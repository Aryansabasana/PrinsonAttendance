import { NextRequest, NextResponse } from "next/server";
import { requireTenantUser } from "@/lib/tenant";
import { hashPassword, comparePassword, signSessionToken, getSessionCookieName } from "@/lib/auth";
import { checkPasswordRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { handleAuthError } from "@/lib/permissions";
import { z } from "zod";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const { tenant, user: session, models } = await requireTenantUser(request);

    // Rate limiting: 5 password attempts per 15 minutes
    const rateLimit = await checkPasswordRateLimit(session.userId, request, tenant);
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const user = await models.User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMatch = await comparePassword(parsed.data.currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    // Security Hardening: Invalidate all existing sessions across other devices by incrementing tokenVersion
    const newTokenVersion = (user.tokenVersion || 0) + 1;
    user.tokenVersion = newTokenVersion;
    user.passwordHash = await hashPassword(parsed.data.newPassword);
    await user.save();

    // Log security event in AuditLog
    await models.AuditLog.create({
      action: "USER_PASSWORD_CHANGED",
      performedBy: user._id,
      performerName: user.name,
      reason: "User updated their account authentication credentials; all other active sessions revoked.",
    });

    // Re-issue a fresh session token with the new tokenVersion for the current device
    const newSessionPayload = {
      ...session,
      tokenVersion: newTokenVersion,
    };
    const newToken = await signSessionToken(newSessionPayload);
    const cookieName = getSessionCookieName(tenant);

    const response = NextResponse.json({
      success: true,
      message: "Password updated successfully. All other active sessions have been revoked.",
    });

    response.cookies.set({
      name: cookieName,
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    return handleAuthError(error);
  }
}

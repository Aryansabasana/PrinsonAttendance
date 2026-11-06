import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { signSessionToken, getSessionCookieName } from "@/lib/auth";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters long"),
  email: z.string().trim().email("Please provide a valid email address").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { tenant, user: session, models } = await getTenantContext(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await models.User.findById(session.userId).populate("employee").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const employeeObj = user.employee as any;

    return NextResponse.json({
      success: true,
      company: tenant,
      profile: {
        id: user._id,
        name: user.name,
        identifier: user.identifier,
        email: user.identifier.includes("@") ? user.identifier : employeeObj?.email || "",
        role: user.role,
        company: tenant,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        employeeCode: employeeObj?.employeeCode,
        designation: employeeObj?.designation,
        department: employeeObj?.department,
        phone: employeeObj?.phone || "",
        joiningDate: employeeObj?.joiningDate,
      },
    });
  } catch (error) {
    console.error("Get profile API error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenant, user: session, models } = await getTenantContext(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const user = await models.User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { name, email, phone } = parsed.data;

    // Check email uniqueness if email provided and changed
    if (email && email.toLowerCase() !== user.identifier) {
      if (user.role === "ADMIN") {
        const existingUser = await models.User.findOne({
          identifier: email.toLowerCase(),
          _id: { $ne: user._id },
        });
        if (existingUser) {
          return NextResponse.json(
            { error: "The provided email address is already in use by another account." },
            { status: 400 }
          );
        }
        user.identifier = email.toLowerCase();
      }
    }

    user.name = name;
    await user.save();

    // If user has associated employee record, keep in sync
    let employeeObj: any = null;
    if (user.employee) {
      employeeObj = await models.Employee.findById(user.employee);
      if (employeeObj) {
        employeeObj.fullName = name;
        if (email) employeeObj.email = email.toLowerCase();
        if (phone) employeeObj.phone = phone;
        await employeeObj.save();
      }
    }

    // Refresh JWT session cookie with updated name & email
    const updatedPayload = {
      userId: user._id.toString(),
      role: user.role,
      employeeId: employeeObj ? employeeObj._id.toString() : undefined,
      employeeCode: employeeObj ? employeeObj.employeeCode : undefined,
      name: user.name,
      email: user.identifier,
      company: tenant,
    };

    const token = await signSessionToken(updatedPayload);
    const cookieName = getSessionCookieName(tenant);

    const response = NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      profile: {
        id: user._id,
        name: user.name,
        identifier: user.identifier,
        email: user.identifier.includes("@") ? user.identifier : employeeObj?.email || "",
        role: user.role,
        company: tenant,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        employeeCode: employeeObj?.employeeCode,
        designation: employeeObj?.designation,
        phone: employeeObj?.phone || "",
      },
    });

    response.cookies.set({
      name: cookieName,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Update profile API error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, HYTEK_SESSION_COOKIE_NAME, getSessionCookieName } from "@/lib/auth";
import { resolveTenantFromRequest } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  const tenant = resolveTenantFromRequest(request);
  const cookieName = getSessionCookieName(tenant);

  const response = NextResponse.json({ success: true, message: `Logged out from ${tenant} successfully` });
  
  // Clear the active tenant cookie
  response.cookies.set({
    name: cookieName,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  // If requested company query or header asks for all or specific
  const companyParam = request.nextUrl.searchParams.get("company");
  if (companyParam === "all") {
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    response.cookies.set({
      name: HYTEK_SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}

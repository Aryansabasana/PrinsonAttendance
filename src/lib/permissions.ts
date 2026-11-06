import { NextResponse } from "next/server";
import { getCurrentUser, SessionPayload } from "./auth";
import { CompanyTenant } from "./mongodb";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function authorizeUser(targetCompany?: CompanyTenant): Promise<SessionPayload> {
  const user = await getCurrentUser(targetCompany);
  if (!user) {
    throw new AuthError("Authentication required. Please sign in.", 401);
  }
  return user;
}

export async function authorizeAdmin(targetCompany?: CompanyTenant): Promise<SessionPayload> {
  const user = await authorizeUser(targetCompany);
  if (user.role !== "ADMIN") {
    throw new AuthError("Forbidden: Admin privileges required.", 403);
  }
  return user;
}

export function assertEmployeeAccess(user: SessionPayload, targetEmployeeId: string) {
  if (user.role === "ADMIN") {
    return true;
  }
  // If user is employee, targetEmployeeId must match user's employeeId
  if (user.employeeId && user.employeeId.toString() === targetEmployeeId.toString()) {
    return true;
  }
  throw new AuthError("Forbidden: You cannot access or modify records of another employee.", 403);
}

export function handleAuthError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Internal API error:", error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Internal Server Error" },
    { status: 500 }
  );
}

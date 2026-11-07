import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { CompanyTenant } from "./mongodb";

const DEFAULT_FALLBACK_SECRET = "prinson_plynest_showroom_jwt_secret_secure_key_2026_9876543210";
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_FALLBACK_SECRET;

if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_FALLBACK_SECRET)) {
  console.warn("SECURITY WARNING: JWT_SECRET is using default fallback in production. Configure a unique 32+ character JWT_SECRET in environment variables.");
}

const secretKey = new TextEncoder().encode(JWT_SECRET);

export const SESSION_COOKIE_NAME = "plynest_session";
export const HYTEK_SESSION_COOKIE_NAME = "hytek_session";

export function getSessionCookieName(company: CompanyTenant = "plynest"): string {
  return company === "hytek" ? HYTEK_SESSION_COOKIE_NAME : SESSION_COOKIE_NAME;
}

export interface SessionPayload {
  userId: string;
  role: "ADMIN" | "EMPLOYEE";
  employeeId?: string; // string representation of Employee ObjectId or employee code
  employeeCode?: string;
  name: string;
  email?: string;
  company?: CompanyTenant;
  tokenVersion?: number;
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plain, salt);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload, company: payload.company || "plynest" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Retrieves and validates the current user session.
 * If targetCompany is specified, guarantees the user has a session strictly for that company.
 */
export async function getCurrentUser(targetCompany?: CompanyTenant): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();

    if (targetCompany === "hytek") {
      const token = cookieStore.get(HYTEK_SESSION_COOKIE_NAME)?.value;
      if (!token) return null;
      const session = await verifySessionToken(token);
      if (!session || session.company !== "hytek") return null;
      return session;
    }

    if (targetCompany === "plynest") {
      const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      if (!token) return null;
      const session = await verifySessionToken(token);
      if (!session || session.company === "hytek") return null;
      return session;
    }

    // Auto-detect if no company specified: prioritize hytek if hytek cookie exists, otherwise plynest
    const hytekToken = cookieStore.get(HYTEK_SESSION_COOKIE_NAME)?.value;
    if (hytekToken) {
      const session = await verifySessionToken(hytekToken);
      if (session && session.company === "hytek") return session;
    }

    const plynestToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (plynestToken) {
      const session = await verifySessionToken(plynestToken);
      if (session) return session;
    }

    return null;
  } catch {
    return null;
  }
}

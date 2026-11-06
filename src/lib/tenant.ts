import { NextRequest } from "next/server";
import { CompanyTenant, getTenantModels, TenantModels } from "./mongodb";
import { getCurrentUser, SessionPayload } from "./auth";
import { AuthError } from "./permissions";

/**
 * Resolves the company tenant from a NextRequest:
 * Checks headers (x-company), cookies, referer, or URL pathname.
 */
export function resolveTenantFromRequest(request: NextRequest): CompanyTenant {
  const headerCompany = request.headers.get("x-company")?.toLowerCase();
  if (headerCompany === "hytek" || headerCompany === "plynest") {
    return headerCompany as CompanyTenant;
  }

  const url = request.nextUrl || new URL(request.url);
  if (url.pathname.startsWith("/hytek/") || url.pathname.startsWith("/api/hytek/")) {
    return "hytek";
  }

  const companyParam = url.searchParams.get("company")?.toLowerCase();
  if (companyParam === "hytek" || companyParam === "plynest") {
    return companyParam as CompanyTenant;
  }

  const referer = request.headers.get("referer");
  if (referer && (referer.includes("/hytek/") || referer.includes("/hytek?"))) {
    return "hytek";
  }

  // Check cookies: if only hytek cookie is present, resolve to hytek
  if (request.cookies.has("hytek_session") && !request.cookies.has("plynest_session")) {
    return "hytek";
  }

  return "plynest";
}

export interface TenantContext {
  tenant: CompanyTenant;
  user: SessionPayload | null;
  models: TenantModels;
}

/**
 * Provides the full tenant context for an API route:
 * Guarantees that models are connected to the tenant's isolated database
 * (plynest_attendance or hytek_attendance).
 */
export async function getTenantContext(
  request: NextRequest,
  forcedTenant?: CompanyTenant
): Promise<TenantContext> {
  const tenant = forcedTenant || resolveTenantFromRequest(request);
  const user = await getCurrentUser(tenant);
  const models = await getTenantModels(tenant);

  return {
    tenant,
    user,
    models,
  };
}

/**
 * Enforces authenticated access for the specific tenant.
 * Rejects with 401 if not logged into that company.
 */
export async function requireTenantUser(
  request: NextRequest,
  forcedTenant?: CompanyTenant
): Promise<{ tenant: CompanyTenant; user: SessionPayload; models: TenantModels }> {
  const tenant = forcedTenant || resolveTenantFromRequest(request);
  const user = await getCurrentUser(tenant);
  if (!user) {
    throw new AuthError(`Authentication required for ${tenant === "hytek" ? "Prinson Hytek" : "Prinson Plynest"}. Please sign in.`, 401);
  }
  const models = await getTenantModels(tenant);
  return { tenant, user, models };
}

/**
 * Enforces admin access for the specific tenant.
 * Rejects with 403 if user is not an admin of that company.
 */
export async function requireTenantAdmin(
  request: NextRequest,
  forcedTenant?: CompanyTenant
): Promise<{ tenant: CompanyTenant; user: SessionPayload; models: TenantModels }> {
  const ctx = await requireTenantUser(request, forcedTenant);
  if (ctx.user.role !== "ADMIN") {
    throw new AuthError(`Forbidden: Admin privileges required for ${ctx.tenant === "hytek" ? "Prinson Hytek" : "Prinson Plynest"}.`, 403);
  }
  return ctx;
}

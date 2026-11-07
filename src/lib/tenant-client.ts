import { CompanyTenant } from "./mongodb";

/**
 * Builds tenant-aware front-end route paths.
 * e.g. for hytek: getTenantUrl("/employees", "hytek") => "/hytek/employees"
 * e.g. for plynest: getTenantUrl("/employees", "plynest") => "/employees"
 */
export function getTenantUrl(path: string, company: CompanyTenant = "plynest"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (company === "hytek") {
    return `/hytek${normalized}`;
  }
  return normalized;
}

/**
 * Appends tenant query param to API routes when required.
 * e.g. for hytek: getTenantApiUrl("/api/employees", "hytek") => "/api/employees?company=hytek"
 * e.g. for plynest: getTenantApiUrl("/api/employees", "plynest") => "/api/employees"
 */
export function getTenantApiUrl(path: string, company: CompanyTenant = "plynest"): string {
  if (company === "hytek") {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}company=hytek`;
  }
  return path;
}

/**
 * Generates tenant request headers for fetch calls.
 */
export function getTenantApiHeaders(company: CompanyTenant = "plynest"): Record<string, string> {
  if (company === "hytek") {
    return { "x-company": "hytek" };
  }
  return {};
}

import { NextRequest } from "next/server";

/**
 * Escapes all regular expression meta-characters to prevent ReDoS
 * and malicious regex pattern injection in MongoDB $regex queries.
 */
export function escapeRegex(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validates standard MongoDB ObjectId 24-character hexadecimal format.
 */
export function isValidObjectId(id: unknown): boolean {
  if (typeof id !== "string") return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Neutralizes CSV formula injection (OWASP CSV Injection).
 * Spreadsheet tools (Excel, LibreOffice, Google Sheets) execute cells starting with =, +, -, @, \t, or \r.
 * Prepending a single apostrophe forces the spreadsheet engine to treat the value as plain text.
 */
export function sanitizeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);

  // If cell starts with dangerous formula trigger characters, neutralize it
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape internal double quotes per RFC 4180
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Deep-sanitizes untrusted objects to prevent MongoDB operator injection ($gt, $ne, $where, etc.)
 */
export function sanitizeMongoQuery<T = any>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeMongoQuery) as unknown as T;
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Strip keys starting with $ (Mongo query operators)
    if (key.startsWith("$")) {
      continue;
    }
    clean[key] = sanitizeMongoQuery(value);
  }
  return clean as T;
}

/**
 * Validates request Origin and Referer for state-changing browser requests (CSRF mitigation).
 * Permissive for programmatic API calls (no Origin/Referer), strict when browser headers are present.
 */
export function validateRequestOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  if (!host) return true;

  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return false;
      }
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost !== host) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

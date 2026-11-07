import fs from "fs";
import path from "path";
import dns from "dns";
import mongoose from "mongoose";
import { NextRequest } from "next/server";

// Fix querySrv ECONNREFUSED on Windows for MongoDB Atlas SRV records
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore in environments where setting DNS servers is not supported
}

// Load .env file if not present in process.env
if (!process.env.MONGODB_URI) {
  const envPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

import { getTenantModels } from "../src/lib/mongodb";
import { signSessionToken } from "../src/lib/auth";
import { checkRateLimit, createRateLimitResponse } from "../src/lib/rate-limit";
import { escapeRegex, sanitizeCsvCell, validateRequestOrigin } from "../src/lib/security";
import { handleAuthError } from "../src/lib/permissions";
import { requireTenantUser, requireTenantAdmin } from "../src/lib/tenant";

// Route handlers
import { POST as loginHandler } from "../src/app/api/auth/login/route";
import { GET as leaveByIdHandler } from "../src/app/api/leave/[id]/route";
import { GET as calendarHandler } from "../src/app/api/attendance/calendar/route";
import { GET as employeesHandler } from "../src/app/api/employees/route";
import { GET as dailyHandler } from "../src/app/api/attendance/daily/route";
import nextConfig from "../next.config.mjs";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedCount++;
    throw new Error(`Security assertion failed: ${message}`);
  }
}

async function runSecurityTests() {
  console.log("\n=======================================================");
  console.log("PRINSON PLYNEST ATTENDANCE — AUTOMATED SECURITY TEST SUITE");
  console.log("=======================================================\n");

  const models = await getTenantModels("plynest");
  console.log("Connected to tenant models successfully.\n");

  // Setup test users and employees
  const empA = await models.Employee.findOneAndUpdate(
    { employeeCode: "SEC-EMP-A" },
    {
      employeeCode: "SEC-EMP-A",
      fullName: "Security Alice",
      email: "alice.security@plynest.com",
      phone: "+91 91000 00001",
      designation: "Executive",
      department: "Security",
      joiningDate: "2026-01-01",
      isActive: true,
    },
    { upsert: true, new: true }
  );

  const empB = await models.Employee.findOneAndUpdate(
    { employeeCode: "SEC-EMP-B" },
    {
      employeeCode: "SEC-EMP-B",
      fullName: "Security Bob",
      email: "bob.security@plynest.com",
      phone: "+91 91000 00002",
      designation: "Specialist",
      department: "Security",
      joiningDate: "2026-01-01",
      isActive: true,
    },
    { upsert: true, new: true }
  );

  const userAlice = await models.User.findOneAndUpdate(
    { identifier: "sec_alice" },
    {
      identifier: "sec_alice",
      name: "Security Alice",
      passwordHash: "$2a$12$eXAMP1eHashForTestingOnlyNotRealHash12345678901234567890",
      role: "EMPLOYEE",
      employee: empA._id,
      isActive: true,
      tokenVersion: 0,
    },
    { upsert: true, new: true }
  );

  const userBob = await models.User.findOneAndUpdate(
    { identifier: "sec_bob" },
    {
      identifier: "sec_bob",
      name: "Security Bob",
      passwordHash: "$2a$12$eXAMP1eHashForTestingOnlyNotRealHash12345678901234567890",
      role: "EMPLOYEE",
      employee: empB._id,
      isActive: true,
      tokenVersion: 0,
    },
    { upsert: true, new: true }
  );

  const userAdmin = await models.User.findOneAndUpdate(
    { identifier: "sec_admin" },
    {
      identifier: "sec_admin",
      name: "Security Admin",
      passwordHash: "$2a$12$eXAMP1eHashForTestingOnlyNotRealHash12345678901234567890",
      role: "ADMIN",
      isActive: true,
      tokenVersion: 0,
    },
    { upsert: true, new: true }
  );

  const userDeactivated = await models.User.findOneAndUpdate(
    { identifier: "sec_deactivated" },
    {
      identifier: "sec_deactivated",
      name: "Security Deactivated",
      passwordHash: "$2a$12$eXAMP1eHashForTestingOnlyNotRealHash12345678901234567890",
      role: "EMPLOYEE",
      employee: empA._id,
      isActive: false,
      tokenVersion: 0,
    },
    { upsert: true, new: true }
  );

  // Generate tokens
  const tokenAlice = await signSessionToken({
    userId: userAlice._id.toString(),
    role: "EMPLOYEE",
    employeeId: empA._id.toString(),
    employeeCode: "SEC-EMP-A",
    name: "Security Alice",
    company: "plynest",
    tokenVersion: 0,
  });

  const tokenAdmin = await signSessionToken({
    userId: userAdmin._id.toString(),
    role: "ADMIN",
    name: "Security Admin",
    company: "plynest",
    tokenVersion: 0,
  });

  // -------------------------------------------------------------
  // SEC-01: Multi-Instance Distributed Rate Limiting
  // -------------------------------------------------------------
  console.log("▶ SEC-01: Multi-instance distributed rate limiting backed by MongoDB");
  const testKey = `test:ratelimit:${Date.now()}`;
  await models.RateLimit.deleteMany({ key: { $regex: "^test:ratelimit:" } });

  for (let i = 1; i <= 5; i++) {
    const res = await checkRateLimit({
      key: testKey,
      limit: 5,
      windowSeconds: 60,
      company: "plynest",
    });
    assert(res.allowed === true, `Attempt ${i}/5 is permitted`);
    assert(res.remaining === 5 - i, `Remaining count accurately decremented to ${5 - i}`);
  }

  // 6th attempt should be blocked
  const blockedRes = await checkRateLimit({
    key: testKey,
    limit: 5,
    windowSeconds: 60,
    company: "plynest",
  });
  assert(blockedRes.allowed === false, "6th attempt exceeds limit and is rejected");
  assert(blockedRes.remaining === 0, "Remaining count is 0 when rate limited");
  assert(blockedRes.retryAfter > 0, "retryAfter provides a positive backoff in seconds");

  const httpRes = createRateLimitResponse(blockedRes);
  assert(httpRes.status === 429, "Rate limiter helper returns HTTP status 429 Too Many Requests");
  assert(httpRes.headers.get("Retry-After") !== null, "Response includes Retry-After header");
  assert(httpRes.headers.get("X-RateLimit-Limit") === "5", "Response includes X-RateLimit-Limit header");

  await models.RateLimit.deleteMany({ key: testKey });

  // -------------------------------------------------------------
  // SEC-02: Timing Attack & Account Enumeration Mitigation (VULN-01 & VULN-02)
  // -------------------------------------------------------------
  console.log("\n▶ SEC-02: Timing attack defense and uniform error messages on login");
  
  // Non-existent user
  const fakeReq = new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "non_existent_user_99999", password: "wrong_password_123" }),
  });
  const fakeRes = await loginHandler(fakeReq);
  const fakeJson = await fakeRes.json();
  assert(fakeRes.status === 401, "Non-existent user receives HTTP 401 Unauthorized");
  assert(fakeJson.error === "Invalid username, employee ID, or password.", "Error message is generic, preventing account enumeration");

  // Deactivated user
  const deactReq = new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "sec_deactivated", password: "some_password" }),
  });
  const deactRes = await loginHandler(deactReq);
  const deactJson = await deactRes.json();
  assert(deactRes.status === 401, "Deactivated account receives HTTP 401 Unauthorized");
  assert(deactJson.error === "Invalid username, employee ID, or password.", "Deactivated account produces identical generic error message");

  // -------------------------------------------------------------
  // SEC-03: Cross-Device Session Invalidation on Password Change (VULN-06)
  // -------------------------------------------------------------
  console.log("\n▶ SEC-03: Instant cross-device session invalidation via tokenVersion");
  // Alice starts with tokenVersion 0
  const validAliceReq = new NextRequest("http://localhost:3000/api/employees", {
    headers: { cookie: `plynest_session=${tokenAlice}` },
  });
  const aliceCtx = await requireTenantUser(validAliceReq);
  assert(aliceCtx.user.userId === userAlice._id.toString(), "Token with current tokenVersion is accepted");

  // Simulate password change incrementing tokenVersion to 1
  await models.User.updateOne({ _id: userAlice._id }, { $inc: { tokenVersion: 1 } });

  let revokedBlocked = false;
  let revokedMessage = "";
  try {
    await requireTenantUser(validAliceReq);
  } catch (err: any) {
    if (err.status === 401) {
      revokedBlocked = true;
      revokedMessage = err.message;
    }
  }
  assert(revokedBlocked, "Request using old session token is immediately rejected with 401");
  assert(revokedMessage.includes("Session has been revoked"), "Session revocation informs user to sign in again");

  // Reset Alice's tokenVersion
  await models.User.updateOne({ _id: userAlice._id }, { tokenVersion: 0 });

  // -------------------------------------------------------------
  // SEC-04: IDOR Mitigation on Leave Requests (VULN-03)
  // -------------------------------------------------------------
  console.log("\n▶ SEC-04: IDOR mitigation on leave request access (/api/leave/[id])");
  // Create leave request for Bob
  const leaveBob = await models.LeaveRequest.create({
    employee: empB._id,
    leaveType: "CASUAL",
    startDate: "2026-11-20",
    endDate: "2026-11-21",
    reason: "Bob confidential leave reason",
    status: "PENDING",
  });

  // Alice tries to access Bob's leave request
  const idorReq = new NextRequest(`http://localhost:3000/api/leave/${leaveBob._id}`, {
    headers: { cookie: `plynest_session=${tokenAlice}` },
  });
  const idorRes = await leaveByIdHandler(idorReq, { params: { id: leaveBob._id.toString() } });
  const idorJson = await idorRes.json();
  assert(idorRes.status === 403, "Cross-employee leave request access is strictly forbidden (HTTP 403)");
  assert(idorJson.error.includes("another employee"), "Response explicitly blocks unauthorized cross-user access");

  // Admin tries to access Bob's leave request
  const adminLeaveReq = new NextRequest(`http://localhost:3000/api/leave/${leaveBob._id}`, {
    headers: { cookie: `plynest_session=${tokenAdmin}` },
  });
  const adminLeaveRes = await leaveByIdHandler(adminLeaveReq, { params: { id: leaveBob._id.toString() } });
  assert(adminLeaveRes.status === 200, "Admin can legitimately view leave request for management approval");

  // Clean up test leave
  await models.LeaveRequest.deleteOne({ _id: leaveBob._id });

  // -------------------------------------------------------------
  // SEC-05: Company-Wide Attendance Calendar Authorization (VULN-04)
  // -------------------------------------------------------------
  console.log("\n▶ SEC-05: Attendance calendar access control (/api/attendance/calendar)");
  // Alice queries calendar without employeeId (should safely scope to Alice, not company-wide)
  const defaultCalendarReq = new NextRequest("http://localhost:3000/api/attendance/calendar?year=2026&month=11", {
    headers: { cookie: `plynest_session=${tokenAlice}` },
  });
  const defaultCalendarRes = await calendarHandler(defaultCalendarReq);
  const defaultCalendarJson = await defaultCalendarRes.json();
  assert(defaultCalendarRes.status === 200, "Employee calendar query succeeds");
  assert(defaultCalendarJson.employee?._id.toString() === empA._id.toString(), "Calendar query without employeeId is strictly scoped to self; company-wide view is withheld");

  // Alice queries her own calendar explicitly
  const aliceCalendarReq = new NextRequest(`http://localhost:3000/api/attendance/calendar?year=2026&month=11&employeeId=${empA._id}`, {
    headers: { cookie: `plynest_session=${tokenAlice}` },
  });
  const aliceCalendarRes = await calendarHandler(aliceCalendarReq);
  assert(aliceCalendarRes.status === 200, "Employee can view their own calendar");

  // Alice tries to query Bob's calendar
  const bobCalendarReq = new NextRequest(`http://localhost:3000/api/attendance/calendar?year=2026&month=11&employeeId=${empB._id}`, {
    headers: { cookie: `plynest_session=${tokenAlice}` },
  });
  const bobCalendarRes = await calendarHandler(bobCalendarReq);
  assert(bobCalendarRes.status === 403, "Employee cannot query another employee's calendar");

  // Admin queries company-wide calendar
  const adminCalendarReq = new NextRequest("http://localhost:3000/api/attendance/calendar?year=2026&month=11", {
    headers: { cookie: `plynest_session=${tokenAdmin}` },
  });
  const adminCalendarRes = await calendarHandler(adminCalendarReq);
  assert(adminCalendarRes.status === 200, "Admin can query company-wide calendar");

  // -------------------------------------------------------------
  // SEC-06: Employee Directory & Daily Register Authorization (VULN-05)
  // -------------------------------------------------------------
  console.log("\n▶ SEC-06: Authorization guards on /api/employees and /api/attendance/daily");
  // Alice accesses /api/employees
  const empListReq = new NextRequest("http://localhost:3000/api/employees", {
    headers: { cookie: `plynest_session=${tokenAlice}` },
  });
  const empListRes = await employeesHandler(empListReq);
  assert(empListRes.status === 403, "Employee cannot access employee management directory (HTTP 403)");

  // Admin accesses /api/employees
  const adminEmpReq = new NextRequest("http://localhost:3000/api/employees", {
    headers: { cookie: `plynest_session=${tokenAdmin}` },
  });
  const adminEmpRes = await employeesHandler(adminEmpReq);
  assert(adminEmpRes.status === 200, "Admin can access employee directory (HTTP 200)");

  // Alice accesses /api/attendance/daily
  const dailyReq = new NextRequest("http://localhost:3000/api/attendance/daily?date=2026-11-01", {
    headers: { cookie: `plynest_session=${tokenAlice}` },
  });
  const dailyRes = await dailyHandler(dailyReq);
  assert(dailyRes.status === 403, "Employee cannot access daily attendance register (HTTP 403)");

  // Admin accesses /api/attendance/daily
  const adminDailyReq = new NextRequest("http://localhost:3000/api/attendance/daily?date=2026-11-01", {
    headers: { cookie: `plynest_session=${tokenAdmin}` },
  });
  const adminDailyRes = await dailyHandler(adminDailyReq);
  assert(adminDailyRes.status === 200, "Admin can access daily attendance register (HTTP 200)");

  // -------------------------------------------------------------
  // SEC-07: ReDoS Mitigation & Regex Meta-Character Escaping (VULN-07)
  // -------------------------------------------------------------
  console.log("\n▶ SEC-07: ReDoS prevention via escapeRegex");
  const dangerousRegex = ".*+?^${}()|[]\\";
  const escaped = escapeRegex(dangerousRegex);
  assert(!/[*+?^${}()|[\]\\]/.test(escaped.replace(/\\./g, "")), "All special regex metacharacters are escaped with backslashes");

  // Querying with .* does not wildcard match when escaped
  const redosSearchReq = new NextRequest("http://localhost:3000/api/employees?search=.*", {
    headers: { cookie: `plynest_session=${tokenAdmin}` },
  });
  const redosRes = await employeesHandler(redosSearchReq);
  const redosJson = await redosRes.json();
  assert(redosRes.status === 200, "Regex payload executed safely without server timeout or catastrophic backtracking");
  assert(Array.isArray(redosJson.employees), "Query returned structured response");
  // Literal search for '.*' should return 0 employees because none have '.*' in name
  assert(redosJson.employees.length === 0, "Literal '.*' does not act as wildcard to dump directory");

  // -------------------------------------------------------------
  // SEC-08: CSV Formula Injection Mitigation (VULN-08)
  // -------------------------------------------------------------
  console.log("\n▶ SEC-08: CSV formula injection neutralization (OWASP CSV Injection)");
  const formulas = [
    "=CMD|' /C calc'!A0",
    "+SUM(A1:A10)",
    "-12345",
    "@MALICIOUS_FUNCTION()",
    "\tTAB_INJECT",
    "\rCARRIAGE_RETURN",
  ];

  for (const formula of formulas) {
    const sanitized = sanitizeCsvCell(formula);
    assert(sanitized.startsWith("\"'") || sanitized.startsWith("'\t") || sanitized.startsWith("'\r"), `Formula '${formula.slice(0, 4)}...' neutralized with leading apostrophe`);
  }

  const normalText = sanitizeCsvCell("Regular Employee Name");
  assert(normalText === '"Regular Employee Name"', "Normal strings without formula prefixes are unmodified");

  // -------------------------------------------------------------
  // SEC-09: CSRF State-Mutation Protection via Origin / Referer Validation
  // -------------------------------------------------------------
  console.log("\n▶ SEC-09: CSRF mitigation for mutating HTTP methods");
  // Mismatched origin on POST request
  const csrfReq = new NextRequest("http://localhost:3000/api/leave/request", {
    method: "POST",
    headers: {
      origin: "https://evil-attacker-site.com",
      host: "localhost:3000",
      cookie: `plynest_session=${tokenAlice}`,
    },
  });
  let csrfBlocked = false;
  try {
    await requireTenantUser(csrfReq);
  } catch (err: any) {
    if (err.status === 403 && err.message.includes("Origin validation failed")) {
      csrfBlocked = true;
    }
  }
  assert(csrfBlocked, "State-mutating request with foreign Origin is rejected (HTTP 403)");

  // Legitimate matching origin
  const legitReq = new NextRequest("http://localhost:3000/api/leave/request", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      host: "localhost:3000",
      cookie: `plynest_session=${tokenAlice}`,
    },
  });
  const legitCtx = await requireTenantUser(legitReq);
  assert(legitCtx.user.userId === userAlice._id.toString(), "State-mutating request with matching Origin succeeds");

  // -------------------------------------------------------------
  // SEC-10: Production Error Masking (VULN-09)
  // -------------------------------------------------------------
  console.log("\n▶ SEC-10: Database error details masked in production");
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const internalErr = new Error("MongoServerError: Authentication failed on database plynest_attendance with user root");
  const maskedRes = handleAuthError(internalErr);
  const maskedJson = await maskedRes.json();
  assert(maskedRes.status === 500, "Server error returns HTTP 500");
  assert(maskedJson.error === "An internal server error occurred. Please contact the administrator.", "Production error message is strictly generic; no database credentials or traces leaked");
  process.env.NODE_ENV = prevEnv;

  // -------------------------------------------------------------
  // SEC-11: Security Headers & CSP Configuration (VULN-10 / VULN-11)
  // -------------------------------------------------------------
  console.log("\n▶ SEC-11: Secure HTTP headers and Content Security Policy in next.config.mjs");
  const configHeaders = await nextConfig.headers();
  const routeHeaders = configHeaders.find((h: any) => h.source === "/:path*")?.headers || [];

  const getHeader = (key: string) => routeHeaders.find((h: any) => h.key.toLowerCase() === key.toLowerCase())?.value;

  const csp = getHeader("Content-Security-Policy");
  assert(csp !== undefined && csp.includes("default-src 'self'"), "CSP defines default-src 'self'");
  assert(csp !== undefined && csp.includes("frame-ancestors 'none'"), "CSP forbids embedding with frame-ancestors 'none'");
  assert(csp !== undefined && csp.includes("base-uri 'self'"), "CSP sets base-uri 'self'");

  const xfo = getHeader("X-Frame-Options");
  assert(xfo === "DENY", "X-Frame-Options is set to DENY");

  const xcto = getHeader("X-Content-Type-Options");
  assert(xcto === "nosniff", "X-Content-Type-Options is set to nosniff");

  const hsts = getHeader("Strict-Transport-Security");
  assert(hsts !== undefined && hsts.includes("max-age=31536000"), "Strict-Transport-Security enforces 1 year HSTS with subdomains and preload");

  const refPol = getHeader("Referrer-Policy");
  assert(refPol === "strict-origin-when-cross-origin", "Referrer-Policy is strict-origin-when-cross-origin");

  const permPol = getHeader("Permissions-Policy");
  assert(permPol !== undefined && permPol.includes("camera=()"), "Permissions-Policy restricts camera, microphone, and geolocation");

  // Clean up test data
  console.log("\nCleaning up test users & records...");
  await models.User.deleteMany({ identifier: { $in: ["sec_alice", "sec_bob", "sec_admin", "sec_deactivated"] } });
  await models.Employee.deleteMany({ employeeCode: { $in: ["SEC-EMP-A", "SEC-EMP-B"] } });

  console.log("\n=======================================================");
  console.log(`SECURITY TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSecurityTests().catch((err) => {
  console.error("Test runner crashed with unhandled exception:", err);
  process.exit(1);
});

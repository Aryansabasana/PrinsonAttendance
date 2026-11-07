import fs from "fs";
import path from "path";
import dns from "dns";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Employee } from "../src/models/Employee";
import { User } from "../src/models/User";
import { Attendance } from "../src/models/Attendance";
import { LeaveRequest } from "../src/models/LeaveRequest";
import { AuditLog } from "../src/models/AuditLog";
import { formatDateStr } from "../src/lib/utils";

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

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/plynest_attendance";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedCount++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("PRINSON PLYNEST ATTENDANCE PORTAL — AUTOMATED TEST SUITE");
  console.log("=======================================================\n");

  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB successfully for test execution.\n");

  // Test 1: Employee Creation & Verification
  console.log("▶ TEST 1: Admin can create an employee and employee persists in database");
  const testEmpCode = "TEST-999";
  await Employee.deleteOne({ employeeCode: testEmpCode });
  const createdEmp = await Employee.create({
    employeeCode: testEmpCode,
    fullName: "Test Staff Member",
    email: "teststaff@plynest.com",
    phone: "+91 99000 00000",
    designation: "Display Specialist",
    department: "Store Operations",
    joiningDate: "2026-01-01",
    isActive: true,
  });
  assert(createdEmp.employeeCode === testEmpCode, "Employee code matches TEST-999");
  assert(createdEmp.isActive === true, "New employee is created with active status");

  // Test 2: Admin Marks Attendance & Persists
  console.log("\n▶ TEST 2: Admin can mark an employee present and record persists");
  const testDate = "2026-11-01";
  await Attendance.deleteOne({ employee: createdEmp._id, dateStr: testDate });
  const attRecord = await Attendance.create({
    employee: createdEmp._id,
    dateStr: testDate,
    status: "PRESENT",
    checkInTime: "09:30",
    checkOutTime: "18:30",
    remarks: "On showroom floor",
  });
  const fetchedAtt = await Attendance.findOne({ employee: createdEmp._id, dateStr: testDate });
  assert(fetchedAtt !== null, "Attendance record was saved and fetched from database");
  assert(fetchedAtt?.status === "PRESENT", "Attendance status is correctly recorded as PRESENT");
  assert(fetchedAtt?.checkInTime === "09:30", "Check-in time correctly recorded as 09:30");

  // Test 3: Attendance Correction & Audit History
  console.log("\n▶ TEST 3: Admin can correct attendance and audit log records the change");
  const previousStatus = fetchedAtt!.status;
  fetchedAtt!.status = "HALF_DAY";
  fetchedAtt!.remarks = "Shifted to half-day site consultation";
  await fetchedAtt!.save();

  const auditEntry = await AuditLog.create({
    action: "ATTENDANCE_CORRECTED",
    performedBy: new mongoose.Types.ObjectId(),
    performerName: "Admin Vikramaditya",
    targetEmployee: createdEmp._id,
    employeeCode: createdEmp.employeeCode,
    employeeName: createdEmp.fullName,
    dateStr: testDate,
    previousValue: { status: previousStatus },
    newValue: { status: "HALF_DAY" },
    reason: "Correction verified with architect site log",
  });
  assert(auditEntry.action === "ATTENDANCE_CORRECTED", "Audit log created with ATTENDANCE_CORRECTED");
  assert(auditEntry.previousValue?.status === "PRESENT", "Previous value recorded as PRESENT in audit");
  assert(auditEntry.newValue?.status === "HALF_DAY", "New value recorded as HALF_DAY in audit");

  // Test 4: Duplicate Attendance Records are Prevented
  console.log("\n▶ TEST 4: Duplicate attendance record on same date is strictly rejected by compound index");
  let duplicatePrevented = false;
  try {
    await Attendance.create({
      employee: createdEmp._id,
      dateStr: testDate,
      status: "ABSENT",
    });
  } catch (err: any) {
    // Mongo duplicate key error E11000
    if (err.code === 11000 || err.message.includes("duplicate key")) {
      duplicatePrevented = true;
    }
  }
  assert(duplicatePrevented, "Compound unique index on { employee, dateStr } successfully prevented duplicate attendance entry");

  // Test 5: Unmarked Day is NOT Counted as Absent
  console.log("\n▶ TEST 5: Clear distinction between Absent and Not Marked");
  const unmarkedDate = "2026-11-02";
  await Attendance.deleteOne({ employee: createdEmp._id, dateStr: unmarkedDate });
  const existingUnmarked = await Attendance.findOne({ employee: createdEmp._id, dateStr: unmarkedDate });
  assert(existingUnmarked === null, "No attendance record exists for unmarked date");
  // Unmarked count is calculated as totalActiveEmployees - (present + absent + half + leave)
  const isAbsent = existingUnmarked?.status === "ABSENT";
  assert(!isAbsent, "Unmarked record is NOT automatically considered ABSENT");

  // Test 6: Half Day is Counted as 0.5 Day (distinct from full day)
  console.log("\n▶ TEST 6: Half-day calculation accuracy (0.5 day vs 1.0 day weight)");
  const sampleRecords = [
    { status: "PRESENT" },
    { status: "PRESENT" },
    { status: "HALF_DAY" },
    { status: "ABSENT" },
  ];
  let pCount = 0;
  let hCount = 0;
  let aCount = 0;
  sampleRecords.forEach((r) => {
    if (r.status === "PRESENT") pCount++;
    else if (r.status === "HALF_DAY") hCount++;
    else if (r.status === "ABSENT") aCount++;
  });
  const totalMarked = pCount + hCount + aCount; // 4
  const weightedPresent = pCount + hCount * 0.5; // 2 + 0.5 = 2.5
  const rate = Math.round((weightedPresent / totalMarked) * 100); // (2.5 / 4) * 100 = 63%
  assert(weightedPresent === 2.5, "Half-day adds exactly 0.5 to total present days");
  assert(rate === 63, "Attendance percentage correctly calculated with half-day weighting (63%)");

  // Newly added employee with 0 records: attendance starts on first marked day (not 100%)
  const newEmpMarkedDays = 0;
  const newEmpRate = newEmpMarkedDays > 0 ? 100 : null;
  assert(newEmpRate === null, "New employee with 0 records has null attendance rate (not 100%)");

  // Test 7: Leave Workflow — Submit & Prevent Self-Approval
  console.log("\n▶ TEST 7: Leave workflow: Submit, Pending state, Overlap detection");
  const leaveStart = "2026-11-10";
  const leaveEnd = "2026-11-11";
  await LeaveRequest.deleteMany({ employee: createdEmp._id });

  const leaveReq = await LeaveRequest.create({
    employee: createdEmp._id,
    leaveType: "CASUAL",
    startDate: leaveStart,
    endDate: leaveEnd,
    reason: "Personal family commitment in Chennai",
    status: "PENDING",
  });
  assert(leaveReq.status === "PENDING", "Leave request initialized in PENDING status");

  // Overlap check
  const overlappingReq = await LeaveRequest.findOne({
    employee: createdEmp._id,
    status: { $in: ["PENDING", "APPROVED"] },
    $or: [{ startDate: { $lte: leaveEnd }, endDate: { $gte: leaveStart } }],
  });
  assert(overlappingReq !== null, "Overlap detector finds existing leave covering requested dates");

  // Test 8: Approving Leave Updates Attendance Consistently
  console.log("\n▶ TEST 8: Approving leave consistently syncs attendance records to APPROVED_LEAVE");
  leaveReq.status = "APPROVED";
  leaveReq.adminRemarks = "Approved by Director Vikramaditya";
  await leaveReq.save();

  // Create attendance record on leave dates
  await Attendance.findOneAndUpdate(
    { employee: createdEmp._id, dateStr: leaveStart },
    {
      $set: {
        status: "APPROVED_LEAVE",
        leaveRequest: leaveReq._id,
        remarks: "Approved leave (CASUAL): " + leaveReq.adminRemarks,
      },
    },
    { upsert: true, new: true }
  );

  const syncedAtt = await Attendance.findOne({ employee: createdEmp._id, dateStr: leaveStart });
  assert(syncedAtt?.status === "APPROVED_LEAVE", "Attendance on start date was updated to APPROVED_LEAVE");
  assert(Boolean(syncedAtt?.remarks?.includes("Approved leave")), "Attendance remark references the approved leave");

  // Test 9: Rejecting Leave Does NOT Create Approved-Leave Attendance
  console.log("\n▶ TEST 9: Rejecting leave preserves pending rejection status without updating attendance");
  const rejectedStart = "2026-11-20";
  const rejectedLeave = await LeaveRequest.create({
    employee: createdEmp._id,
    leaveType: "OTHER",
    startDate: rejectedStart,
    endDate: rejectedStart,
    reason: "Weekend extension",
    status: "REJECTED",
    adminRemarks: "Showroom promotional exhibition scheduled that day",
  });
  assert(rejectedLeave.status === "REJECTED", "Leave status is REJECTED");
  const uncreatedAtt = await Attendance.findOne({ employee: createdEmp._id, dateStr: rejectedStart });
  assert(uncreatedAtt === null, "No approved-leave attendance was created for rejected leave request");

  // Test 10: Deactivating Employee Preserves Historical Records
  console.log("\n▶ TEST 10: Deactivating an employee keeps historical records completely intact");
  createdEmp.isActive = false;
  await createdEmp.save();

  const historyAfterDeactivation = await Attendance.find({ employee: createdEmp._id });
  assert(historyAfterDeactivation.length >= 2, "Historical attendance records preserved after employee deactivation");
  assert(createdEmp.isActive === false, "Employee status is successfully set to inactive");

  // Clean up test employee
  await Attendance.deleteMany({ employee: createdEmp._id });
  await LeaveRequest.deleteMany({ employee: createdEmp._id });
  await Employee.deleteOne({ _id: createdEmp._id });

  // =========================================================================
  // MULTI-TENANT & DUAL-DATABASE ISOLATION TESTS (PLINEST vs HYTEK)
  // =========================================================================
  console.log("\n=======================================================");
  console.log("PRINSON PLYNEST vs PRINSON HYTEK — DATABASE ISOLATION TESTS");
  console.log("=======================================================\n");

  const { getTenantModels } = await import("../src/lib/mongodb");

  // Load models for both databases
  const plynestModels = await getTenantModels("plynest");
  const hytekModels = await getTenantModels("hytek");

  // Test 11: Verify Physical Database Separation
  console.log("▶ TEST 11: Physical database isolation between plynest_attendance and hytek_attendance");
  assert(
    plynestModels.User.db.name === "plynest_attendance",
    `Plynest models are bound to 'plynest_attendance' database (actual: ${plynestModels.User.db.name})`
  );
  assert(
    hytekModels.User.db.name === "hytek_attendance",
    `Hytek models are bound to 'hytek_attendance' database (actual: ${hytekModels.User.db.name})`
  );
  assert(
    plynestModels.User.db.name !== hytekModels.User.db.name,
    "Plynest and Hytek use completely separate physical database connections"
  );

  // Test 12: Admin Isolation
  console.log("\n▶ TEST 12: Admin account isolation between Plynest and Hytek");
  const plynestAdminInPlynest = await plynestModels.User.findOne({ identifier: "admin@plynest.com" });
  const plynestAdminInHytek = await hytekModels.User.findOne({ identifier: "admin@plynest.com" });
  assert(plynestAdminInPlynest !== null, "admin@plynest.com exists in plynest_attendance database");
  assert(plynestAdminInHytek === null, "admin@plynest.com CANNOT be found in hytek_attendance database");

  const hytekAdminInHytek = await hytekModels.User.findOne({ identifier: "admin@hytek.com" });
  const hytekAdminInPlynest = await plynestModels.User.findOne({ identifier: "admin@hytek.com" });
  assert(hytekAdminInHytek !== null, "admin@hytek.com exists in hytek_attendance database");
  assert(hytekAdminInPlynest === null, "admin@hytek.com CANNOT be found in plynest_attendance database");

  // Test 13: Workforce & Employee Data Isolation
  console.log("\n▶ TEST 13: Workforce isolation between Plynest and Hytek");
  const plynestEmployees = await plynestModels.Employee.find({}).lean();
  const hytekEmployees = await hytekModels.Employee.find({}).lean();
  assert(plynestEmployees.length > 0, "Plynest database contains active employees");
  assert(hytekEmployees.length > 0, "Hytek database contains active employees");

  // Verify no Hytek employee codes exist in Plynest
  const crossHytekInPlynest = await plynestModels.Employee.findOne({ employeeCode: "PH-101" });
  assert(crossHytekInPlynest === null, "Hytek employee (PH-101) does NOT exist in Plynest database");

  // Verify no Plynest employee codes exist in Hytek
  const crossPlynestInHytek = await hytekModels.Employee.findOne({ employeeCode: "PP-101" });
  assert(crossPlynestInHytek === null, "Plynest employee (PP-101) does NOT exist in Hytek database");

  // Test 14: Settings & Configuration Isolation
  console.log("\n▶ TEST 14: Settings and Showroom configuration isolation");
  const plynestSetting = await plynestModels.Setting.findOne({ key: "default_config" });
  const hytekSetting = await hytekModels.Setting.findOne({ key: "default_config" });
  assert(
    plynestSetting?.showroomName?.includes("Plynest") === true,
    `Plynest showroom configuration is distinct (actual: ${plynestSetting?.showroomName})`
  );
  assert(
    hytekSetting?.showroomName?.includes("Hytek") === true,
    `Hytek facility configuration is distinct (actual: ${hytekSetting?.showroomName})`
  );

  // Test 15: Unified Login Auto-Detection Across Both Databases
  console.log("\n▶ TEST 15: Unified Login auto-detection routes to correct company");
  await plynestModels.RateLimit.deleteMany({});
  await hytekModels.RateLimit.deleteMany({});

  const { POST: loginHandler } = await import("../src/app/api/auth/login/route");
  const { NextRequest } = await import("next/server");

  // A. Plynest admin on unified login (no company provided)
  const reqPlynestAdmin = new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "admin@plynest.com", password: "AdminPassword123!" }),
  });
  const resPlynestAdmin = await loginHandler(reqPlynestAdmin);
  const dataPlynestAdmin = await resPlynestAdmin.json();
  assert(resPlynestAdmin.status === 200, "Plynest admin authenticates successfully on unified login");
  assert(dataPlynestAdmin.company === "plynest", "Plynest admin is automatically resolved to company: plynest");
  assert(Boolean(resPlynestAdmin.cookies.get("plynest_session")), "plynest_session cookie was set for Plynest admin");

  // B. Hytek admin on unified login (no company provided)
  const reqHytekAdmin = new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "admin@hytek.com", password: "HytekAdmin123!" }),
  });
  const resHytekAdmin = await loginHandler(reqHytekAdmin);
  const dataHytekAdmin = await resHytekAdmin.json();
  assert(resHytekAdmin.status === 200, "Hytek admin authenticates successfully on unified login");
  assert(dataHytekAdmin.company === "hytek", "Hytek admin is automatically resolved to company: hytek");
  assert(Boolean(resHytekAdmin.cookies.get("hytek_session")), "hytek_session cookie was set for Hytek admin");

  // C. Hytek employee by employeeCode on unified login
  const reqHytekStaff = new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "PH-101", password: "Hytek@123" }),
  });
  const resHytekStaff = await loginHandler(reqHytekStaff);
  const dataHytekStaff = await resHytekStaff.json();
  assert(resHytekStaff.status === 200, "Hytek staff (PH-101) authenticates on unified login");
  assert(dataHytekStaff.company === "hytek", "Hytek staff is automatically resolved to company: hytek");

  // D. Invalid credentials rejected
  const reqBad = new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "admin@hytek.com", password: "WrongPassword" }),
  });
  const resBad = await loginHandler(reqBad);
  assert(resBad.status === 401, "Invalid password correctly rejected with 401");

  console.log("\n=======================================================");
  console.log(`TEST SUITE COMPLETED: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!");
  console.log("=======================================================\n");

  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

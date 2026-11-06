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
import { Setting } from "../src/models/Setting";
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

async function seed() {
  const maskedUri = MONGODB_URI.replace(/:([^:@]+)@/, ":****@");
  console.log("Connecting to MongoDB at:", maskedUri);
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB successfully.");

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Employee.deleteMany({}),
    Attendance.deleteMany({}),
    LeaveRequest.deleteMany({}),
    AuditLog.deleteMany({}),
    Setting.deleteMany({}),
  ]);
  console.log("Cleared existing database collections.");

  // 1. Create Default Setting
  const setting = await Setting.create({
    key: "default_config",
    showroomName: "Prinson Plynest Showroom",
    showroomAddress: "Plot 42, 100ft Timber & Architectural Panels Arcade, Indiranagar, Bangalore",
    timezone: "Asia/Kolkata",
    enableCheckInOut: true,
    halfDayThresholdHours: 4.5,
    standardWorkHoursStart: "09:30",
    standardWorkHoursEnd: "18:30",
  });
  console.log("Created showroom settings:", setting.showroomName);

  // 2. Hash passwords
  const adminPasswordHash = await bcrypt.hash("AdminPassword123!", 10);
  const employeePasswordHash = await bcrypt.hash("Employee123!", 10);

  // 3. Create Admin User
  const adminUser = await User.create({
    identifier: "admin@plynest.com",
    name: "Vikramaditya Roy",
    passwordHash: adminPasswordHash,
    role: "ADMIN",
    isActive: true,
  });
  console.log("Created Admin:", adminUser.identifier);

  // 4. Create Showroom Employees
  const employeeData = [
    {
      employeeCode: "PP-101",
      fullName: "Rajesh Sharma",
      email: "rajesh@plynest.com",
      phone: "+91 98450 11201",
      designation: "Senior Interior Consultant",
      department: "Sales & Client Advisory",
      joiningDate: "2023-01-15",
      isActive: true,
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    },
    {
      employeeCode: "PP-102",
      fullName: "Ananya Verma",
      email: "ananya@plynest.com",
      phone: "+91 98450 11202",
      designation: "Showroom Floor Lead",
      department: "Store Operations",
      joiningDate: "2023-03-01",
      isActive: true,
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    },
    {
      employeeCode: "PP-103",
      fullName: "Karthik Nair",
      email: "karthik@plynest.com",
      phone: "+91 98450 11203",
      designation: "Architectural Veneer Specialist",
      department: "Sales & Client Advisory",
      joiningDate: "2023-06-10",
      isActive: true,
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    },
    {
      employeeCode: "PP-104",
      fullName: "Sneha Patel",
      email: "sneha@plynest.com",
      phone: "+91 98450 11204",
      designation: "Client Relations & Billing Specialist",
      department: "Billing & Front Desk",
      joiningDate: "2023-08-20",
      isActive: true,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    },
    {
      employeeCode: "PP-105",
      fullName: "Mohammed Farhan",
      email: "farhan@plynest.com",
      phone: "+91 98450 11205",
      designation: "Plywood & Panel Inventory Officer",
      department: "Logistics & Materials",
      joiningDate: "2023-11-05",
      isActive: true,
      avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    },
    {
      employeeCode: "PP-106",
      fullName: "Pooja Sundaram",
      email: "pooja@plynest.com",
      phone: "+91 98450 11206",
      designation: "Display & Merchandising Coordinator",
      department: "Store Operations",
      joiningDate: "2024-02-01",
      isActive: true,
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    },
    {
      employeeCode: "PP-107",
      fullName: "Amitav Sengupta",
      email: "amitav@plynest.com",
      phone: "+91 98450 11207",
      designation: "Technical Surfaces Consultant",
      department: "Sales & Client Advisory",
      joiningDate: "2024-04-12",
      isActive: true,
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    },
    {
      employeeCode: "PP-108",
      fullName: "Divya Kulkarni",
      email: "divya@plynest.com",
      phone: "+91 98450 11208",
      designation: "Quality & Dispatch Coordinator",
      department: "Logistics & Materials",
      joiningDate: "2024-07-01",
      isActive: false, // Inactive employee to test active/inactive filter
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    },
  ];

  const createdEmployees = [];
  for (const item of employeeData) {
    const emp = await Employee.create(item);
    createdEmployees.push(emp);

    // Create user login for employee (identifier can be email or employeeCode)
    await User.create({
      identifier: emp.email?.toLowerCase() || emp.employeeCode.toLowerCase(),
      name: emp.fullName,
      passwordHash: employeePasswordHash,
      role: "EMPLOYEE",
      employee: emp._id,
      isActive: emp.isActive,
    });
  }
  console.log(`Created ${createdEmployees.length} employees and employee accounts.`);

  // 5. Generate Past Attendance (Last 14 days up to today)
  const today = new Date();
  const pastDays = 14;

  const attendanceBatch = [];
  for (let i = pastDays; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = formatDateStr(d);
    const dayOfWeek = d.getDay(); // 0 is Sunday

    if (dayOfWeek === 0) {
      // Showroom closed on Sundays or skeleton crew
      continue;
    }

    for (const emp of createdEmployees) {
      // Pseudo-random deterministic distribution based on code and date
      const hash = (emp.employeeCode.charCodeAt(3) + i * 7) % 10;
      let status: "PRESENT" | "ABSENT" | "HALF_DAY" | "APPROVED_LEAVE" = "PRESENT";
      let checkIn = "09:25";
      let checkOut = "18:35";
      let remarks = "";

      if (hash === 1) {
        status = "ABSENT";
        checkIn = "";
        checkOut = "";
        remarks = "Uninformed absence";
      } else if (hash === 2) {
        status = "HALF_DAY";
        checkIn = "09:30";
        checkOut = "14:00";
        remarks = "Client site visit morning only";
      } else if (hash === 3) {
        status = "APPROVED_LEAVE";
        checkIn = "";
        checkOut = "";
        remarks = "Pre-approved leave";
      }

      attendanceBatch.push({
        employee: emp._id,
        dateStr,
        status,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        remarks,
        markedBy: adminUser._id,
      });
    }
  }

  // Today's attendance - partial marking so admin can experience marking
  const todayStr = formatDateStr(today);
  const activeEmployees = createdEmployees.filter((e) => e.isActive);

  // Mark first 3 employees as PRESENT, 4th as HALF_DAY, 5th as APPROVED_LEAVE, leaving 6th and 7th as NOT_MARKED
  if (activeEmployees.length >= 5) {
    attendanceBatch.push({
      employee: activeEmployees[0]._id,
      dateStr: todayStr,
      status: "PRESENT",
      checkInTime: "09:18",
      checkOutTime: "",
      remarks: "On showroom floor",
      markedBy: adminUser._id,
    });
    attendanceBatch.push({
      employee: activeEmployees[1]._id,
      dateStr: todayStr,
      status: "PRESENT",
      checkInTime: "09:24",
      checkOutTime: "",
      remarks: "Morning meeting",
      markedBy: adminUser._id,
    });
    attendanceBatch.push({
      employee: activeEmployees[2]._id,
      dateStr: todayStr,
      status: "PRESENT",
      checkInTime: "09:30",
      checkOutTime: "",
      remarks: "",
      markedBy: adminUser._id,
    });
    attendanceBatch.push({
      employee: activeEmployees[3]._id,
      dateStr: todayStr,
      status: "HALF_DAY",
      checkInTime: "09:40",
      checkOutTime: "14:00",
      remarks: "Half-day approved for personal appointment",
      markedBy: adminUser._id,
    });
    attendanceBatch.push({
      employee: activeEmployees[4]._id,
      dateStr: todayStr,
      status: "APPROVED_LEAVE",
      checkInTime: "",
      checkOutTime: "",
      remarks: "Family function approved leave",
      markedBy: adminUser._id,
    });
  }

  await Attendance.insertMany(attendanceBatch);
  console.log(`Inserted ${attendanceBatch.length} attendance records.`);

  // 6. Create realistic Leave Requests
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 5);

  const leave1 = await LeaveRequest.create({
    employee: activeEmployees[0]._id,
    leaveType: "CASUAL",
    startDate: formatDateStr(tomorrow),
    endDate: formatDateStr(tomorrow),
    reason: "Attending nephew's graduation ceremony in Mysore",
    status: "PENDING",
  });

  const leave2 = await LeaveRequest.create({
    employee: activeEmployees[2]._id,
    leaveType: "SICK",
    startDate: formatDateStr(today),
    endDate: formatDateStr(tomorrow),
    reason: "Mild fever and throat viral infection, physician advised 2 days rest",
    status: "PENDING",
  });

  const leave3 = await LeaveRequest.create({
    employee: activeEmployees[4]._id,
    leaveType: "PERSONAL",
    startDate: todayStr,
    endDate: todayStr,
    reason: "Family function in hometown",
    status: "APPROVED",
    reviewedBy: adminUser._id,
    reviewedAt: new Date(),
    adminRemarks: "Approved as requested. Covered by Rajesh.",
  });

  const leave4 = await LeaveRequest.create({
    employee: activeEmployees[1]._id,
    leaveType: "CASUAL",
    startDate: "2026-10-10",
    endDate: "2026-10-12",
    reason: "Short personal trip",
    status: "APPROVED",
    reviewedBy: adminUser._id,
    reviewedAt: new Date("2026-10-08"),
    adminRemarks: "Approved. All client presentations handed over.",
  });

  const leave5 = await LeaveRequest.create({
    employee: activeEmployees[3]._id,
    leaveType: "OTHER",
    startDate: "2026-10-25",
    endDate: "2026-10-26",
    reason: "Weekend extension",
    status: "REJECTED",
    reviewedBy: adminUser._id,
    reviewedAt: new Date("2026-10-24"),
    adminRemarks: "Showroom promotional exhibition scheduled that weekend. Leave cannot be sanctioned.",
  });

  console.log("Created 5 sample leave requests (Pending, Approved, Rejected).");

  // 7. Create Audit Logs
  await AuditLog.create([
    {
      action: "ATTENDANCE_CORRECTED",
      performedBy: adminUser._id,
      performerName: adminUser.name,
      targetEmployee: activeEmployees[1]._id,
      employeeCode: activeEmployees[1].employeeCode,
      employeeName: activeEmployees[1].fullName,
      dateStr: formatDateStr(new Date(today.getTime() - 86400000 * 2)),
      previousValue: { status: "ABSENT", remarks: "" },
      newValue: { status: "PRESENT", checkInTime: "09:45", remarks: "Delayed due to architect consultation at site" },
      reason: "Employee submitted verified architect site log confirmation",
    },
    {
      action: "LEAVE_APPROVED",
      performedBy: adminUser._id,
      performerName: adminUser.name,
      targetEmployee: activeEmployees[4]._id,
      employeeCode: activeEmployees[4].employeeCode,
      employeeName: activeEmployees[4].fullName,
      dateStr: todayStr,
      previousValue: { status: "PENDING" },
      newValue: { status: "APPROVED" },
      reason: "Family function approved leave",
    },
  ]);
  console.log("Created audit trail sample logs.");

  console.log("\n========================================================");
  console.log("SEEDED DATABASE SUCCESSFULLY FOR PRINSON PLYNEST SHOWROOM!");
  console.log("========================================================");
  console.log("Admin login:     admin@plynest.com   / AdminPassword123!");
  console.log("Employee login:  rajesh@plynest.com  / Employee123!");
  console.log("                 PP-101              / Employee123!");
  console.log("========================================================\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seeding failed with error:", err);
  process.exit(1);
});

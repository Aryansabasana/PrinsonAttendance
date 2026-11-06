import fs from "fs";
import path from "path";
import dns from "dns";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { UserSchema } from "../src/models/User";
import { EmployeeSchema } from "../src/models/Employee";
import { AttendanceSchema } from "../src/models/Attendance";
import { LeaveRequestSchema } from "../src/models/LeaveRequest";
import { AuditLogSchema } from "../src/models/AuditLog";
import { SettingSchema } from "../src/models/Setting";
import { formatDateStr } from "../src/lib/utils";

// Fix querySrv ECONNREFUSED on Windows for MongoDB Atlas SRV records
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore in environments where setting DNS servers is not supported
}

// Load .env file
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

const BASE_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/plynest_attendance";
const HYTEK_URI = BASE_URI.includes("plynest_attendance")
  ? BASE_URI.replace("plynest_attendance", "hytek_attendance")
  : BASE_URI.replace(/\/[^/?]+(\?|$)/, "/hytek_attendance$1");

async function seedHytek() {
  const maskedUri = HYTEK_URI.replace(/:([^:@]+)@/, ":****@");
  console.log("Connecting to Prinson Hytek database at:", maskedUri);

  const conn = await mongoose.createConnection(HYTEK_URI).asPromise();
  console.log("Connected to Prinson Hytek MongoDB successfully. DB Name:", conn.name);

  // Bind schemas to hytek connection
  const User = conn.model("User", UserSchema);
  const Employee = conn.model("Employee", EmployeeSchema);
  const Attendance = conn.model("Attendance", AttendanceSchema);
  const LeaveRequest = conn.model("LeaveRequest", LeaveRequestSchema);
  const AuditLog = conn.model("AuditLog", AuditLogSchema);
  const Setting = conn.model("Setting", SettingSchema);

  // Clear existing collections in hytek_attendance
  await Promise.all([
    User.deleteMany({}),
    Employee.deleteMany({}),
    Attendance.deleteMany({}),
    LeaveRequest.deleteMany({}),
    AuditLog.deleteMany({}),
    Setting.deleteMany({}),
  ]);
  console.log("Cleared existing hytek_attendance collections.");

  // 1. Create Default Setting for Hytek
  const setting = await Setting.create({
    key: "default_config",
    showroomName: "Prinson Hytek Industrial Facility",
    showroomAddress: "Plot 18, Phase 2, Peenya Industrial Complex, Bangalore",
    timezone: "Asia/Kolkata",
    enableCheckInOut: true,
    halfDayThresholdHours: 4.5,
    standardWorkHoursStart: "09:30",
    standardWorkHoursEnd: "18:30",
  });
  console.log("Created Hytek settings:", setting.showroomName);

  // 2. Hash passwords
  const adminPasswordHash = await bcrypt.hash("HytekAdmin123!", 10);
  const employeePasswordHash = await bcrypt.hash("Hytek@123", 10);

  // 3. Create Hytek Admin User
  const adminUser = await User.create({
    identifier: "admin@hytek.com",
    name: "Harish Patel",
    passwordHash: adminPasswordHash,
    role: "ADMIN",
    isActive: true,
  });
  console.log("Created Hytek Admin:", adminUser.identifier);

  // 4. Create Hytek Employees
  const employeeData = [
    {
      employeeCode: "PH-101",
      fullName: "Arun Kumar",
      email: "arun@hytek.com",
      phone: "+91 98450 22101",
      designation: "CNC Operations Specialist",
      department: "Precision Machining",
      joiningDate: "2023-03-01",
      isActive: true,
    },
    {
      employeeCode: "PH-102",
      fullName: "Priya Nair",
      email: "priya@hytek.com",
      phone: "+91 98450 22102",
      designation: "Quality Assurance Lead",
      department: "Inspection & Metrology",
      joiningDate: "2023-04-15",
      isActive: true,
    },
    {
      employeeCode: "PH-103",
      fullName: "Karthik Reddy",
      email: "karthik@hytek.com",
      phone: "+91 98450 22103",
      designation: "Assembly Technician",
      department: "Modular Systems",
      joiningDate: "2023-06-10",
      isActive: true,
    },
    {
      employeeCode: "PH-104",
      fullName: "Deepa Rao",
      email: "deepa@hytek.com",
      phone: "+91 98450 22104",
      designation: "Procurement & Supply Officer",
      department: "Supply Chain",
      joiningDate: "2023-08-01",
      isActive: true,
    },
    {
      employeeCode: "PH-105",
      fullName: "Siddharth Joshi",
      email: "siddharth@hytek.com",
      phone: "+91 98450 22105",
      designation: "Automation Engineer",
      department: "Robotics & Testing",
      joiningDate: "2023-09-20",
      isActive: true,
    },
  ];

  const createdEmployees: any[] = [];
  for (const emp of employeeData) {
    const employee = await Employee.create(emp);
    createdEmployees.push(employee);

    // Also create matching user account
    await User.create({
      identifier: emp.email,
      name: emp.fullName,
      passwordHash: employeePasswordHash,
      role: "EMPLOYEE",
      employee: employee._id,
      isActive: true,
    });
  }
  console.log(`Created ${createdEmployees.length} Hytek employees & user accounts.`);

  // 5. Seed Attendance for the past 7 days and today
  const today = new Date();
  const dateList: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dateList.push(formatDateStr(d));
  }

  let totalAtt = 0;
  for (const dateStr of dateList) {
    for (let idx = 0; idx < createdEmployees.length; idx++) {
      const emp = createdEmployees[idx];
      // Skip Sundays (day 0)
      const dayOfWeek = new Date(dateStr).getDay();
      if (dayOfWeek === 0) continue;

      let status = "PRESENT";
      let checkIn = "09:30";
      let checkOut = "18:30";

      // Vary status for realistic charts
      if (idx === 2 && dateStr === dateList[dateList.length - 2]) {
        status = "HALF_DAY";
        checkOut = "14:00";
      } else if (idx === 3 && dateStr === dateList[dateList.length - 3]) {
        status = "ABSENT";
        checkIn = "";
        checkOut = "";
      }

      await Attendance.create({
        employee: emp._id,
        dateStr,
        status,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        markedBy: adminUser._id,
        remarks: status === "PRESENT" ? "On time" : status === "HALF_DAY" ? "Half day approved" : "Uninformed",
      });
      totalAtt++;
    }
  }
  console.log(`Created ${totalAtt} attendance records across past week.`);

  // 6. Create sample leave request
  const pendingLeave = await LeaveRequest.create({
    employee: createdEmployees[0]._id,
    startDate: dateList[dateList.length - 1],
    endDate: dateList[dateList.length - 1],
    daysCount: 1,
    leaveType: "CASUAL",
    reason: "Personal family commitment",
    status: "PENDING",
  });
  console.log("Created sample pending leave request:", pendingLeave._id);

  // 7. Create Audit Log
  await AuditLog.create({
    action: "SYSTEM_SEEDED",
    performedBy: adminUser._id,
    performerName: "Harish Patel (Hytek Admin)",
    reason: "Initial seeding of Prinson Hytek database",
    newValue: { database: "hytek_attendance", employeesCount: createdEmployees.length },
  });
  console.log("Created Hytek Audit Log.");

  await conn.close();
  console.log("Seeding of Prinson Hytek database completed successfully!");
}

seedHytek().catch((err) => {
  console.error("Hytek seed failed:", err);
  process.exit(1);
});

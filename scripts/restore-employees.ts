import dns from "dns";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { EmployeeSchema } from "../src/models/Employee";
import { UserSchema } from "../src/models/User";
import { SettingSchema } from "../src/models/Setting";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eq = trimmed.indexOf("=");
      if (eq !== -1) {
        process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}

const URI = process.env.MONGODB_URI || "";

export interface EmployeeInput {
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string;
  designation: string;
  department?: string;
  joiningDate?: string;
  password?: string;
  role?: "ADMIN" | "EMPLOYEE";
  isActive?: boolean;
}

export async function restoreEmployees(
  company: "plynest" | "hytek" = "plynest",
  employees: EmployeeInput[],
  clearDemo: boolean = false
) {
  const targetDb = company === "hytek" ? "hytek_attendance" : "plynest_attendance";
  const targetUri = URI.includes(".mongodb.net/")
    ? URI.replace(/\.mongodb\.net\/([^?]+)/, `.mongodb.net/${targetDb}`)
    : URI.replace(/\/[^/?]+(\?|$)/, `/${targetDb}$1`);

  console.log(`Connecting to ${targetDb}...`);
  const conn = await mongoose.createConnection(targetUri).asPromise();
  const Employee = conn.model("Employee", EmployeeSchema);
  const User = conn.model("User", UserSchema);

  if (clearDemo) {
    console.log("Removing demo PP- / PH- placeholder accounts...");
    const demoCodes = company === "hytek" ? [/^PH-10/i] : [/^PP-10/i, "TEST-999"];
    for (const code of demoCodes) {
      const demoEmps = await Employee.find({ employeeCode: code });
      for (const emp of demoEmps) {
        await User.deleteMany({ employee: emp._id });
        await Employee.findByIdAndDelete(emp._id);
      }
    }
    console.log("Cleared demo placeholder accounts.");
  }

  for (const item of employees) {
    const existingEmp = await Employee.findOne({ employeeCode: item.employeeCode });
    let empId = existingEmp?._id;

    if (existingEmp) {
      existingEmp.fullName = item.fullName;
      existingEmp.email = item.email;
      existingEmp.phone = item.phone || existingEmp.phone;
      existingEmp.designation = item.designation;
      existingEmp.department = item.department || existingEmp.department;
      existingEmp.joiningDate = item.joiningDate || existingEmp.joiningDate;
      existingEmp.isActive = item.isActive !== undefined ? item.isActive : true;
      await existingEmp.save();
      console.log(`✓ Updated Employee: [${item.employeeCode}] ${item.fullName}`);
    } else {
      const newEmp = await Employee.create({
        employeeCode: item.employeeCode,
        fullName: item.fullName,
        email: item.email,
        phone: item.phone || "",
        designation: item.designation,
        department: item.department || "General",
        joiningDate: item.joiningDate || new Date().toISOString().split("T")[0],
        isActive: item.isActive !== undefined ? item.isActive : true,
      });
      empId = newEmp._id;
      console.log(`✓ Created Employee: [${item.employeeCode}] ${item.fullName}`);
    }

    // Upsert User login account
    const identifier = item.email.toLowerCase().trim();
    const existingUser = await User.findOne({
      $or: [{ identifier }, { employee: empId }],
    });

    const defaultPassword = item.password || "Password123!";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    if (existingUser) {
      existingUser.identifier = identifier;
      existingUser.name = item.fullName;
      existingUser.role = item.role || existingUser.role || "EMPLOYEE";
      existingUser.employee = empId as any;
      if (item.password) {
        existingUser.passwordHash = passwordHash;
      }
      await existingUser.save();
      console.log(`  ✓ Updated User account: ${identifier}`);
    } else {
      await User.create({
        identifier,
        name: item.fullName,
        passwordHash,
        role: item.role || "EMPLOYEE",
        employee: empId,
        isActive: true,
      });
      console.log(`  ✓ Created User account: ${identifier} (default password: ${defaultPassword})`);
    }
  }

  await conn.close();
  console.log(`\nRestore completed successfully for ${company}!`);
}

async function main() {
  const filePath = process.argv[2] || path.resolve(__dirname, "../backups/my-employees.json");
  if (!fs.existsSync(filePath)) {
    console.log(`Usage: npx tsx scripts/restore-employees.ts <path-to-json> [--hytek] [--clear-demo]`);
    console.log(`File not found: ${filePath}`);
    return;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);
  const company = process.argv.includes("--hytek") ? "hytek" : "plynest";
  const clearDemo = process.argv.includes("--clear-demo");

  const list = Array.isArray(data) ? data : data.employees || [];
  await restoreEmployees(company, list, clearDemo);
}

if (require.main === module) {
  main().catch(console.error);
}

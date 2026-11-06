import { NextRequest, NextResponse } from "next/server";
import { requireTenantUser, requireTenantAdmin } from "@/lib/tenant";
import { handleAuthError } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

const createEmployeeSchema = z.object({
  employeeCode: z.string().min(2, "Employee code is required").toUpperCase().trim(),
  fullName: z.string().min(2, "Full name is required").trim(),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  phone: z.string().min(5, "Phone number is required").trim(),
  designation: z.string().min(2, "Designation is required").trim(),
  department: z.string().min(2, "Department is required").trim(),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid joining date (YYYY-MM-DD) is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  avatarUrl: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { models } = await requireTenantUser(request);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "all";
    const designation = searchParams.get("designation") || "";
    const department = searchParams.get("department") || "";
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") === "desc" ? -1 : 1;

    const query: any = {};

    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    if (designation) {
      query.designation = designation;
    }

    if (department) {
      query.department = department;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { employeeCode: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    let sortOptions: any = { fullName: sortOrder };
    if (sortBy === "joiningDate") {
      sortOptions = { joiningDate: sortOrder };
    } else if (sortBy === "employeeCode") {
      sortOptions = { employeeCode: sortOrder };
    }

    const employees = await models.Employee.find(query).sort(sortOptions).lean();

    return NextResponse.json({
      success: true,
      employees,
      total: employees.length,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenant, user: admin, models } = await requireTenantAdmin(request);

    const body = await request.json();
    const parsed = createEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const data = parsed.data;

    // Check if employeeCode already exists in this tenant database
    const existing = await models.Employee.findOne({ employeeCode: data.employeeCode });
    if (existing) {
      return NextResponse.json(
        { error: `Employee code ${data.employeeCode} already exists.` },
        { status: 400 }
      );
    }

    // Create Employee record
    const employee = await models.Employee.create({
      employeeCode: data.employeeCode,
      fullName: data.fullName,
      email: data.email || undefined,
      phone: data.phone,
      designation: data.designation,
      department: data.department,
      joiningDate: data.joiningDate,
      avatarUrl: data.avatarUrl || "",
      isActive: true,
    });

    // Create User login account for this employee
    const initialPassword = data.password || (tenant === "hytek" ? "Hytek@123" : "Plynest@123");
    const passwordHash = await hashPassword(initialPassword);
    const loginIdentifier = data.email?.toLowerCase() || data.employeeCode.toLowerCase();

    await models.User.create({
      identifier: loginIdentifier,
      passwordHash,
      role: "EMPLOYEE",
      employee: employee._id,
      name: employee.fullName,
      isActive: true,
    });

    // Log in audit trail
    await models.AuditLog.create({
      action: "EMPLOYEE_STATUS_CHANGED",
      performedBy: admin.userId,
      performerName: admin.name,
      targetEmployee: employee._id,
      employeeCode: employee.employeeCode,
      employeeName: employee.fullName,
      newValue: { action: "CREATED", employeeCode: employee.employeeCode, designation: employee.designation },
      reason: "New employee profile registered into showroom workforce register",
    });

    return NextResponse.json(
      {
        success: true,
        employee,
        initialPassword,
        message: "Employee created successfully with portal credentials.",
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}

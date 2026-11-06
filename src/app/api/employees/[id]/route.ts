import { NextRequest, NextResponse } from "next/server";
import { requireTenantUser, requireTenantAdmin } from "@/lib/tenant";
import { assertEmployeeAccess, handleAuthError } from "@/lib/permissions";
import { z } from "zod";

const updateEmployeeSchema = z.object({
  fullName: z.string().min(2, "Full name is required").optional(),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  phone: z.string().min(5, "Phone is required").optional(),
  designation: z.string().min(2, "Designation is required").optional(),
  department: z.string().min(2, "Department is required").optional(),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isActive: z.boolean().optional(),
  avatarUrl: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, models } = await requireTenantUser(request);
    const employeeId = params.id;
    assertEmployeeAccess(user, employeeId);

    const employee = await models.Employee.findById(employeeId).lean();
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Compute attendance statistics
    const [attendances, leaveRequests] = await Promise.all([
      models.Attendance.find({ employee: employeeId }).sort({ dateStr: -1 }).lean(),
      models.LeaveRequest.find({ employee: employeeId }).sort({ createdAt: -1 }).lean(),
    ]);

    let presentCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let approvedLeaveCount = 0;

    attendances.forEach((att) => {
      if (att.status === "PRESENT") presentCount++;
      else if (att.status === "ABSENT") absentCount++;
      else if (att.status === "HALF_DAY") halfDayCount++;
      else if (att.status === "APPROVED_LEAVE") approvedLeaveCount++;
    });

    const totalMarkedDays = presentCount + absentCount + halfDayCount + approvedLeaveCount;
    const hasStarted = totalMarkedDays > 0;
    // Effective attendance: Present (1) + Half day (0.5) divided by total marked days
    const attendancePercentage =
      hasStarted
        ? Math.round(((presentCount + halfDayCount * 0.5) / totalMarkedDays) * 100)
        : null;

    return NextResponse.json({
      success: true,
      employee,
      stats: {
        totalRecords: attendances.length,
        totalMarkedDays,
        hasStarted,
        presentCount,
        absentCount,
        halfDayCount,
        approvedLeaveCount,
        attendancePercentage,
      },
      recentAttendance: attendances.slice(0, 30),
      leaveRequests,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user: admin, models } = await requireTenantAdmin(request);
    const employeeId = params.id;

    const employee = await models.Employee.findById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const prevValues = {
      fullName: employee.fullName,
      email: employee.email,
      phone: employee.phone,
      designation: employee.designation,
      department: employee.department,
      isActive: employee.isActive,
    };

    const data = parsed.data;
    if (data.fullName !== undefined) employee.fullName = data.fullName;
    if (data.email !== undefined) employee.email = data.email || undefined;
    if (data.phone !== undefined) employee.phone = data.phone;
    if (data.designation !== undefined) employee.designation = data.designation;
    if (data.department !== undefined) employee.department = data.department;
    if (data.joiningDate !== undefined) employee.joiningDate = data.joiningDate;
    if (data.avatarUrl !== undefined) employee.avatarUrl = data.avatarUrl;

    if (data.isActive !== undefined && data.isActive !== employee.isActive) {
      employee.isActive = data.isActive;
      // Also update linked user account status
      await models.User.updateMany({ employee: employee._id }, { isActive: data.isActive });

      await models.AuditLog.create({
        action: "EMPLOYEE_STATUS_CHANGED",
        performedBy: admin.userId,
        performerName: admin.name,
        targetEmployee: employee._id,
        employeeCode: employee.employeeCode,
        employeeName: employee.fullName,
        previousValue: { isActive: prevValues.isActive },
        newValue: { isActive: data.isActive },
        reason: data.isActive
          ? "Employee re-activated by showroom administrator"
          : "Employee deactivated (historical attendance preserved)",
      });
    }

    await employee.save();

    // Update User's display name if name changed
    if (data.fullName) {
      await models.User.updateMany({ employee: employee._id }, { name: data.fullName });
    }

    return NextResponse.json({
      success: true,
      employee,
      message: "Employee updated successfully.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

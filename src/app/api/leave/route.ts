import { NextRequest, NextResponse } from "next/server";
import { requireTenantUser } from "@/lib/tenant";
import { handleAuthError } from "@/lib/permissions";
import { z } from "zod";

const createLeaveSchema = z.object({
  leaveType: z.enum(["CASUAL", "SICK", "PERSONAL", "OTHER"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date format"),
  reason: z.string().min(5, "Please provide a valid reason (minimum 5 characters)"),
  employeeId: z.string().optional(), // Admin can apply on behalf of an employee if needed
});

export async function GET(request: NextRequest) {
  try {
    const { tenant, user, models } = await requireTenantUser(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";
    const leaveType = searchParams.get("leaveType") || "ALL";
    let targetEmployeeId = searchParams.get("employeeId") || "";

    // If employee role, restrict to self
    if (user.role === "EMPLOYEE") {
      if (!user.employeeId) {
        return NextResponse.json({ error: "No employee profile found" }, { status: 403 });
      }
      targetEmployeeId = user.employeeId.toString();
    }

    const query: any = {};
    if (targetEmployeeId) {
      query.employee = targetEmployeeId;
    }
    if (status && status !== "ALL") {
      query.status = status;
    }
    if (leaveType && leaveType !== "ALL") {
      query.leaveType = leaveType;
    }

    const leaveRequests = await models.LeaveRequest.find(query)
      .populate("employee", "employeeCode fullName designation department avatarUrl")
      .populate("reviewedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      company: tenant,
      leaveRequests,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenant, user, models } = await requireTenantUser(request);

    const body = await request.json();
    const parsed = createLeaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const { leaveType, startDate, endDate, reason } = parsed.data;

    // Validate date sequence: startDate <= endDate
    if (startDate > endDate) {
      return NextResponse.json({ error: "End date cannot be earlier than start date" }, { status: 400 });
    }

    let employeeId = user.employeeId;
    if (user.role === "ADMIN" && parsed.data.employeeId) {
      employeeId = parsed.data.employeeId;
    }

    if (!employeeId) {
      return NextResponse.json({ error: "Employee identification required" }, { status: 400 });
    }

    const employee = await models.Employee.findById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
    }

    // Check for existing overlapping pending or approved leave request
    const overlapping = await models.LeaveRequest.findOne({
      employee: employeeId,
      status: { $in: ["PENDING", "APPROVED"] },
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
      ],
    });

    if (overlapping) {
      return NextResponse.json(
        {
          error: `An existing ${overlapping.status.toLowerCase()} leave request already overlaps with this date range (${overlapping.startDate} to ${overlapping.endDate}).`,
        },
        { status: 400 }
      );
    }

    // Check if attendance is already marked as PRESENT on any of these days
    const existingAttendance = await models.Attendance.find({
      employee: employeeId,
      dateStr: { $gte: startDate, $lte: endDate },
    }).lean();

    const presentDays = existingAttendance
      .filter((a) => a.status === "PRESENT" || a.status === "HALF_DAY")
      .map((a) => a.dateStr);

    const leaveRequest = await models.LeaveRequest.create({
      employee: employeeId,
      leaveType,
      startDate,
      endDate,
      reason,
      status: "PENDING",
    });

    return NextResponse.json(
      {
        success: true,
        company: tenant,
        leaveRequest,
        warnings: presentDays.length > 0 ? `Attendance is already recorded for: ${presentDays.join(", ")}` : null,
        message: "Leave application submitted successfully. Pending admin review.",
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}

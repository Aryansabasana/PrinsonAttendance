import { NextRequest, NextResponse } from "next/server";
import { requireTenantUser, requireTenantAdmin } from "@/lib/tenant";
import { handleAuthError } from "@/lib/permissions";
import { z } from "zod";

const decisionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  adminRemarks: z.string().optional(),
  overrideAttendanceConflicts: z.boolean().optional(),
});

function getDatesInRange(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const [sy, sm, sd] = startDateStr.split("-").map(Number);
  const [ey, em, ed] = endDateStr.split("-").map(Number);

  const current = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { models } = await requireTenantUser(request);

    const leave = await models.LeaveRequest.findById(params.id)
      .populate("employee", "employeeCode fullName designation department avatarUrl")
      .populate("reviewedBy", "name")
      .lean();

    if (!leave) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    // Check attendance records for the dates in this leave request
    const dates = getDatesInRange(leave.startDate, leave.endDate);
    const existingAttendance = await models.Attendance.find({
      employee: (leave.employee as any)._id,
      dateStr: { $in: dates },
    }).lean();

    const conflicts = existingAttendance.filter(
      (a) => a.status === "PRESENT" || a.status === "HALF_DAY" || a.status === "ABSENT"
    );

    return NextResponse.json({
      success: true,
      leave,
      dates,
      conflicts,
      hasConflicts: conflicts.length > 0,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user: admin, models } = await requireTenantAdmin(request);

    const body = await request.json();
    const parsed = decisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const { action, adminRemarks = "", overrideAttendanceConflicts = false } = parsed.data;

    const leave = await models.LeaveRequest.findById(params.id).populate("employee");
    if (!leave) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    if (leave.status !== "PENDING") {
      return NextResponse.json(
        { error: `This leave request has already been ${leave.status.toLowerCase()}.` },
        { status: 400 }
      );
    }

    const employee = leave.employee as any;
    const dates = getDatesInRange(leave.startDate, leave.endDate);

    if (action === "APPROVE") {
      // Check for attendance conflicts in this tenant DB
      const existingAttendance = await models.Attendance.find({
        employee: employee._id,
        dateStr: { $in: dates },
      });

      const conflictingDates = existingAttendance.filter(
        (a) => a.status === "PRESENT" || a.status === "HALF_DAY"
      );

      if (conflictingDates.length > 0 && !overrideAttendanceConflicts) {
        return NextResponse.json(
          {
            error: `Attendance conflict detected: Employee is already marked as present/half-day on ${conflictingDates.map((c) => c.dateStr).join(", ")}. Please resolve the conflict by enabling override.`,
            requiresResolution: true,
            conflictingDates: conflictingDates.map((c) => ({
              dateStr: c.dateStr,
              status: c.status,
            })),
          },
          { status: 409 }
        );
      }

      // Update leave request
      leave.status = "APPROVED";
      leave.reviewedBy = admin.userId as any;
      leave.reviewedAt = new Date();
      leave.adminRemarks = adminRemarks;
      await leave.save();

      // Consistently update Attendance records to APPROVED_LEAVE
      for (const dStr of dates) {
        await models.Attendance.findOneAndUpdate(
          { employee: employee._id, dateStr: dStr },
          {
            $set: {
              status: "APPROVED_LEAVE",
              checkInTime: "",
              checkOutTime: "",
              remarks: `Approved leave (${leave.leaveType}): ${adminRemarks || leave.reason}`,
              leaveRequest: leave._id,
              markedBy: admin.userId,
            },
          },
          { upsert: true, new: true }
        );
      }

      // Audit log
      await models.AuditLog.create({
        action: "LEAVE_APPROVED",
        performedBy: admin.userId,
        performerName: admin.name,
        targetEmployee: employee._id,
        employeeCode: employee.employeeCode,
        employeeName: employee.fullName,
        dateStr: `${leave.startDate} to ${leave.endDate}`,
        previousValue: { status: "PENDING" },
        newValue: { status: "APPROVED", datesUpdated: dates.length },
        reason: adminRemarks || "Leave application approved",
      });

      return NextResponse.json({
        success: true,
        message: `Leave approved. ${dates.length} attendance day(s) updated to Approved Leave.`,
        leave,
      });
    } else {
      // REJECT
      leave.status = "REJECTED";
      leave.reviewedBy = admin.userId as any;
      leave.reviewedAt = new Date();
      leave.adminRemarks = adminRemarks;
      await leave.save();

      await models.AuditLog.create({
        action: "LEAVE_REJECTED",
        performedBy: admin.userId,
        performerName: admin.name,
        targetEmployee: employee._id,
        employeeCode: employee.employeeCode,
        employeeName: employee.fullName,
        dateStr: `${leave.startDate} to ${leave.endDate}`,
        previousValue: { status: "PENDING" },
        newValue: { status: "REJECTED" },
        reason: adminRemarks || "Leave application rejected",
      });

      return NextResponse.json({
        success: true,
        message: "Leave application rejected.",
        leave,
      });
    }
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, models } = await requireTenantUser(request);

    const leave = await models.LeaveRequest.findById(params.id);
    if (!leave) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    // Only creator or admin can cancel
    if (user.role === "EMPLOYEE" && leave.employee.toString() !== user.employeeId?.toString()) {
      return NextResponse.json({ error: "Forbidden: You cannot cancel another employee's leave" }, { status: 403 });
    }

    if (leave.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending leave requests can be cancelled." },
        { status: 400 }
      );
    }

    leave.status = "CANCELLED";
    await leave.save();

    return NextResponse.json({
      success: true,
      message: "Leave request cancelled successfully.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

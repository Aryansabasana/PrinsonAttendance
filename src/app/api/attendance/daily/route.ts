import { NextRequest, NextResponse } from "next/server";
import { requireTenantUser, requireTenantAdmin } from "@/lib/tenant";
import { handleAuthError } from "@/lib/permissions";
import { formatDateStr } from "@/lib/utils";
import { z } from "zod";

const markAttendanceSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "APPROVED_LEAVE", "NOT_MARKED"]),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  remarks: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { tenant, models } = await requireTenantUser(request);

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("dateStr") || formatDateStr(new Date());

    // 1. Get all active employees in this tenant DB
    const [allActiveEmployees, existingAttendances, leaveRequestsOnDate] = await Promise.all([
      models.Employee.find({ isActive: true }).sort({ employeeCode: 1 }).lean(),
      models.Attendance.find({ dateStr }).populate("markedBy", "name").lean(),
      models.LeaveRequest.find({
        startDate: { $lte: dateStr },
        endDate: { $gte: dateStr },
        status: { $in: ["PENDING", "APPROVED"] },
      }).lean(),
    ]);

    // Map existing attendance by employeeId string
    const attendanceMap = new Map<string, any>();
    existingAttendances.forEach((att) => {
      attendanceMap.set(att.employee.toString(), att);
    });

    // Map leaves by employeeId
    const leaveMap = new Map<string, any>();
    leaveRequestsOnDate.forEach((leave) => {
      leaveMap.set(leave.employee.toString(), leave);
    });

    // Combine employees with their attendance status
    const register = allActiveEmployees.map((emp) => {
      const empId = emp._id.toString();
      const existing = attendanceMap.get(empId);
      const leave = leaveMap.get(empId);

      return {
        employee: emp,
        attendanceId: existing?._id || null,
        status: existing?.status || "NOT_MARKED",
        checkInTime: existing?.checkInTime || "",
        checkOutTime: existing?.checkOutTime || "",
        remarks: existing?.remarks || "",
        markedBy: existing?.markedBy ? (existing.markedBy as any).name : null,
        updatedAt: existing?.updatedAt || null,
        leaveInfo: leave
          ? {
              leaveType: leave.leaveType,
              status: leave.status,
              reason: leave.reason,
            }
          : null,
      };
    });

    // Compute metrics for the date
    let presentCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let approvedLeaveCount = 0;
    let notMarkedCount = 0;

    register.forEach((r) => {
      if (r.status === "PRESENT") presentCount++;
      else if (r.status === "ABSENT") absentCount++;
      else if (r.status === "HALF_DAY") halfDayCount++;
      else if (r.status === "APPROVED_LEAVE") approvedLeaveCount++;
      else notMarkedCount++;
    });

    return NextResponse.json({
      success: true,
      company: tenant,
      dateStr,
      summary: {
        totalEmployees: allActiveEmployees.length,
        presentCount,
        absentCount,
        halfDayCount,
        approvedLeaveCount,
        notMarkedCount,
      },
      register,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user: admin, models } = await requireTenantAdmin(request);

    const body = await request.json();
    const parsed = markAttendanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const { employeeId, dateStr, status, checkInTime = "", checkOutTime = "", remarks = "" } = parsed.data;

    const employee = await models.Employee.findById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Check existing record
    const existing = await models.Attendance.findOne({ employee: employeeId, dateStr });

    let isCorrection = false;
    let previousStatus = "NOT_MARKED";

    if (existing) {
      previousStatus = existing.status;
      if (existing.status !== status || existing.remarks !== remarks) {
        isCorrection = true;
      }

      existing.status = status;
      existing.checkInTime = checkInTime;
      existing.checkOutTime = checkOutTime;
      existing.remarks = remarks;
      existing.markedBy = admin.userId as any;
      await existing.save();

      if (isCorrection) {
        await models.AuditLog.create({
          action: "ATTENDANCE_CORRECTED",
          performedBy: admin.userId,
          performerName: admin.name,
          targetEmployee: employee._id,
          employeeCode: employee.employeeCode,
          employeeName: employee.fullName,
          dateStr,
          previousValue: { status: previousStatus },
          newValue: { status, checkInTime, checkOutTime, remarks },
          reason: remarks || "Attendance record updated by showroom admin",
        });
      }

      return NextResponse.json({
        success: true,
        attendance: existing,
        message: "Attendance updated successfully.",
      });
    } else {
      // Create new attendance record
      const newAttendance = await models.Attendance.create({
        employee: employeeId,
        dateStr,
        status,
        checkInTime,
        checkOutTime,
        remarks,
        markedBy: admin.userId,
      });

      await models.AuditLog.create({
        action: "ATTENDANCE_CREATED",
        performedBy: admin.userId,
        performerName: admin.name,
        targetEmployee: employee._id,
        employeeCode: employee.employeeCode,
        employeeName: employee.fullName,
        dateStr,
        newValue: { status, checkInTime, checkOutTime, remarks },
        reason: remarks || "Daily attendance marked",
      });

      return NextResponse.json({
        success: true,
        attendance: newAttendance,
        message: "Attendance recorded successfully.",
      });
    }
  } catch (error) {
    return handleAuthError(error);
  }
}

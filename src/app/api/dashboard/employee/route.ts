import { NextRequest, NextResponse } from "next/server";
import { requireTenantUser } from "@/lib/tenant";
import { handleAuthError } from "@/lib/permissions";
import { formatDateStr } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { tenant, user, models } = await requireTenantUser(request);
    if (!user.employeeId) {
      return NextResponse.json({ error: "No employee profile linked to user" }, { status: 403 });
    }

    const today = new Date();
    const todayStr = formatDateStr(today);
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const monthStr = String(month).padStart(2, "0");
    const monthStart = `${year}-${monthStr}-01`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${monthStr}-${String(lastDayOfMonth).padStart(2, "0")}`;

    const [employee, monthlyAttendance, todayAttendance, leaveRequests] = await Promise.all([
      models.Employee.findById(user.employeeId).lean(),
      models.Attendance.find({
        employee: user.employeeId,
        dateStr: { $gte: monthStart, $lte: monthEnd },
      }).sort({ dateStr: 1 }).lean(),
      models.Attendance.findOne({
        employee: user.employeeId,
        dateStr: todayStr,
      }).lean(),
      models.LeaveRequest.find({ employee: user.employeeId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    if (!employee) {
      return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
    }

    let presentThisMonth = 0;
    let absentThisMonth = 0;
    let halfDayThisMonth = 0;
    let approvedLeaveThisMonth = 0;

    monthlyAttendance.forEach((a) => {
      if (a.status === "PRESENT") presentThisMonth++;
      else if (a.status === "ABSENT") absentThisMonth++;
      else if (a.status === "HALF_DAY") halfDayThisMonth++;
      else if (a.status === "APPROVED_LEAVE") approvedLeaveThisMonth++;
    });

    const totalMarkedThisMonth = presentThisMonth + absentThisMonth + halfDayThisMonth + approvedLeaveThisMonth;
    const hasStarted = totalMarkedThisMonth > 0;
    const attendancePercentage =
      hasStarted
        ? Math.round(((presentThisMonth + halfDayThisMonth * 0.5) / totalMarkedThisMonth) * 100)
        : null;

    const pendingLeaves = leaveRequests.filter((l) => l.status === "PENDING");
    const upcomingApprovedLeaves = leaveRequests.filter(
      (l) => l.status === "APPROVED" && l.endDate >= todayStr
    );

    // Recent 10 attendance records in this tenant DB
    const recentAttendance = await models.Attendance.find({ employee: user.employeeId })
      .sort({ dateStr: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      success: true,
      company: tenant,
      employee,
      todayStr,
      todayStatus: todayAttendance?.status || "NOT_MARKED",
      todayAttendance,
      metrics: {
        presentThisMonth,
        absentThisMonth,
        halfDayThisMonth,
        approvedLeaveThisMonth,
        attendancePercentage,
        hasStarted,
        pendingLeavesCount: pendingLeaves.length,
        totalMarkedThisMonth,
      },
      recentAttendance,
      pendingLeaves,
      upcomingApprovedLeaves,
      leaveRequests,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

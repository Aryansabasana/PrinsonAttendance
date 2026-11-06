import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdmin } from "@/lib/tenant";
import { handleAuthError } from "@/lib/permissions";
import { formatDateStr } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { tenant, models } = await requireTenantAdmin(request);

    const { searchParams } = new URL(request.url);
    const today = new Date();
    const defaultStart = formatDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
    const defaultEnd = formatDateStr(today);

    const startDate = searchParams.get("startDate") || defaultStart;
    const endDate = searchParams.get("endDate") || defaultEnd;
    const employeeId = searchParams.get("employeeId") || "";
    const designation = searchParams.get("designation") || "";
    const status = searchParams.get("status") || "ALL";

    // 1. Get employees matching filters in this tenant DB
    const empQuery: any = { isActive: true };
    if (employeeId) empQuery._id = employeeId;
    if (designation) empQuery.designation = designation;

    const employees = await models.Employee.find(empQuery).sort({ employeeCode: 1 }).lean();
    const employeeIds = employees.map((e) => e._id);

    // 2. Query attendance records in date range
    const attQuery: any = {
      dateStr: { $gte: startDate, $lte: endDate },
      employee: { $in: employeeIds },
    };
    if (status && status !== "ALL") {
      attQuery.status = status;
    }

    const attendances = await models.Attendance.find(attQuery)
      .populate("employee", "employeeCode fullName designation department")
      .sort({ dateStr: -1 })
      .lean();

    // 3. Summaries
    let presentCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let approvedLeaveCount = 0;

    attendances.forEach((a) => {
      if (a.status === "PRESENT") presentCount++;
      else if (a.status === "ABSENT") absentCount++;
      else if (a.status === "HALF_DAY") halfDayCount++;
      else if (a.status === "APPROVED_LEAVE") approvedLeaveCount++;
    });

    const totalMarked = presentCount + absentCount + halfDayCount + approvedLeaveCount;
    const overallRate =
      totalMarked > 0 ? Math.round(((presentCount + halfDayCount * 0.5) / totalMarked) * 100) : 0;

    // 4. Employee-wise breakdown
    const empStatsMap = new Map<string, any>();
    employees.forEach((emp) => {
      empStatsMap.set(emp._id.toString(), {
        employee: emp,
        present: 0,
        absent: 0,
        halfDay: 0,
        approvedLeave: 0,
        totalMarked: 0,
        attendanceRate: 0,
      });
    });

    attendances.forEach((a) => {
      const empId = (a.employee as any)?._id?.toString() || a.employee.toString();
      const stats = empStatsMap.get(empId);
      if (stats) {
        if (a.status === "PRESENT") stats.present++;
        else if (a.status === "ABSENT") stats.absent++;
        else if (a.status === "HALF_DAY") stats.halfDay++;
        else if (a.status === "APPROVED_LEAVE") stats.approvedLeave++;
        stats.totalMarked++;
      }
    });

    empStatsMap.forEach((stats) => {
      if (stats.totalMarked > 0) {
        stats.attendanceRate = Math.round(
          ((stats.present + stats.halfDay * 0.5) / stats.totalMarked) * 100
        );
      }
    });

    // 5. Daily trend aggregation for charts
    const dailyMap = new Map<string, { dateStr: string; present: number; absent: number; halfDay: number; approvedLeave: number }>();
    attendances.forEach((a) => {
      if (!dailyMap.has(a.dateStr)) {
        dailyMap.set(a.dateStr, {
          dateStr: a.dateStr,
          present: 0,
          absent: 0,
          halfDay: 0,
          approvedLeave: 0,
        });
      }
      const day = dailyMap.get(a.dateStr)!;
      if (a.status === "PRESENT") day.present++;
      else if (a.status === "ABSENT") day.absent++;
      else if (a.status === "HALF_DAY") day.halfDay++;
      else if (a.status === "APPROVED_LEAVE") day.approvedLeave++;
    });

    const dailyTrend = Array.from(dailyMap.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    return NextResponse.json({
      success: true,
      company: tenant,
      filters: { startDate, endDate, employeeId, designation, status },
      summary: {
        totalMarked,
        presentCount,
        absentCount,
        halfDayCount,
        approvedLeaveCount,
        overallRate,
      },
      employeeBreakdown: Array.from(empStatsMap.values()),
      dailyTrend,
      recordsCount: attendances.length,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

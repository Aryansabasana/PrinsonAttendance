import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdmin } from "@/lib/tenant";
import { handleAuthError } from "@/lib/permissions";
import { formatDateStr } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { tenant, models } = await requireTenantAdmin(request);

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("dateStr") || formatDateStr(new Date());

    // 1. Total active employees in this tenant DB
    const activeEmployees = await models.Employee.find({ isActive: true }).sort({ employeeCode: 1 }).lean();
    const totalActive = activeEmployees.length;

    // 2. Today's attendance records in this tenant DB
    const todayAttendances = await models.Attendance.find({ dateStr })
      .populate("markedBy", "name")
      .lean();

    const attMap = new Map<string, any>();
    todayAttendances.forEach((a) => attMap.set(a.employee.toString(), a));

    // 3. Compute today's counts
    let presentToday = 0;
    let absentToday = 0;
    let halfDayToday = 0;
    let approvedLeaveToday = 0;

    todayAttendances.forEach((a) => {
      if (a.status === "PRESENT") presentToday++;
      else if (a.status === "ABSENT") absentToday++;
      else if (a.status === "HALF_DAY") halfDayToday++;
      else if (a.status === "APPROVED_LEAVE") approvedLeaveToday++;
    });

    const totalMarkedToday = presentToday + absentToday + halfDayToday + approvedLeaveToday;
    const notMarkedToday = Math.max(0, totalActive - totalMarkedToday);

    // 4. Pending leave applications in this tenant DB
    const pendingLeaves = await models.LeaveRequest.find({ status: "PENDING" })
      .populate("employee", "employeeCode fullName designation avatarUrl")
      .sort({ createdAt: -1 })
      .lean();

    // 5. Overall monthly attendance percentage
    const [year, month] = dateStr.split("-");
    const monthStart = `${year}-${month}-01`;
    const monthlyRecords = await models.Attendance.find({
      dateStr: { $gte: monthStart, $lte: dateStr },
    }).lean();

    let mPresent = 0;
    let mHalf = 0;
    let mTotal = 0;
    monthlyRecords.forEach((r) => {
      if (r.status === "PRESENT") {
        mPresent++;
        mTotal++;
      } else if (r.status === "HALF_DAY") {
        mHalf++;
        mTotal++;
      } else if (r.status === "ABSENT") {
        mTotal++;
      } else if (r.status === "APPROVED_LEAVE") {
        mTotal++;
      }
    });

    const overallAttendanceRate =
      mTotal > 0 ? Math.round(((mPresent + mHalf * 0.5) / mTotal) * 100) : 0;

    // 6. Last 7 days attendance trend
    const targetDate = new Date(dateStr);
    const trendDays: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(targetDate);
      d.setDate(targetDate.getDate() - i);
      trendDays.push(formatDateStr(d));
    }

    const past7Attendance = await models.Attendance.find({
      dateStr: { $in: trendDays },
    }).lean();

    const trendMap = new Map<string, { dateStr: string; label: string; present: number; absent: number; halfDay: number; approvedLeave: number }>();
    trendDays.forEach((d) => {
      const parts = d.split("-");
      const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const label = dt.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
      trendMap.set(d, {
        dateStr: d,
        label,
        present: 0,
        absent: 0,
        halfDay: 0,
        approvedLeave: 0,
      });
    });

    past7Attendance.forEach((a) => {
      const item = trendMap.get(a.dateStr);
      if (item) {
        if (a.status === "PRESENT") item.present++;
        else if (a.status === "ABSENT") item.absent++;
        else if (a.status === "HALF_DAY") item.halfDay++;
        else if (a.status === "APPROVED_LEAVE") item.approvedLeave++;
      }
    });

    const sevenDayTrend = Array.from(trendMap.values());

    // 7. Today's employee attendance detailed list
    const todayList = activeEmployees.map((emp) => {
      const att = attMap.get(emp._id.toString());
      return {
        employee: emp,
        status: att?.status || "NOT_MARKED",
        checkInTime: att?.checkInTime || "",
        checkOutTime: att?.checkOutTime || "",
        remarks: att?.remarks || "",
        markedBy: att?.markedBy ? (att.markedBy as any).name : null,
        updatedAt: att?.updatedAt || null,
      };
    });

    // 8. Settings for this tenant DB
    const setting = await models.Setting.findOne({ key: "default_config" }).lean();

    return NextResponse.json({
      success: true,
      company: tenant,
      dateStr,
      metrics: {
        totalActiveEmployees: totalActive,
        presentToday,
        absentToday,
        approvedLeaveToday,
        halfDayToday,
        notMarkedToday,
        pendingLeavesCount: pendingLeaves.length,
        overallAttendanceRate,
      },
      todayList,
      sevenDayTrend,
      pendingLeaves,
      setting,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

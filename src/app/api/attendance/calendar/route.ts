import { NextRequest, NextResponse } from "next/server";
import { requireTenantUser } from "@/lib/tenant";
import { assertEmployeeAccess, handleAuthError } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const { tenant, user, models } = await requireTenantUser(request);

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10); // 1-12
    let targetEmployeeId = searchParams.get("employeeId") || "";

    // Security: Employee role is locked strictly to self
    if (user.role === "EMPLOYEE") {
      if (!user.employeeId) {
        return NextResponse.json(
          { error: "Forbidden: No employee profile linked to user" },
          { status: 403 }
        );
      }
      const requestedId = searchParams.get("employeeId");
      if (requestedId && requestedId !== user.employeeId.toString()) {
        return NextResponse.json(
          { error: "Forbidden: Employees can only view their own attendance calendar." },
          { status: 403 }
        );
      }
      targetEmployeeId = user.employeeId.toString();
    } else if (targetEmployeeId) {
      assertEmployeeAccess(user, targetEmployeeId);
    }

    const monthStr = String(month).padStart(2, "0");
    const startDateStr = `${year}-${monthStr}-01`;
    // Last day of month
    const lastDay = new Date(year, month, 0).getDate();
    const endDateStr = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

    // If specific employee selected:
    if (targetEmployeeId) {
      const [employee, attendances] = await Promise.all([
        models.Employee.findById(targetEmployeeId).lean(),
        models.Attendance.find({
          employee: targetEmployeeId,
          dateStr: { $gte: startDateStr, $lte: endDateStr },
        }).lean(),
      ]);

      if (!employee) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }

      const attendanceMap = new Map<string, any>();
      attendances.forEach((a) => attendanceMap.set(a.dateStr, a));

      // Build daily map for all days of this month
      const days = [];
      let presentCount = 0;
      let absentCount = 0;
      let halfDayCount = 0;
      let approvedLeaveCount = 0;
      let notMarkedCount = 0;

      for (let day = 1; day <= lastDay; day++) {
        const dStr = `${year}-${monthStr}-${String(day).padStart(2, "0")}`;
        const record = attendanceMap.get(dStr);
        const dayOfWeek = new Date(year, month - 1, day).getDay();
        const isSunday = dayOfWeek === 0;

        let status = record?.status || "NOT_MARKED";

        if (status === "PRESENT") presentCount++;
        else if (status === "ABSENT") absentCount++;
        else if (status === "HALF_DAY") halfDayCount++;
        else if (status === "APPROVED_LEAVE") approvedLeaveCount++;
        else notMarkedCount++;

        days.push({
          dateStr: dStr,
          day,
          dayOfWeek,
          isSunday,
          status,
          checkInTime: record?.checkInTime || "",
          checkOutTime: record?.checkOutTime || "",
          remarks: record?.remarks || "",
        });
      }

      const totalMarkedDays = presentCount + absentCount + halfDayCount + approvedLeaveCount;
      const hasStarted = totalMarkedDays > 0;
      const attendancePercentage =
        hasStarted
          ? Math.round(((presentCount + halfDayCount * 0.5) / totalMarkedDays) * 100)
          : null;

      return NextResponse.json({
        success: true,
        company: tenant,
        view: "individual",
        year,
        month,
        employee,
        stats: {
          presentCount,
          absentCount,
          halfDayCount,
          approvedLeaveCount,
          notMarkedCount,
          totalMarkedDays,
          hasStarted,
          attendancePercentage,
        },
        days,
      });
    }

    // Company-wide calendar view is strictly Admin only
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin privileges required to view company-wide calendar." },
        { status: 403 }
      );
    }

    const [allActiveEmployees, monthlyAttendances] = await Promise.all([
      models.Employee.find({ isActive: true }).select("_id fullName employeeCode designation").lean(),
      models.Attendance.find({
        dateStr: { $gte: startDateStr, $lte: endDateStr },
      }).lean(),
    ]);

    const dailyAggregates: Record<
      string,
      { present: number; absent: number; halfDay: number; approvedLeave: number; notMarked: number }
    > = {};

    for (let day = 1; day <= lastDay; day++) {
      const dStr = `${year}-${monthStr}-${String(day).padStart(2, "0")}`;
      dailyAggregates[dStr] = {
        present: 0,
        absent: 0,
        halfDay: 0,
        approvedLeave: 0,
        notMarked: 0,
      };
    }

    monthlyAttendances.forEach((att) => {
      const agg = dailyAggregates[att.dateStr];
      if (agg) {
        if (att.status === "PRESENT") agg.present++;
        else if (att.status === "ABSENT") agg.absent++;
        else if (att.status === "HALF_DAY") agg.halfDay++;
        else if (att.status === "APPROVED_LEAVE") agg.approvedLeave++;
      }
    });

    const totalActive = allActiveEmployees.length;
    const days = [];
    for (let day = 1; day <= lastDay; day++) {
      const dStr = `${year}-${monthStr}-${String(day).padStart(2, "0")}`;
      const dayOfWeek = new Date(year, month - 1, day).getDay();
      const agg = dailyAggregates[dStr];
      const markedCount = agg.present + agg.absent + agg.halfDay + agg.approvedLeave;
      agg.notMarked = Math.max(0, totalActive - markedCount);

      days.push({
        dateStr: dStr,
        day,
        dayOfWeek,
        isSunday: dayOfWeek === 0,
        counts: agg,
        totalEmployees: totalActive,
      });
    }

    return NextResponse.json({
      success: true,
      company: tenant,
      view: "company",
      year,
      month,
      totalActiveEmployees: totalActive,
      employees: allActiveEmployees,
      days,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

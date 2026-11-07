import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdmin } from "@/lib/tenant";
import { handleAuthError } from "@/lib/permissions";
import { formatDateStr } from "@/lib/utils";
import { sanitizeCsvCell } from "@/lib/security";

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenantAdmin(request);
    const { Employee, Attendance } = tenant.models;

    const { searchParams } = new URL(request.url);
    const today = new Date();
    const defaultStart = formatDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
    const defaultEnd = formatDateStr(today);

    const startDate = searchParams.get("startDate") || defaultStart;
    const endDate = searchParams.get("endDate") || defaultEnd;
    const employeeId = searchParams.get("employeeId") || "";
    const designation = searchParams.get("designation") || "";
    const status = searchParams.get("status") || "ALL";

    const empQuery: any = {};
    if (employeeId) empQuery._id = employeeId;
    if (designation) empQuery.designation = designation;

    const employees = await Employee.find(empQuery).select("_id").lean();
    const employeeIds = employees.map((e) => e._id);

    const attQuery: any = {
      dateStr: { $gte: startDate, $lte: endDate },
      employee: { $in: employeeIds },
    };
    if (status && status !== "ALL") {
      attQuery.status = status;
    }

    const attendances = await Attendance.find(attQuery)
      .populate("employee", "employeeCode fullName designation department")
      .populate("markedBy", "name")
      .sort({ dateStr: -1, "employee.employeeCode": 1 })
      .lean();

    const headers = [
      "Employee ID",
      "Employee Name",
      "Designation",
      "Department",
      "Date",
      "Status",
      "Check-In Time",
      "Check-Out Time",
      "Remarks",
      "Recorded By",
      "Last Updated",
    ];

    const rows = attendances.map((a: any) => [
      sanitizeCsvCell(a.employee?.employeeCode || "N/A"),
      sanitizeCsvCell(a.employee?.fullName || "N/A"),
      sanitizeCsvCell(a.employee?.designation || "N/A"),
      sanitizeCsvCell(a.employee?.department || "N/A"),
      sanitizeCsvCell(a.dateStr),
      sanitizeCsvCell(a.status),
      sanitizeCsvCell(a.checkInTime || "--"),
      sanitizeCsvCell(a.checkOutTime || "--"),
      sanitizeCsvCell(a.remarks || ""),
      sanitizeCsvCell(a.markedBy?.name || "System"),
      sanitizeCsvCell(a.updatedAt ? new Date(a.updatedAt).toISOString() : ""),
    ]);

    const csvContent = [headers.map((h) => `"${h}"`).join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const filename = `${tenant.tenant}_attendance_export_${startDate}_to_${endDate}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

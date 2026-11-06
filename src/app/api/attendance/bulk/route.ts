import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTenantAdmin } from "@/lib/tenant";
import { handleAuthError } from "@/lib/permissions";
import { z } from "zod";

const bulkMarkSchema = z.object({
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  employeeIds: z.array(z.string()).min(1, "Select at least one employee"),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "APPROVED_LEAVE", "NOT_MARKED"]),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  remarks: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { user: admin, models } = await requireTenantAdmin(request);

    const body = await request.json();
    const parsed = bulkMarkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const { dateStr, employeeIds, status, checkInTime = "", checkOutTime = "", remarks = "" } = parsed.data;

    // Fetch employee details for audit log
    const employees = await models.Employee.find({ _id: { $in: employeeIds } }).lean();

    const bulkOps: any = employeeIds.map((empId) => ({
      updateOne: {
        filter: { employee: empId, dateStr },
        update: {
          $set: {
            status,
            checkInTime: status === "ABSENT" || status === "APPROVED_LEAVE" ? "" : checkInTime,
            checkOutTime: status === "ABSENT" || status === "APPROVED_LEAVE" ? "" : checkOutTime,
            remarks,
            markedBy: new mongoose.Types.ObjectId(admin.userId),
          },
        },
        upsert: true,
      },
    }));

    await models.Attendance.bulkWrite(bulkOps);

    // Audit log
    await models.AuditLog.create({
      action: "BULK_ATTENDANCE_MARKED",
      performedBy: admin.userId,
      performerName: admin.name,
      dateStr,
      newValue: {
        status,
        affectedCount: employeeIds.length,
        employees: employees.map((e) => e.employeeCode),
      },
      reason: `Bulk attendance marked as ${status} for ${employeeIds.length} employees`,
    });

    return NextResponse.json({
      success: true,
      count: employeeIds.length,
      message: `Bulk marked ${employeeIds.length} employees as ${status} successfully.`,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

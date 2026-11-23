import { NextRequest, NextResponse } from "next/server";
import { requireTenantUser, requireTenantAdmin } from "@/lib/tenant";
import { handleAuthError } from "@/lib/permissions";
import { z } from "zod";

const declareHolidaySchema = z.object({
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  name: z.string().trim().min(1, "Holiday name is required").max(100).default("Holiday"),
});

const deleteHolidaySchema = z.object({
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
});

export async function GET(request: NextRequest) {
  try {
    const { tenant, models } = await requireTenantUser(request);
    const { searchParams } = new URL(request.url);

    const dateStr = searchParams.get("dateStr");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (dateStr) {
      const holiday = await models.Holiday.findOne({ dateStr }).lean();
      return NextResponse.json({
        success: true,
        company: tenant,
        dateStr,
        isHoliday: Boolean(holiday),
        holiday: holiday || null,
      });
    }

    if (year && month) {
      const monthStr = String(month).padStart(2, "0");
      const startDateStr = `${year}-${monthStr}-01`;
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const endDateStr = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

      const holidays = await models.Holiday.find({
        dateStr: { $gte: startDateStr, $lte: endDateStr },
      }).lean();

      return NextResponse.json({
        success: true,
        company: tenant,
        holidays,
      });
    }

    // Default: fetch all holidays
    const holidays = await models.Holiday.find({}).sort({ dateStr: -1 }).limit(100).lean();
    return NextResponse.json({
      success: true,
      company: tenant,
      holidays,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user: admin, models, tenant } = await requireTenantAdmin(request);

    const body = await request.json();
    const parsed = declareHolidaySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const { dateStr, name } = parsed.data;

    // Upsert Holiday in tenant database
    const holiday = await models.Holiday.findOneAndUpdate(
      { dateStr },
      {
        $set: {
          dateStr,
          name,
          declaredBy: admin.userId,
          declaredByName: admin.name,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Audit log
    await models.AuditLog.create({
      action: "HOLIDAY_DECLARED",
      performedBy: admin.userId,
      performerName: admin.name,
      dateStr,
      newValue: { name },
      reason: `Holiday declared for ${dateStr}: ${name}`,
    });

    return NextResponse.json({
      success: true,
      company: tenant,
      message: `Holiday '${name}' declared successfully for ${dateStr}.`,
      holiday,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user: admin, models, tenant } = await requireTenantAdmin(request);

    let dateStr = "";
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("dateStr");

    if (dateParam) {
      dateStr = dateParam;
    } else {
      try {
        const body = await request.json();
        dateStr = body?.dateStr || "";
      } catch {
        // Body optional if provided in query string
      }
    }

    const parsed = deleteHolidaySchema.safeParse({ dateStr });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Valid dateStr required" }, { status: 400 });
    }

    const deleted = await models.Holiday.findOneAndDelete({ dateStr: parsed.data.dateStr });
    if (!deleted) {
      return NextResponse.json({ error: "No holiday was declared for this date." }, { status: 404 });
    }

    // Clean up any attendance marked strictly as HOLIDAY so attendance can be marked normally
    await models.Attendance.deleteMany({ dateStr: parsed.data.dateStr, status: "HOLIDAY" });

    // Audit log
    await models.AuditLog.create({
      action: "HOLIDAY_CANCELLED",
      performedBy: admin.userId,
      performerName: admin.name,
      dateStr: parsed.data.dateStr,
      reason: `Holiday cancelled for ${parsed.data.dateStr}`,
    });

    return NextResponse.json({
      success: true,
      company: tenant,
      message: `Holiday cancelled for ${parsed.data.dateStr}. Attendance can now be marked.`,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

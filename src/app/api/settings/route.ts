import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdmin, requireTenantUser } from "@/lib/tenant";
import { handleAuthError } from "@/lib/permissions";
import { z } from "zod";

const updateSettingsSchema = z.object({
  showroomName: z.string().min(2).optional(),
  showroomAddress: z.string().optional(),
  timezone: z.string().optional(),
  enableCheckInOut: z.boolean().optional(),
  halfDayThresholdHours: z.number().min(1).max(12).optional(),
  standardWorkHoursStart: z.string().optional(),
  standardWorkHoursEnd: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenantUser(request);
    const { Setting } = tenant.models;

    let setting: any = await Setting.findOne({ key: "default_config" }).lean();
    if (!setting) {
      setting = await Setting.create({
        key: "default_config",
        showroomName: tenant.tenant === "hytek" ? "Prinson Hytek Showroom" : "Prinson Plynest Showroom",
        showroomAddress:
          tenant.tenant === "hytek"
            ? "Hytek Precision Industrial Estate, Bangalore"
            : "Plot 42, Timber & Architectural Panels Arcade, Bangalore",
        timezone: "Asia/Kolkata",
        enableCheckInOut: true,
        halfDayThresholdHours: 4.5,
        standardWorkHoursStart: "09:30",
        standardWorkHoursEnd: "18:30",
      });
    }

    return NextResponse.json({ success: true, setting });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenant = await requireTenantAdmin(request);
    const admin = tenant.user;
    const { Setting, AuditLog } = tenant.models;

    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const updated = await Setting.findOneAndUpdate(
      { key: "default_config" },
      {
        $set: {
          ...parsed.data,
          updatedBy: admin.userId,
        },
      },
      { upsert: true, new: true }
    );

    await AuditLog.create({
      action: "SETTINGS_UPDATED",
      performedBy: admin.userId,
      performerName: admin.name,
      newValue: parsed.data,
      reason: `${tenant.tenant === "hytek" ? "Prinson Hytek" : "Prinson Plynest"} attendance configuration updated`,
    });

    return NextResponse.json({
      success: true,
      setting: updated,
      message: "Attendance settings updated successfully.",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

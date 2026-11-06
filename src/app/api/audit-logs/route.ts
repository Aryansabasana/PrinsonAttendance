import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdmin } from "@/lib/tenant";
import { handleAuthError } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenantAdmin(request);
    const { AuditLog } = tenant.models;

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);

    const query: any = {};
    if (action && action !== "ALL") {
      query.action = action;
    }

    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query)
        .populate("performedBy", "name identifier")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

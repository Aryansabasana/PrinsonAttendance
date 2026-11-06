import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTenantModels } from "@/lib/mongodb";
import { resolveTenantFromRequest } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const tenant = resolveTenantFromRequest(request);
    const session = await getCurrentUser(tenant);

    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    const { Employee } = await getTenantModels(tenant);

    let employeeData = null;
    if (session.employeeId) {
      employeeData = await Employee.findById(session.employeeId).lean();
    }

    return NextResponse.json({
      authenticated: true,
      company: tenant,
      user: {
        id: session.userId,
        name: session.name,
        role: session.role,
        email: session.email,
        company: tenant,
        employeeId: session.employeeId,
        employeeCode: session.employeeCode,
        employee: employeeData,
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ error: "Failed to verify session" }, { status: 500 });
  }
}

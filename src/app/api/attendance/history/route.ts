import { NextRequest, NextResponse } from "next/server";
import { requireTenantUser } from "@/lib/tenant";
import { assertEmployeeAccess, handleAuthError } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const { tenant, user, models } = await requireTenantUser(request);

    const { searchParams } = new URL(request.url);
    let targetEmployeeId = searchParams.get("employeeId") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const status = searchParams.get("status") || "ALL";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);
    const search = searchParams.get("search")?.trim() || "";

    // Security: If user is EMPLOYEE, restrict strictly to their own employeeId!
    if (user.role === "EMPLOYEE") {
      if (!user.employeeId) {
        return NextResponse.json({ error: "No employee profile linked to user" }, { status: 403 });
      }
      targetEmployeeId = user.employeeId.toString();
    } else if (targetEmployeeId) {
      assertEmployeeAccess(user, targetEmployeeId);
    }

    const query: any = {};

    if (targetEmployeeId) {
      query.employee = targetEmployeeId;
    } else if (search) {
      // Find matching employees first in this tenant DB
      const matchedEmployees = await models.Employee.find({
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { employeeCode: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      query.employee = { $in: matchedEmployees.map((e) => e._id) };
    }

    if (startDate && endDate) {
      query.dateStr = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.dateStr = { $gte: startDate };
    } else if (endDate) {
      query.dateStr = { $lte: endDate };
    }

    if (status && status !== "ALL") {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [totalRecords, records] = await Promise.all([
      models.Attendance.countDocuments(query),
      models.Attendance.find(query)
        .populate("employee", "employeeCode fullName designation department")
        .populate("markedBy", "name")
        .sort({ dateStr: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      company: tenant,
      records,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

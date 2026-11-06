import { NextRequest, NextResponse } from "next/server";
import { getTenantModels, CompanyTenant } from "@/lib/mongodb";
import { comparePassword, signSessionToken, getSessionCookieName } from "@/lib/auth";
import { resolveTenantFromRequest } from "@/lib/tenant";
import { z } from "zod";

const loginSchema = z.object({
  identifier: z.string().min(1, "Username, email, or Employee ID is required"),
  password: z.string().min(1, "Password is required"),
  company: z.enum(["plynest", "hytek"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { identifier, password, company: bodyCompany } = parsed.data;
    const cleanId = identifier.trim().toLowerCase();
    const escapedInput = identifier.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Companies to search: explicit or both
    const companiesToSearch: CompanyTenant[] = bodyCompany
      ? [bodyCompany]
      : ["plynest", "hytek"];

    let authenticatedUser: any = null;
    let matchedCompany: CompanyTenant | null = null;
    let isDeactivated = false;

    for (const company of companiesToSearch) {
      try {
        const { User, Employee } = await getTenantModels(company);

        // 1. Find user by direct identifier (email, username, etc.)
        let user = await User.findOne({ identifier: cleanId }).populate("employee");

        // 2. If not found by direct identifier, check if it matches an Employee's employeeCode or email
        if (!user) {
          const emp = await Employee.findOne({
            $or: [
              { employeeCode: { $regex: new RegExp(`^${escapedInput}$`, "i") } },
              { email: { $regex: new RegExp(`^${escapedInput}$`, "i") } },
            ],
          });
          if (emp) {
            user = await User.findOne({ employee: emp._id }).populate("employee");
          }
        }

        if (user) {
          const isMatch = await comparePassword(password, user.passwordHash);
          if (isMatch) {
            if (!user.isActive) {
              isDeactivated = true;
              break;
            }
            authenticatedUser = user;
            matchedCompany = company;
            break;
          }
        }
      } catch (tenantErr: any) {
        console.warn(`[Login] Lookup failed for tenant ${company}:`, tenantErr?.message || tenantErr);
        // Continue to check the next company if dual lookup
      }
    }

    if (isDeactivated) {
      return NextResponse.json(
        { error: "Your account has been deactivated. Please contact administration." },
        { status: 403 }
      );
    }

    if (!authenticatedUser || !matchedCompany) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    // Update lastLogin cleanly using updateOne to prevent schema validation side effects on populated objects
    const { User } = await getTenantModels(matchedCompany);
    await User.updateOne({ _id: authenticatedUser._id }, { $set: { lastLogin: new Date() } });

    const empObj = authenticatedUser.employee as any;
    const sessionPayload = {
      userId: authenticatedUser._id.toString(),
      role: authenticatedUser.role,
      employeeId: empObj ? empObj._id.toString() : undefined,
      employeeCode: empObj ? empObj.employeeCode : undefined,
      name: authenticatedUser.name,
      email: authenticatedUser.identifier,
      company: matchedCompany,
    };

    const token = await signSessionToken(sessionPayload);
    const cookieName = getSessionCookieName(matchedCompany);

    const response = NextResponse.json({
      success: true,
      company: matchedCompany,
      user: {
        id: authenticatedUser._id,
        name: authenticatedUser.name,
        role: authenticatedUser.role,
        identifier: authenticatedUser.identifier,
        company: matchedCompany,
        employeeId: empObj?._id,
        employeeCode: empObj?.employeeCode,
        designation: empObj?.designation,
      },
    });

    // Set HTTP-only secure cookie for the specific tenant
    response.cookies.set({
      name: cookieName,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error("Login API error:", error?.message, error?.stack);
    return NextResponse.json(
      { error: "Internal server error during authentication" },
      { status: 500 }
    );
  }
}


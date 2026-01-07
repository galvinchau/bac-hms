// app/api/admin/roles/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ✅ Direction A: "Manage User Roles" should list ONLY valid User Types.
// This endpoint now returns "system roles" = user types (not HR/payroll positions).

const VALID_USER_TYPES = [
  "ADMIN",
  "COORDINATOR",
  "OFFICE",
  "DSP",
  "HR",
] as const;

function labelFor(code: string) {
  switch (code) {
    case "ADMIN":
      return {
        name: "Admin",
        description: "Full access to Admin, Billing, Payroll.",
      };
    case "COORDINATOR":
      return {
        name: "Coordinator",
        description: "Coordination access (no Admin super powers).",
      };
    case "OFFICE":
      return {
        name: "Office",
        description: "Office access (Time Keeping, ops screens).",
      };
    case "DSP":
      return {
        name: "DSP",
        description: "DSP access (no Admin/Billing/Payroll).",
      };
    case "HR":
      return {
        name: "HR",
        description: "HR access (Employee/HR + Time Keeping).",
      };
    default:
      return { name: code, description: "" };
  }
}

export async function GET() {
  try {
    // Count users per userType
    const userGroups = await prisma.user.groupBy({
      by: ["userType"],
      _count: { _all: true },
    });

    const userCountByType: Record<string, number> = {};
    for (const g of userGroups) {
      if (g.userType) userCountByType[g.userType] = g._count._all;
    }

    // Return ONLY valid user types
    const result = VALID_USER_TYPES.map((code) => {
      const meta = labelFor(code);
      return {
        id: code, // ✅ stable id for UI (not DB role id)
        code,
        name: meta.name,
        description: meta.description,
        userCount: userCountByType[code] ?? 0,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/admin/roles error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

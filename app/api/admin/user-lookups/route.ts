// app/api/admin/user-lookups/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ✅ Direction A: User Type is the single source of truth (for menus + system privileges).
// - Employee Role/Position is HR/Payroll only (not here).
// - Manage User Roles should show ONLY valid User Types (ADMIN/COORDINATOR/OFFICE/DSP/HR).

const VALID_USER_TYPES = [
  "ADMIN",
  "COORDINATOR",
  "OFFICE",
  "DSP",
  "HR",
] as const;
type ValidUserType = (typeof VALID_USER_TYPES)[number];

export async function GET() {
  try {
    // NOTE:
    // We still return `roles` for backward compatibility with existing UI,
    // but the UI should move to `userTypes` going forward.
    const [roles, privileges, employees] = await Promise.all([
      prisma.role.findMany({
        orderBy: { code: "asc" },
      }),
      prisma.privilege.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.employee.findMany({
        orderBy: { employeeId: "asc" },
      }),
    ]);

    const supervisors = employees.map((e) => ({
      id: e.id,
      code: e.employeeId,
      name: `${e.firstName} ${e.lastName}`,
    }));

    // ✅ New: explicit userTypes list for dropdown + Admin/Manage User Roles
    const userTypes = VALID_USER_TYPES.map((code) => ({
      code,
      name:
        code === "ADMIN"
          ? "Admin"
          : code === "COORDINATOR"
          ? "Coordinator"
          : code === "OFFICE"
          ? "Office"
          : code === "DSP"
          ? "DSP"
          : "HR",
      description:
        code === "ADMIN"
          ? "Full access to Admin, Billing, Payroll."
          : code === "COORDINATOR"
          ? "Operational coordination access (no Admin super powers)."
          : code === "OFFICE"
          ? "Office staff access (Time Keeping, operational screens)."
          : code === "DSP"
          ? "Direct Support Professional (no Admin/Billing/Payroll)."
          : "HR access (HR/Employee-focused, Time Keeping).",
    }));

    // ✅ Optional: filter roles so legacy UI doesn't see HR/Payroll business roles
    // If you want to keep ALL roles visible for now, comment out this filter.
    const filteredRoles = roles.filter((r) =>
      VALID_USER_TYPES.includes(r.code as ValidUserType)
    );

    return NextResponse.json({
      // ✅ prefer this going forward:
      userTypes,

      // legacy (keep for now):
      roles: filteredRoles,

      privileges,
      supervisors,
    });
  } catch (err) {
    console.error("GET /api/admin/user-lookups error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

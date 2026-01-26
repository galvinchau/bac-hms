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

/**
 * Ensure baseline privileges exist in DB so Create User screen can assign them.
 * We keep it here (user-lookups) because the UI always calls this endpoint.
 *
 * NOTE:
 * - This is "best-effort" seeding:
 *   1) Try createMany(skipDuplicates) by `code`.
 *   2) If that fails (no unique constraint, etc.), create one-by-one with try/catch.
 */
async function ensureBaselinePrivileges() {
  const required: Array<{ code: string; name: string }> = [
    // Programs
    { code: "PROGRAMS_VIEW", name: "Programs - View" },
    { code: "PROGRAMS_WRITE", name: "Programs - Add/Update" },

    // Services
    { code: "SERVICES_VIEW", name: "Services - View" },
    { code: "SERVICES_WRITE", name: "Services - Add/Update" },

    // Employees
    { code: "EMPLOYEES_VIEW", name: "Employees - View" },
    { code: "EMPLOYEES_WRITE", name: "Employees - Add/Update" },

    // Medication
    { code: "MEDICATION_VIEW", name: "Medication - View" },
    { code: "MEDICATION_WRITE", name: "Medication - Add/Update" },

    // FireDrill
    { code: "FIREDRILL_VIEW", name: "FireDrill - View" },
    { code: "FIREDRILL_WRITE", name: "FireDrill - Add/Update" },

    // Authorizations
    { code: "AUTHORIZATIONS_VIEW", name: "Authorizations - View" },
    { code: "AUTHORIZATIONS_WRITE", name: "Authorizations - Add/Update" },
  ];

  // Fast path: check what exists by code
  const existing = await prisma.privilege.findMany({
    where: { code: { in: required.map((x) => x.code) } as any },
    select: { code: true },
  });

  const existSet = new Set(existing.map((x: any) => String(x.code)));
  const missing = required.filter((x) => !existSet.has(x.code));
  if (missing.length === 0) return;

  // Try createMany (best) — will succeed if `code` is unique or skipDuplicates works
  try {
    await prisma.privilege.createMany({
      data: missing.map((m) => ({ code: m.code, name: m.name })) as any,
      skipDuplicates: true,
    });
    return;
  } catch (err) {
    // Fallback to per-row create (safe for unknown unique constraints)
    console.warn(
      "[user-lookups] createMany failed, fallback to create one-by-one",
      err,
    );
  }

  for (const m of missing) {
    try {
      // If your schema has different field names, adjust here.
      await prisma.privilege.create({
        data: { code: m.code, name: m.name } as any,
      });
    } catch (e) {
      // Ignore duplicates or race conditions
      // (We don't want lookup endpoint to fail because a record already exists)
      continue;
    }
  }
}

export async function GET() {
  try {
    // ✅ Ensure the required privileges exist for Create User UI
    await ensureBaselinePrivileges();

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
      VALID_USER_TYPES.includes(r.code as ValidUserType),
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

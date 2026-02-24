// web/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type EmployeeProfile = {
  // NOTE:
  // - staffId: business staff code (Employee.employeeId) if you use it
  // - id: DB primary key (Employee.id) -> THIS is what poc_daily_log.dspid FK expects
  id: string; // Employee.id (FK target)
  staffId: string; // Employee.employeeId (optional/business)
  firstName: string;
  lastName: string;
  position: string;
  address: string;
  phone: string;
  email: string;
  displayName: string;
};

export async function GET(req: NextRequest) {
  const sessionUser: any = getSessionFromRequest(req);

  if (!sessionUser) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }

  const email = String(sessionUser.email ?? "").trim();
  let employee: EmployeeProfile | null = null;

  if (email) {
    // Link session user -> employee by email (case-insensitive)
    // IMPORTANT: We must use Employee.id for FK relations (poc_daily_log.dspid)
    const emp = await prisma.employee.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: {
        id: true, // ✅ DB PK
        employeeId: true, // optional business id
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        email: true,
        address1: true,
        address2: true,
        city: true,
        state: true,
        zip: true,
      },
    });

    if (emp?.id) {
      const displayName = [emp.firstName, emp.lastName].filter(Boolean).join(" ").trim() || emp.email || email;

      employee = {
        id: emp.id,
        staffId: emp.employeeId ?? "",
        firstName: emp.firstName ?? "",
        lastName: emp.lastName ?? "",
        position: emp.role ?? "Office",
        phone: emp.phone ?? "",
        email: emp.email ?? email,
        address: [emp.address1, emp.address2, emp.city, emp.state, emp.zip].filter(Boolean).join(", "),
        displayName,
      };
    }
  }

  // ✅ Compatibility + FIX for your POC Daily Logs UI:
  // Your page.tsx expects { ok: true, user: ... }.
  // Also deriveActorFromMe() looks for user.employeeId / user.id / user.employee.id.
  // So we put DB Employee.id into user.employeeId.
  const userOut = {
    ...sessionUser,
    // Use DB PK as "employeeId" so client can use it as dspId
    employeeId: employee?.id || sessionUser.employeeId || null,
    // Provide a stable name for UI
    name: employee?.displayName || sessionUser.name || sessionUser.username || sessionUser.email || "",
    // Optional nested employee for other pages that read user.employee.id
    employee: employee ? { id: employee.id, displayName: employee.displayName, email: employee.email } : sessionUser.employee || null,
  };

  return NextResponse.json({
    ok: true,
    authenticated: true,
    user: userOut,
    employee, // keep for Time Keeping usage
  });
}
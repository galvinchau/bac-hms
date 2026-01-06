// web/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type EmployeeProfile = {
  staffId: string; // Employee.employeeId
  firstName: string;
  lastName: string;
  position: string;
  address: string;
  phone: string;
  email: string;
};

export async function GET(req: NextRequest) {
  const user = getSessionFromRequest(req);

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const email = (user.email ?? "").trim();
  let employee: EmployeeProfile | null = null;

  if (email) {
    // Link user -> employee by email (case-insensitive)
    const emp = await prisma.employee.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: {
        employeeId: true,
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

    if (emp?.employeeId) {
      employee = {
        staffId: emp.employeeId,
        firstName: emp.firstName ?? "",
        lastName: emp.lastName ?? "",
        position: emp.role ?? "Office",
        phone: emp.phone ?? "",
        email: emp.email ?? email,
        address: [emp.address1, emp.address2, emp.city, emp.state, emp.zip]
          .filter(Boolean)
          .join(", "),
      };
    }
  }

  return NextResponse.json({
    authenticated: true,
    user,
    employee, // <-- Time Keeping cần cái này
  });
}

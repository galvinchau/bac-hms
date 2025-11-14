// app/api/admin/user-lookups/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/user-lookups
// Trả về: roles, privileges, supervisors (danh sách Employees)
export async function GET() {
  try {
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

    return NextResponse.json({
      roles,
      privileges,
      supervisors,
    });
  } catch (err) {
    console.error("GET /api/admin/user-lookups error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

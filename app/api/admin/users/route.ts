// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      email,
      firstName,
      lastName,
      locked,
      userType,
      roleIds,
      privilegeIds,
      supervisorIds,
    } = body as {
      email: string;
      firstName: string;
      lastName: string;
      locked: boolean;
      userType: string;
      roleIds: string[];
      privilegeIds: string[];
      supervisorIds: string[];
    };

    // ====== Basic validation ======
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // Check trùng email
    const existing = await prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This email/username already exists." },
        { status: 400 }
      );
    }

    // ====== Transaction: create user + gán roles/privileges/supervisors ======
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          firstName,
          lastName,
          locked: !!locked,
          userType: userType || "ADMIN",
        },
      });

      // Roles
      if (Array.isArray(roleIds) && roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({
            userId: user.id,
            roleId,
          })),
        });
      }

      // Privileges
      if (Array.isArray(privilegeIds) && privilegeIds.length > 0) {
        await tx.userPrivilege.createMany({
          data: privilegeIds.map((privilegeId) => ({
            userId: user.id,
            privilegeId,
          })),
        });
      }

      // Supervisors
      if (Array.isArray(supervisorIds) && supervisorIds.length > 0) {
        await tx.userSupervisor.createMany({
          data: supervisorIds.map((supervisorId) => ({
            userId: user.id,
            supervisorId,
          })),
        });
      }

      return user;
    });

    return NextResponse.json(
      {
        id: result.id,
        email: result.email,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/admin/users error:", err);
    return NextResponse.json(
      { error: "Failed to create user." },
      { status: 500 }
    );
  }
}

// app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper: lấy id từ URL, ví dụ /api/admin/users/123 => "123"
function getUserIdFromUrl(req: NextRequest): string | null {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    // [..., "api", "admin", "users", "<id>"]
    const id = segments[segments.length - 1];
    if (!id || id === "users") return null;
    return id;
  } catch {
    return null;
  }
}

// =========================================
// GET /api/admin/users/:id
// Load chi tiết user + roles/privileges
// =========================================
export async function GET(req: NextRequest) {
  try {
    const id = getUserIdFromUrl(req);
    if (!id) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
        privileges: { include: { privilege: true } },
        supervisors: { include: { supervisor: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      locked: user.locked,
      userType: user.userType,
      roles: user.roles.map((ur) => ur.role),
      privileges: user.privileges.map((up) => up.privilege),
      supervisors: user.supervisors.map((us) => ({
        id: us.supervisor.id,
        code: us.supervisor.employeeId,
        name: `${us.supervisor.firstName} ${us.supervisor.lastName}`,
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/users/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to load user." },
      { status: 500 }
    );
  }
}

// =========================================
// PUT /api/admin/users/:id
// Update user + gán lại roles/privileges/supervisors
// =========================================
export async function PUT(req: NextRequest) {
  try {
    const id = getUserIdFromUrl(req);
    if (!id) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

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

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // check trùng email với user khác
    const existing = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This email/username already exists." },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          email,
          firstName,
          lastName,
          locked: !!locked,
          userType: userType || "ADMIN",
        },
      });

      // clear cũ
      await tx.userRole.deleteMany({ where: { userId: user.id } });
      await tx.userPrivilege.deleteMany({ where: { userId: user.id } });
      await tx.userSupervisor.deleteMany({ where: { userId: user.id } });

      // set mới
      if (Array.isArray(roleIds) && roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId: user.id, roleId })),
        });
      }

      if (Array.isArray(privilegeIds) && privilegeIds.length > 0) {
        await tx.userPrivilege.createMany({
          data: privilegeIds.map((privilegeId) => ({
            userId: user.id,
            privilegeId,
          })),
        });
      }

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
      { id: updated.id, email: updated.email },
      { status: 200 }
    );
  } catch (err) {
    console.error("PUT /api/admin/users/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update user." },
      { status: 500 }
    );
  }
}

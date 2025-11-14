// app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: { id: string };
};

// GET /api/admin/users/:id
// Dùng cho màn hình Modify User (load chi tiết user)
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        roles: { include: { role: true } },
        privileges: { include: { privilege: true } },
        supervisors: { include: { supervisor: true } },
      },
    });

    if (!user) {
      return new NextResponse("Not found", { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err) {
    console.error("GET /api/admin/users/[id] error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// PUT /api/admin/users/:id
// Lưu thay đổi từ màn hình Modify User
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const body = await req.json();

    const {
      firstName,
      lastName,
      locked,
      userType,
      roleIds = [],
      privilegeIds = [],
      supervisorIds = [],
    } = body ?? {};

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        firstName,
        lastName,
        locked,
        userType,
        // Clear các liên kết cũ rồi gán lại (cho đơn giản)
        roles: {
          deleteMany: {},
          create: (roleIds as string[]).map((roleId) => ({ roleId })),
        },
        privileges: {
          deleteMany: {},
          create: (privilegeIds as string[]).map((privilegeId) => ({
            privilegeId,
          })),
        },
        supervisors: {
          deleteMany: {},
          create: (supervisorIds as string[]).map((supervisorId) => ({
            supervisorId,
          })),
        },
      },
    });

    return NextResponse.json(user);
  } catch (err) {
    console.error("PUT /api/admin/users/[id] error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

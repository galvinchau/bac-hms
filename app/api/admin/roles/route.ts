// app/api/admin/roles/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1) Lấy danh sách role nhưng chỉ giữ ADMIN + COORDINATOR
    const roles = await prisma.role.findMany({
      where: {
        code: {
          in: ["ADMIN", "COORDINATOR"],
        },
      },
      orderBy: {
        code: "asc",
      },
    });

    // 2) GroupBy User theo userType để đếm số user mỗi loại
    const userGroups = await prisma.user.groupBy({
      by: ["userType"],
      _count: {
        _all: true,
      },
    });

    const userCountByType: Record<string, number> = {};
    for (const g of userGroups) {
      // g.userType là string (ADMIN / COORDINATOR / DSP / STAFF ...)
      if (g.userType) {
        userCountByType[g.userType] = g._count._all;
      }
    }

    // 3) Map ra dữ liệu trả về cho UI
    const result = roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description ?? "",
      // Nếu chưa có user nào type = role.code thì cho = 0
      userCount: userCountByType[r.code] ?? 0,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/admin/roles error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

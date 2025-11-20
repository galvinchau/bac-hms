// app/api/medication/individuals/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // ⚠️ Đảm bảo trong schema.prisma có model tên "Individual"
    // Nếu tên khác (vd: Client, Person...), sửa lại ở đây
    const individuals = await prisma.individual.findMany({
      orderBy: { createdAt: "asc" }, // nếu không có createdAt thì bỏ dòng này
      select: {
        id: true,
        code: true,
        firstName: true,
        middleName: true,
        lastName: true,
      },
    });

    return NextResponse.json(individuals);
  } catch (err: any) {
    console.error("[GET /api/medication/individuals] error:", err);

    return NextResponse.json(
      {
        error: "Failed to load individuals for Medication module.",
        detail: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}

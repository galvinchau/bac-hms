// Web/app/api/medication/individuals/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Note: Avoid ordering by createdAt because some schemas don't have it.
    const items = await prisma.individual.findMany({
      select: {
        id: true,
        code: true,
        firstName: true,
        middleName: true,
        lastName: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 500,
    });

    // Standard response shape: { items: [...] }
    return NextResponse.json({ items }, { status: 200 });
  } catch (err: any) {
    console.error("[GET /api/medication/individuals] error:", err);

    return NextResponse.json(
      {
        items: [],
        error: "Failed to load individuals for Medication module.",
        errorDetail: String(err?.message || err),
      },
      { status: 500 },
    );
  }
}

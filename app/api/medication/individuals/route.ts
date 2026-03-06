// web/app/api/medication/individuals/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Primary source of truth: Individuals table via Prisma model Individual
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

    return NextResponse.json({ items }, { status: 200 });
  } catch (err: any) {
    // IMPORTANT:
    // Do NOT return 500 here because MARClient treats non-OK as fatal.
    // Return 200 with warning so UI can fallback gracefully.
    console.error("GET /api/medication/individuals error:", err);

    return NextResponse.json(
      {
        items: [],
        warning:
          "Individuals endpoint failed (DB/schema mismatch). Returning empty list so UI can fallback.",
        errorDetail: String(err?.message || err),
      },
      { status: 200 },
    );
  }
}
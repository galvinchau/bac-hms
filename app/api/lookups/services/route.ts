import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/lookups/services?q=
 *
 * Your Prisma `service` model does NOT have `name` and does NOT have `code`.
 * It likely has: id, notes (Prisma hinted `notes` exists).
 *
 * So we return a safe lookup using ONLY fields we know exist:
 * - id
 * - notes
 *
 * UI expects: { id, code, name }
 * We'll map:
 *   code = id (temporary)
 *   name = notes || id
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    // If notes doesn't exist (rare), Prisma will throw and we'll see in detail.
    const where = q
      ? {
          notes: { contains: q, mode: "insensitive" as const },
        }
      : undefined;

    const rows = await prisma.service.findMany({
      where,
      select: { id: true, notes: true },
      orderBy: [{ id: "asc" }], // safe
      take: 500,
    });

    const items = rows.map((r) => {
      const id = String(r.id ?? "").trim();
      const notes = String((r as any).notes ?? "").trim();
      return {
        id,
        code: id, // temporary
        name: notes || id,
      };
    });

    return NextResponse.json({ items });
  } catch (err: any) {
    console.error("GET /api/lookups/services failed:", err);

    const isProd = process.env.NODE_ENV === "production";
    return NextResponse.json(
      {
        error: "Failed to load services lookup",
        detail: isProd
          ? undefined
          : {
              name: err?.name,
              code: err?.code,
              message: err?.message,
              meta: err?.meta,
            },
      },
      { status: 500 },
    );
  }
}

// web/app/api/poc/resolve/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pocNumberRaw = (url.searchParams.get("pocNumber") || "").trim();

    if (!pocNumberRaw) {
      return NextResponse.json(
        { ok: false, error: "MISSING_POC_NUMBER", detail: "pocNumber is required." },
        { status: 400 }
      );
    }

    // NOTE:
    // Adjust the `where` field name if your Prisma model uses a different column name.
    // We assume Prisma field is `pocNumber` and stored as string or number-like string.
    const poc = await prisma.poc.findFirst({
      where: {
        pocNumber: pocNumberRaw,
      } as any,
      select: {
        id: true,
        individualId: true,
        pocNumber: true,
        startDate: true,
        stopDate: true,
      } as any,
    });

    if (!poc) {
      return NextResponse.json(
        {
          ok: false,
          error: "POC_NOT_FOUND",
          detail: `POC not found for pocNumber=${pocNumberRaw}`,
        },
        { status: 404 }
      );
    }

    // normalize dates to YYYY-MM-DD
    const toYmd = (v: any) => {
      if (!v) return null;
      const s = String(v).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return null;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    };

    return NextResponse.json({
      ok: true,
      pocId: poc.id,
      individualId: poc.individualId,
      pocNumber: String((poc as any).pocNumber ?? pocNumberRaw),
      pocStart: toYmd((poc as any).startDate),
      pocStop: toYmd((poc as any).stopDate),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "RESOLVE_FAILED", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
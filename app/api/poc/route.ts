// web/app/api/poc/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonError(message: string, status = 500, detail?: any) {
  return NextResponse.json(
    { error: message, detail: detail ? String(detail) : undefined },
    { status }
  );
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const individualId = (searchParams.get("individualId") || "").trim();

    if (!individualId) {
      return jsonError("Missing required query: individualId", 400);
    }

    const items = await prisma.poc.findMany({
      where: { individualId },
      orderBy: { createdAt: "desc" },
      include: {
        duties: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json({ items });
  } catch (e: any) {
    console.error("GET /api/poc error:", e);
    return jsonError("Internal Server Error (GET /api/poc)", 500, e?.message || e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const individualId = String(body?.individualId || "").trim();
    const pocNumber = String(body?.pocNumber || "").trim();
    const startDate = String(body?.startDate || "").trim();

    if (!individualId) return jsonError("individualId is required", 400);
    if (!pocNumber) return jsonError("pocNumber is required", 400);
    if (!startDate) return jsonError("startDate is required", 400);

    const stopDate = body?.stopDate ? String(body.stopDate) : null;
    const shift = String(body?.shift || "All");
    const note = body?.note ? String(body.note) : null;
    const createdBy = body?.createdBy ? String(body.createdBy) : null;

    const duties = Array.isArray(body?.duties) ? body.duties : [];

    const created = await prisma.$transaction(async (tx) => {
      const poc = await tx.poc.create({
        data: {
          individualId,
          pocNumber,
          startDate: new Date(startDate),
          stopDate: stopDate ? new Date(stopDate) : null,
          shift,
          note,
          createdBy,
        },
      });

      if (duties.length > 0) {
        await tx.pocDuty.createMany({
          data: duties.map((d: any) => ({
            pocId: poc.id,
            category: String(d?.category ?? ""),
            taskNo: Number(d?.taskNo ?? 0),
            duty: String(d?.duty ?? ""),
            minutes: d?.minutes === null || d?.minutes === undefined ? null : Number(d.minutes),
            asNeeded: Boolean(d?.asNeeded ?? false),
            timesWeekMin: d?.timesWeekMin === null || d?.timesWeekMin === undefined ? null : Number(d.timesWeekMin),
            timesWeekMax: d?.timesWeekMax === null || d?.timesWeekMax === undefined ? null : Number(d.timesWeekMax),
            daysOfWeek: d?.daysOfWeek ?? null,
            instruction: d?.instruction ? String(d.instruction) : null,
            sortOrder: Number(d?.sortOrder ?? 0),
          })),
        });
      }

      return poc;
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    console.error("POST /api/poc error:", e);

    const msg = String(e?.message || e || "");
    if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("duplicate")) {
      return jsonError("Duplicate / Unique constraint error", 409, msg);
    }

    return jsonError("Internal Server Error (POST /api/poc)", 500, e?.message || e);
  }
}

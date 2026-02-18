// web/app/api/poc/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonError(message: string, status = 500, detail?: any) {
  return NextResponse.json(
    { error: message, detail: detail ? String(detail) : undefined },
    { status }
  );
}

async function getIdFromCtx(ctx: any): Promise<string> {
  // Next.js app router newer versions: ctx.params can be a Promise
  const p = await ctx?.params;
  return String(p?.id || "").trim();
}

export async function GET(_req: Request, ctx: any) {
  try {
    const id = await getIdFromCtx(ctx);
    if (!id) return jsonError("Missing id", 400);

    const poc = await prisma.poc.findUnique({
      where: { id },
      include: {
        duties: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!poc) return jsonError("POC not found", 404);
    return NextResponse.json({ item: poc });
  } catch (e: any) {
    console.error("GET /api/poc/[id] error:", e);
    return jsonError("Internal Server Error (GET /api/poc/[id])", 500, e?.message || e);
  }
}

export async function PATCH(req: Request, ctx: any) {
  try {
    const id = await getIdFromCtx(ctx);
    if (!id) return jsonError("Missing id", 400);

    const body = await req.json();

    const startDate = body?.startDate ? String(body.startDate).trim() : null;
    const stopDate = body?.stopDate ? String(body.stopDate).trim() : null;
    const shift = body?.shift ? String(body.shift) : undefined;
    const note = body?.note === null || body?.note === undefined ? null : String(body.note);
    const duties = Array.isArray(body?.duties) ? body.duties : [];

    await prisma.$transaction(async (tx) => {
      await tx.poc.update({
        where: { id },
        data: {
          ...(startDate ? { startDate: new Date(startDate) } : {}),
          stopDate: stopDate ? new Date(stopDate) : null,
          ...(shift !== undefined ? { shift } : {}),
          note,
        },
      });

      // Simple approach (safe, predictable): replace duties
      await tx.pocDuty.deleteMany({ where: { pocId: id } });

      if (duties.length > 0) {
        await tx.pocDuty.createMany({
          data: duties.map((d: any) => ({
            pocId: id,
            category: String(d?.category ?? ""),
            taskNo: Number(d?.taskNo ?? 0),
            duty: String(d?.duty ?? ""),
            minutes:
              d?.minutes === null || d?.minutes === undefined ? null : Number(d.minutes),
            asNeeded: Boolean(d?.asNeeded ?? false),
            timesWeekMin:
              d?.timesWeekMin === null || d?.timesWeekMin === undefined
                ? null
                : Number(d.timesWeekMin),
            timesWeekMax:
              d?.timesWeekMax === null || d?.timesWeekMax === undefined
                ? null
                : Number(d.timesWeekMax),
            daysOfWeek: d?.daysOfWeek ?? null, // JSON
            instruction: d?.instruction ? String(d.instruction) : null,
            sortOrder: Number(d?.sortOrder ?? 0),
          })),
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("PATCH /api/poc/[id] error:", e);
    const msg = String(e?.message || e || "");
    if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("duplicate")) {
      return jsonError("Duplicate / Unique constraint error", 409, msg);
    }
    return jsonError("Internal Server Error (PATCH /api/poc/[id])", 500, e?.message || e);
  }
}

export async function DELETE(_req: Request, ctx: any) {
  try {
    const id = await getIdFromCtx(ctx);
    if (!id) return jsonError("Missing id", 400);

    await prisma.$transaction(async (tx) => {
      await tx.pocDuty.deleteMany({ where: { pocId: id } });
      await tx.poc.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /api/poc/[id] error:", e);
    return jsonError("Internal Server Error (DELETE /api/poc/[id])", 500, e?.message || e);
  }
}

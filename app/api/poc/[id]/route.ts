// web/app/api/poc/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonError(message: string, status = 500, detail?: any) {
  return NextResponse.json(
    { error: message, detail: detail ? String(detail) : undefined },
    { status }
  );
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  try {
    const id = String(ctx?.params?.id || "").trim();
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

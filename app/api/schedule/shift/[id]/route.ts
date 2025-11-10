// app/api/schedule/shift/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: { id: string };
};

/**
 * PUT /api/schedule/shift/:id
 * Cập nhật một shift trong weekly schedule
 * Body có thể chứa: plannedStart, plannedEnd, status, notes
 */
export async function PUT(req: Request, context: RouteContext) {
  const shiftId = context.params.id;

  try {
    const body = await req.json();

    const data: any = {};

    if (body.plannedStart) {
      data.plannedStart = new Date(body.plannedStart);
    }
    if (body.plannedEnd) {
      data.plannedEnd = new Date(body.plannedEnd);
    }
    if (typeof body.status === "string") {
      data.status = body.status;
    }
    if (typeof body.notes === "string") {
      data.notes = body.notes;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const updated = await prisma.scheduleShift.update({
      where: { id: shiftId },
      data,
      include: {
        service: true,
        plannedDsp: true,
        actualDsp: true,
        visits: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT /api/schedule/shift/[id] error:", error);
    return NextResponse.json(
      {
        error: "Failed to update shift",
        detail: String(error?.message || error),
      },
      { status: 500 }
    );
  }
}

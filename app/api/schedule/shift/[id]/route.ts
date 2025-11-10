// app/api/schedule/shift/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: { id: string };
};

export async function PUT(req: Request, { params }: RouteParams) {
  const { id } = params;

  try {
    const body = await req.json();

    const {
      serviceId,
      plannedDspId,
      plannedStart,
      plannedEnd,
      status,
      notes,
      checkInAt,
      checkOutAt,
    } = body ?? {};

    const data: any = {};
    if (serviceId) data.serviceId = serviceId;
    if ("plannedDspId" in body) data.plannedDspId = plannedDspId ?? null;
    if (plannedStart) data.plannedStart = plannedStart;
    if (plannedEnd) data.plannedEnd = plannedEnd;
    if (status) data.status = status;
    if ("notes" in body) data.notes = notes;

    // update shift chính
    await prisma.scheduleShift.update({
      where: { id },
      data,
    });

    // Handle Check-in / Check-out → Visit
    if (checkInAt || checkOutAt) {
      let visit = await prisma.visit.findFirst({
        where: { shiftId: id },
        orderBy: { checkInAt: "asc" },
      });

      if (!visit) {
        visit = await prisma.visit.create({
          data: {
            shiftId: id,
            checkInAt: checkInAt ?? plannedStart ?? new Date().toISOString(),
            checkOutAt: checkOutAt ?? null,
            units: 0,
          },
        });
      } else {
        visit = await prisma.visit.update({
          where: { id: visit.id },
          data: {
            checkInAt: checkInAt ?? visit.checkInAt,
            checkOutAt: checkOutAt ?? visit.checkOutAt,
          },
        });
      }

      // tính lại units nếu đủ in/out
      if (visit.checkInAt && visit.checkOutAt) {
        const mins =
          (new Date(visit.checkOutAt).getTime() -
            new Date(visit.checkInAt).getTime()) /
          (1000 * 60);
        const units = Math.max(0, Math.round(mins / 15));

        await prisma.visit.update({
          where: { id: visit.id },
          data: { units },
        });
      }
    }

    const full = await prisma.scheduleShift.findUnique({
      where: { id },
      include: {
        service: true,
        plannedDsp: true,
        actualDsp: true,
        visits: true,
      },
    });

    return NextResponse.json(full);
  } catch (err: any) {
    console.error("Update shift error:", err);
    return NextResponse.json(
      {
        error: "UPDATE_SHIFT_FAILED",
        detail: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}

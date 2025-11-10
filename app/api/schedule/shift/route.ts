// app/api/schedule/shift/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      weekId,
      scheduleDate,
      serviceId,
      plannedDspId,
      plannedStart,
      plannedEnd,
      status,
      notes,
      checkInAt,
      checkOutAt,
    } = body ?? {};

    if (
      !weekId ||
      !scheduleDate ||
      !serviceId ||
      !plannedStart ||
      !plannedEnd
    ) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    const created = await prisma.scheduleShift.create({
      data: {
        weekId,
        scheduleDate,
        serviceId,
        plannedDspId: plannedDspId ?? null,
        plannedStart,
        plannedEnd,
        status: status ?? "NOT_STARTED",
        billable: true,
        notes: notes ?? null,
      },
    });

    // nếu có check-in/out thì tạo Visit luôn
    if (checkInAt || checkOutAt) {
      let visit = await prisma.visit.create({
        data: {
          shiftId: created.id,
          checkInAt: checkInAt ?? plannedStart,
          checkOutAt: checkOutAt ?? null,
          units: 0,
        },
      });

      if (visit.checkInAt && visit.checkOutAt) {
        const mins =
          (new Date(visit.checkOutAt).getTime() -
            new Date(visit.checkInAt).getTime()) /
          (1000 * 60);
        const units = Math.max(0, Math.round(mins / 15));

        visit = await prisma.visit.update({
          where: { id: visit.id },
          data: { units },
        });
      }
    }

    const full = await prisma.scheduleShift.findUnique({
      where: { id: created.id },
      include: {
        service: true,
        plannedDsp: true,
        actualDsp: true,
        visits: true,
      },
    });

    return NextResponse.json(full, { status: 201 });
  } catch (err: any) {
    console.error("Create shift error:", err);
    return NextResponse.json(
      {
        error: "CREATE_SHIFT_FAILED",
        detail: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}

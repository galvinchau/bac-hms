// app/api/schedule/shift/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const body = (rawBody && typeof rawBody === "object") ? rawBody : {};

    const {
      weekId,
      individualId, // FE đang gửi thêm field này
      scheduleDate,
      serviceId,
      // FE gửi dspId, file cũ dùng plannedDspId → support cả 2
      dspId,
      plannedDspId,
      plannedStart,
      plannedEnd,
      status,
      notes,
      checkInAt,
      checkOutAt,
    } = body as {
      weekId?: string;
      individualId?: string;
      scheduleDate?: string;
      serviceId?: string;
      dspId?: string | null;
      plannedDspId?: string | null;
      plannedStart?: string;
      plannedEnd?: string;
      status?: string;
      notes?: string | null;
      checkInAt?: string | null;
      checkOutAt?: string | null;
    };

    // Validate các field bắt buộc (giống file gốc)
    if (
      !weekId ||
      !scheduleDate ||
      !serviceId ||
      !plannedStart ||
      !plannedEnd
    ) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    // Ưu tiên dspId (FE) nếu có, fallback về plannedDspId
    const effectiveDspId =
      (typeof dspId !== "undefined" ? dspId : plannedDspId) ?? null;

    // Tạo ScheduleShift
    const created = await prisma.scheduleShift.create({
      data: {
        weekId,
        scheduleDate: new Date(scheduleDate),
        serviceId,
        plannedDspId: effectiveDspId,
        plannedStart: new Date(plannedStart),
        plannedEnd: new Date(plannedEnd),
        status: status ?? "NOT_STARTED",
        billable: true,
        notes: notes ?? null,
        // chỉ set individualId nếu FE gửi, tránh đụng schema nếu field optional
        ...(individualId ? { individualId } : {}),
      },
    });

    // nếu có check-in/out thì tạo Visit luôn
    if (checkInAt || checkOutAt) {
      let visit = await prisma.visit.create({
        data: {
          shiftId: created.id,
          checkInAt: checkInAt
            ? new Date(checkInAt)
            : new Date(plannedStart),
          checkOutAt: checkOutAt ? new Date(checkOutAt) : null,
          units: 0,
        },
      });

      // tính lại units nếu đủ in/out
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

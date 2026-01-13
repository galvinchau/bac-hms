// app/api/schedule/shift/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const body = rawBody && typeof rawBody === "object" ? rawBody : {};

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
          checkInAt: checkInAt ? new Date(checkInAt) : new Date(plannedStart),
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

// ======================================================
// ✅ ADD: PUT (update shift) — minimal, không đụng POST
// ======================================================
export async function PUT(req: Request) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const body = rawBody && typeof rawBody === "object" ? rawBody : {};

    const {
      shiftId, // FE đang gửi shiftId
      id, // allow legacy
      serviceId,
      dspId,
      plannedDspId,
      plannedStart,
      plannedEnd,
      status,
      notes,
      checkInAt,
      checkOutAt,
    } = body as {
      shiftId?: string;
      id?: string;
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

    const effectiveShiftId = shiftId || id;
    if (!effectiveShiftId) {
      return NextResponse.json({ error: "MISSING_SHIFT_ID" }, { status: 400 });
    }

    // Tìm shift hiện tại
    const existing = await prisma.scheduleShift.findUnique({
      where: { id: effectiveShiftId },
      include: { visits: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "SHIFT_NOT_FOUND" }, { status: 404 });
    }

    // Ưu tiên dspId (FE) nếu có, fallback về plannedDspId
    const effectiveDspId = typeof dspId !== "undefined" ? dspId : plannedDspId;

    // Update shift (chỉ update field nào FE gửi lên)
    await prisma.scheduleShift.update({
      where: { id: existing.id },
      data: {
        ...(serviceId ? { serviceId } : {}),
        ...(typeof effectiveDspId !== "undefined"
          ? { plannedDspId: effectiveDspId ?? null }
          : {}),
        ...(plannedStart ? { plannedStart: new Date(plannedStart) } : {}),
        ...(plannedEnd ? { plannedEnd: new Date(plannedEnd) } : {}),
        ...(status ? { status } : {}),
        ...(typeof notes !== "undefined" ? { notes: notes ?? null } : {}),
      },
    });

    // Nếu có update checkIn/checkOut thì update/create visit đầu tiên
    if (typeof checkInAt !== "undefined" || typeof checkOutAt !== "undefined") {
      const firstVisit = await prisma.visit.findFirst({
        where: { shiftId: existing.id },
        orderBy: { checkInAt: "asc" },
      });

      const nextCheckIn =
        typeof checkInAt !== "undefined"
          ? checkInAt
            ? new Date(checkInAt)
            : null
          : firstVisit?.checkInAt ?? null;

      const nextCheckOut =
        typeof checkOutAt !== "undefined"
          ? checkOutAt
            ? new Date(checkOutAt)
            : null
          : firstVisit?.checkOutAt ?? null;

      // Recalc units
      let units = 0;
      if (nextCheckIn && nextCheckOut) {
        const mins =
          (nextCheckOut.getTime() - nextCheckIn.getTime()) / (1000 * 60);
        units = Math.max(0, Math.round(mins / 15));
      }

      if (firstVisit) {
        await prisma.visit.update({
          where: { id: firstVisit.id },
          data: {
            ...(typeof checkInAt !== "undefined"
              ? { checkInAt: nextCheckIn ?? firstVisit.checkInAt }
              : {}),
            ...(typeof checkOutAt !== "undefined"
              ? { checkOutAt: nextCheckOut }
              : {}),
            units,
          },
        });
      } else {
        // Nếu admin chỉ nhập checkOut mà không có checkIn → fallback plannedStart
        const fallbackCheckIn =
          nextCheckIn ??
          (plannedStart ? new Date(plannedStart) : existing.plannedStart);

        await prisma.visit.create({
          data: {
            shiftId: existing.id,
            checkInAt: fallbackCheckIn,
            checkOutAt: nextCheckOut,
            units,
          },
        });
      }
    }

    const full = await prisma.scheduleShift.findUnique({
      where: { id: existing.id },
      include: {
        service: true,
        plannedDsp: true,
        actualDsp: true,
        visits: true,
      },
    });

    return NextResponse.json(full, { status: 200 });
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

// ======================================================
// ✅ ADD: DELETE (delete shift) — minimal, không đụng POST
// ======================================================
export async function DELETE(req: Request) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const body = rawBody && typeof rawBody === "object" ? rawBody : {};

    const { shiftId, id } = body as { shiftId?: string; id?: string };
    const effectiveShiftId = shiftId || id;

    if (!effectiveShiftId) {
      return NextResponse.json({ error: "MISSING_SHIFT_ID" }, { status: 400 });
    }

    const existing = await prisma.scheduleShift.findUnique({
      where: { id: effectiveShiftId },
    });

    if (!existing) {
      return NextResponse.json({ error: "SHIFT_NOT_FOUND" }, { status: 404 });
    }

    // Xóa visits trước rồi xóa shift
    await prisma.$transaction([
      prisma.visit.deleteMany({ where: { shiftId: existing.id } }),
      prisma.scheduleShift.delete({ where: { id: existing.id } }),
    ]);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("Delete shift error:", err);
    return NextResponse.json(
      {
        error: "DELETE_SHIFT_FAILED",
        detail: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}

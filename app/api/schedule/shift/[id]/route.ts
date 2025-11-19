// app/api/schedule/shift/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VisitSource } from "@prisma/client";

/**
 * Helper: cố gắng lấy shiftId từ cả params lẫn URL (phòng hờ)
 */
function getShiftId(req: Request, context?: any): string | null {
  const paramId = context?.params?.id;
  if (paramId) return paramId;

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    // /api/schedule/shift/:id  → phần cuối là id
    const last = parts[parts.length - 1];
    return last || null;
  } catch {
    return null;
  }
}

export async function PUT(req: Request, context: any) {
  const id = getShiftId(req, context);

  if (!id) {
    return NextResponse.json({ error: "MISSING_SHIFT_ID" }, { status: 400 });
  }

  try {
    const rawBody = await req.json().catch(() => ({}));
    const body = rawBody && typeof rawBody === "object" ? rawBody : ({} as any);

    const {
      serviceId,
      // FE đang gửi dspId, nhưng vẫn support cả plannedDspId cho tương thích
      dspId,
      plannedDspId,
      plannedStart,
      plannedEnd,
      status,
      notes,
      checkInAt,
      checkOutAt,
    } = body as {
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

    const data: any = {};

    if (serviceId) data.serviceId = serviceId;

    // Ưu tiên dspId (FE) nếu có, nếu không thì fallback plannedDspId
    if ("dspId" in body || "plannedDspId" in body) {
      const effectiveDspId =
        (typeof dspId !== "undefined" ? dspId : plannedDspId) ?? null;
      data.plannedDspId = effectiveDspId;
    }

    if (plannedStart) data.plannedStart = new Date(plannedStart);
    if (plannedEnd) data.plannedEnd = new Date(plannedEnd);

    // ===== AUTO STATUS ƯU TIÊN THEO CHECK IN / OUT =====
    let autoStatus: string | undefined;
    if (checkInAt && checkOutAt) {
      autoStatus = "COMPLETED";
    } else if (checkInAt && !checkOutAt) {
      autoStatus = "IN_PROGRESS";
    }

    if (autoStatus) {
      data.status = autoStatus;
    } else if (status) {
      // chỉ dùng status gửi tay khi không có checkIn/checkOut
      data.status = status;
    }

    if ("notes" in body) data.notes = notes ?? null;

    // Cập nhật shift trước
    const updatedShift = await prisma.scheduleShift.update({
      where: { id },
      data,
    });

    // ===== Handle Check-in / Check-out → Visit =====
    if (checkInAt || checkOutAt) {
      const checkInDate = checkInAt ? new Date(checkInAt) : undefined;
      const checkOutDate = checkOutAt ? new Date(checkOutAt) : undefined;

      // Lấy DSP cho visit: ưu tiên actualDsp, nếu không có thì plannedDsp
      const dspForVisit = updatedShift.actualDspId ?? updatedShift.plannedDspId;

      if (!dspForVisit) {
        console.warn(
          "[Visit OFFICE_EDIT] Skip create because no DSP assigned for shift",
          id
        );
      } else {
        let visit = await prisma.visit.findFirst({
          where: { scheduleShiftId: id },
          orderBy: { checkInAt: "asc" },
        });

        if (!visit) {
          // Tạo visit mới
          visit = await prisma.visit.create({
            data: {
              scheduleShiftId: id,
              individualId: updatedShift.individualId,
              dspId: dspForVisit,
              serviceId: updatedShift.serviceId,
              checkInAt:
                checkInDate ??
                (plannedStart ? new Date(plannedStart) : new Date()),
              checkOutAt: checkOutDate ?? null,
              source: VisitSource.OFFICE_EDIT,
              durationMinutes: null,
              units: null,
              isBillable: true,
            },
          });
        } else {
          // Cập nhật visit cũ
          visit = await prisma.visit.update({
            where: { id: visit.id },
            data: {
              checkInAt: checkInDate ?? visit.checkInAt,
              checkOutAt: checkOutDate ?? visit.checkOutAt,
              source: VisitSource.OFFICE_EDIT,
            },
          });
        }

        // Tính lại duration + units nếu đủ in/out
        if (visit.checkInAt && visit.checkOutAt) {
          const mins =
            (new Date(visit.checkOutAt).getTime() -
              new Date(visit.checkInAt).getTime()) /
            (1000 * 60);
          const safeMinutes = Math.max(0, Math.round(mins));
          const units = Math.max(0, Math.round(safeMinutes / 15));

          await prisma.visit.update({
            where: { id: visit.id },
            data: {
              durationMinutes: safeMinutes,
              units,
              isBillable: true,
            },
          });
        }
      }
    }

    // Lấy lại full shift (kèm relations) trả về FE
    const full = await prisma.scheduleShift.findUnique({
      where: { id },
      include: {
        service: true,
        plannedDsp: true,
        actualDsp: true,
        visits: true,
      },
    });

    if (!full) {
      return NextResponse.json({ error: "SHIFT_NOT_FOUND" }, { status: 404 });
    }

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

export async function DELETE(req: Request, context: any) {
  const id = getShiftId(req, context);

  if (!id) {
    return NextResponse.json({ error: "MISSING_SHIFT_ID" }, { status: 400 });
  }

  try {
    await prisma.scheduleShift.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Delete shift error:", err);

    // Nếu record không tồn tại nữa thì coi như xoá thành công
    if ((err as any)?.code === "P2025") {
      return NextResponse.json({
        ok: true,
        warning: "SHIFT_ALREADY_DELETED",
      });
    }

    return NextResponse.json(
      {
        error: "DELETE_SHIFT_FAILED",
        detail: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}

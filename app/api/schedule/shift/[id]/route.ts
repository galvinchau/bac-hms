// app/api/schedule/shift/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    if (status) data.status = status;
    if ("notes" in body) data.notes = notes ?? null;

    // Cập nhật shift, lấy lại bản ghi sau update để dùng cho Visit
    const updatedShift = await prisma.scheduleShift.update({
      where: { id },
      data,
    });

    // Handle Check-in / Check-out → Visit
    if (checkInAt || checkOutAt) {
      const checkInDate = checkInAt ? new Date(checkInAt) : undefined;
      const checkOutDate = checkOutAt ? new Date(checkOutAt) : undefined;

      // DSP thực tế cho Visit: ưu tiên actualDsp, nếu chưa có thì plannedDsp
      const effectiveDspId =
        updatedShift.actualDspId ?? updatedShift.plannedDspId ?? null;

      if (!effectiveDspId) {
        // Không có DSP thì không thể tạo Visit được
        return NextResponse.json(
          { error: "MISSING_DSP_FOR_VISIT" },
          { status: 400 }
        );
      }

      // Tìm visit gắn với ca này (nếu đã có)
      let visit = await prisma.visit.findFirst({
        where: { scheduleShiftId: id }, // ✅ đúng field trong schema
        orderBy: { checkInAt: "asc" },
      });

      if (!visit) {
        // Chưa có Visit → tạo mới
        visit = await prisma.visit.create({
          data: {
            scheduleShiftId: id,
            individualId: updatedShift.individualId,
            dspId: effectiveDspId,
            serviceId: updatedShift.serviceId,
            checkInAt:
              checkInDate ??
              (plannedStart ? new Date(plannedStart) : new Date()),
            checkOutAt: checkOutDate ?? null,
            source: "OFFICE_EDIT", // enum VisitSource
          },
        });
      } else {
        // Đã có Visit → cập nhật, đồng thời gắn scheduleShiftId nếu trước đó chưa có
        visit = await prisma.visit.update({
          where: { id: visit.id },
          data: {
            scheduleShiftId: visit.scheduleShiftId ?? id,
            checkInAt: checkInDate ?? visit.checkInAt,
            checkOutAt: checkOutDate ?? visit.checkOutAt,
            // Bổ sung thông tin nếu còn trống
            individualId: visit.individualId ?? updatedShift.individualId,
            dspId: visit.dspId ?? effectiveDspId,
            serviceId: visit.serviceId ?? updatedShift.serviceId,
          },
        });
      }

      // Tính lại durationMinutes + units nếu đủ in/out
      if (visit.checkInAt && visit.checkOutAt) {
        const mins =
          (new Date(visit.checkOutAt).getTime() -
            new Date(visit.checkInAt).getTime()) /
          (1000 * 60);
        const durationMinutes = Math.max(0, Math.round(mins));
        const units = Math.max(0, Math.round(durationMinutes / 15));

        await prisma.visit.update({
          where: { id: visit.id },
          data: {
            durationMinutes,
            units,
          },
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

    if (!full) {
      return NextResponse.json(
        { error: "SHIFT_NOT_FOUND" },
        { status: 404 }
      );
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
    // Nếu DB chưa set ON DELETE CASCADE cho visit.scheduleShiftId
    // thì có thể mở lại đoạn dưới để xoá Visit trước:
    //
    // await prisma.visit.deleteMany({
    //   where: { scheduleShiftId: id },
    // });

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

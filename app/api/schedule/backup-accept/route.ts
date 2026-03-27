// bac-hms/web/app/api/schedule/backup-accept/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/schedule/backup-accept
 *
 * Body:
 * {
 *   shiftId: string;
 *   employeeId: string;
 * }
 *
 * Logic:
 * - Chỉ cho accept nếu shift còn đang mở:
 *   + isBackupPlanShift = true
 *   + plannedDspId = null
 *   + actualDspId = null
 *   + status = NOT_STARTED
 * - Khi accept thành công:
 *   + plannedDspId = employeeId
 *   + actualDspId = employeeId
 *   + isBackupPlanShift = false
 *   + wasBackupPlanShift = true
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const body = rawBody && typeof rawBody === "object" ? rawBody : {};

    const { shiftId, employeeId } = body as {
      shiftId?: string;
      employeeId?: string;
    };

    if (!shiftId || !employeeId) {
      return NextResponse.json(
        { error: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    const updatedShift = await prisma.$transaction(async (tx) => {
      const shift = await tx.scheduleShift.findUnique({
        where: { id: shiftId },
        include: {
          service: true,
          plannedDsp: true,
          actualDsp: true,
          visits: true,
        },
      });

      if (!shift) {
        throw new Error("SHIFT_NOT_FOUND");
      }

      const isStillOpen =
        shift.isBackupPlanShift === true &&
        shift.plannedDspId === null &&
        shift.actualDspId === null &&
        shift.status === "NOT_STARTED";

      if (!isStillOpen) {
        throw new Error("SHIFT_ALREADY_CLAIMED");
      }

      const updated = await tx.scheduleShift.update({
        where: { id: shiftId },
        data: {
          plannedDspId: employeeId,
          actualDspId: employeeId,
          isBackupPlanShift: false,
          wasBackupPlanShift: true,
        },
        include: {
          service: true,
          plannedDsp: true,
          actualDsp: true,
          visits: true,
        },
      });

      return updated;
    });

    return NextResponse.json(
      {
        ok: true,
        shift: updatedShift,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("POST /api/schedule/backup-accept error:", err);

    const message = String(err?.message || err);

    if (message === "SHIFT_NOT_FOUND") {
      return NextResponse.json(
        { error: "SHIFT_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (message === "SHIFT_ALREADY_CLAIMED") {
      return NextResponse.json(
        {
          error: "SHIFT_ALREADY_CLAIMED",
          detail: "This shift has already been claimed by another DSP.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "FAILED_TO_ACCEPT_BACKUP_SHIFT",
        detail: message,
      },
      { status: 500 }
    );
  }
}
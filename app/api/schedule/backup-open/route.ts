// bac-hms/web/app/api/schedule/backup-open/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/schedule/backup-open
 *
 * Trả về các backup shift đang mở để Mobile/Web có thể hiển thị alert:
 * - isBackupPlanShift = true
 * - plannedDspId = null
 * - actualDspId = null
 * - status = NOT_STARTED
 */
export async function GET() {
  try {
    const shifts = await prisma.scheduleShift.findMany({
      where: {
        isBackupPlanShift: true,
        plannedDspId: null,
        actualDspId: null,
        status: "NOT_STARTED",
      },
      include: {
        individual: true,
        service: true,
      },
      orderBy: [
        { scheduleDate: "asc" },
        { plannedStart: "asc" },
      ],
    });

    const items = shifts.map((shift) => ({
      id: shift.id,
      weekId: shift.weekId,
      individualId: shift.individualId,
      individualName: `${shift.individual.firstName} ${shift.individual.lastName}`.trim(),
      individualCode: shift.individual.code,
      serviceId: shift.serviceId,
      serviceCode: shift.service.serviceCode,
      serviceName: shift.service.serviceName,
      scheduleDate: shift.scheduleDate,
      plannedStart: shift.plannedStart,
      plannedEnd: shift.plannedEnd,
      awakeMonitoringRequired: shift.awakeMonitoringRequired,
      notes: shift.notes,
      backupNote: shift.backupNote,
      status: shift.status,
    }));

    return NextResponse.json(
      {
        ok: true,
        items,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("GET /api/schedule/backup-open error:", err);

    return NextResponse.json(
      {
        error: "FAILED_TO_FETCH_BACKUP_OPEN_SHIFTS",
        detail: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}
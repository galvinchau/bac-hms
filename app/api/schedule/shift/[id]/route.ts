// C:\bac-hms\web\app\api\schedule\shift\[id]\route.ts

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

function formatDateLabel(dateValue?: Date | string | null): string | null {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;

  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function formatTimeLabel(dateValue?: Date | string | null): string | null {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function buildShiftTimeLabel(
  start?: Date | string | null,
  end?: Date | string | null
): string | null {
  const startLabel = formatTimeLabel(start);
  const endLabel = formatTimeLabel(end);

  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  if (startLabel) return startLabel;
  if (endLabel) return endLabel;
  return null;
}

function sameDateTime(
  a?: Date | string | null,
  b?: Date | string | null
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;

  const da = new Date(a);
  const db = new Date(b);

  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return da.getTime() === db.getTime();
}

function sameDateOnly(
  a?: Date | string | null,
  b?: Date | string | null
): boolean {
  const la = formatDateLabel(a);
  const lb = formatDateLabel(b);
  return la === lb;
}

function buildIndividualName(
  individual:
    | {
        firstName?: string | null;
        middleName?: string | null;
        lastName?: string | null;
      }
    | null
    | undefined
): string | null {
  if (!individual) return null;
  const parts = [
    individual.firstName?.trim(),
    individual.middleName?.trim(),
    individual.lastName?.trim(),
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

function buildServiceDisplayName(
  service:
    | {
        serviceCode?: string | null;
        serviceName?: string | null;
      }
    | null
    | undefined
): string | null {
  if (!service) return null;

  if (service.serviceCode && service.serviceName) {
    return `${service.serviceCode} — ${service.serviceName}`;
  }

  return service.serviceName || service.serviceCode || null;
}

type ShiftAlertType =
  | "SHIFT_CANCELLED"
  | "SHIFT_TIME_CHANGED"
  | "SHIFT_REASSIGNED_REMOVED"
  | "SHIFT_REASSIGNED_ASSIGNED"
  | "SHIFT_DETAILS_CHANGED";

function getAlertTitle(alertType: ShiftAlertType): string {
  switch (alertType) {
    case "SHIFT_CANCELLED":
      return "Assigned Shift Cancelled";
    case "SHIFT_TIME_CHANGED":
      return "Assigned Shift Time Updated";
    case "SHIFT_REASSIGNED_REMOVED":
      return "Removed From Assigned Shift";
    case "SHIFT_REASSIGNED_ASSIGNED":
      return "New Assigned Shift";
    case "SHIFT_DETAILS_CHANGED":
      return "Assigned Shift Details Updated";
    default:
      return "Assigned Shift Updated";
  }
}

function getAlertMessage(alertType: ShiftAlertType): string {
  switch (alertType) {
    case "SHIFT_CANCELLED":
      return "Your assigned shift has been cancelled.";
    case "SHIFT_TIME_CHANGED":
      return "Your assigned shift time has been updated.";
    case "SHIFT_REASSIGNED_REMOVED":
      return "You have been removed from this shift.";
    case "SHIFT_REASSIGNED_ASSIGNED":
      return "You have been assigned to this shift.";
    case "SHIFT_DETAILS_CHANGED":
      return "Your assigned shift details have been updated.";
    default:
      return "Your assigned shift has been updated.";
  }
}

async function sendShiftAlertPush(params: {
  staffId: string;
  alertType: ShiftAlertType;
  shiftId: string;
  individualName?: string | null;
  serviceName?: string | null;
  shiftDateLabel?: string | null;
  shiftTimeLabel?: string | null;
  oldShiftTimeLabel?: string | null;
  newShiftTimeLabel?: string | null;
  oldShiftDateLabel?: string | null;
  newShiftDateLabel?: string | null;
  note?: string | null;
}) {
  const baseUrl =
    process.env.BAC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BAC_API_BASE_URL ||
    "https://blueangelscareapi.onrender.com";

  try {
    const res = await fetch(`${baseUrl}/mobile/push/shift-alert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        staffId: params.staffId,
        alertType: params.alertType,
        shiftId: params.shiftId,
        individualName: params.individualName ?? null,
        serviceName: params.serviceName ?? null,
        shiftDateLabel: params.shiftDateLabel ?? null,
        shiftTimeLabel: params.shiftTimeLabel ?? null,
        oldShiftTimeLabel: params.oldShiftTimeLabel ?? null,
        newShiftTimeLabel: params.newShiftTimeLabel ?? null,
        oldShiftDateLabel: params.oldShiftDateLabel ?? null,
        newShiftDateLabel: params.newShiftDateLabel ?? null,
        note: params.note ?? null,
      }),
    });

    const text = await res.text().catch(() => "");

    if (!res.ok) {
      console.error("[SHIFT_ALERT_PUSH] API failed", {
        status: res.status,
        body: text,
        alertType: params.alertType,
        shiftId: params.shiftId,
        staffId: params.staffId,
      });
      return;
    }

    console.log("[SHIFT_ALERT_PUSH] API success", {
      status: res.status,
      body: text,
      alertType: params.alertType,
      shiftId: params.shiftId,
      staffId: params.staffId,
    });
  } catch (err) {
    console.error("[SHIFT_ALERT_PUSH] request failed", {
      alertType: params.alertType,
      shiftId: params.shiftId,
      staffId: params.staffId,
      err,
    });
  }
}

async function createMobileAlertAndPush(params: {
  employeeId: string;
  shiftId: string;
  alertType: ShiftAlertType;
  individualName?: string | null;
  serviceName?: string | null;
  shiftDateLabel?: string | null;
  shiftTimeLabel?: string | null;
  oldShiftTimeLabel?: string | null;
  newShiftTimeLabel?: string | null;
  oldShiftDateLabel?: string | null;
  newShiftDateLabel?: string | null;
  note?: string | null;
}) {
  const title = getAlertTitle(params.alertType);
  const message = getAlertMessage(params.alertType);

  try {
    await prisma.mobileAlert.create({
      data: {
        employeeId: params.employeeId,
        shiftId: params.shiftId,
        type: params.alertType,
        title,
        message,
        note: params.note ?? null,
        individualName: params.individualName ?? null,
        serviceName: params.serviceName ?? null,
        shiftDateLabel: params.shiftDateLabel ?? null,
        shiftTimeLabel: params.shiftTimeLabel ?? null,
        isRead: false,
      },
    });
  } catch (err) {
    console.error("[SHIFT_ALERT] Failed to create mobileAlert", {
      alertType: params.alertType,
      shiftId: params.shiftId,
      employeeId: params.employeeId,
      err,
    });
  }

  await sendShiftAlertPush({
    staffId: params.employeeId,
    alertType: params.alertType,
    shiftId: params.shiftId,
    individualName: params.individualName ?? null,
    serviceName: params.serviceName ?? null,
    shiftDateLabel: params.shiftDateLabel ?? null,
    shiftTimeLabel: params.shiftTimeLabel ?? null,
    oldShiftTimeLabel: params.oldShiftTimeLabel ?? null,
    newShiftTimeLabel: params.newShiftTimeLabel ?? null,
    oldShiftDateLabel: params.oldShiftDateLabel ?? null,
    newShiftDateLabel: params.newShiftDateLabel ?? null,
    note: params.note ?? null,
  });
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
      dspId,
      plannedDspId,
      plannedStart,
      plannedEnd,
      scheduleDate,
      status,
      notes,
      checkInAt,
      checkOutAt,
      awakeMonitoringRequired,
      isBackupPlanShift,
      serviceAddressType,
    } = body as {
      serviceId?: string;
      dspId?: string | null;
      plannedDspId?: string | null;
      plannedStart?: string;
      plannedEnd?: string;
      scheduleDate?: string;
      status?: string;
      notes?: string | null;
      checkInAt?: string | null;
      checkOutAt?: string | null;
      awakeMonitoringRequired?: boolean;
      isBackupPlanShift?: boolean;
      serviceAddressType?: "PRIMARY" | "SECONDARY";
    };

    const normalizedServiceAddressType =
      serviceAddressType === "SECONDARY" ? "SECONDARY" : "PRIMARY";

    // Đọc shift cũ trước khi update để detect schedule changes
    const existingShift = await prisma.scheduleShift.findUnique({
      where: { id },
      include: {
        service: true,
        individual: true,
        plannedDsp: true,
        actualDsp: true,
      },
    });

    if (!existingShift) {
      return NextResponse.json({ error: "SHIFT_NOT_FOUND" }, { status: 404 });
    }

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
    if (scheduleDate) data.scheduleDate = new Date(scheduleDate);

    if ("awakeMonitoringRequired" in body) {
      data.awakeMonitoringRequired = !!awakeMonitoringRequired;
    }

    if ("isBackupPlanShift" in body) {
      data.isBackupPlanShift = !!isBackupPlanShift;
    }

    if ("serviceAddressType" in body) {
      data.serviceAddressType = normalizedServiceAddressType;
    }

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

    // ===== Schedule change mobile alerts + push notifications =====
    const oldStatus = String(existingShift.status || "");
    const newStatus = String(updatedShift.status || "");
    const movedIntoCancelled =
      oldStatus !== "CANCELLED" && newStatus === "CANCELLED";

    const oldPlannedDspId = existingShift.plannedDspId ?? null;
    const newPlannedDspId = updatedShift.plannedDspId ?? null;
    const plannedDspChanged = oldPlannedDspId !== newPlannedDspId;

    const plannedStartChanged = !sameDateTime(
      existingShift.plannedStart,
      updatedShift.plannedStart
    );
    const plannedEndChanged = !sameDateTime(
      existingShift.plannedEnd,
      updatedShift.plannedEnd
    );
    const timeChanged = plannedStartChanged || plannedEndChanged;

    const dateChanged = !sameDateOnly(
      existingShift.scheduleDate,
      updatedShift.scheduleDate
    );

    const serviceChanged =
      String(existingShift.serviceId || "") !== String(updatedShift.serviceId || "");

    const detailsChanged = serviceChanged || dateChanged;

    const serviceForAlert =
      serviceId && serviceId !== existingShift.serviceId
        ? await prisma.service.findUnique({
            where: { id: serviceId },
            select: {
              serviceCode: true,
              serviceName: true,
            },
          })
        : existingShift.service;

    const individualName = buildIndividualName(existingShift.individual);
    const serviceDisplayName = buildServiceDisplayName(serviceForAlert);

    const oldDateLabel = formatDateLabel(existingShift.scheduleDate);
    const newDateLabel = formatDateLabel(updatedShift.scheduleDate);
    const currentDateLabel = newDateLabel ?? oldDateLabel;

    const oldTimeLabel = buildShiftTimeLabel(
      existingShift.plannedStart,
      existingShift.plannedEnd
    );

    const newTimeLabel = buildShiftTimeLabel(
      updatedShift.plannedStart,
      updatedShift.plannedEnd
    );

    const currentTimeLabel = newTimeLabel ?? oldTimeLabel;

    if (movedIntoCancelled) {
      // Ưu tiên actualDspId, fallback plannedDspId
      const targetEmployeeId =
        updatedShift.actualDspId ??
        existingShift.actualDspId ??
        updatedShift.plannedDspId ??
        existingShift.plannedDspId;

      if (targetEmployeeId) {
        await createMobileAlertAndPush({
          employeeId: targetEmployeeId,
          shiftId: updatedShift.id,
          alertType: "SHIFT_CANCELLED",
          individualName,
          serviceName: serviceDisplayName,
          shiftDateLabel: currentDateLabel,
          shiftTimeLabel: currentTimeLabel,
          note: updatedShift.notes ?? null,
        });
      } else {
        console.warn(
          "[SHIFT_CANCEL_ALERT] Skip alert because no assigned DSP found for shift",
          updatedShift.id
        );
      }
    } else {
      if (plannedDspChanged) {
        if (oldPlannedDspId) {
          await createMobileAlertAndPush({
            employeeId: oldPlannedDspId,
            shiftId: updatedShift.id,
            alertType: "SHIFT_REASSIGNED_REMOVED",
            individualName,
            serviceName: serviceDisplayName,
            shiftDateLabel: currentDateLabel,
            shiftTimeLabel: currentTimeLabel,
            note: updatedShift.notes ?? null,
          });
        }

        if (newPlannedDspId) {
          await createMobileAlertAndPush({
            employeeId: newPlannedDspId,
            shiftId: updatedShift.id,
            alertType: "SHIFT_REASSIGNED_ASSIGNED",
            individualName,
            serviceName: serviceDisplayName,
            shiftDateLabel: currentDateLabel,
            shiftTimeLabel: currentTimeLabel,
            note: updatedShift.notes ?? null,
          });
        }
      } else {
        const targetEmployeeId =
          updatedShift.actualDspId ??
          existingShift.actualDspId ??
          updatedShift.plannedDspId ??
          existingShift.plannedDspId;

        if (targetEmployeeId && timeChanged) {
          await createMobileAlertAndPush({
            employeeId: targetEmployeeId,
            shiftId: updatedShift.id,
            alertType: "SHIFT_TIME_CHANGED",
            individualName,
            serviceName: serviceDisplayName,
            shiftDateLabel: currentDateLabel,
            shiftTimeLabel: currentTimeLabel,
            oldShiftTimeLabel: oldTimeLabel,
            newShiftTimeLabel: newTimeLabel,
            note: updatedShift.notes ?? null,
          });
        }

        if (targetEmployeeId && detailsChanged && !timeChanged) {
          await createMobileAlertAndPush({
            employeeId: targetEmployeeId,
            shiftId: updatedShift.id,
            alertType: "SHIFT_DETAILS_CHANGED",
            individualName,
            serviceName: serviceDisplayName,
            shiftDateLabel: currentDateLabel,
            shiftTimeLabel: currentTimeLabel,
            oldShiftDateLabel: oldDateLabel,
            newShiftDateLabel: newDateLabel,
            note: updatedShift.notes ?? null,
          });
        }
      }
    }

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
    const existingShift = await prisma.scheduleShift.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingShift) {
      return NextResponse.json({
        ok: true,
        warning: "SHIFT_ALREADY_DELETED",
      });
    }

    const linkedVisitsCount = await prisma.visit.count({
      where: {
        scheduleShiftId: id,
      },
    });

    // Không cho xóa shift đã có visit để an toàn audit/payroll/billing
    if (linkedVisitsCount > 0) {
      return NextResponse.json(
        {
          error: "SHIFT_HAS_VISITS",
          detail:
            "Cannot delete this shift because one or more visits are already linked to it.",
        },
        { status: 400 }
      );
    }

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
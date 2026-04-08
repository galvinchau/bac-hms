// web/app/api/employees/[id]/schedules/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function buildWhereFromParam(param: string) {
  if (param.startsWith("BAC-E-")) {
    return { employeeId: param };
  }
  return { id: param };
}

function parseDateStart(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDateEnd(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: "Missing employee id" },
        { status: 400 }
      );
    }

    const employeeWhere = buildWhereFromParam(id);

    const employee = await prisma.employee.findFirst({
      where: employeeWhere,
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        middleName: true,
        lastName: true,
        role: true,
        branch: true,
        status: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const from = parseDateStart(searchParams.get("from"));
    const to = parseDateEnd(searchParams.get("to"));
    const status = searchParams.get("status")?.trim() || "";

    const scheduleDateFilter: Record<string, Date> = {};
    if (from) scheduleDateFilter.gte = from;
    if (to) scheduleDateFilter.lte = to;

    const shifts = await prisma.scheduleShift.findMany({
      where: {
        OR: [{ actualDspId: employee.id }, { plannedDspId: employee.id }],
        ...(Object.keys(scheduleDateFilter).length > 0
          ? { scheduleDate: scheduleDateFilter }
          : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        individual: {
          select: {
            id: true,
            code: true,
            firstName: true,
            middleName: true,
            lastName: true,
            branch: true,
          },
        },
        service: {
          select: {
            id: true,
            serviceCode: true,
            serviceName: true,
            category: true,
          },
        },
        plannedDsp: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
        actualDsp: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
        week: {
          select: {
            id: true,
            weekStart: true,
            weekEnd: true,
          },
        },
      },
      orderBy: [{ scheduleDate: "asc" }, { plannedStart: "asc" }],
      take: 500,
    });

    const rows = shifts.map((shift) => {
      const individualName = [
        shift.individual.firstName,
        shift.individual.middleName || "",
        shift.individual.lastName,
      ]
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      const plannedDspName = shift.plannedDsp
        ? [
            shift.plannedDsp.firstName,
            shift.plannedDsp.middleName || "",
            shift.plannedDsp.lastName,
          ]
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
        : "";

      const actualDspName = shift.actualDsp
        ? [
            shift.actualDsp.firstName,
            shift.actualDsp.middleName || "",
            shift.actualDsp.lastName,
          ]
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
        : "";

      const assignmentType =
        shift.actualDspId === employee.id
          ? "Actual DSP"
          : shift.plannedDspId === employee.id
          ? "Planned DSP"
          : "";

      const plannedHours =
        shift.plannedStart && shift.plannedEnd
          ? Math.max(
              0,
              (new Date(shift.plannedEnd).getTime() -
                new Date(shift.plannedStart).getTime()) /
                (1000 * 60 * 60)
            )
          : 0;

      return {
        id: shift.id,
        scheduleDate: shift.scheduleDate,
        plannedStart: shift.plannedStart,
        plannedEnd: shift.plannedEnd,
        status: shift.status,
        awakeMonitoringRequired: shift.awakeMonitoringRequired,
        cancelReason: shift.cancelReason,
        cancelledAt: shift.cancelledAt,
        backupNote: shift.backupNote,
        billable: shift.billable,
        notes: shift.notes,
        assignmentType,
        plannedHours,

        individual: {
          id: shift.individual.id,
          code: shift.individual.code,
          name: individualName,
          branch: shift.individual.branch,
          houseName: "",
          houseCode: "",
        },

        service: {
          id: shift.service.id,
          code: shift.service.serviceCode,
          name: shift.service.serviceName,
          category: shift.service.category,
        },

        plannedDsp: shift.plannedDsp
          ? {
              id: shift.plannedDsp.id,
              employeeId: shift.plannedDsp.employeeId,
              name: plannedDspName,
            }
          : null,

        actualDsp: shift.actualDsp
          ? {
              id: shift.actualDsp.id,
              employeeId: shift.actualDsp.employeeId,
              name: actualDspName,
            }
          : null,

        week: shift.week,
      };
    });

    const summary = {
      totalShifts: rows.length,
      totalPlannedHours: Number(
        rows.reduce((sum, row) => sum + row.plannedHours, 0).toFixed(2)
      ),
      cancelledShifts: rows.filter((row) => row.status === "CANCELLED").length,
      backupPlanShifts: rows.filter((row) => row.status === "BACKUP_PLAN")
        .length,
      awakeShifts: rows.filter((row) => row.awakeMonitoringRequired).length,
      completedShifts: rows.filter((row) => row.status === "COMPLETED").length,
      inProgressShifts: rows.filter((row) => row.status === "IN_PROGRESS")
        .length,
      upcomingShifts: rows.filter(
        (row) =>
          new Date(row.plannedStart).getTime() >= Date.now() &&
          row.status === "NOT_STARTED"
      ).length,
    };

    return NextResponse.json({
      employee,
      summary,
      rows,
    });
  } catch (error) {
    console.error("Error fetching employee schedules:", error);
    return NextResponse.json(
      { message: "Failed to load employee schedules" },
      { status: 500 }
    );
  }
}
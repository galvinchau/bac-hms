// app/api/dashboard/summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ScheduleStatus } from "@prisma/client";

function getCurrentWeekRangeUtc() {
  const now = new Date();

  // Tính theo UTC cho đơn giản
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const date = now.getUTCDate();
  const day = now.getUTCDay(); // 0 = Sun

  const weekStart = new Date(Date.UTC(year, month, date - day)); // Chủ nhật
  const weekEnd = new Date(Date.UTC(year, month, date - day + 7)); // +7 ngày

  return { weekStart, weekEnd };
}

function formatWeekLabel(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  };

  const s = start.toLocaleDateString("en-US", opts);
  // end là exclusive, trừ đi 1 ngày để hiển thị cho đẹp
  const endDisplay = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const e = endDisplay.toLocaleDateString("en-US", opts);

  return `${s} – ${e}`;
}

export async function GET() {
  try {
    const { weekStart, weekEnd } = getCurrentWeekRangeUtc();

    // Đếm tổng Individual & Employee
    const [totalIndividuals, totalEmployees] = await Promise.all([
      prisma.individual.count(),
      prisma.employee.count(),
    ]);

    // Lấy tất cả ca schedule trong tuần hiện tại
    const shiftsThisWeek = await prisma.scheduleShift.findMany({
      where: {
        scheduleDate: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      select: {
        plannedStart: true,
        plannedEnd: true,
        status: true,
        billable: true,
      },
    });

    // Lấy tất cả visit trong tuần hiện tại (billable)
    const visitsThisWeek = await prisma.visit.findMany({
      where: {
        checkInAt: {
          gte: weekStart,
          lt: weekEnd,
        },
        isBillable: true,
      },
      select: {
        checkInAt: true,
        checkOutAt: true,
        durationMinutes: true,
      },
    });

    // Tính planned minutes từ scheduleShift
    let plannedMinutes = 0;
    for (const s of shiftsThisWeek) {
      if (s.billable === false) continue;
      if (!s.plannedStart || !s.plannedEnd) continue;

      let diff = s.plannedEnd.getTime() - s.plannedStart.getTime();
      // nếu qua ngày (ví dụ 22:00 -> 06:00 hôm sau) thì cộng thêm 24h
      if (diff < 0) {
        diff += 24 * 60 * 60 * 1000;
      }
      plannedMinutes += diff / 60000;
    }

    const unitsPlannedWeek = Math.round(plannedMinutes / 15);

    // Tính actual minutes từ visit
    let actualMinutes = 0;
    for (const v of visitsThisWeek) {
      let minutes = v.durationMinutes ?? 0;
      if (!minutes && v.checkOutAt) {
        let diff = v.checkOutAt.getTime() - v.checkInAt.getTime();
        if (diff < 0) diff = 0;
        minutes = diff / 60000;
      }
      if (minutes > 0) {
        actualMinutes += minutes;
      }
    }

    const unitsActualWeek = Math.round(actualMinutes / 15);
    const weeklyUnitBalance = unitsActualWeek - unitsPlannedWeek;

    // Shifts in progress: visit đã check-in nhưng chưa check-out
    const shiftsInProgress = await prisma.visit.count({
      where: {
        checkInAt: {
          gte: weekStart,
          lt: weekEnd,
        },
        checkOutAt: null,
      },
    });

    // Completed shifts: visit có check-in & check-out trong tuần
    const shiftsCompleted = await prisma.visit.count({
      where: {
        checkInAt: {
          gte: weekStart,
          lt: weekEnd,
        },
        NOT: {
          checkOutAt: null,
        },
      },
    });

    // Cancelled shifts: ScheduleShift status = CANCELLED trong tuần
    const shiftsCancelled = await prisma.scheduleShift.count({
      where: {
        scheduleDate: {
          gte: weekStart,
          lt: weekEnd,
        },
        status: ScheduleStatus.CANCELLED,
      },
    });

    // Tổng ca schedule trong tuần (để hiển thị cột "Total")
    const shiftsTotal = shiftsThisWeek.length;

    const currentWeekLabel = formatWeekLabel(weekStart, weekEnd);

    return NextResponse.json({
      totalIndividuals,
      totalEmployees,
      unitsPlannedWeek,
      unitsActualWeek,
      weeklyUnitBalance,
      shiftsInProgress,
      shiftsCompleted,
      shiftsCancelled,
      shiftsTotal,
      currentWeekLabel,
    });
  } catch (err) {
    console.error("GET /api/dashboard/summary error:", err);
    return NextResponse.json(
      { error: "Failed to load dashboard summary." },
      { status: 500 }
    );
  }
}

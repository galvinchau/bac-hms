// app/page.tsx
import { prisma } from "@/lib/prisma";
import DashboardOverview from "@/components/dashboard/DashboardOverview";

export default async function DashboardPage() {
  // Tính tuần hiện tại (Chủ nhật -> Thứ bảy)
  const now = new Date();
  const dow = now.getDay(); // 0 = Sun
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - dow);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Lấy số liệu từ DB
  const [totalIndividuals, totalEmployees, shiftsThisWeek, visitsThisWeek] =
    await Promise.all([
      prisma.individual.count(),
      prisma.employee.count(),
      prisma.scheduleShift.findMany({
        where: {
          scheduleDate: {
            gte: weekStart,
            lt: weekEnd,
          },
        },
        select: {
          id: true,
          scheduleDate: true,
          plannedStart: true,
          plannedEnd: true,
          status: true,
        },
      }),
      prisma.visit.findMany({
        where: {
          checkInAt: {
            gte: weekStart,
            lt: weekEnd,
          },
        },
        select: {
          id: true,
          durationMinutes: true,
        },
      }),
    ]);

  // Tính units kế hoạch trong tuần từ plannedStart/End
  const totalPlannedUnits = shiftsThisWeek.reduce((sum, s) => {
    if (!s.plannedStart || !s.plannedEnd) return sum;
    const minutes =
      (s.plannedEnd.getTime() - s.plannedStart.getTime()) / 1000 / 60;
    if (!isFinite(minutes) || minutes <= 0) return sum;
    const units = Math.round(minutes / 15);
    return sum + units;
  }, 0);

  // Units thực tế từ Visit.durationMinutes
  const totalActualUnits = visitsThisWeek.reduce((sum, v) => {
    const mins = v.durationMinutes ?? 0;
    return sum + Math.round(mins / 15);
  }, 0);

  const unitDelta = totalActualUnits - totalPlannedUnits;

  // Thống kê trạng thái ca
  const totalShifts = shiftsThisWeek.length;
  const inProgress = shiftsThisWeek.filter(
    (s) => s.status === "IN_PROGRESS"
  ).length;
  const completed = shiftsThisWeek.filter(
    (s) => s.status === "COMPLETED"
  ).length;
  const notStarted = shiftsThisWeek.filter(
    (s) => s.status === "NOT_STARTED"
  ).length;
  const cancelled = shiftsThisWeek.filter(
    (s) => s.status === "CANCELLED"
  ).length;

  const summary = {
    totalIndividuals,
    totalEmployees,
    totalPlannedUnits,
    totalActualUnits,
    unitDelta,
    totalShifts,
    inProgress,
    completed,
    notStarted,
    cancelled,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
      <p className="text-sm text-bac-muted mb-4">
        Overview of caseload and schedule status for the current week.
      </p>

      <DashboardOverview summary={summary} />
    </div>
  );
}

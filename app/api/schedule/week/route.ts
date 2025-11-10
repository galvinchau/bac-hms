// app/api/schedule/week/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ===== Helpers =====

function normalizeWeekStart(input: string): Date {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new Error("weekStart must be a valid ISO date string");
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateFromMinutes(baseDate: Date, minutes: number): Date {
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

// ===== GET /api/schedule/week =====
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const individualId = searchParams.get("individualId") || undefined;
    const weekStartParam = searchParams.get("weekStart") || undefined;

    // 1 tuần cụ thể
    if (individualId && weekStartParam) {
      const weekStart = normalizeWeekStart(weekStartParam);

      const week = await prisma.scheduleWeek.findFirst({
        where: {
          individualId,
          weekStart,
        },
        include: {
          shifts: {
            include: {
              service: true,
              plannedDsp: true,
              actualDsp: true,
              visits: true,
            },
            orderBy: [
              { scheduleDate: "asc" },
              { plannedStart: "asc" },
            ],
          },
        },
      });

      return NextResponse.json({ week });
    }

    // List nhiều tuần
    const weeks = await prisma.scheduleWeek.findMany({
      where: {
        ...(individualId ? { individualId } : {}),
      },
      include: {
        shifts: false,
      },
      orderBy: [{ weekStart: "desc" }],
    });

    return NextResponse.json({ weeks });
  } catch (error) {
    console.error("GET /api/schedule/week error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weekly schedules" },
      { status: 500 }
    );
  }
}

type GenerateWeekInput = {
  individualId: string;
  weekStart: string;
  templateId?: string | null;
  regenerate?: boolean;
};

// ===== POST /api/schedule/week =====
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateWeekInput;

    if (!body.individualId) {
      return NextResponse.json(
        { error: "individualId is required" },
        { status: 400 }
      );
    }
    if (!body.weekStart) {
      return NextResponse.json(
        { error: "weekStart is required" },
        { status: 400 }
      );
    }

    const weekStart = normalizeWeekStart(body.weekStart);
    const weekEnd = addDays(weekStart, 6);
    const regenerate = body.regenerate === true;

    const existingWeek = await prisma.scheduleWeek.findFirst({
      where: {
        individualId: body.individualId,
        weekStart,
      },
      include: {
        shifts: {
          include: {
            service: true,
            plannedDsp: true,
            actualDsp: true,
            visits: true,
          },
          orderBy: [
            { scheduleDate: "asc" },
            { plannedStart: "asc" },
          ],
        },
      },
    });

    if (existingWeek && !regenerate) {
      return NextResponse.json({
        week: existingWeek,
        created: false,
        regenerated: false,
      });
    }

    // Chọn template
    let template = null;

    if (body.templateId) {
      template = await prisma.masterScheduleTemplate.findFirst({
        where: {
          id: body.templateId,
          individualId: body.individualId,
          isActive: true,
        },
        include: {
          shifts: true,
        },
      });

      if (!template) {
        return NextResponse.json(
          { error: "Template not found or not active for this Individual" },
          { status: 400 }
        );
      }
    } else {
      template = await prisma.masterScheduleTemplate.findFirst({
        where: {
          individualId: body.individualId,
          isActive: true,
          effectiveFrom: { lte: weekStart },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: weekStart } }],
        },
        include: {
          shifts: true,
        },
        orderBy: [{ effectiveFrom: "desc" }],
      });

      if (!template) {
        return NextResponse.json(
          {
            error:
              "No active master schedule template found for this Individual and week",
          },
          { status: 400 }
        );
      }
    }

    // Transaction
    const result = await prisma.$transaction(async (tx) => {
      if (existingWeek && regenerate) {
        await tx.scheduleShift.deleteMany({
          where: { weekId: existingWeek.id },
        });
        await tx.scheduleWeek.delete({
          where: { id: existingWeek.id },
        });
      }

      const newWeek = await tx.scheduleWeek.create({
        data: {
          individualId: body.individualId,
          templateId: template.id,
          weekStart,
          weekEnd,
          generatedFromTemplate: true,
          notes: null,
          locked: false,
        },
      });

      const shiftsData = template.shifts.map((s) => {
        const scheduleDate = addDays(weekStart, s.dayOfWeek);

        const start = dateFromMinutes(scheduleDate, s.startMinutes);

        const endBase =
          s.endMinutes >= s.startMinutes
            ? scheduleDate
            : addDays(scheduleDate, 1);

        const end = dateFromMinutes(endBase, s.endMinutes);

        return {
          weekId: newWeek.id,
          individualId: body.individualId,
          serviceId: s.serviceId,
          plannedDspId: s.defaultDspId ?? null,
          actualDspId: null,
          scheduleDate,
          plannedStart: start,
          plannedEnd: end,
          status: "NOT_STARTED" as const,
          cancelledBy: null,
          cancelledAt: null,
          cancelReason: null,
          backupNote: null,
          billable: s.billable ?? true,
          notes: s.notes ?? null,
        };
      });

      if (shiftsData.length > 0) {
        await tx.scheduleShift.createMany({ data: shiftsData });
      }

      const weekWithShifts = await tx.scheduleWeek.findUnique({
        where: { id: newWeek.id },
        include: {
          shifts: {
            include: {
              service: true,
              plannedDsp: true,
              actualDsp: true,
              visits: true,
            },
            orderBy: [
              { scheduleDate: "asc" },
              { plannedStart: "asc" },
            ],
          },
        },
      });

      return weekWithShifts!;
    });

    return NextResponse.json({
      week: result,
      created: true,
      regenerated: !!existingWeek,
    });
  } catch (error) {
    console.error("POST /api/schedule/week error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate week";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

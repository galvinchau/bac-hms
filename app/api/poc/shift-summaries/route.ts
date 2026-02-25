// web/app/api/poc/shift-summaries/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function jsonError(message: string, status = 500, detail?: any) {
  return NextResponse.json(
    { error: message, detail: detail ? String(detail) : undefined },
    { status }
  );
}

function startOfDayUTC(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function endOfDayUTC(d: Date) {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

function dayOfWeekUTC(d: Date): number {
  return d.getUTCDay(); // 0=Sun..6=Sat
}

/**
 * Normalize duty.daysOfWeek (jsonb) to a boolean check.
 * Supports:
 * - null/undefined => all days
 * - [0,1,2] or ["Mon","Wed"] or ["0","2"]
 * - { "0": true, "2": true } or { "Sun": true, "Wed": true }
 * - { days: [...] }
 */
function dutyAppliesToDay(daysOfWeek: any, dayIndex0Sun: number): boolean {
  if (daysOfWeek === null || daysOfWeek === undefined) return true;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
  const dayName = dayNames[dayIndex0Sun];

  const normalizeToIndex = (v: any): number | null => {
    if (v === null || v === undefined) return null;

    if (typeof v === "number" && v >= 0 && v <= 6) return v;

    if (typeof v === "string") {
      const s = v.trim();
      const n = Number(s);
      if (!Number.isNaN(n) && n >= 0 && n <= 6) return n;

      const t = s.slice(0, 3).toLowerCase();
      const idx = dayNames.findIndex((x) => x.toLowerCase() === t);
      if (idx >= 0) return idx;
    }

    return null;
  };

  if (Array.isArray(daysOfWeek)) {
    for (const v of daysOfWeek) {
      const idx = normalizeToIndex(v);
      if (idx !== null && idx === dayIndex0Sun) return true;
      if (typeof v === "string" && v.trim().slice(0, 3).toLowerCase() === dayName.toLowerCase())
        return true;
    }
    return false;
  }

  if (typeof daysOfWeek === "object") {
    if (Array.isArray((daysOfWeek as any).days)) {
      return dutyAppliesToDay((daysOfWeek as any).days, dayIndex0Sun);
    }

    for (const k of Object.keys(daysOfWeek)) {
      const val = (daysOfWeek as any)[k];
      if (!val) continue;

      const idx = normalizeToIndex(k);
      if (idx !== null && idx === dayIndex0Sun) return true;

      const kk = k.trim().slice(0, 3).toLowerCase();
      if (kk === dayName.toLowerCase()) return true;
    }
    return false;
  }

  return true;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const individualId = (searchParams.get("individualId") || "").trim();
    const weekStartRaw = (searchParams.get("weekStart") || "").trim();

    if (!individualId) return jsonError("Missing required query: individualId", 400);
    if (!weekStartRaw) return jsonError("Missing required query: weekStart", 400);

    const weekStartInput = new Date(weekStartRaw);
    if (Number.isNaN(weekStartInput.getTime())) {
      return jsonError("Invalid weekStart", 400, weekStartRaw);
    }

    // Normalize to UTC day boundary (Sun 00:00 UTC-ish), but DO NOT rely on exact match in DB.
    const ws = startOfDayUTC(weekStartInput);
    const we = new Date(ws);
    we.setUTCDate(we.getUTCDate() + 6);
    const weekEndDay = startOfDayUTC(we);

    // ✅ Robust week lookup (range-based) to avoid timezone mismatch
    // Many systems store weekStart with local midnight which becomes non-00:00Z.
    const rangeStart = new Date(ws);
    rangeStart.setUTCHours(rangeStart.getUTCHours() - 36); // -36h
    const rangeEnd = new Date(ws);
    rangeEnd.setUTCHours(rangeEnd.getUTCHours() + 36); // +36h

    const candidateWeeks = await prisma.scheduleWeek.findMany({
      where: {
        individualId,
        weekStart: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      include: {
        shifts: {
          select: {
            id: true,
            scheduleDate: true,
          },
        },
      },
      take: 5,
      orderBy: { weekStart: "asc" },
    });

    if (!candidateWeeks.length) {
      // no week generated yet => no badges
      return NextResponse.json([]);
    }

    // pick closest weekStart to the requested ws
    const week = candidateWeeks
      .map((w) => ({
        w,
        diff: Math.abs(new Date(w.weekStart as any).getTime() - ws.getTime()),
      }))
      .sort((a, b) => a.diff - b.diff)[0].w;

    const shifts = week.shifts || [];
    if (!shifts.length) return NextResponse.json([]);

    // POC overlap (day-level)
    const weekStartDay = startOfDayUTC(ws);
    const weekEndEnd = endOfDayUTC(weekEndDay);

    const pocs = await prisma.poc.findMany({
      where: {
        individualId,
        startDate: { lte: weekEndEnd },
        OR: [{ stopDate: null }, { stopDate: { gte: weekStartDay } }],
      },
      select: {
        id: true,
        pocNumber: true,
        startDate: true,
        stopDate: true,
        duties: {
          select: {
            id: true,
            daysOfWeek: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result: Array<{
      scheduleShiftId: string;
      pocNumbers: string[];
      hasPoc: boolean;
      hasActivePoc: boolean;
    }> = [];

    for (const s of shifts) {
      const shiftId = s.id;
      const shiftDay = startOfDayUTC(new Date(s.scheduleDate));
      const dayIndex = dayOfWeekUTC(shiftDay);

      const matched: string[] = [];

      for (const poc of pocs) {
        const pocStart = startOfDayUTC(new Date(poc.startDate));
        const pocStop = poc.stopDate ? startOfDayUTC(new Date(poc.stopDate)) : null;

        const inRange =
          shiftDay.getTime() >= pocStart.getTime() &&
          (pocStop === null || shiftDay.getTime() <= pocStop.getTime());

        if (!inRange) continue;

        const duties = Array.isArray(poc.duties) ? poc.duties : [];
        const anyDutyApplies =
          duties.length === 0
            ? true
            : duties.some((d) => dutyAppliesToDay(d.daysOfWeek, dayIndex));

        if (!anyDutyApplies) continue;

        matched.push(poc.pocNumber ? String(poc.pocNumber) : String(poc.id));
      }

      const unique = Array.from(new Set(matched));

      result.push({
        scheduleShiftId: shiftId,
        pocNumbers: unique,
        hasPoc: unique.length > 0,
        hasActivePoc: unique.length > 0,
      });
    }

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("GET /api/poc/shift-summaries error:", e);
    return jsonError(
      "Internal Server Error (GET /api/poc/shift-summaries)",
      500,
      e?.message || e
    );
  }
}
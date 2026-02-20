// web/app/api/poc/schedule-dsp/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Return map by date: { "YYYY-MM-DD": { dspId, dspName } }
 *
 * Priority:
 * 1) DSP from existing daily logs (poc_daily_log.dspid) for the given POC + Individual (most accurate: who updated/submitted).
 * 2) Fallback to planned DSP from schedule shift tables (ScheduleShift / scheduleshift / schedule_shift / Schedule).
 */

function jsonOk(map: Record<string, { dspId: string | null; dspName: string | null }>) {
  return NextResponse.json({ ok: true, map });
}
function jsonErr(status: number, error: string, detail?: string) {
  return NextResponse.json({ ok: false, error, detail }, { status });
}

function normalizeName(first?: any, last?: any, full?: any) {
  const f = String(first ?? "").trim();
  const l = String(last ?? "").trim();
  const x = String(full ?? "").trim();
  const out = `${f} ${l}`.trim();
  return out || x || "";
}

async function readEmployeeNames(ids: string[]) {
  const map: Record<string, string> = {};
  if (!ids.length) return map;

  // Try snake table
  const snakeSqls = [
    `
    SELECT e.id, e.firstname AS "firstName", e.lastname AS "lastName", NULL::text AS "fullName"
    FROM public.employee e
    WHERE e.id = ANY($1::text[])
    `,
    `
    SELECT e.id, e.first_name AS "firstName", e.last_name AS "lastName", NULL::text AS "fullName"
    FROM public.employee e
    WHERE e.id = ANY($1::text[])
    `,
  ];

  for (const sql of snakeSqls) {
    try {
      const rows = (await prisma.$queryRawUnsafe(sql, ids)) as any[];
      for (const r of rows || []) {
        const id = String(r?.id || "").trim();
        if (!id || map[id]) continue;
        const name = normalizeName(r?.firstName, r?.lastName, r?.fullName);
        if (name) map[id] = name;
      }
      if (Object.keys(map).length) break;
    } catch {}
  }

  // Try camel table
  const camelSqls = [
    `
    SELECT e.id, e."firstName" AS "firstName", e."lastName" AS "lastName", NULL::text AS "fullName"
    FROM public."Employee" e
    WHERE e.id = ANY($1::text[])
    `,
    `
    SELECT e.id, NULL::text AS "firstName", NULL::text AS "lastName", e.name AS "fullName"
    FROM public."Employee" e
    WHERE e.id = ANY($1::text[])
    `,
  ];

  for (const sql of camelSqls) {
    try {
      const rows = (await prisma.$queryRawUnsafe(sql, ids)) as any[];
      for (const r of rows || []) {
        const id = String(r?.id || "").trim();
        if (!id || map[id]) continue;
        const name = normalizeName(r?.firstName, r?.lastName, r?.fullName);
        if (name) map[id] = name;
      }
      if (Object.keys(map).length) break;
    } catch {}
  }

  return map;
}

/** read DSP from existing daily logs (best source) */
async function readDailyLogDsps(pocId: string, individualId: string, dateFrom: string, dateTo: string) {
  const candidates: Array<{ label: string; sql: string }> = [
    {
      label: "poc_daily_log (snake)",
      sql: `
        SELECT
          l.date::date AS "date",
          l.dspid AS "dspId"
        FROM public.poc_daily_log l
        WHERE l.pocid = $1
          AND l.individualid = $2
          AND l.date::date >= $3::date
          AND l.date::date <= $4::date
        ORDER BY l.date::date ASC
      `,
    },
    {
      label: "POC_Daily_Log (camel-ish)",
      sql: `
        SELECT
          l.date::date AS "date",
          l."dspId" AS "dspId"
        FROM public."POC_Daily_Log" l
        WHERE l."pocId" = $1
          AND l."individualId" = $2
          AND l.date::date >= $3::date
          AND l.date::date <= $4::date
        ORDER BY l.date::date ASC
      `,
    },
  ];

  for (const c of candidates) {
    try {
      const rows = (await prisma.$queryRawUnsafe(c.sql, pocId, individualId, dateFrom, dateTo)) as any[];
      if (Array.isArray(rows) && rows.length) return rows;
    } catch {}
  }
  return [] as any[];
}

/** fallback planned DSP from schedules */
async function readShiftDsps(individualId: string, dateFrom: string, dateTo: string) {
  const candidates: Array<{ label: string; sql: string }> = [
    {
      label: "schedule_shift (snake: dspid)",
      sql: `
        SELECT
          s.date::date AS "date",
          s.dspid AS "dspId"
        FROM public.schedule_shift s
        WHERE s.individualid = $1
          AND s.date::date >= $2::date
          AND s.date::date <= $3::date
        ORDER BY s.date::date ASC
      `,
    },
    {
      label: "scheduleshift (snake: dspid)",
      sql: `
        SELECT
          s.date::date AS "date",
          s.dspid AS "dspId"
        FROM public.scheduleshift s
        WHERE s.individualid = $1
          AND s.date::date >= $2::date
          AND s.date::date <= $3::date
        ORDER BY s.date::date ASC
      `,
    },
    {
      label: "ScheduleShift (camel: dspId)",
      sql: `
        SELECT
          s.date::date AS "date",
          s."dspId" AS "dspId"
        FROM public."ScheduleShift" s
        WHERE s."individualId" = $1
          AND s.date::date >= $2::date
          AND s.date::date <= $3::date
        ORDER BY s.date::date ASC
      `,
    },
    {
      label: "ScheduleShift (camel: assignedStaffId)",
      sql: `
        SELECT
          s.date::date AS "date",
          s."assignedStaffId" AS "dspId"
        FROM public."ScheduleShift" s
        WHERE s."individualId" = $1
          AND s.date::date >= $2::date
          AND s.date::date <= $3::date
        ORDER BY s.date::date ASC
      `,
    },
    {
      label: "Schedule (camel: assignedStaffId)",
      sql: `
        SELECT
          s.date::date AS "date",
          s."assignedStaffId" AS "dspId"
        FROM public."Schedule" s
        WHERE s."individualId" = $1
          AND s.date::date >= $2::date
          AND s.date::date <= $3::date
        ORDER BY s.date::date ASC
      `,
    },
  ];

  for (const c of candidates) {
    try {
      const rows = (await prisma.$queryRawUnsafe(c.sql, individualId, dateFrom, dateTo)) as any[];
      if (Array.isArray(rows) && rows.length) return rows;
    } catch {}
  }

  return [] as any[];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const individualId = (searchParams.get("individualId") || "").trim();
    const pocId = (searchParams.get("pocId") || "").trim(); // ✅ new
    const dateFrom = (searchParams.get("dateFrom") || "").trim();
    const dateTo = (searchParams.get("dateTo") || "").trim();

    if (!individualId) return jsonErr(400, "Missing individualId");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) return jsonErr(400, "Invalid dateFrom");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) return jsonErr(400, "Invalid dateTo");

    // 1) From daily logs
    const logRows = pocId ? await readDailyLogDsps(pocId, individualId, dateFrom, dateTo) : [];

    // 2) Fallback from schedule shifts
    const shiftRows = await readShiftDsps(individualId, dateFrom, dateTo);

    const map: Record<string, { dspId: string | null; dspName: string | null }> = {};
    const ids: string[] = [];

    // First fill from logs (priority)
    for (const r of logRows || []) {
      const d = String(r?.date || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;

      const dspId = r?.dspId ? String(r.dspId).trim() : "";
      if (!map[d]) {
        map[d] = { dspId: dspId || null, dspName: null };
        if (dspId) ids.push(dspId);
      } else if (!map[d].dspId && dspId) {
        map[d].dspId = dspId;
        ids.push(dspId);
      }
    }

    // Then fill missing from schedule shifts
    for (const r of shiftRows || []) {
      const d = String(r?.date || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;

      const dspId = r?.dspId ? String(r.dspId).trim() : "";
      if (!map[d]) {
        map[d] = { dspId: dspId || null, dspName: null };
        if (dspId) ids.push(dspId);
      } else {
        if (!map[d].dspId && dspId) {
          map[d].dspId = dspId;
          ids.push(dspId);
        }
      }
    }

    const uniqIds = Array.from(new Set(ids));
    const nameMap = await readEmployeeNames(uniqIds);

    Object.keys(map).forEach((d) => {
      const id = map[d].dspId;
      map[d].dspName = id ? nameMap[id] || id : null;
    });

    return jsonOk(map);
  } catch (e: any) {
    return jsonErr(500, "Server error", String(e?.message || e));
  }
}

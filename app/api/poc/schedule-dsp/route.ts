// web/app/api/poc/schedule-dsp/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Return map by date: { "YYYY-MM-DD": { dspId, dspName } }
 * We try a few common table/column variants because DB naming may differ.
 *
 * ✅ IMPORTANT:
 * - In your DB screenshot, Visit has dspId (good source for "who worked/updated that day")
 * - Some ScheduleShift tables may NOT have dspId / assignedStaffId, so Visit is tried FIRST.
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

// Try read shifts by different table/column variants.
// Must return rows with: date (YYYY-MM-DD), dspId (string|null)
async function readShifts(individualId: string, dateFrom: string, dateTo: string) {
  const candidates: Array<{ label: string; sql: string }> = [
    // ✅ 1) VISIT FIRST (your DB shows Visit has dspId)
    {
      label: "Visit (camel) - date column",
      sql: `
        SELECT
          v.date::date AS "date",
          v."dspId" AS "dspId"
        FROM public."Visit" v
        WHERE v."individualId" = $1
          AND v.date::date >= $2::date
          AND v.date::date <= $3::date
        ORDER BY v.date::date ASC
      `,
    },
    {
      label: "visit (snake) - date column",
      sql: `
        SELECT
          v.date::date AS "date",
          v.dspid AS "dspId"
        FROM public.visit v
        WHERE v.individualid = $1
          AND v.date::date >= $2::date
          AND v.date::date <= $3::date
        ORDER BY v.date::date ASC
      `,
    },
    // If Visit stores timestamps instead of date: derive PA date from checkIn/start
    {
      label: "Visit (camel) - checkIn timestamp",
      sql: `
        SELECT
          ((v."checkIn" AT TIME ZONE 'America/New_York')::date) AS "date",
          v."dspId" AS "dspId"
        FROM public."Visit" v
        WHERE v."individualId" = $1
          AND ((v."checkIn" AT TIME ZONE 'America/New_York')::date) >= $2::date
          AND ((v."checkIn" AT TIME ZONE 'America/New_York')::date) <= $3::date
        ORDER BY ((v."checkIn" AT TIME ZONE 'America/New_York')::date) ASC
      `,
    },
    {
      label: "visit (snake) - checkin timestamp",
      sql: `
        SELECT
          ((v.checkin AT TIME ZONE 'America/New_York')::date) AS "date",
          v.dspid AS "dspId"
        FROM public.visit v
        WHERE v.individualid = $1
          AND ((v.checkin AT TIME ZONE 'America/New_York')::date) >= $2::date
          AND ((v.checkin AT TIME ZONE 'America/New_York')::date) <= $3::date
        ORDER BY ((v.checkin AT TIME ZONE 'America/New_York')::date) ASC
      `,
    },

    // ✅ 2) FALLBACK: ScheduleShift variants (keep your original)
    {
      label: "schedule_shift (snake)",
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
      label: "scheduleshift (snake)",
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
      label: "ScheduleShift (camel)",
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
      label: "Schedule (camel)",
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
    } catch {
      // try next
    }
  }

  return [] as any[];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const individualId = (searchParams.get("individualId") || "").trim();
    const dateFrom = (searchParams.get("dateFrom") || "").trim();
    const dateTo = (searchParams.get("dateTo") || "").trim();

    if (!individualId) return jsonErr(400, "Missing individualId");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) return jsonErr(400, "Invalid dateFrom");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) return jsonErr(400, "Invalid dateTo");

    const rows = await readShifts(individualId, dateFrom, dateTo);

    // choose 1 DSP per day: first non-null dspId
    const map: Record<string, { dspId: string | null; dspName: string | null }> = {};
    const ids: string[] = [];

    for (const r of rows || []) {
      const d = String(r?.date || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;

      const dspId = r?.dspId ? String(r.dspId).trim() : "";
      if (!map[d]) {
        map[d] = { dspId: dspId || null, dspName: null };
        if (dspId) ids.push(dspId);
      } else {
        // already exists → keep the first non-null
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

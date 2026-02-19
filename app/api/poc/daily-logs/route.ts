// web/app/api/poc/daily-logs/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Status = "DRAFT" | "SUBMITTED";

function asInt(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function safeStatusList(raw: string | null): Status[] | null {
  if (!raw) return null;
  const parts = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const out: Status[] = [];
  for (const p of parts) {
    if (p === "DRAFT" || p === "SUBMITTED") out.push(p as Status);
  }
  return out.length ? out : null;
}

function jsonOk(body: any, status = 200) {
  return NextResponse.json({ ok: true, ...body }, { status });
}

function jsonErr(status: number, error: string, detail?: string) {
  return NextResponse.json({ ok: false, error, detail }, { status });
}

/* ---- column discovery (for NOT NULL columns like createdby) ---- */
const g = globalThis as any;
if (!g.__BAC_COL_CACHE__) g.__BAC_COL_CACHE__ = new Map<string, Set<string>>();
const COL_CACHE: Map<string, Set<string>> = g.__BAC_COL_CACHE__;

async function getColumns(schema: string, table: string): Promise<Set<string>> {
  const key = `${schema}.${table}`;
  const cached = COL_CACHE.get(key);
  if (cached) return cached;

  const sql = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
  `;
  const rows = (await prisma.$queryRawUnsafe(sql, schema, table)) as Array<{ column_name: string }>;
  const set = new Set<string>(rows.map((r) => String(r.column_name).toLowerCase()));
  COL_CACHE.set(key, set);
  return set;
}

function pickCol(cols: Set<string>, candidates: string[]): string | null {
  for (const c of candidates) {
    if (cols.has(c.toLowerCase())) return c;
  }
  return null;
}

/**
 * GET /api/poc/daily-logs
 * NOTE: poc_daily_log table has NO pocNumber column.
 * UI can display pocNumber from query.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const pocId = (searchParams.get("pocId") || "").trim() || null;
    const individualId = (searchParams.get("individualId") || "").trim() || null;
    const dspId = (searchParams.get("dspId") || "").trim() || null;

    const dateFrom = (searchParams.get("dateFrom") || "").trim() || null; // YYYY-MM-DD
    const dateTo = (searchParams.get("dateTo") || "").trim() || null; // YYYY-MM-DD

    const statuses = safeStatusList(searchParams.get("status")); // DRAFT,SUBMITTED

    const page = asInt(searchParams.get("page"), 1);
    const pageSize = Math.min(asInt(searchParams.get("pageSize"), 25), 200);
    const offset = (page - 1) * pageSize;

    // Build WHERE dynamically (parameterized)
    const where: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (pocId) {
      where.push(`l.pocid = $${i++}`);
      params.push(pocId);
    }
    if (individualId) {
      where.push(`l.individualid = $${i++}`);
      params.push(individualId);
    }
    if (dspId) {
      where.push(`l.dspid = $${i++}`);
      params.push(dspId);
    }
    if (dateFrom) {
      where.push(`l.date >= $${i++}::date`);
      params.push(dateFrom);
    }
    if (dateTo) {
      where.push(`l.date <= $${i++}::date`);
      params.push(dateTo);
    }
    if (statuses && statuses.length) {
      where.push(`l.status = ANY($${i++}::public.poc_daily_log_status[])`);
      params.push(statuses);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Count
    const countSql = `
      SELECT COUNT(*)::int AS count
      FROM public.poc_daily_log l
      ${whereSql}
    `;
    const countRows = (await prisma.$queryRawUnsafe(countSql, ...params)) as Array<{ count: number }>;
    const total = countRows?.[0]?.count ?? 0;

    // Data (plus task_count)
    const dataSql = `
      SELECT
        l.id,
        l.pocid AS "pocId",
        l.individualid AS "individualId",
        l.dspid AS "dspId",
        l.date,
        l.status,
        l.submittedat AS "submittedAt",
        l.createdat AS "createdAt",
        l.updatedat AS "updatedAt",
        (
          SELECT COUNT(*)::int
          FROM public.poc_daily_task_log t
          WHERE t.dailylogid = l.id
        ) AS "taskCount"
      FROM public.poc_daily_log l
      ${whereSql}
      ORDER BY l.date DESC, l.updatedat DESC
      LIMIT $${i++} OFFSET $${i++}
    `;

    const dataParams = [...params, pageSize, offset];
    const items = (await prisma.$queryRawUnsafe(dataSql, ...dataParams)) as any[];

    return jsonOk({
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      items,
    });
  } catch (err: any) {
    console.error("GET /api/poc/daily-logs error:", err);
    return jsonErr(500, "Internal server error", String(err?.message || err));
  }
}

/**
 * POST /api/poc/daily-logs
 * Create-or-get one daily log for (pocId, individualId, date)
 * Body: { pocId, individualId, date(YYYY-MM-DD), dspId?, createdBy? }
 *
 * ✅ FIX: if DB has NOT NULL createdby/created_by, auto fill "office" (or body.createdBy)
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { pocId?: string; individualId?: string; date?: string; dspId?: string | null; createdBy?: string | null }
      | null;

    if (!body) return jsonErr(400, "Invalid JSON body");

    const pocId = String(body.pocId || "").trim();
    const individualId = String(body.individualId || "").trim();
    const date = String(body.date || "").trim(); // YYYY-MM-DD
    const dspId = body.dspId === undefined ? null : body.dspId;
    const createdBy = String(body.createdBy || "").trim() || "office";

    if (!pocId) return jsonErr(400, "Missing pocId");
    if (!individualId) return jsonErr(400, "Missing individualId");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonErr(400, "Invalid date (expected YYYY-MM-DD)");

    // 1) If exists -> return it
    const findSql = `
      SELECT id
      FROM public.poc_daily_log
      WHERE pocid = $1 AND individualid = $2 AND date = $3::date
      LIMIT 1
    `;
    const found = (await prisma.$queryRawUnsafe(findSql, pocId, individualId, date)) as Array<{ id: string }>;
    if (found?.[0]?.id) {
      return jsonOk({ id: found[0].id, created: false });
    }

    // 2) Create (dynamic columns: include createdby if exists)
    const cols = await getColumns("public", "poc_daily_log");
    const cCreatedBy = pickCol(cols, ["createdby", "created_by"]);

    // Base columns always present in your schema
    const insertCols: string[] = ["pocid", "individualid", "dspid", "date", "status", "submittedat", "createdat", "updatedat"];
    const insertVals: string[] = [];
    const params: any[] = [];
    let i = 1;

    // pocid
    insertVals.push(`$${i++}`); params.push(pocId);
    // individualid
    insertVals.push(`$${i++}`); params.push(individualId);
    // dspid
    insertVals.push(`$${i++}`); params.push(dspId);
    // date
    insertVals.push(`$${i++}::date`); params.push(date);
    // status
    insertVals.push(`'DRAFT'::public.poc_daily_log_status`);
    // submittedat
    insertVals.push(`NULL`);
    // createdat
    insertVals.push(`NOW()`);
    // updatedat
    insertVals.push(`NOW()`);

    // ✅ optional NOT NULL column
    if (cCreatedBy) {
      insertCols.splice(6, 0, cCreatedBy); // put before createdat (nice ordering)
      insertVals.splice(6, 0, `$${i++}`);
      params.push(createdBy);
    }

    const colsSql = insertCols.map((c) => `"${c}"`).join(", ");
    const valsSql = insertVals.join(", ");

    const insertSql = `
      INSERT INTO public.poc_daily_log
        (${colsSql})
      VALUES
        (${valsSql})
      RETURNING id
    `;

    try {
      const ins = (await prisma.$queryRawUnsafe(insertSql, ...params)) as Array<{ id: string }>;
      const id = ins?.[0]?.id;
      if (!id) return jsonErr(500, "Create failed", "No id returned");
      return jsonOk({ id, created: true }, 201);
    } catch (e: any) {
      // Race fallback: re-select
      const found2 = (await prisma.$queryRawUnsafe(findSql, pocId, individualId, date)) as Array<{ id: string }>;
      if (found2?.[0]?.id) {
        return jsonOk({ id: found2[0].id, created: false });
      }
      throw e;
    }
  } catch (err: any) {
    console.error("POST /api/poc/daily-logs error:", err);
    return jsonErr(500, "Internal server error", String(err?.message || err));
  }
}

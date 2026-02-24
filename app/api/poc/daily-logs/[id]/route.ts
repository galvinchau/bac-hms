// web/app/api/poc/daily-logs/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * DB tables (confirmed by your screenshots):
 * - public.poc_daily_log(id, pocid, individualid, dspid, date, status, submittedat, createdat, updatedat, scheduleshiftid)
 * - public.poc_daily_task_log(
 *      id, dailylogid, pocdutyid,
 *      completionstatus, completedat, note,
 *      lockedat, lockedbyid, lockedbyname,
 *      lasteditedat, lasteditedbyid, lasteditedbyname, lastededitreason,
 *      edithistory,
 *      createdat, updatedat
 *   )
 *
 * Enums:
 * - public.poc_duty_completion_status: INDEPENDENT, VERBAL_PROMPT, PHYSICAL_ASSIST, REFUSED
 */

type Status = "DRAFT" | "SUBMITTED";

type CompletionStatus = "INDEPENDENT" | "VERBAL_PROMPT" | "PHYSICAL_ASSIST" | "REFUSED";

type TaskEditHistory = {
  at: string; // ISO
  byId?: string | null;
  byName?: string | null;
  reason?: string | null;
  action: "LOCK" | "EDIT_ENABLE" | "EDIT_SAVE";
};

type TaskDetail = {
  id: string; // pocDutyId
  pocDutyId?: string; // keep compatibility with UI
  taskNo?: number | null;
  duty: string;
  category?: string | null;

  status: CompletionStatus | null;
  note?: string | null;
  timestamp?: string | null; // ISO (completedAt)

  lockedAt?: string | null;
  lockedById?: string | null;
  lockedByName?: string | null;

  lastEditedAt?: string | null;
  lastEditedById?: string | null;
  lastEditedByName?: string | null;
  lastEditReason?: string | null;

  editHistory?: TaskEditHistory[] | null;
};

type DailyLogDetail = {
  id: string;
  pocId: string;
  pocNumber?: string | null;
  individualId: string;

  dspId: string | null;
  dspLockedAt?: string | null;

  date: string; // YYYY-MM-DD
  status: Status;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;

  // optional audit fields (UI may send; keep harmless)
  auditReason?: string | null;
  auditUpdatedAt?: string | null;
  auditActorName?: string | null;

  tasks: TaskDetail[];
};

function jsonOk(item: any) {
  return NextResponse.json({ ok: true, item });
}
function jsonErr(status: number, error: string, detail?: string) {
  return NextResponse.json({ ok: false, error, detail }, { status });
}

function toIso(v: any): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function normalizeCompletion(v: any): CompletionStatus | null {
  if (!v) return null;
  const s = String(v).trim().toUpperCase();
  if (s === "INDEPENDENT" || s === "VERBAL_PROMPT" || s === "PHYSICAL_ASSIST" || s === "REFUSED") return s;
  return null;
}

/** Returns true if daysOfWeek exists AND actually contains constraints. */
function hasDayConstraint(daysOfWeek: any): boolean {
  if (!daysOfWeek) return false;

  let v: any = daysOfWeek;

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return false;
    try {
      v = JSON.parse(s);
    } catch {
      // Non-JSON string but present -> treat as constraint exists
      return true;
    }
  }

  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === "object") return Object.keys(v).length > 0;

  return true;
}

function getDowKeyFromYmd(ymd: string): { idx: number; short: "S" | "M" | "T" | "W" | "F"; long: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat" } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;

  // mid-day UTC avoids DST edge
  const dt = new Date(`${ymd}T12:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  }).format(dt); // "Mon", "Tue", ...

  const map: Record<string, { idx: number; long: any; short: any }> = {
    Sun: { idx: 0, long: "sun", short: "S" },
    Mon: { idx: 1, long: "mon", short: "M" },
    Tue: { idx: 2, long: "tue", short: "T" },
    Wed: { idx: 3, long: "wed", short: "W" },
    Thu: { idx: 4, long: "thu", short: "T" },
    Fri: { idx: 5, long: "fri", short: "F" },
    Sat: { idx: 6, long: "sat", short: "S" },
  };

  const hit = map[weekday];
  if (!hit) return null;
  return hit;
}

function weekdayToUpperShort(idx: number) {
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][idx] || "";
}

function capitalize(s: string) {
  if (!s) return s;
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

function dutyAppliesToDay(daysOfWeek: any, ymd: string): boolean {
  if (!daysOfWeek) return true;

  const dow = getDowKeyFromYmd(ymd);
  if (!dow) return true;

  let v: any = daysOfWeek;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      // ignore
    }
  }

  if (Array.isArray(v)) {
    const set = new Set(v.map((x) => String(x).trim().toLowerCase()));
    if (set.has(dow.long)) return true;
    if (set.has(dow.long.slice(0, 1))) return true;
    if (set.has(dow.short.toLowerCase())) return true;
    const upper = new Set(v.map((x) => String(x).trim().toUpperCase()));
    if (upper.has(dow.long.toUpperCase())) return true;
    if (upper.has(weekdayToUpperShort(dow.idx))) return true;
    return false;
  }

  if (v && typeof v === "object") {
    if (v[String(dow.idx)] === true) return true;

    if (v[dow.long] === true) return true;
    if (v[dow.long.toUpperCase()] === true) return true;

    if (v[dow.short] === true) return true;
    if (v[dow.short.toLowerCase()] === true) return true;

    const k1 = capitalize(dow.long);
    if (v[k1] === true) return true;

    return false;
  }

  return true;
}

function safeJsonParse(v: any) {
  if (!v) return null;
  if (typeof v === "object") return v;
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function normalizeHistory(arr: any): TaskEditHistory[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => ({
      at: String(x?.at || x?.timestamp || x?.time || ""),
      byId: x?.byId ?? x?.actorId ?? null,
      byName: x?.byName ?? x?.actorName ?? null,
      reason: x?.reason ?? null,
      action: (x?.action as any) || "EDIT_SAVE",
    }))
    .filter((x) => !!x.at);
}

async function readDailyLog(id: string) {
  const rows = (await prisma.$queryRawUnsafe(
    `
    SELECT
      l.id,
      l.pocid AS "pocId",
      l.individualid AS "individualId",
      l.dspid AS "dspId",
      l.date,
      l.status,
      l.submittedat AS "submittedAt",
      l.createdat AS "createdAt",
      l.updatedat AS "updatedAt"
    FROM public.poc_daily_log l
    WHERE l.id = $1
    LIMIT 1
  `,
    id
  )) as any[];

  return rows?.[0] || null;
}

async function readPocNumber(pocId: string): Promise<string | null> {
  if (!pocId) return null;

  try {
    const r1 = (await prisma.$queryRawUnsafe(`SELECT p.pocnumber AS "pocNumber" FROM public.poc p WHERE p.id = $1 LIMIT 1`, pocId)) as any[];
    if (r1?.[0]?.pocNumber) return String(r1[0].pocNumber);
  } catch {}

  try {
    const r2 = (await prisma.$queryRawUnsafe(`SELECT p."pocNumber" AS "pocNumber" FROM public."POC" p WHERE p.id = $1 LIMIT 1`, pocId)) as any[];
    if (r2?.[0]?.pocNumber) return String(r2[0].pocNumber);
  } catch {}

  return null;
}

async function readAllDuties(pocId: string): Promise<any[]> {
  if (!pocId) return [];

  const out: any[] = [];

  try {
    const a = (await prisma.$queryRawUnsafe(
      `
      SELECT
        d.id,
        d.pocid,
        d.category,
        d.taskno,
        d.duty,
        d.daysofweek,
        d.instruction,
        d.sortorder
      FROM public.poc_duty d
      WHERE d.pocid = $1
      ORDER BY d.sortorder NULLS LAST, d.taskno NULLS LAST, d.duty
    `,
      pocId
    )) as any[];
    if (Array.isArray(a)) out.push(...a);
  } catch {}

  try {
    const b = (await prisma.$queryRawUnsafe(
      `
      SELECT
        d.id,
        d."pocId" AS pocid,
        d.category,
        d."taskNo" AS taskno,
        d.duty,
        d."daysOfWeek" AS daysofweek,
        d.instruction,
        d."sortOrder" AS sortorder
      FROM public."POC_Duty" d
      WHERE d."pocId" = $1
      ORDER BY d."sortOrder" NULLS LAST, d."taskNo" NULLS LAST, d.duty
    `,
      pocId
    )) as any[];
    if (Array.isArray(b)) out.push(...b);
  } catch {}

  const seen = new Set<string>();
  const dedup: any[] = [];
  for (const x of out) {
    const id = String(x?.id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    dedup.push(x);
  }
  return dedup;
}

async function readTaskLogs(dailyLogId: string): Promise<Map<string, any>> {
  const rows = (await prisma.$queryRawUnsafe(
    `
    SELECT
      t.pocdutyid AS "pocDutyId",
      t.completionstatus AS "completionStatus",
      t.completedat AS "completedAt",
      t.note,

      -- NEW meta columns
      t.lockedat AS "lockedAt",
      t.lockedbyid AS "lockedById",
      t.lockedbyname AS "lockedByName",

      t.lasteditedat AS "lastEditedAt",
      t.lasteditedbyid AS "lastEditedById",
      t.lasteditedbyname AS "lastEditedByName",
      t.lasteditreason AS "lastEditReason",

      t.edithistory AS "editHistory",

      t.updatedat AS "updatedAt",
      t.createdat AS "createdAt"
    FROM public.poc_daily_task_log t
    WHERE t.dailylogid = $1
  `,
    dailyLogId
  )) as any[];

  const m = new Map<string, any>();
  (rows || []).forEach((r) => {
    const k = String(r?.pocDutyId || "");
    if (!k) return;
    m.set(k, r);
  });
  return m;
}

function buildTasksForDay(ymd: string, duties: any[], logsByDutyId: Map<string, any>, dailyLogDspId: string | null): TaskDetail[] {
  const list = Array.isArray(duties) ? duties : [];

  // Filter:
  // - If duty has day constraint -> show when applies to day
  // - If duty has NO day constraint -> show ONLY if it already has a task log for this dailyLog
  const filtered = list.filter((d) => {
    const applies = dutyAppliesToDay(d?.daysofweek, ymd);
    if (!applies) return false;

    const dutyId = String(d?.id || "").trim();
    const constrained = hasDayConstraint(d?.daysofweek);

    if (constrained) return true;
    if (!dutyId) return false;
    return logsByDutyId.has(dutyId);
  });

  return filtered.map((d: any, idx: number) => {
    const dutyId = String(d?.id || `${idx}`);
    const taskNo = d?.taskno === null || d?.taskno === undefined ? null : Number(d.taskno);
    const duty = String(d?.duty ?? `Task ${idx + 1}`);
    const category = d?.category ? String(d.category) : null;

    const log = logsByDutyId.get(dutyId);

    const status = normalizeCompletion(log?.completionStatus) ?? null;
    const note = log?.note ?? null;

    const completedAtIso = toIso(log?.completedAt);
    const ts = completedAtIso;

    // Locked meta: prefer DB columns; fallback to completedAt + dailyLog dspId (for older rows)
    const lockedAt = toIso(log?.lockedAt) || ts;
    const lockedById = String(log?.lockedById || "").trim() || (lockedAt ? (dailyLogDspId ? String(dailyLogDspId) : "") : "");
    const lockedByName = String(log?.lockedByName || "").trim() || null;

    const lastEditedAt = toIso(log?.lastEditedAt);
    const lastEditedById = log?.lastEditedById ? String(log.lastEditedById) : null;
    const lastEditedByName = log?.lastEditedByName ? String(log.lastEditedByName) : null;
    const lastEditReason = log?.lastEditReason ? String(log.lastEditReason) : null;

    const hist = normalizeHistory(safeJsonParse(log?.editHistory) || log?.editHistory);

    return {
      id: dutyId,
      pocDutyId: dutyId,

      taskNo,
      duty,
      category,

      status,
      note,
      timestamp: ts,

      lockedAt: lockedAt ?? null,
      lockedById: lockedById ? String(lockedById) : null,
      lockedByName: lockedByName,

      lastEditedAt: lastEditedAt ?? null,
      lastEditedById: lastEditedById,
      lastEditedByName: lastEditedByName,
      lastEditReason: lastEditReason,

      editHistory: hist.length ? hist : null,
    };
  });
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!id) return jsonErr(400, "Missing id");

    const log = await readDailyLog(id);
    if (!log) return jsonErr(404, "Not found");

    const pocNumber = await readPocNumber(String(log.pocId || ""));
    const duties = await readAllDuties(String(log.pocId || ""));
    const taskLogs = await readTaskLogs(String(log.id));

    const dspId = log.dspId ? String(log.dspId) : null;
    const tasks = buildTasksForDay(String(log.date), duties, taskLogs, dspId);

    const item: DailyLogDetail = {
      id: String(log.id),
      pocId: String(log.pocId),
      pocNumber: pocNumber ?? null,
      individualId: String(log.individualId),

      dspId,
      date: String(log.date),
      status: String(log.status) as Status,
      submittedAt: toIso(log.submittedAt),
      createdAt: toIso(log.createdAt) || new Date().toISOString(),
      updatedAt: toIso(log.updatedAt) || new Date().toISOString(),

      tasks,
    };

    return jsonOk(item);
  } catch (e: any) {
    return jsonErr(500, "Server error", String(e?.message || e));
  }
}

/**
 * UI sends:
 * - status, dspId (daily log)
 * - tasks[] includes:
 *   pocDutyId, status, note, timestamp,
 *   lockedAt, lockedById, lockedByName,
 *   lastEditedAt, lastEditedById, lastEditedByName, lastEditReason,
 *   editHistory
 */
type PatchBody = {
  status?: Status;
  dspId?: string | null;

  auditReason?: string | null;
  auditActorId?: string | null;
  auditActorName?: string | null;

  tasks?: Array<{
    pocDutyId?: string;
    id?: string;

    status: CompletionStatus | string | null;
    note?: string | null;
    timestamp?: string | null;

    lockedAt?: string | null;
    lockedById?: string | null;
    lockedByName?: string | null;

    lastEditedAt?: string | null;
    lastEditedById?: string | null;
    lastEditedByName?: string | null;
    lastEditReason?: string | null;

    editHistory?: any;
  }>;
};

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!id) return jsonErr(400, "Missing id");

    const body = (await req.json().catch(() => null)) as PatchBody | null;
    if (!body) return jsonErr(400, "Invalid JSON body");

    const cur = await readDailyLog(id);
    if (!cur) return jsonErr(404, "Not found");

    const nextStatus: Status = (body.status || cur.status) as Status;
    const incomingDspId = String(body.dspId ?? "").trim() || null;

    // Update header + persist dspId
    await prisma.$queryRawUnsafe(
      `
      UPDATE public.poc_daily_log
      SET
        dspid = COALESCE($3, dspid),
        status = $2::public.poc_daily_log_status,
        submittedat = CASE WHEN $2 = 'SUBMITTED' THEN COALESCE(submittedat, now()) ELSE NULL END,
        updatedat = now()
      WHERE id = $1
    `,
      id,
      nextStatus,
      incomingDspId
    );

    const incoming = Array.isArray(body.tasks) ? body.tasks : [];

    for (const t of incoming) {
      const dutyIdRaw = String(t?.pocDutyId || t?.id || "").trim();
      if (!dutyIdRaw) continue;

      const statusEnum = normalizeCompletion(t?.status);
      const note = t?.note ?? null;

      const tsIso = t?.timestamp ? String(t.timestamp).trim() : "";
      const hasTs = !!tsIso;

      const lockedAtIso = t?.lockedAt ? String(t.lockedAt).trim() : "";
      const lockedById = String(t?.lockedById || "").trim() || null;
      const lockedByName = String(t?.lockedByName || "").trim() || null;

      const lastEditedAtIso = t?.lastEditedAt ? String(t.lastEditedAt).trim() : "";
      const lastEditedById = String(t?.lastEditedById || "").trim() || null;
      const lastEditedByName = String(t?.lastEditedByName || "").trim() || null;
      const lastEditReason = String(t?.lastEditReason || "").trim() || null;

      const historyArr = normalizeHistory(t?.editHistory);
      const historyJson = historyArr.length ? JSON.stringify(historyArr) : null;

      // If status is null/invalid: only update meta if row exists, do NOT insert new row.
      if (!statusEnum) {
        await prisma.$queryRawUnsafe(
          `
          UPDATE public.poc_daily_task_log
          SET
            note = COALESCE($3, note),

            completedat = CASE
              WHEN $4::text IS NULL OR $4::text = '' THEN completedat
              ELSE $4::timestamptz
            END,

            lockedat = CASE
              WHEN $5::text IS NULL OR $5::text = '' THEN lockedat
              ELSE $5::timestamptz
            END,
            lockedbyid = COALESCE($6, lockedbyid),
            lockedbyname = COALESCE($7, lockedbyname),

            lasteditedat = CASE
              WHEN $8::text IS NULL OR $8::text = '' THEN lasteditedat
              ELSE $8::timestamptz
            END,
            lasteditedbyid = COALESCE($9, lasteditedbyid),
            lasteditedbyname = COALESCE($10, lasteditedbyname),
            lasteditreason = COALESCE($11, lasteditreason),

            edithistory = CASE
              WHEN $12::text IS NULL OR $12::text = '' THEN edithistory
              ELSE $12::jsonb
            END,

            updatedat = now()
          WHERE dailylogid = $1 AND pocdutyid = $2
        `,
          id,
          dutyIdRaw,
          note,
          hasTs ? tsIso : "",
          lockedAtIso || "",
          lockedById,
          lockedByName,
          lastEditedAtIso || "",
          lastEditedById,
          lastEditedByName,
          lastEditReason,
          historyJson || ""
        );
        continue;
      }

      // Try update first
      const updated = (await prisma.$queryRawUnsafe(
        `
        UPDATE public.poc_daily_task_log
        SET
          completionstatus = $3::public.poc_duty_completion_status,
          note = $4,

          completedat = CASE
            WHEN $5::text IS NULL OR $5::text = '' THEN COALESCE(completedat, now())
            ELSE $5::timestamptz
          END,

          lockedat = CASE
            WHEN $6::text IS NULL OR $6::text = '' THEN COALESCE(lockedat, now())
            ELSE $6::timestamptz
          END,
          lockedbyid = COALESCE($7, lockedbyid),
          lockedbyname = COALESCE($8, lockedbyname),

          lasteditedat = CASE
            WHEN $9::text IS NULL OR $9::text = '' THEN lasteditedat
            ELSE $9::timestamptz
          END,
          lasteditedbyid = COALESCE($10, lasteditedbyid),
          lasteditedbyname = COALESCE($11, lasteditedbyname),
          lasteditreason = COALESCE($12, lasteditreason),

          edithistory = CASE
            WHEN $13::text IS NULL OR $13::text = '' THEN edithistory
            ELSE $13::jsonb
          END,

          updatedat = now()
        WHERE dailylogid = $1 AND pocdutyid = $2
        RETURNING id
      `,
        id,
        dutyIdRaw,
        statusEnum,
        note,
        hasTs ? tsIso : "",
        lockedAtIso || "",
        lockedById,
        lockedByName,
        lastEditedAtIso || "",
        lastEditedById,
        lastEditedByName,
        lastEditReason,
        historyJson || ""
      )) as any[];

      if (updated?.[0]?.id) continue;

      // Insert new
      await prisma.$queryRawUnsafe(
        `
        INSERT INTO public.poc_daily_task_log
          (id, dailylogid, pocdutyid, completionstatus, completedat, note,
           lockedat, lockedbyid, lockedbyname,
           lasteditedat, lasteditedbyid, lasteditedbyname, lasteditreason,
           edithistory,
           createdat, updatedat)
        VALUES
          (gen_random_uuid(), $1, $2, $3::public.poc_duty_completion_status,
           CASE WHEN $4::text IS NULL OR $4::text = '' THEN now() ELSE $4::timestamptz END,
           $5,
           CASE WHEN $6::text IS NULL OR $6::text = '' THEN now() ELSE $6::timestamptz END,
           $7,
           $8,
           CASE WHEN $9::text IS NULL OR $9::text = '' THEN NULL ELSE $9::timestamptz END,
           $10,
           $11,
           $12,
           CASE WHEN $13::text IS NULL OR $13::text = '' THEN NULL ELSE $13::jsonb END,
           now(), now())
      `,
        id,
        dutyIdRaw,
        statusEnum,
        hasTs ? tsIso : "",
        note,
        lockedAtIso || "",
        lockedById,
        lockedByName,
        lastEditedAtIso || "",
        lastEditedById,
        lastEditedByName,
        lastEditReason,
        historyJson || ""
      );
    }

    // Return fresh detail
    const refreshed = await readDailyLog(id);
    if (!refreshed) return jsonErr(404, "Not found");

    const pocNumber = await readPocNumber(String(refreshed.pocId || ""));
    const duties = await readAllDuties(String(refreshed.pocId || ""));
    const taskLogs = await readTaskLogs(String(refreshed.id));

    const dspId = refreshed.dspId ? String(refreshed.dspId) : null;
    const tasks = buildTasksForDay(String(refreshed.date), duties, taskLogs, dspId);

    const item: DailyLogDetail = {
      id: String(refreshed.id),
      pocId: String(refreshed.pocId),
      pocNumber: pocNumber ?? null,
      individualId: String(refreshed.individualId),
      dspId,
      date: String(refreshed.date),
      status: String(refreshed.status) as Status,
      submittedAt: toIso(refreshed.submittedAt),
      createdAt: toIso(refreshed.createdAt) || new Date().toISOString(),
      updatedAt: toIso(refreshed.updatedAt) || new Date().toISOString(),
      tasks,
    };

    return jsonOk(item);
  } catch (e: any) {
    return jsonErr(500, "Server error", String(e?.message || e));
  }
}
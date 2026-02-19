// web/app/api/poc/daily-logs/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * DB tables (confirmed by screenshots):
 * - public.poc_daily_log(id, pocid, individualid, dspid, date, status, submittedat, createdat, updatedat, scheduleshiftid)
 * - public.poc_daily_task_log(id, dailylogid, pocdutyid, completionstatus, completedat, note, createdat, updatedat)
 * - public.poc_duty(id, pocid, category, taskno, duty, minutes, asneeded, timesweekmin, timesweekmax, daysofweek(jsonb), instruction, sortorder, createdat, updatedat)
 * - public."POC_Duty"(id, "pocId", category, "taskNo", duty, minutes, "asNeeded", "timesWeekMin", "timesWeekMax", "daysOfWeek"(jsonb), instruction, "sortOrder")
 *
 * Completion enum:
 * - public.poc_duty_completion_status: INDEPENDENT, VERBAL_PROMPT, PHYSICAL_ASSIST, REFUSED
 */

type Status = "DRAFT" | "SUBMITTED";

type CompletionStatus =
  | "INDEPENDENT"
  | "VERBAL_PROMPT"
  | "PHYSICAL_ASSIST"
  | "REFUSED";

type TaskDetail = {
  id: string; // pocDutyId
  taskNo?: number | null;
  duty: string;
  category?: string | null;
  status: CompletionStatus | null;
  note?: string | null;
  timestamp?: string | null; // ISO (completedAt)
};

type DailyLogDetail = {
  id: string;
  pocId: string;
  pocNumber?: string | null;
  individualId: string;
  dspId: string | null;
  date: string; // YYYY-MM-DD
  status: Status;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  if (
    s === "INDEPENDENT" ||
    s === "VERBAL_PROMPT" ||
    s === "PHYSICAL_ASSIST" ||
    s === "REFUSED"
  )
    return s;
  return null;
}

/**
 * ✅ NEW helper:
 * Returns true if daysOfWeek exists AND actually contains constraints.
 * If daysOfWeek is null/undefined/empty array/empty object/empty string => false.
 */
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

function getDowKeyFromYmd(ymd: string): {
  idx: number; // 0..6 (Sun..Sat)
  short: "S" | "M" | "T" | "W" | "F";
  long:
    | "sun"
    | "mon"
    | "tue"
    | "wed"
    | "thu"
    | "fri"
    | "sat";
} | null {
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
    const r1 = (await prisma.$queryRawUnsafe(
      `SELECT p.pocnumber AS "pocNumber" FROM public.poc p WHERE p.id = $1 LIMIT 1`,
      pocId
    )) as any[];
    if (r1?.[0]?.pocNumber) return String(r1[0].pocNumber);
  } catch {}

  try {
    const r2 = (await prisma.$queryRawUnsafe(
      `SELECT p."pocNumber" AS "pocNumber" FROM public."POC" p WHERE p.id = $1 LIMIT 1`,
      pocId
    )) as any[];
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
      t.note
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

function buildTasksForDay(
  ymd: string,
  duties: any[],
  logsByDutyId: Map<string, any>
): TaskDetail[] {
  const list = Array.isArray(duties) ? duties : [];

  // ✅ UPDATED FILTER:
  // - If duty has day constraint -> show when applies to day
  // - If duty has NO day constraint -> show ONLY if it already has a task log for this dailyLog
  const filtered = list.filter((d) => {
    const applies = dutyAppliesToDay(d?.daysofweek, ymd);
    if (!applies) return false;

    const dutyId = String(d?.id || "").trim();
    const constrained = hasDayConstraint(d?.daysofweek);

    if (constrained) return true; // normal case: show by DOW rules

    // no constraint -> show only if log exists (avoid showing "extra" tasks)
    if (!dutyId) return false;
    return logsByDutyId.has(dutyId);
  });

  return filtered.map((d: any, idx: number) => {
    const dutyId = String(d?.id || `${idx}`);
    const taskNo =
      d?.taskno === null || d?.taskno === undefined ? null : Number(d.taskno);
    const duty = String(d?.duty ?? `Task ${idx + 1}`);
    const category = d?.category ? String(d.category) : null;

    const log = logsByDutyId.get(dutyId);
    const status = normalizeCompletion(log?.completionStatus) ?? null;
    const note = log?.note ?? null;
    const timestamp = toIso(log?.completedAt);

    return {
      id: dutyId,
      taskNo,
      duty,
      category,
      status,
      note,
      timestamp,
    };
  });
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    if (!id) return jsonErr(400, "Missing id");

    const log = await readDailyLog(id);
    if (!log) return jsonErr(404, "Not found");

    const pocNumber = await readPocNumber(String(log.pocId || ""));
    const duties = await readAllDuties(String(log.pocId || ""));
    const taskLogs = await readTaskLogs(String(log.id));

    const tasks = buildTasksForDay(String(log.date), duties, taskLogs);

    const item: DailyLogDetail = {
      id: String(log.id),
      pocId: String(log.pocId),
      pocNumber: pocNumber ?? null,
      individualId: String(log.individualId),
      dspId: log.dspId ? String(log.dspId) : null,
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
 * ✅ IMPORTANT:
 * UI (file #3) sends tasks[] with `pocDutyId`
 * We support both `pocDutyId` and legacy `id` to be safe.
 */
type PatchBody = {
  status?: Status;
  tasks?: Array<{
    pocDutyId?: string; // ✅ preferred
    id?: string; // ✅ backward compatibility
    status: CompletionStatus | string | null;
    note?: string | null;
    timestamp?: string | null; // ISO
  }>;
};

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    if (!id) return jsonErr(400, "Missing id");

    const body = (await req.json().catch(() => null)) as PatchBody | null;
    if (!body) return jsonErr(400, "Invalid JSON body");

    const cur = await readDailyLog(id);
    if (!cur) return jsonErr(404, "Not found");

    const nextStatus: Status = (body.status || cur.status) as Status;

    // Update header
    await prisma.$queryRawUnsafe(
      `
      UPDATE public.poc_daily_log
      SET
        status = $2::public.poc_daily_log_status,
        submittedat = CASE WHEN $2 = 'SUBMITTED' THEN COALESCE(submittedat, now()) ELSE NULL END,
        updatedat = now()
      WHERE id = $1
    `,
      id,
      nextStatus
    );

    const incoming = Array.isArray(body.tasks) ? body.tasks : [];

    for (const t of incoming) {
      const dutyIdRaw = String(t?.pocDutyId || t?.id || "").trim();
      if (!dutyIdRaw) continue;

      const statusEnum = normalizeCompletion(t?.status);
      const note = t?.note ?? null;

      const tsIso = t?.timestamp ? String(t.timestamp).trim() : "";
      const hasTs = !!tsIso;

      // If status is null/invalid: only update note/time if row exists, do NOT insert new row.
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
            updatedat = now()
          WHERE dailylogid = $1 AND pocdutyid = $2
        `,
          id,
          dutyIdRaw,
          note,
          hasTs ? tsIso : ""
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
          updatedat = now()
        WHERE dailylogid = $1 AND pocdutyid = $2
        RETURNING id
      `,
        id,
        dutyIdRaw,
        statusEnum,
        note,
        hasTs ? tsIso : ""
      )) as any[];

      if (updated?.[0]?.id) continue;

      // Insert new
      await prisma.$queryRawUnsafe(
        `
        INSERT INTO public.poc_daily_task_log
          (id, dailylogid, pocdutyid, completionstatus, completedat, note, createdat, updatedat)
        VALUES
          (gen_random_uuid(), $1, $2, $3::public.poc_duty_completion_status,
           CASE WHEN $4::text IS NULL OR $4::text = '' THEN now() ELSE $4::timestamptz END,
           $5, now(), now())
      `,
        id,
        dutyIdRaw,
        statusEnum,
        hasTs ? tsIso : "",
        note
      );
    }

    // Return fresh detail
    const refreshed = await readDailyLog(id);
    if (!refreshed) return jsonErr(404, "Not found");

    const pocNumber = await readPocNumber(String(refreshed.pocId || ""));
    const duties = await readAllDuties(String(refreshed.pocId || ""));
    const taskLogs = await readTaskLogs(String(refreshed.id));

    const tasks = buildTasksForDay(String(refreshed.date), duties, taskLogs);

    const item: DailyLogDetail = {
      id: String(refreshed.id),
      pocId: String(refreshed.pocId),
      pocNumber: pocNumber ?? null,
      individualId: String(refreshed.individualId),
      dspId: refreshed.dspId ? String(refreshed.dspId) : null,
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

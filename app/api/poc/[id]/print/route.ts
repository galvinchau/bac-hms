// web/app/api/poc/[id]/print/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* =========================================================
   Helpers
========================================================= */

function escapeHtml(input: any) {
  const s = String(input ?? "");
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function fmtDateMMDDYYYY(d: any) {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt?.getTime?.())) return "";
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const yyyy = String(dt.getFullYear());
  return `${mm}/${dd}/${yyyy}`;
}

function fmtPA_DateHeader(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
  return fmt.format(d).replace(",", "");
}

function fmtPA_Time(d: any) {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt?.getTime?.())) return "";
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return fmt.format(dt).replace(",", "");
}

function yyyyMmDd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODateOnlyToUTC(dateOnly: any): Date | null {
  if (!dateOnly) return null;
  if (dateOnly instanceof Date) return new Date(dateOnly);
  const s = String(dateOnly).trim();
  if (!s) return null;
  if (s.includes("T")) {
    const dt = new Date(s);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function normalizeDays(daysOfWeek: any): Set<string> {
  const set = new Set<string>();
  if (!daysOfWeek) return set;

  const mapNum: Record<number, string> = {
    0: "SUN",
    1: "MON",
    2: "TUE",
    3: "WED",
    4: "THU",
    5: "FRI",
    6: "SAT",
    7: "SUN",
  };

  const pushToken = (t: string) => {
    const x = t.trim().toUpperCase();
    if (!x) return;
    if (x.startsWith("SU")) return set.add("SUN");
    if (x.startsWith("MO")) return set.add("MON");
    if (x.startsWith("TU")) return set.add("TUE");
    if (x.startsWith("WE")) return set.add("WED");
    if (x.startsWith("TH")) return set.add("THU");
    if (x.startsWith("FR")) return set.add("FRI");
    if (x.startsWith("SA")) return set.add("SAT");
  };

  if (Array.isArray(daysOfWeek)) {
    for (const v of daysOfWeek) {
      if (typeof v === "number") set.add(mapNum[v] ?? "");
      else pushToken(String(v));
    }
  } else if (typeof daysOfWeek === "object") {
    for (const [k, v] of Object.entries(daysOfWeek)) {
      if (!v) continue;
      pushToken(k);
    }
  } else {
    const parts = String(daysOfWeek).split(/[,;/\s]+/g);
    for (const p of parts) pushToken(p);
  }

  if (set.has("")) set.delete("");
  return set;
}

function dowTokenForPA(dateUTC: Date): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  });
  const w = fmt.format(dateUTC).toUpperCase();
  if (w.startsWith("SUN")) return "SUN";
  if (w.startsWith("MON")) return "MON";
  if (w.startsWith("TUE")) return "TUE";
  if (w.startsWith("WED")) return "WED";
  if (w.startsWith("THU")) return "THU";
  if (w.startsWith("FRI")) return "FRI";
  if (w.startsWith("SAT")) return "SAT";
  return "";
}

function statusLabel(x: any): string {
  const v = String(x ?? "").toUpperCase();
  if (v === "INDEPENDENT") return "Independent";
  if (v === "VERBAL_PROMPT") return "Verbal Prompt";
  if (v === "PHYSICAL_ASSIST") return "Physical Assist";
  if (v === "REFUSED") return "Refused";
  return "";
}

function pickFirstNonEmpty(...vals: any[]) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

/**
 * ✅ Timezone-safe: convert various date shapes to YYYY-MM-DD without shifting day
 */
function toISODateNoShift(x: any): string {
  if (!x) return "";
  if (typeof x === "string") {
    const s = x.trim();
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (s.includes("T") && s.length >= 10) return s.substring(0, 10);
    return s;
  }
  if (x instanceof Date) return yyyyMmDd(x);
  return "";
}

function safeDateMs(x: any) {
  if (!x) return 0;
  const t = new Date(String(x)).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function safeJsonStringify(x: any): string {
  try {
    return JSON.stringify(x, null, 0);
  } catch {
    return String(x ?? "");
  }
}

/**
 * Extract / format edit history into printable lines.
 * Accepts:
 * - array of objects/strings
 * - object
 * - string
 */
function formatEditHistoryLines(editHistory: any): string[] {
  if (!editHistory) return [];

  // if already a string
  if (typeof editHistory === "string") {
    const s = editHistory.trim();
    if (!s) return [];
    return [s];
  }

  // if array
  if (Array.isArray(editHistory)) {
    const lines: string[] = [];
    for (const it of editHistory) {
      if (!it) continue;
      if (typeof it === "string") {
        const s = it.trim();
        if (s) lines.push(s);
        continue;
      }
      // best effort known fields
      const at = pickFirstNonEmpty(it?.at, it?.time, it?.timestamp, it?.createdAt, it?.updatedAt);
      const who = pickFirstNonEmpty(it?.byName, it?.by, it?.userName, it?.name, it?.byId);
      const action = pickFirstNonEmpty(it?.action, it?.event, it?.type);
      const reason = pickFirstNonEmpty(it?.reason, it?.note, it?.comment);

      const parts = [
        at ? fmtPA_Time(at) : "",
        action ? String(action).toUpperCase() : "",
        who ? `by ${who}` : "",
        reason ? `- reason: ${reason}` : "",
      ].filter(Boolean);

      if (parts.length) lines.push(parts.join(" "));
      else lines.push(safeJsonStringify(it));
    }
    return lines;
  }

  // object
  if (typeof editHistory === "object") {
    // if it looks like { items:[...] }
    if (Array.isArray((editHistory as any).items)) {
      return formatEditHistoryLines((editHistory as any).items);
    }
    // otherwise stringify once
    const s = safeJsonStringify(editHistory);
    return s && s !== "{}" ? [s] : [];
  }

  return [String(editHistory)];
}

/* =========================================================
   API Fetchers
========================================================= */

async function apiGetDailyLogsList(origin: string, q: URLSearchParams) {
  const url = `${origin}/api/poc/daily-logs?${q.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

async function apiGetDailyLogDetail(origin: string, id: string) {
  const url = `${origin}/api/poc/daily-logs/${encodeURIComponent(id)}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

async function apiGetDspNames(origin: string, dspIds: string[]) {
  const ids = Array.from(
    new Set((dspIds || []).map((x) => String(x).trim()).filter(Boolean))
  );
  if (!ids.length) return {} as Record<string, string>;

  const q = new URLSearchParams();
  q.set("ids", ids.join(","));
  const url = `${origin}/api/poc/dsp-names?${q.toString()}`;

  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return {} as Record<string, string>;

  const map =
    data?.map && typeof data.map === "object" ? data.map : ({} as any);
  return map as Record<string, string>;
}

/* =========================================================
   Route
========================================================= */

export async function GET(req: Request, ctx: any) {
  try {
    const origin = new URL(req.url).origin;

    const params = (await ctx?.params) ?? {};
    const id = String(params?.id ?? "").trim();
    if (!id) return new NextResponse("Missing id", { status: 400 });

    const poc = await (prisma as any).poc.findUnique({
      where: { id },
      include: {
        individual: true,
        duties: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!poc) return new NextResponse("POC not found", { status: 404 });

    const individual = poc.individual ?? null;

    // Header info
    const companyName = "BLUE ANGELS CARE";
    const tzLabel = "America/New_York (PA)";
    const now = new Date();

    const pocNumber =
      String(poc.pocNumber ?? "").trim() || String(poc.id ?? "").trim();
    const shift = String(poc.shift ?? "All").trim() || "All";
    const pocIdDisplay = String(poc.id ?? "").trim();

    const admissionId =
      (individual?.code && String(individual.code).trim()) ||
      (individual?.medicaidId && String(individual.medicaidId).trim()) ||
      "";

    const individualName = (() => {
      const first = String(individual?.firstName ?? "").trim();
      const last = String(individual?.lastName ?? "").trim();
      const label = `${last} ${first}`.trim();
      if (label) return label.toUpperCase();
      const name = String(individual?.name ?? "").trim();
      return name ? name.toUpperCase() : "";
    })();

    // Range
    const startUTC = parseISODateOnlyToUTC(poc.startDate) ?? new Date();
    const stopUTC =
      parseISODateOnlyToUTC(poc.stopDate) ??
      parseISODateOnlyToUTC(poc.startDate) ??
      new Date();

    const dateFromISO = yyyyMmDd(startUTC);
    const dateToISO = yyyyMmDd(stopUTC);

    // Build days list inclusive
    const days: Array<{
      dateUTC: Date;
      dateISO: string;
      dow: string;
      header: string;
    }> = [];
    {
      const totalGuard = 400;
      let cur = new Date(startUTC);
      let i = 0;
      while (cur.getTime() <= stopUTC.getTime() && i < totalGuard) {
        const dateISO = yyyyMmDd(cur);
        const dow = dowTokenForPA(cur);
        days.push({
          dateUTC: new Date(cur),
          dateISO,
          dow,
          header: fmtPA_DateHeader(cur),
        });
        cur = addDays(cur, 1);
        i++;
      }
    }

    // ✅ Duties: only those with at least 1 checked day
    const allDutiesRaw = Array.isArray(poc.duties) ? poc.duties : [];
    const duties = allDutiesRaw
      .map((d: any) => {
        const daysSet = normalizeDays(d.daysOfWeek);
        const hasChecked =
          daysSet.has("SUN") ||
          daysSet.has("MON") ||
          daysSet.has("TUE") ||
          daysSet.has("WED") ||
          daysSet.has("THU") ||
          daysSet.has("FRI") ||
          daysSet.has("SAT");
        if (!hasChecked) return null;

        const dutyId = String(d.id ?? d.pocDutyId ?? d.pocdutyid ?? "").trim();
        const taskNo = d?.taskNo == null ? "" : String(d.taskNo).trim();
        const desc = String(d?.duty ?? d?.description ?? "").trim();
        if (!taskNo && !desc) return null;

        return {
          id: dutyId,
          taskNo,
          duty: desc,
          daysSet,
          sortOrder: d?.sortOrder ?? 0,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      taskNo: string;
      duty: string;
      daysSet: Set<string>;
      sortOrder: number;
    }>;

    // =====================================================
    // Fetch daily logs list via API
    // =====================================================
    const individualId = String(individual?.id ?? poc.individualId ?? "").trim();

    const q = new URLSearchParams();
    q.set("pocId", id);
    q.set("individualId", individualId);
    q.set("dateFrom", dateFromISO);
    q.set("dateTo", dateToISO);
    q.set("pageSize", "500");

    const listData = await apiGetDailyLogsList(origin, q);

    const listItems: any[] =
      (Array.isArray(listData?.items) ? listData.items : []) ||
      (Array.isArray(listData?.rows) ? listData.rows : []) ||
      (Array.isArray(listData?.data) ? listData.data : []);

    // Map daily logs by dateISO
    const dailyLogByDate = new Map<string, any>();
    for (const l of listItems) {
      const d =
        l?.date ?? l?.logDate ?? l?.day ?? l?.serviceDate ?? l?.forDate ?? null;
      const iso = toISODateNoShift(d) || toISODateNoShift(l?.createdAt) || "";
      if (iso) dailyLogByDate.set(iso, l);
    }

    const dailyLogIds = Array.from(dailyLogByDate.values())
      .map((x) => String(x?.id ?? x?.dailyLogId ?? "").trim())
      .filter(Boolean);

    // Fetch detail for each daily log id
    const detailsById = new Map<string, any>();
    await Promise.all(
      dailyLogIds.map(async (logId) => {
        try {
          const detail = await apiGetDailyLogDetail(origin, logId);
          detailsById.set(logId, detail);
        } catch {
          // ignore
        }
      })
    );

    // ✅ Build dspIdByLogId (prefer detail.item.dspId, fallback list dspId)
    const dspIdByLogId = new Map<string, string>();
    for (const day of days) {
      const log = dailyLogByDate.get(day.dateISO) ?? null;
      const logId = log ? String(log?.id ?? log?.dailyLogId ?? "").trim() : "";
      if (!logId) continue;

      const raw = detailsById.get(logId) ?? {};
      const detail = raw?.item ?? raw;

      const dspId =
        String(
          detail?.dspId ??
            detail?.dspid ??
            log?.dspId ??
            log?.dspid ??
            ""
        ).trim() || "";
      if (dspId) dspIdByLogId.set(logId, dspId);
    }

    // =====================================================
    // Build task map: key = dailyLogId::pocDutyId -> task row
    // Also collect all potential DSP ids for name lookup
    // =====================================================
    const dspIdsForLookup = new Set<string>();
    for (const v of dspIdByLogId.values()) dspIdsForLookup.add(String(v));

    const taskLogMap = new Map<string, any>();
    for (const logId of dailyLogIds) {
      const raw = detailsById.get(logId) ?? {};
      // /api/poc/daily-logs/[id] returns { ok:true, item:{...} }
      const detail = raw?.item ?? raw;

      // collect day DSP if present
      const dayDspId = String(detail?.dspId ?? detail?.dspid ?? "").trim();
      if (dayDspId) dspIdsForLookup.add(dayDspId);

      const tasks =
        (Array.isArray(detail?.tasks) ? detail.tasks : null) ??
        (Array.isArray(detail?.items) ? detail.items : null) ??
        (Array.isArray(detail?.taskLogs) ? detail.taskLogs : null) ??
        (Array.isArray(detail?.dailyLog?.tasks) ? detail.dailyLog.tasks : null) ??
        [];

      for (const t of tasks) {
        const pocDutyId = pickFirstNonEmpty(
          t?.pocDutyId,
          t?.dutyId,
          t?.pocDutyID,
          t?.pocdutyid,
          t?.id
        );
        if (!pocDutyId) continue;

        // collect task DSP ids if present
        const lockId = String(t?.lockedById ?? "").trim();
        const editId = String(t?.lastEditedById ?? "").trim();
        const dspId = String(t?.dspId ?? t?.dspid ?? "").trim();
        if (lockId) dspIdsForLookup.add(lockId);
        if (editId) dspIdsForLookup.add(editId);
        if (dspId) dspIdsForLookup.add(dspId);

        const key = `${logId}::${pocDutyId}`;

        const ts = pickFirstNonEmpty(
          t?.timestamp,
          t?.completedAt,
          t?.updatedAt,
          t?.createdAt,
          t?.lockedAt
        );

        const existing = taskLogMap.get(key);
        if (!existing) {
          taskLogMap.set(key, t);
        } else {
          const existingTs = pickFirstNonEmpty(
            existing?.timestamp,
            existing?.completedAt,
            existing?.updatedAt,
            existing?.createdAt,
            existing?.lockedAt
          );
          const a = safeDateMs(existingTs);
          const b = safeDateMs(ts);
          if (b >= a) taskLogMap.set(key, t);
        }
      }
    }

    // Lookup DSP names once
    const dspNameMap = await apiGetDspNames(origin, Array.from(dspIdsForLookup));

    const totalDays = days.length;

    // =====================================================
    // Render HTML
    // =====================================================
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>POC Daily Logs Report</title>
  <style>
@page { size: Letter portrait; margin: 0.5in; }

/* Ensure print uses full width and doesn't clip */
html, body { width: 100%; }
body { font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; }

/* Chrome print safety */
* { box-sizing: border-box; }
table { max-width: 100%; }

.headerTop {
  display:flex; align-items:flex-start; justify-content:space-between;
  border-bottom: 2px solid #000;
  padding-bottom: 8px;
  margin-bottom: 8px;
}
.brand { font-weight: 900; font-size: 22px; letter-spacing: 0.5px; color: #0B2E6B; }
.centerTitle { text-align:center; flex: 1; }
.centerTitle .t1 { font-size: 18px; font-weight: 800; }
.centerTitle .t2 { margin-top: 2px; font-size: 12px; font-weight: 700; }
.topRight { text-align:right; font-size: 12px; font-weight: 700; }
.tz { font-size: 11px; margin-top: 3px; }

.metaGrid {
  display:grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin: 10px 0 10px;
}
.metaBox {
  border: 2px solid #000;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
}
.metaRow { display:flex; gap:10px; }
.metaLabel { font-weight: 800; width: 95px; }
.metaVal { font-weight: 700; }

.daySection {
  border: 2px solid #000;
  border-radius: 8px;
  margin-top: 10px;
  /* allow multiple days per page, but avoid splitting rows */
  break-inside: auto;
  page-break-inside: auto;
}
.dayHeader {
  display:flex; align-items:center; justify-content:space-between;
  padding: 6px 10px;
  border-bottom: 2px solid #000;
  font-weight: 900;
}
.dayHeader .date { font-size: 14px; }
.badge {
  border: 2px solid #000;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 900;
}
.badge.empty { background:#fff; }
.badge.updated { background:#e9f3ff; }
.badge.done { background:#e9ffe9; }

.dayNoteLine {
  padding: 6px 10px;
  font-size: 12px;
  color: #333;
}

.tableWrap { padding: 8px 8px 10px; }

/* ✅ Portrait-friendly columns */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  table-layout: fixed;
}
th, td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
th { background: #e6e6e6; font-weight: 800; text-align: left; }

.col-task { width: 52px; text-align:center; }
.col-duty { width: 210px; }        /* ✅ narrower Duty */
.col-status { width: 105px; }
.col-ts { width: 135px; }
.col-dsp { width: 175px; }         /* keep room for history */
.col-note { width: auto; }

td.col-duty { white-space: normal; word-break: break-word; overflow-wrap: anywhere; }
td.col-note { white-space: normal; word-break: break-word; overflow-wrap: anywhere; }

/* ✅ DSP should WRAP (so history doesn't "disappear") */
td.col-dsp { white-space: normal; word-break: break-word; overflow-wrap: anywhere; }

/* Avoid cutting a row across pages */
tr { break-inside: avoid; page-break-inside: avoid; }
thead { display: table-header-group; }
tfoot { display: table-footer-group; }
  </style>
</head>
<body>

  <div class="headerTop">
    <div>
      <div class="brand">${escapeHtml(companyName)}</div>
      <div class="tz">Timezone: ${escapeHtml(tzLabel)}</div>
    </div>

    <div class="centerTitle">
      <div class="t1">POC Daily Logs Report</div>
      <div class="t2">POC Number: ${escapeHtml(pocNumber)}</div>
    </div>

    <div class="topRight">
      <div>Generated: ${escapeHtml(fmtPA_Time(now))}</div>
      <div>Shift: ${escapeHtml(shift)}</div>
    </div>
  </div>

  <div class="metaGrid">
    <div class="metaBox">
      <div class="metaRow"><div class="metaLabel">Individual:</div><div class="metaVal">${escapeHtml(individualName)}</div></div>
      <div class="metaRow"><div class="metaLabel">Admission ID:</div><div class="metaVal">${escapeHtml(admissionId)}</div></div>
    </div>
    <div class="metaBox">
      <div class="metaRow"><div class="metaLabel">Date From:</div><div class="metaVal">${escapeHtml(fmtDateMMDDYYYY(startUTC))}</div></div>
      <div class="metaRow"><div class="metaLabel">Date To:</div><div class="metaVal">${escapeHtml(fmtDateMMDDYYYY(stopUTC))}</div></div>
    </div>
    <div class="metaBox">
      <div class="metaRow"><div class="metaLabel">POC ID:</div><div class="metaVal">${escapeHtml(pocIdDisplay)}</div></div>
      <div class="metaRow"><div class="metaLabel">Total Days:</div><div class="metaVal">${escapeHtml(String(totalDays))}</div></div>
    </div>
  </div>

  ${days
    .map((day) => {
      const log = dailyLogByDate.get(day.dateISO) ?? null;
      const dailyLogId = log ? String(log?.id ?? log?.dailyLogId ?? "").trim() : "";

      const s = String(log?.status ?? "").toUpperCase();
      const badge = log ? (s === "SUBMITTED" ? "DONE" : "UPDATED") : "EMPTY";
      const badgeClass = badge === "DONE" ? "done" : badge === "UPDATED" ? "updated" : "empty";

      const dutiesForDay = duties
        .filter((d) => d.daysSet?.has(day.dow))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      const noteLine = !log ? "No daily log created" : "";

      // DSP name for the day (stored on daily log)
      const dspIdForDay = dailyLogId ? String(dspIdByLogId.get(dailyLogId) || "").trim() : "";
      const dspNameForDay = dspIdForDay ? String(dspNameMap[dspIdForDay] || dspIdForDay).trim() : "";

      const rowsHtml = dutiesForDay.length
        ? dutiesForDay
            .map((d) => {
              let st = "";
              let ts = "";
              let dspCellLines: string[] = [];
              let note = "";

              // default: show day DSP name (if any)
              if (dspNameForDay) dspCellLines.push(dspNameForDay);

              if (dailyLogId && d.id) {
                const t = taskLogMap.get(`${dailyLogId}::${d.id}`) ?? null;

                if (t) {
                  st = statusLabel(t?.status ?? t?.completionStatus ?? t?.taskStatus);

                  const rawTs = pickFirstNonEmpty(
                    t?.timestamp,
                    t?.completedAt,
                    t?.updatedAt,
                    t?.createdAt,
                    t?.lockedAt
                  );
                  ts = rawTs ? fmtPA_Time(rawTs) : "";

                  note = pickFirstNonEmpty(t?.note, t?.notes, t?.comment, t?.memo);

                  // === DSP block (with history) ===
                  const lockAtRaw = pickFirstNonEmpty(t?.lockedAt, t?.timestamp, t?.completedAt);
                  const lockAt = lockAtRaw ? fmtPA_Time(lockAtRaw) : "";

                  const lockName = String(t?.lockedByName ?? "").trim();
                  const lockId = String(t?.lockedById ?? "").trim();
                  const lockNameFromId = lockId ? String(dspNameMap[lockId] || lockId).trim() : "";
                  const lockedBy = pickFirstNonEmpty(lockName, lockNameFromId, dspNameForDay);

                  // last edited
                  const editedAtRaw = pickFirstNonEmpty(t?.lastEditedAt, t?.lasteditedat);
                  const editedAt = editedAtRaw ? fmtPA_Time(editedAtRaw) : "";

                  const editedByName = String(t?.lastEditedByName ?? t?.lasteditedbyname ?? "").trim();
                  const editedById = String(t?.lastEditedById ?? t?.lasteditedbyid ?? "").trim();
                  const editedBy = pickFirstNonEmpty(
                    editedByName,
                    editedById ? String(dspNameMap[editedById] || editedById).trim() : "",
                    ""
                  );

                  const editReason = pickFirstNonEmpty(t?.lastEditReason, t?.lasteditreason);

                  // history
                  const editHistory = t?.editHistory ?? t?.edithistory;
                  const historyLines = formatEditHistoryLines(editHistory);

                  // reset dsp lines and rebuild in a stable order
                  dspCellLines = [];

                  // 1) Locked line (only if has a timestamp/status)
                  if (st) {
                    if (lockedBy) {
                      dspCellLines.push(lockAt ? `Locked by ${lockedBy} @ ${lockAt}` : `Locked by ${lockedBy}`);
                    } else {
                      dspCellLines.push(lockAt ? `Locked @ ${lockAt}` : "Locked");
                    }
                  } else if (dspNameForDay) {
                    // if not locked, still show day DSP (for consistency)
                    dspCellLines.push(dspNameForDay);
                  }

                  // 2) Edited line
                  if (editedAt || editedBy || editReason) {
                    const parts = [
                      editedBy ? `Edited by ${editedBy}` : "Edited",
                      editedAt ? `@ ${editedAt}` : "",
                      editReason ? `- reason: ${editReason}` : "",
                    ].filter(Boolean);
                    dspCellLines.push(parts.join(" "));
                  }

                  // 3) Edit History block
                  if (historyLines.length) {
                    dspCellLines.push("Edit History");
                    for (const ln of historyLines) dspCellLines.push(ln);
                  }
                }
              }

              // If still blank
              const dspCell = dspCellLines.filter(Boolean).join("<br/>");

              return `<tr>
  <td class="col-task">${escapeHtml(d.taskNo)}</td>
  <td class="col-duty">${escapeHtml(d.duty)}</td>
  <td class="col-status">${escapeHtml(st)}</td>
  <td class="col-ts">${escapeHtml(ts)}</td>
  <td class="col-dsp">${dspCell ? dspCell : ""}</td>
  <td class="col-note">${escapeHtml(note)}</td>
</tr>`;
            })
            .join("\n")
        : `<tr><td colspan="6" style="text-align:center;">No duties scheduled for this day</td></tr>`;

      return `
<div class="daySection">
  <div class="dayHeader">
    <div class="date">${escapeHtml(day.header)}</div>
    <div class="badge ${badgeClass}">${escapeHtml(badge)}</div>
  </div>
  ${noteLine ? `<div class="dayNoteLine">${escapeHtml(noteLine)}</div>` : ""}
  <div class="tableWrap">
    <table>
      <thead>
        <tr>
          <th class="col-task">Task#</th>
          <th class="col-duty">Duty</th>
          <th class="col-status">Status</th>
          <th class="col-ts">Timestamp (PA)</th>
          <th class="col-dsp">DSP</th>
          <th class="col-note">Note</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>
</div>`;
    })
    .join("\n")}

</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("GET /api/poc/[id]/print error:", e);
    return new NextResponse(
      `Internal Server Error\n${String(e?.message || e)}`,
      { status: 500 }
    );
  }
}
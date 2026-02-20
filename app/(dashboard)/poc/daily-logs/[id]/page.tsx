// web/app/(dashboard)/poc/daily-logs/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Status = "DRAFT" | "SUBMITTED";

// ✅ Match DB enum: public.poc_duty_completion_status
type TaskStatus = "INDEPENDENT" | "VERBAL_PROMPT" | "PHYSICAL_ASSIST" | "REFUSED";

type TaskDetail = {
  id: string; // may be pocDutyId OR taskLogId depending on API shape
  pocDutyId: string; // may be pocDutyId OR taskLogId depending on API shape
  taskNo?: number | null;
  duty: string;
  category?: string | null;
  status: TaskStatus | null;
  note?: string | null;
  timestamp?: string | null; // ISO
};

type DailyLogDetail = {
  id: string;
  pocId: string;
  pocNumber?: string | null;
  individualId: string;
  dspId: string | null;
  date: string; // may be YYYY-MM-DD OR ISO DateTime
  status: Status;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tasks: TaskDetail[];
};

type DutyItem = {
  id: string;
  pocId: string;
  category?: string | null;
  taskNo?: number | null;
  duty: string;
  instruction?: string | null;
  daysOfWeek?: any; // jsonb in DB
  sortOrder?: number | null;
};

function qs(obj: Record<string, string | number | null | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (!s) continue;
    sp.set(k, s);
  }
  return sp.toString();
}

async function readJsonOrThrow(res: Response) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) {
    const txt = await res.text().catch(() => "");
    throw new Error(`API returned non-JSON (${res.status}). ${txt.slice(0, 120)}`);
  }
  return res.json();
}

const TZ_PA = "America/New_York";

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

/**
 * ✅ Normalize any date string (YYYY-MM-DD or ISO) into YYYY-MM-DD.
 */
function toYmdAny(input: string) {
  const s = String(input || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/**
 * ✅ Create a safe Date object for display in PA.
 */
function dateFromYmdNoShift(ymd: string) {
  if (!isYmd(ymd)) return null;
  const d = new Date(`${ymd}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function fmtDateOnlyPA_MMDDYYYY(dateAny: string) {
  const ymd = toYmdAny(dateAny);
  const d = dateFromYmdNoShift(ymd);
  if (!d) return dateAny;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ_PA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function fmtDateHeaderPA(dateAny: string) {
  const ymd = toYmdAny(dateAny);
  const d = dateFromYmdNoShift(ymd);
  if (!d) return dateAny;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ_PA,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

function fmtLocalPA(dtIso: string) {
  const s = String(dtIso || "").trim();
  if (!s) return s;

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return dtIso;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ_PA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function nowIso() {
  return new Date().toISOString();
}

/* =========================================================
   ✅ Days-of-week filtering helpers (DB format confirmed)
   DB jsonb: {"sun":true,"mon":true,"tue":true,"wed":true,"thu":true,"fri":true,"sat":true}
   ========================================================= */

function hasAnyTrue(obj: any) {
  if (!obj || typeof obj !== "object") return false;
  return Object.values(obj).some((v) => v === true);
}

function getDowKeyFromYmd(ymd: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;

  // Midday UTC to avoid timezone shift across days
  const dt = new Date(`${ymd}T12:00:00.000Z`);
  const wk = new Intl.DateTimeFormat("en-US", { timeZone: TZ_PA, weekday: "short" }).format(dt);

  const map: Record<string, string> = {
    Sun: "sun",
    Mon: "mon",
    Tue: "tue",
    Wed: "wed",
    Thu: "thu",
    Fri: "fri",
    Sat: "sat",
  };

  return map[wk] ?? null;
}

/**
 * ✅ Strictly filter by DB jsonb keys:
 * - If daysOfWeek is null/undefined => treat as "applies all days"
 * - If object exists but all false => "no days selected" => false
 * - Else check today key: sun/mon/tue/wed/thu/fri/sat
 */
function dutyAppliesToDay(daysOfWeek: any, ymd: string): boolean {
  if (!daysOfWeek) return true;

  const key = getDowKeyFromYmd(ymd);
  if (!key) return true;

  let v: any = daysOfWeek;

  // Some APIs may send jsonb as string
  if (typeof v === "string") {
    const raw = v.trim();
    if (!raw) return true;
    try {
      v = JSON.parse(raw);
    } catch {
      // If not JSON, be permissive (don’t hide)
      return true;
    }
  }

  if (v && typeof v === "object" && !Array.isArray(v)) {
    // If object has no true values -> none selected -> should be filtered out
    if (!hasAnyTrue(v)) return false;
    return v[key] === true;
  }

  // Unknown format => be permissive
  return true;
}

/**
 * ✅ Because API shape can vary:
 * Sometimes t.id is the poc_duty.id, sometimes t.pocDutyId is.
 * We'll match using whichever exists in dutyById.
 */
function getTaskDutyId(t: TaskDetail, dutyById: Record<string, DutyItem>): string {
  const a = String((t as any)?.pocDutyId || "").trim();
  const b = String((t as any)?.id || "").trim();

  if (a && dutyById[a]) return a;
  if (b && dutyById[b]) return b;

  // fallback: prefer pocDutyId if present, else id
  return a || b;
}

export default function DailyLogDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "").trim();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [item, setItem] = useState<DailyLogDetail | null>(null);
  const [saving, setSaving] = useState(false);

  // ✅ Duty list (by POC) to filter tasks by Days Of Week
  const [dutyById, setDutyById] = useState<Record<string, DutyItem>>({});
  const [dutiesLoaded, setDutiesLoaded] = useState(false);

  async function loadDutiesForPoc(pocId: string) {
    const pid = String(pocId || "").trim();
    if (!pid) {
      setDutyById({});
      setDutiesLoaded(true);
      return;
    }

    setDutiesLoaded(false);
    try {
      const res = await fetch(`/api/poc/duties?${qs({ pocId: pid })}`, { method: "GET" });
      const json = (await readJsonOrThrow(res)) as {
        ok: boolean;
        items: DutyItem[];
        error?: string;
        detail?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.detail || json.error || `HTTP ${res.status}`);

      const map: Record<string, DutyItem> = {};
      (json.items || []).forEach((d) => {
        const did = String(d?.id || "").trim();
        if (did) map[did] = d;
      });

      setDutyById(map);
      setDutiesLoaded(true);
    } catch {
      // If duties cannot be loaded, do NOT filter (avoid hiding everything)
      setDutyById({});
      setDutiesLoaded(true);
    }
  }

  async function load() {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/poc/daily-logs/${encodeURIComponent(id)}`, { method: "GET" });
      const json = (await readJsonOrThrow(res)) as {
        ok: boolean;
        item?: DailyLogDetail;
        error?: string;
        detail?: string;
      };
      if (!res.ok || !json.ok || !json.item) throw new Error(json.detail || json.error || `HTTP ${res.status}`);

      setItem(json.item);

      // ✅ Load duties for this POC so we can filter by Days Of Week
      await loadDutiesForPoc(json.item.pocId);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setItem(null);
      setDutyById({});
      setDutiesLoaded(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function updateTask(taskId: string, patch: Partial<TaskDetail>) {
    setItem((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: (prev.tasks || []).map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
      };
    });
  }

  // ✅ Visible tasks: duties that belong to POC and match Days Of Week for this log date.
  // NOTE: now 100% matches DB jsonb keys sun/mon/tue/wed/thu/fri/sat.
  const visibleTasks = useMemo(() => {
    const tasks = item?.tasks || [];
    if (!item) return tasks;

    // If duties not loaded yet, don't hide anything
    if (!dutiesLoaded) return tasks;

    const hasDutyMap = dutyById && Object.keys(dutyById).length > 0;
    if (!hasDutyMap) return tasks;

    const logYmd = toYmdAny(item.date);
    if (!logYmd) return tasks;

    // 1) Keep only tasks whose duty exists in this POC
    const belongsToPoc = tasks.filter((t) => {
      const did = getTaskDutyId(t, dutyById);
      return !!did && !!dutyById[did];
    });

    // 2) Filter by day-of-week (STRICT)
    const byDay = belongsToPoc.filter((t) => {
      const did = getTaskDutyId(t, dutyById);
      const duty = dutyById[did];
      if (!duty) return false;
      return dutyAppliesToDay(duty.daysOfWeek, logYmd);
    });

    return byDay;
  }, [item, dutiesLoaded, dutyById]);

  async function save(nextStatus?: Status) {
    if (!item) return;

    setSaving(true);
    setErr(null);
    try {
      const payload = {
        status: nextStatus || item.status,
        tasks: (visibleTasks || []).map((t) => ({
          // ✅ API expects pocDutyId (duty id). Use best-effort:
          pocDutyId: String((t as any)?.pocDutyId || (t as any)?.id || "").trim(),
          status: t.status,
          note: t.note ?? null,
          timestamp: t.timestamp ?? null,
        })),
      };

      const res = await fetch(`/api/poc/daily-logs/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await readJsonOrThrow(res)) as {
        ok: boolean;
        item?: DailyLogDetail;
        error?: string;
        detail?: string;
      };
      if (!res.ok || !json.ok || !json.item) throw new Error(json.detail || json.error || `HTTP ${res.status}`);

      setItem(json.item);

      router.back();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  // ✅ Dark theme wrapper
  const pageWrap = "min-h-[calc(100vh-64px)] bg-[#071427] text-white";
  const card = "rounded-lg border border-white/10 bg-[#071427]";
  const cardInner = "p-4";
  const softText = "text-white/70";
  const mono = "font-mono";
  const btn = "px-3 py-2 rounded-md border border-white/20 hover:bg-white/10 disabled:opacity-50";
  const btnPrimary = "px-4 py-2 rounded-md bg-white text-black hover:opacity-90 disabled:opacity-50";

  if (loading || !item) {
    return (
      <div className={`${pageWrap} p-4`}>
        <div className={`${card} ${cardInner}`}>
          <div className="text-lg font-semibold text-white">Daily Log Detail</div>
          <div className={`mt-2 text-sm ${softText}`}>
            {loading ? "Loading..." : err ? `Error: ${err}` : "Not found."}
          </div>
          <div className="mt-3">
            <button className={btn} onClick={() => router.back()}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayDate = fmtDateOnlyPA_MMDDYYYY(item.date);
  const displayHeaderDate = fmtDateHeaderPA(item.date);
  const printTitle = `Daily Log — ${displayHeaderDate}`;
  const pocDisplay = item.pocNumber?.trim() ? item.pocNumber : item.pocId;

  return (
    <div className={`${pageWrap} p-4`}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-card { box-shadow: none !important; border: 1px solid #000 !important; background: white !important; }
          .print-table th, .print-table td { border: 1px solid #000 !important; color: black !important; }
        }
      `}</style>

      <div className="no-print flex items-center justify-between mb-3">
        <div>
          <div className="text-xl font-semibold text-white">{printTitle}</div>
          <div className={`text-sm ${softText} ${mono}`}>Log ID: {item.id}</div>
        </div>
        <div className="flex items-center gap-2">
          <button className={btn} onClick={() => router.back()} disabled={saving}>
            Back
          </button>
          <button className={btn} onClick={() => window.print()} disabled={saving}>
            Print
          </button>
        </div>
      </div>

      {err ? (
        <div className="no-print mb-3 text-sm text-red-300">
          Error: <span className="font-mono">{err}</span>
        </div>
      ) : null}

      <div className={`print-card ${card} ${cardInner}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <div className={`text-xs text-[#f5c84c]`}>Date</div>
            <div className={`mt-1 ${mono} text-base text-white`}>{displayDate}</div>
          </div>

          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <div className={`text-xs text-[#f5c84c]`}>POC Number</div>
            <div className={`mt-1 ${mono} text-base text-white`}>{pocDisplay}</div>
          </div>

          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <div className={`text-xs text-[#f5c84c]`}>DSP</div>
            <div className={`mt-1 ${mono} text-base text-white`}>{item.dspId || "—"}</div>
          </div>

          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <div className={`text-xs text-[#f5c84c]`}>Status</div>
            <div className="mt-1 font-semibold text-base text-white">{item.status}</div>
            {item.submittedAt ? (
              <div className={`text-[11px] ${softText} mt-1`}>Submitted: {fmtLocalPA(item.submittedAt)}</div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">
            Tasks{" "}
            <span className="text-xs text-white/50">
              ({visibleTasks.length}/{(item.tasks || []).length})
            </span>
          </div>
          <div className={`no-print text-xs ${softText}`}>
            Timezone: {TZ_PA}. If Timestamp is empty, server stamps now().
          </div>
        </div>

        <div className="mt-2 overflow-auto">
          <table className="print-table w-full text-sm border border-white/10">
            <thead className="bg-white/5">
              <tr className="text-left">
                <th className="px-3 py-2 border border-white/10 w-[90px] text-[#f5c84c] font-bold">Task #</th>
                <th className="px-3 py-2 border border-white/10 text-[#f5c84c] font-bold">Duty</th>
                <th className="px-3 py-2 border border-white/10 w-[220px] text-[#f5c84c] font-bold">Status</th>
                <th className="px-3 py-2 border border-white/10 w-[240px] text-[#f5c84c] font-bold">
                  Timestamp (PA)
                </th>
                <th className="px-3 py-2 border border-white/10 text-[#f5c84c] font-bold">Note</th>
                <th className="no-print px-3 py-2 border border-white/10 w-[90px] text-[#f5c84c] font-bold">Quick</th>
              </tr>
            </thead>

            <tbody className="text-white">
              {(visibleTasks || []).map((t) => (
                <tr key={t.id} className="hover:bg-white/5">
                  <td className={`px-3 py-2 border border-white/10 ${mono}`}>{t.taskNo ?? ""}</td>
                  <td className="px-3 py-2 border border-white/10">{t.duty}</td>

                  <td className="px-3 py-2 border border-white/10">
                    <select
                      className="w-full border border-white/10 rounded-md px-2 py-2 bg-white/10 text-white no-print"
                      value={t.status ?? ""}
                      onChange={(e) => updateTask(t.id, { status: (e.target.value as TaskStatus) || null })}
                      disabled={saving}
                    >
                      <option value="" className="bg-[#071427]">
                        (Select)
                      </option>
                      <option value="INDEPENDENT" className="bg-[#071427]">
                        Independent
                      </option>
                      <option value="VERBAL_PROMPT" className="bg-[#071427]">
                        Verbal Prompt
                      </option>
                      <option value="PHYSICAL_ASSIST" className="bg-[#071427]">
                        Physical Assist
                      </option>
                      <option value="REFUSED" className="bg-[#071427]">
                        Refused
                      </option>
                    </select>

                    <div className="hidden print:block">{t.status || ""}</div>
                  </td>

                  <td className="px-3 py-2 border border-white/10">
                    <div className="no-print">
                      <input
                        className="w-full border border-white/10 rounded-md px-2 py-2 bg-white/10 text-white"
                        value={t.timestamp ? fmtLocalPA(t.timestamp) : "(auto)"}
                        readOnly
                      />
                    </div>

                    <div className="hidden print:block">{t.timestamp ? fmtLocalPA(t.timestamp) : ""}</div>
                  </td>

                  <td className="px-3 py-2 border border-white/10">
                    <input
                      className="w-full border border-white/10 rounded-md px-2 py-2 bg-white/10 text-white no-print"
                      value={t.note || ""}
                      onChange={(e) => updateTask(t.id, { note: e.target.value })}
                      placeholder="Optional note..."
                      disabled={saving}
                    />
                    <div className="hidden print:block">{t.note || ""}</div>
                  </td>

                  <td className="no-print px-3 py-2 border border-white/10">
                    <button
                      className="px-3 py-2 rounded-md border border-white/20 hover:bg-white/10 text-xs"
                      onClick={() => updateTask(t.id, { timestamp: nowIso() })}
                      disabled={saving}
                      title="Fill timestamp now"
                    >
                      Now
                    </button>
                  </td>
                </tr>
              ))}

              {(visibleTasks || []).length === 0 ? (
                <tr>
                  <td className={`px-3 py-6 text-center border border-white/10 ${softText}`} colSpan={6}>
                    No tasks for this POC (based on Days Of Week).
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="no-print mt-4 flex items-center justify-end gap-2">
          <button className={btn} onClick={() => load()} disabled={saving}>
            Reload
          </button>
          <button className={btn} onClick={() => save("DRAFT")} disabled={saving}>
            Save Draft
          </button>
          <button className={btnPrimary} onClick={() => save("SUBMITTED")} disabled={saving}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
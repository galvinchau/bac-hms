// web/app/(dashboard)/poc/daily-logs/page.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Status = "DRAFT" | "SUBMITTED";

type ApiItem = {
  id: string;
  pocId: string;
  pocNumber?: string | null;
  individualId: string;
  dspId: string | null;
  date: string; // YYYY-MM-DD (but API might return ISO)
  status: Status;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
};

type ApiResponse = {
  ok: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: ApiItem[];
  error?: string;
  detail?: string;
};

type DutyItem = {
  id: string;
  pocId: string;
  category?: string | null;
  taskNo?: number | null;
  duty: string;
  instruction?: string | null;
  daysOfWeek?: any;
  sortOrder?: number | null;
};

type AuthMe = {
  ok: boolean;
  user?: any;
};

type ResolvePocResponse = {
  ok: boolean;
  pocId?: string;
  individualId?: string;
  pocStart?: string | null; // YYYY-MM-DD
  pocStop?: string | null; // YYYY-MM-DD
  pocNumber?: string | null;
  error?: string;
  detail?: string;
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

function todayYmdPA(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_PA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value || "1970";
  const m = parts.find((p) => p.type === "month")?.value || "01";
  const d = parts.find((p) => p.type === "day")?.value || "01";
  return `${y}-${m}-${d}`;
}

function normalizeToYmd(v: string): string {
  const s = String(v || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function addDays(ymd: string, delta: number) {
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function fmtDatePA(ymdOrIso: string) {
  const s = String(ymdOrIso || "").trim();
  if (!s) return s;

  const d = isYmd(s) ? new Date(`${s}T12:00:00.000Z`) : new Date(s);
  if (Number.isNaN(d.getTime())) return ymdOrIso;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ_PA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function getDowKeyFromYmd(ymd: string): {
  idx: number;
  short: "S" | "M" | "T" | "W" | "F";
  long: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
} | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;

  const dt = new Date(`${ymd}T12:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  }).format(dt);

  const map: Record<string, { idx: number; long: any; short: any }> = {
    Sun: { idx: 0, long: "sun", short: "S" },
    Mon: { idx: 1, long: "mon", short: "M" },
    Tue: { idx: 2, long: "tue", short: "T" },
    Wed: { idx: 3, long: "wed", short: "W" },
    Thu: { idx: 4, long: "thu", short: "T" },
    Fri: { idx: 5, long: "fri", short: "F" },
    Sat: { idx: 6, long: "sat", short: "S" },
  };

  return map[weekday] || null;
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
    } catch {}
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

function truncate(s: string, n: number) {
  const x = String(s || "");
  if (x.length <= n) return x;
  return x.slice(0, n - 1) + "…";
}

/* =========================================================
   ✅ Close/Return helpers (avoid 404 due to double-encoding)
   ========================================================= */

function safeDecodeURIComponentOnce(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function normalizeReturnTo(raw: string) {
  let s = String(raw || "").trim();
  if (!s) return "";

  const d1 = safeDecodeURIComponentOnce(s);
  const d2 = safeDecodeURIComponentOnce(d1);
  s = d2;

  if (s.startsWith("http://") || s.startsWith("https://")) return "";

  if (!s.startsWith("/")) {
    const d3 = safeDecodeURIComponentOnce(s);
    s = d3;
    if (!s.startsWith("/")) s = "/" + s;
  }

  s = s.replace(/\s+/g, "");
  return s;
}

function deriveActorFromMe(me: any): { actorId: string; actorName: string } {
  const u = me?.user || me;

  const actorId = String(u?.employeeId || u?.dspId || u?.employee?.id || u?.id || "").trim();
  const actorName = String(u?.name || u?.fullName || u?.displayName || u?.email || "").trim();

  return { actorId, actorName };
}

function isDifferentIso(a?: string | null, b?: string | null) {
  const aa = String(a || "").trim();
  const bb = String(b || "").trim();
  if (!aa || !bb) return false;
  return aa !== bb;
}

function DailyLogsListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // incoming query
  const prePocId = searchParams.get("pocId") || "";
  const prePocNumber = searchParams.get("pocNumber") || "";
  const preIndividualId = searchParams.get("individualId") || "";

  const pocStartRaw = searchParams.get("pocStart") || "";
  const pocStopRaw = searchParams.get("pocStop") || "";

  const prePocStart = normalizeToYmd(pocStartRaw);
  const prePocStop = normalizeToYmd(pocStopRaw);

  const returnToRaw = searchParams.get("returnTo") || "";
  const returnTo = normalizeReturnTo(returnToRaw);

  // ✅ resolved fallback when only pocNumber is provided
  const [resolved, setResolved] = useState<{
    pocId: string;
    individualId: string;
    pocStart: string;
    pocStop: string;
    pocNumber: string;
  } | null>(null);

  const [resolving, setResolving] = useState(false);
  const [resolveErr, setResolveErr] = useState<string | null>(null);

  // Effective values (prefer query, fallback to resolved)
  const effPocId = prePocId || resolved?.pocId || "";
  const effIndividualId = preIndividualId || resolved?.individualId || "";
  const effPocNumber = prePocNumber || resolved?.pocNumber || "";

  const effPocStart = prePocStart || resolved?.pocStart || "";
  const effPocStop = prePocStop || resolved?.pocStop || "";

  const today = todayYmdPA();
  const endDate = effPocStop || today;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [statusDraft, setStatusDraft] = useState(true);
  const [statusSubmitted, setStatusSubmitted] = useState(true);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [duties, setDuties] = useState<DutyItem[]>([]);

  const [actorId, setActorId] = useState("");
  const [actorName, setActorName] = useState("");

  const statusParam = useMemo(() => {
    const list: Status[] = [];
    if (statusDraft) list.push("DRAFT");
    if (statusSubmitted) list.push("SUBMITTED");
    return list.length ? list.join(",") : "";
  }, [statusDraft, statusSubmitted]);

  const titleSuffix = useMemo(() => {
    if (effPocNumber) return ` — POC ${effPocNumber}`;
    if (effPocId) return ` — POC`;
    return "";
  }, [effPocId, effPocNumber]);

  // ✅ Resolve when missing ids but has pocNumber
  useEffect(() => {
    async function resolveIfNeeded() {
      setResolveErr(null);

      // already have both -> no need resolve
      if (prePocId && preIndividualId) return;

      // need resolve only if we have pocNumber
      const pn = String(prePocNumber || "").trim();
      if (!pn) return;

      // avoid re-resolve
      if (resolved && resolved.pocNumber === pn) return;
      if (resolving) return;

      try {
        setResolving(true);

        const res = await fetch(`/api/poc/resolve?${qs({ pocNumber: pn })}`, {
          method: "GET",
          cache: "no-store",
        });

        const json = (await readJsonOrThrow(res)) as ResolvePocResponse;
        if (!res.ok || !json?.ok) {
          throw new Error(json?.detail || json?.error || `Resolve failed (${res.status})`);
        }

        const pocId = String(json.pocId || "").trim();
        const individualId = String(json.individualId || "").trim();
        const pocStart = normalizeToYmd(String(json.pocStart || ""));
        const pocStop = normalizeToYmd(String(json.pocStop || ""));
        const pocNumber = String(json.pocNumber || pn).trim();

        if (!pocId || !individualId) {
          throw new Error("Resolve result missing pocId/individualId.");
        }
        if (!pocStart) {
          throw new Error("Resolve result missing pocStart.");
        }

        setResolved({
          pocId,
          individualId,
          pocStart,
          pocStop,
          pocNumber,
        });
      } catch (e: any) {
        setResolveErr(String(e?.message || e));
        setResolved(null);
      } finally {
        setResolving(false);
      }
    }

    resolveIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prePocId, preIndividualId, prePocNumber]);

  const generatedDates = useMemo(() => {
    if (!effPocStart) return [];
    if (!isYmd(effPocStart)) return [];
    if (!isYmd(endDate)) return [];
    if (endDate < effPocStart) return [];

    const out: string[] = [];
    let cur = effPocStart;
    while (cur <= endDate) {
      out.push(cur);
      cur = addDays(cur, 1);
      if (out.length > 3660) break;
    }
    return out;
  }, [effPocStart, endDate]);

  async function loadMe() {
    try {
      const res = await fetch(`/api/auth/me`, { method: "GET" });
      const json = (await readJsonOrThrow(res)) as AuthMe;
      if (!res.ok || !json?.ok) return;

      const { actorId, actorName } = deriveActorFromMe(json);
      if (actorId) setActorId(actorId);
      if (actorName) setActorName(actorName);
    } catch {}
  }

  async function loadDutiesOnce() {
    if (!effPocId) return;
    try {
      const res = await fetch(`/api/poc/duties?${qs({ pocId: effPocId })}`, { method: "GET" });
      const json = (await readJsonOrThrow(res)) as {
        ok: boolean;
        items: DutyItem[];
        error?: string;
        detail?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.detail || json.error || `HTTP ${res.status}`);
      setDuties(Array.isArray(json.items) ? json.items : []);
    } catch {
      setDuties([]);
    }
  }

  async function loadRange() {
    if (!effPocId || !effIndividualId || !effPocStart) return;

    setLoading(true);
    setErr(null);
    try {
      const query = qs({
        pocId: effPocId,
        individualId: effIndividualId,
        dateFrom: effPocStart,
        dateTo: endDate,
        status: statusParam || null,
        page: 1,
        pageSize: 200,
      });

      const res = await fetch(`/api/poc/daily-logs?${query}`, { method: "GET" });
      const json = (await readJsonOrThrow(res)) as ApiResponse;

      if (!res.ok || !json.ok) throw new Error(json.detail || json.error || `HTTP ${res.status}`);
      setData(json);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDutiesOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effPocId]);

  useEffect(() => {
    loadRange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusParam, effPocId, effIndividualId, effPocStart, endDate]);

  const byDate = useMemo(() => {
    const m = new Map<string, ApiItem>();
    (data?.items || []).forEach((x) => {
      const key = normalizeToYmd(String(x?.date || ""));
      if (key) m.set(key, x);
    });
    return m;
  }, [data]);

  function buildDetailUrl(args: { id: string; date: string; dspId?: string | null }) {
    const q = qs({
      pocId: effPocId || null,
      individualId: effIndividualId || null,
      pocNumber: effPocNumber || null,
      pocStart: effPocStart || null,
      pocStop: effPocStop || null,
      date: args.date || null,
      dspId: args.dspId ?? null,
      returnTo: returnTo || null,
    });
    return `/poc/daily-logs/${encodeURIComponent(args.id)}${q ? `?${q}` : ""}`;
  }

  async function openDay(ymd: string) {
    if (!effPocId || !effIndividualId) return;
    if (!isYmd(ymd)) return;

    const exist = byDate.get(ymd);
    if (exist?.id) {
      router.push(buildDetailUrl({ id: exist.id, date: ymd, dspId: exist.dspId ?? null }));
      return;
    }

    setLoading(true);
    setErr(null);
    try {
      const createDspId = actorId || null;

      const res = await fetch(`/api/poc/daily-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pocId: effPocId,
          individualId: effIndividualId,
          date: ymd,
          dspId: createDspId,
        }),
      });

      const json = (await readJsonOrThrow(res)) as {
        ok: boolean;
        id?: string;
        created?: boolean;
        error?: string;
        detail?: string;
      };
      if (!res.ok || !json.ok || !json.id) throw new Error(json.detail || json.error || `HTTP ${res.status}`);

      router.push(buildDetailUrl({ id: json.id, date: ymd, dspId: createDspId }));
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  function onClose() {
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    router.push("/individual/detail");
  }

  const dutiesForDay = useMemo(() => {
    const cache = new Map<string, DutyItem[]>();
    return (ymd: string) => {
      const hit = cache.get(ymd);
      if (hit) return hit;
      const list = (duties || []).filter((d) => dutyAppliesToDay(d.daysOfWeek, ymd));
      cache.set(ymd, list);
      return list;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duties]);

  // ✅ Handle missing params: allow pocNumber-only, show resolving UI
  const missingIds = !effPocId || !effIndividualId;
  const missingStart = !effPocStart;

  if (missingIds) {
    const canResolve = !!prePocNumber;

    return (
      <div className="min-h-[calc(100vh-64px)] p-4">
        <div className="rounded-xl border border-white/10 bg-[#0B1220] text-white p-5 shadow">
          <div className="text-lg font-semibold text-[#FFD66B]">Daily Logs</div>

          {canResolve ? (
            <>
              <div className="mt-2 text-sm text-white/70">
                Resolving POC from <span className="font-mono">pocNumber={prePocNumber}</span>…
              </div>

              {resolving ? (
                <div className="mt-2 text-sm text-white/60">Please wait…</div>
              ) : resolveErr ? (
                <div className="mt-2 text-sm text-red-300">
                  Resolve error: <span className="font-mono">{resolveErr}</span>
                </div>
              ) : (
                <div className="mt-2 text-sm text-white/60">
                  (If you still see this, please refresh.)
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mt-2 text-sm text-red-300">Missing pocId / individualId from query.</div>
              <div className="mt-2 text-sm text-white/70">
                Please open Daily Logs from the POC module button so the page receives the required parameters.
              </div>
            </>
          )}

          <div className="mt-4">
            <button
              className="px-4 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (missingStart) {
    return (
      <div className="min-h-[calc(100vh-64px)] p-4">
        <div className="rounded-xl border border-white/10 bg-[#0B1220] text-white p-5 shadow">
          <div className="text-lg font-semibold text-[#FFD66B]">Daily Logs{titleSuffix}</div>
          <div className="mt-2 text-sm text-red-300">Missing pocStart in query (and resolve).</div>
          <div className="mt-2 text-sm text-white/70">POC Start Date is required to generate daily log dates.</div>
          <div className="mt-4 flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const showWho = actorName ? `Signed in: ${actorName}` : "";

  // ✅ FULL-BLEED breakout: escape any parent max-width container
  const fullBleedStyle: React.CSSProperties = {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#070B14] text-white" style={fullBleedStyle}>
      <div className="w-full px-4 md:px-6 py-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight">Daily Logs{titleSuffix}</h1>
            <p className="mt-1 text-sm text-white/70">
              Range: <span className="font-mono">{fmtDatePA(effPocStart)}</span> →{" "}
              <span className="font-mono">{fmtDatePA(endDate)}</span>
              <span className="ml-2 text-xs text-white/40">(Timezone: {TZ_PA})</span>
            </p>
            {showWho ? <p className="mt-1 text-xs text-white/50">{showWho}</p> : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              className="px-4 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10"
              onClick={onClose}
            >
              Close
            </button>
            <button
              className="px-4 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-50"
              onClick={() => loadRange()}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-[#0B1220] p-4">
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-[#FFD66B] font-semibold">
              <input type="checkbox" checked={statusDraft} onChange={(e) => setStatusDraft(e.target.checked)} />
              Draft
            </label>

            <label className="flex items-center gap-2 text-sm text-[#FFD66B] font-semibold">
              <input
                type="checkbox"
                checked={statusSubmitted}
                onChange={(e) => setStatusSubmitted(e.target.checked)}
              />
              Submitted
            </label>

            <div className="text-sm text-white/70">
              Total days: <b>{generatedDates.length}</b> • Existing logs: <b>{data?.total ?? 0}</b>
            </div>

            <div className="text-xs text-white/50">
              Status meaning: <span className="text-white/70">EMPTY</span> (no log) •{" "}
              <span className="text-yellow-200">DRAFT</span> (created) •{" "}
              <span className="text-emerald-200">UPDATED</span> (draft updated) •{" "}
              <span className="text-green-200">DONE</span> (submitted)
            </div>
          </div>

          {resolving ? (
            <div className="mt-3 text-xs text-white/50">
              Resolving POC from <span className="font-mono">pocNumber={prePocNumber}</span>…
            </div>
          ) : null}

          {resolveErr ? (
            <div className="mt-3 text-sm text-red-300">
              Resolve error: <span className="font-mono">{resolveErr}</span>
            </div>
          ) : null}

          {err ? (
            <div className="mt-3 text-sm text-red-300">
              Error: <span className="font-mono">{err}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 overflow-hidden bg-[#0B1220]">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="text-sm text-white/70">{loading ? "Loading..." : "Click any date to open Detail."}</div>
          </div>

          <div className="overflow-auto">
            <table className="w-full table-auto text-[13px] min-w-[1100px]">
              <thead className="bg-[#0A1020]">
                <tr className="text-left">
                  <th className="px-3 py-2 border-b border-white/10 w-[140px] text-[#FFD66B] font-bold whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-3 py-2 border-b border-white/10 w-[160px] text-[#FFD66B] font-bold whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-3 py-2 border-b border-white/10 min-w-[320px] text-[#FFD66B] font-bold">
                    Duty
                  </th>
                  <th className="px-3 py-2 border-b border-white/10 min-w-[360px] text-[#FFD66B] font-bold">
                    Instruction
                  </th>
                  <th className="px-3 py-2 border-b border-white/10 min-w-[280px] text-[#FFD66B] font-bold">
                    Notes
                  </th>
                </tr>
              </thead>

              <tbody>
                {generatedDates.map((d) => {
                  const item = byDate.get(d);
                  const empty = !item;

                  const status: Status | null = item?.status ? item.status : null;

                  const list = dutiesForDay(d);

                  const dutyPreview = list.length
                    ? truncate(
                        list
                          .slice(0, 2)
                          .map((x) => x.duty)
                          .filter(Boolean)
                          .join(" • "),
                        220
                      )
                    : "—";

                  const instrPreview = list.length
                    ? truncate(
                        list
                          .slice(0, 2)
                          .map((x) => String(x.instruction || "").trim())
                          .filter(Boolean)
                          .join(" • ") || "—",
                        240
                      )
                    : "—";

                  const notesText = item ? "Open to view/edit" : "Not created yet (auto-create on open)";

                  const looksUpdated =
                    !!item &&
                    (item.status === "SUBMITTED" ||
                      !!String(item.submittedAt || "").trim() ||
                      !!String(item.dspId || "").trim() ||
                      isDifferentIso(item.updatedAt, item.createdAt));

                  const statusLabel = empty
                    ? "EMPTY"
                    : status === "SUBMITTED"
                      ? "✅ DONE"
                      : looksUpdated
                        ? "UPDATED"
                        : "DRAFT";

                  const statusClass = empty
                    ? "bg-white/5 border-white/10 text-white/60"
                    : status === "SUBMITTED"
                      ? "bg-green-500/10 border-green-500/30 text-green-200"
                      : looksUpdated
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                        : "bg-yellow-500/10 border-yellow-500/30 text-yellow-200";

                  return (
                    <tr
                      key={d}
                      className={"border-b border-white/5 hover:bg-white/5 cursor-pointer " + (empty ? "opacity-95" : "")}
                      onClick={() => openDay(d)}
                      title="Open detail"
                    >
                      <td className="px-3 py-1.5 align-middle whitespace-nowrap">
                        <div className="font-bold leading-tight">{fmtDatePA(d)}</div>
                      </td>

                      <td className="px-3 py-1.5 align-middle whitespace-nowrap">
                        <span className={"inline-block px-2 py-1 rounded-full text-[11px] border " + statusClass}>
                          {statusLabel}
                        </span>
                      </td>

                      <td className="px-3 py-1.5 align-middle">
                        <div
                          className="text-white/90 leading-tight whitespace-nowrap overflow-hidden text-ellipsis"
                          title={dutyPreview}
                        >
                          {dutyPreview}
                        </div>
                      </td>

                      <td className="px-3 py-1.5 align-middle">
                        <div
                          className="text-white/80 leading-tight whitespace-nowrap overflow-hidden text-ellipsis"
                          title={instrPreview}
                        >
                          {instrPreview}
                        </div>
                      </td>

                      <td className="px-3 py-1.5 align-middle">
                        <div
                          className="text-white/70 leading-tight whitespace-nowrap overflow-hidden text-ellipsis"
                          title={notesText}
                        >
                          {notesText}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {generatedDates.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-white/60" colSpan={5}>
                      No dates generated. Check POC Start/Stop.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DailyLogsListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-64px)] p-4 bg-[#070B14] text-white">
          <div className="rounded-xl border border-white/10 p-4 bg-[#0B1220]">
            <div className="text-lg font-semibold text-[#FFD66B]">Daily Logs</div>
            <div className="mt-2 text-sm text-white/70">Loading...</div>
          </div>
        </div>
      }
    >
      <DailyLogsListInner />
    </Suspense>
  );
}
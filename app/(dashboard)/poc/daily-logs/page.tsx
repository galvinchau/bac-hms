// web/app/(dashboard)/poc/daily-logs/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Status = "DRAFT" | "SUBMITTED";

type ApiItem = {
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

/** ✅ FIX: parse YYYY-MM-DD safely to avoid timezone shift */
function fmtDatePA(ymdOrIso: string) {
  const s = String(ymdOrIso || "").trim();
  if (!s) return "";

  const d = isYmd(s) ? new Date(`${s}T12:00:00.000Z`) : new Date(s);
  if (Number.isNaN(d.getTime())) return ymdOrIso;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ_PA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d); // MM/DD/YYYY
}

export default function DailyLogsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const prePocId = searchParams.get("pocId") || "";
  const prePocNumber = searchParams.get("pocNumber") || "";
  const preIndividualId = searchParams.get("individualId") || "";

  const pocStartRaw = searchParams.get("pocStart") || "";
  const pocStopRaw = searchParams.get("pocStop") || "";

  const pocStart = normalizeToYmd(pocStartRaw);
  const pocStop = normalizeToYmd(pocStopRaw);

  const today = todayYmdPA();
  const endDate = pocStop || today;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [statusDraft, setStatusDraft] = useState(true);
  const [statusSubmitted, setStatusSubmitted] = useState(true);

  const [data, setData] = useState<ApiResponse | null>(null);

  const statusParam = useMemo(() => {
    const list: Status[] = [];
    if (statusDraft) list.push("DRAFT");
    if (statusSubmitted) list.push("SUBMITTED");
    return list.length ? list.join(",") : "";
  }, [statusDraft, statusSubmitted]);

  const titleSuffix = useMemo(() => {
    if (prePocNumber) return ` — POC ${prePocNumber}`;
    if (prePocId) return ` — POC`;
    return "";
  }, [prePocId, prePocNumber]);

  const generatedDates = useMemo(() => {
    if (!pocStart) return [];
    if (!isYmd(pocStart)) return [];
    if (!isYmd(endDate)) return [];
    if (endDate < pocStart) return [];

    const out: string[] = [];
    let cur = pocStart;
    while (cur <= endDate) {
      out.push(cur);
      cur = addDays(cur, 1);
      if (out.length > 3660) break;
    }
    return out;
  }, [pocStart, endDate]);

  async function loadRange() {
    if (!prePocId || !preIndividualId || !pocStart) return;

    setLoading(true);
    setErr(null);
    try {
      const query = qs({
        pocId: prePocId,
        individualId: preIndividualId,
        dateFrom: pocStart,
        dateTo: endDate,
        status: statusParam || null,
        page: 1,
        pageSize: 200,
      });

      const res = await fetch(`/api/poc/daily-logs?${query}`, { method: "GET" });
      const json = (await readJsonOrThrow(res)) as ApiResponse;

      if (!res.ok || !json.ok) {
        throw new Error(json.detail || json.error || `HTTP ${res.status}`);
      }

      setData(json);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusParam, prePocId, preIndividualId, pocStart, endDate]);

  const byDate = useMemo(() => {
    const m = new Map<string, ApiItem>();
    (data?.items || []).forEach((x) => {
      if (x?.date) m.set(String(x.date), x);
    });
    return m;
  }, [data]);

  function buildDetailUrl(args: { id: string; date: string; dspId?: string | null }) {
    const q = qs({
      pocId: prePocId || null,
      individualId: preIndividualId || null,
      pocNumber: prePocNumber || null,
      date: args.date || null,
      dspId: args.dspId ?? null,
    });

    return `/poc/daily-logs/${encodeURIComponent(args.id)}${q ? `?${q}` : ""}`;
  }

  async function openDay(ymd: string) {
    if (!prePocId || !preIndividualId) return;
    if (!isYmd(ymd)) return;

    const exist = byDate.get(ymd);
    if (exist?.id) {
      router.push(
        buildDetailUrl({
          id: exist.id,
          date: ymd,
          dspId: exist.dspId ?? null,
        })
      );
      return;
    }

    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/poc/daily-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pocId: prePocId,
          individualId: preIndividualId,
          date: ymd,
          dspId: null,
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

      router.push(
        buildDetailUrl({
          id: json.id,
          date: ymd,
          dspId: null,
        })
      );
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  if (!prePocId || !preIndividualId) {
    return (
      <div className="p-4">
        <div className="rounded-lg border p-4 bg-white">
          <div className="text-lg font-semibold">Daily Logs</div>
          <div className="mt-2 text-sm text-red-600">Missing pocId / individualId from query.</div>
          <div className="mt-2 text-sm text-neutral-600">
            Please open Daily Logs from the POC module button so the page receives the required parameters.
          </div>
        </div>
      </div>
    );
  }

  if (!pocStart) {
    return (
      <div className="p-4">
        <div className="rounded-lg border p-4 bg-white">
          <div className="text-lg font-semibold">Daily Logs{titleSuffix}</div>
          <div className="mt-2 text-sm text-red-600">Missing pocStart in query.</div>
          <div className="mt-2 text-sm text-neutral-600">
            POC Start Date is required to generate daily log dates (Start → End).
          </div>
          <div className="mt-3 text-xs text-neutral-500">
            Debug: pocStartRaw=<span className="font-mono">{JSON.stringify(pocStartRaw)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Daily Logs{titleSuffix}</h1>
          <p className="text-sm text-neutral-500">
            Range: <span className="font-mono">{fmtDatePA(pocStart)}</span> →{" "}
            <span className="font-mono">{fmtDatePA(endDate)}</span>
            <span className="ml-2 text-xs text-neutral-400">(Timezone: {TZ_PA})</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-md border hover:bg-neutral-50 disabled:opacity-50"
            onClick={loadRange}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-3 bg-white">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={statusDraft} onChange={(e) => setStatusDraft(e.target.checked)} />
            Draft
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={statusSubmitted} onChange={(e) => setStatusSubmitted(e.target.checked)} />
            Submitted
          </label>

          <div className="text-sm text-neutral-500">
            Total days: <b>{generatedDates.length}</b> • Existing logs: <b>{data?.total ?? 0}</b>
          </div>
        </div>

        {err ? (
          <div className="mt-2 text-sm text-red-600">
            Error: <span className="font-mono">{err}</span>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border overflow-hidden bg-white">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <div className="text-sm text-neutral-600">{loading ? "Loading..." : "Click any date to open Detail."}</div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-neutral-50">
              <tr className="text-left">
                <th className="px-3 py-2 border-b w-[160px]">Date</th>
                <th className="px-3 py-2 border-b w-[140px]">Status</th>
                <th className="px-3 py-2 border-b w-[120px]">Tasks</th>
                <th className="px-3 py-2 border-b">Notes</th>
              </tr>
            </thead>
            <tbody>
              {generatedDates.map((d) => {
                const item = byDate.get(d);
                const status = item?.status || "DRAFT";
                const taskCount = item?.taskCount ?? 0;

                const empty = !item;

                return (
                  <tr
                    key={d}
                    className={"border-b hover:bg-neutral-50 cursor-pointer " + (empty ? "opacity-90" : "")}
                    onClick={() => openDay(d)}
                    title="Open detail"
                  >
                    <td className="px-3 py-2">
                      <div className="font-semibold">{fmtDatePA(d)}</div>
                      <div className="text-[11px] text-neutral-500 font-mono">{d}</div>
                    </td>
                    <td className="px-3 py-2">
                      {item ? (
                        <span
                          className={
                            "px-2 py-1 rounded-full text-xs border " +
                            (status === "SUBMITTED" ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200")
                          }
                        >
                          {status}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs border bg-neutral-50 border-neutral-200">
                          EMPTY
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{item ? taskCount : "—"}</td>
                    <td className="px-3 py-2 text-neutral-500">
                      {item ? "Open to view/edit" : "Not created yet (will auto-create on open)"}
                    </td>
                  </tr>
                );
              })}

              {generatedDates.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-neutral-500" colSpan={4}>
                    No dates generated. Check POC Start/Stop.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

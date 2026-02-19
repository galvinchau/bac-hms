// web/app/(dashboard)/poc/daily-logs/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Status = "DRAFT" | "SUBMITTED";

// ✅ Match DB enum: public.poc_duty_completion_status
type TaskStatus = "INDEPENDENT" | "VERBAL_PROMPT" | "PHYSICAL_ASSIST" | "REFUSED";

type TaskDetail = {
  id: string; // pocDutyId (used as row key)
  pocDutyId: string;
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
  date: string; // YYYY-MM-DD
  status: Status;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tasks: TaskDetail[];
};

async function readJsonOrThrow(res: Response) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) {
    const txt = await res.text().catch(() => "");
    throw new Error(`API returned non-JSON (${res.status}). ${txt.slice(0, 120)}`);
  }
  return res.json();
}

const TZ_PA = "America/New_York";

function fmtDateOnlyPA_MMDDYYYY(ymd: string) {
  // ymd: YYYY-MM-DD -> show MM/DD/YYYY in PA timezone safely
  const d = new Date(`${ymd}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return ymd;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ_PA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d); // MM/DD/YYYY
}

function fmtLocalPA(dtIso: string) {
  const d = new Date(dtIso);
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

export default function DailyLogDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "").trim();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [item, setItem] = useState<DailyLogDetail | null>(null);
  const [saving, setSaving] = useState(false);

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
    } catch (e: any) {
      setErr(String(e?.message || e));
      setItem(null);
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

  async function save(nextStatus?: Status) {
    if (!item) return;

    setSaving(true);
    setErr(null);
    try {
      const payload = {
        status: nextStatus || item.status,
        tasks: (item.tasks || []).map((t) => ({
          pocDutyId: t.pocDutyId, // ✅ keep as your existing API expects
          status: t.status,
          note: t.note ?? null,
          timestamp: t.timestamp ?? null, // null => server stamps now() if designed that way
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

      // ✅ After save/submit: go back to list so list refresh can show status
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
  const printTitle = `Daily Log — ${displayDate}`;
  const pocDisplay = item.pocNumber?.trim() ? item.pocNumber : item.pocId; // ✅ show real POC number if available

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
        {/* Header cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <div className={`text-xs text-[#f5c84c]`}>Date</div>
            {/* ✅ show only MM/DD/YYYY */}
            <div className={`mt-1 ${mono} text-base text-white`}>{displayDate}</div>
          </div>

          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <div className={`text-xs text-[#f5c84c]`}>POC Number</div>
            {/* ✅ show real POC number (2026888) */}
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
          <div className="text-sm font-semibold text-white">Tasks</div>
          <div className={`no-print text-xs ${softText}`}>
            Timezone: {TZ_PA}. If Timestamp is empty, server stamps now().
          </div>
        </div>

        {/* Table */}
        <div className="mt-2 overflow-auto">
          <table className="print-table w-full text-sm border border-white/10">
            <thead className="bg-white/5">
              <tr className="text-left">
                {/* ✅ header text yellow bold */}
                <th className="px-3 py-2 border border-white/10 w-[90px] text-[#f5c84c] font-bold">Task #</th>
                <th className="px-3 py-2 border border-white/10 text-[#f5c84c] font-bold">Duty</th>
                <th className="px-3 py-2 border border-white/10 w-[220px] text-[#f5c84c] font-bold">Status</th>
                <th className="px-3 py-2 border border-white/10 w-[240px] text-[#f5c84c] font-bold">Timestamp (PA)</th>
                <th className="px-3 py-2 border border-white/10 text-[#f5c84c] font-bold">Note</th>
                <th className="no-print px-3 py-2 border border-white/10 w-[90px] text-[#f5c84c] font-bold">Quick</th>
              </tr>
            </thead>

            <tbody className="text-white">
              {(item.tasks || []).map((t) => (
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

                    <div className="print-only hidden">{t.status || ""}</div>
                  </td>

                  <td className="px-3 py-2 border border-white/10">
                    {/* ✅ ONLY ONE LINE display */}
                    <div className="no-print">
                      <input
                        className="w-full border border-white/10 rounded-md px-2 py-2 bg-white/10 text-white"
                        value={t.timestamp ? fmtLocalPA(t.timestamp) : "(auto)"}
                        readOnly
                      />
                    </div>
                    <div className="print-only">{t.timestamp ? fmtLocalPA(t.timestamp) : ""}</div>
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
                    {/* ✅ NOW fills immediately (no need wait save) */}
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

              {(item.tasks || []).length === 0 ? (
                <tr>
                  <td className={`px-3 py-6 text-center border border-white/10 ${softText}`} colSpan={6}>
                    No tasks.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Buttons */}
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

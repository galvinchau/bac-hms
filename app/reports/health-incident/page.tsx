"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Status =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "ASSIGNED"
  | "INVESTIGATED"
  | "CLOSED";

type HealthIncidentListItem = {
  id: string;

  caseNumber?: string | null;

  date: string; // ISO (preferred)
  createdAt?: string; // ISO fallback

  status: Status;

  individualId: string;
  individualName: string;

  staffId: string;
  staffName: string | null;

  ciName?: string | null;

  // Optional: depends on your DB shape
  incidentType?: string | null;
  shiftStart?: string | null;
  shiftEnd?: string | null;
};

type ApiResponse = { items: HealthIncidentListItem[] };

type Option = { value: string; label: string };

function isoDateOnly(iso?: string) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function safeStr(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function statusBadge(status: Status) {
  switch (status) {
    case "DRAFT":
      return "bg-slate-700/80 text-white";
    case "SUBMITTED":
      return "bg-bac-primary/80 text-white";
    case "IN_REVIEW":
      return "bg-yellow-600/80 text-white";
    case "ASSIGNED":
      return "bg-blue-700/80 text-white";
    case "INVESTIGATED":
      return "bg-violet-700/80 text-white";
    case "CLOSED":
      return "bg-emerald-700/80 text-white";
    default:
      return "bg-slate-700/80 text-white";
  }
}

export default function HealthIncidentReportListPage() {
  const router = useRouter();

  const [items, setItems] = useState<HealthIncidentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [staffId, setStaffId] = useState("ALL");
  const [individualId, setIndividualId] = useState("ALL");
  const [status, setStatus] = useState<Status | "ALL">("ALL");

  async function loadData(params?: {
    from?: string;
    to?: string;
    staffId?: string;
    individualId?: string;
    status?: string;
  }) {
    try {
      setLoading(true);
      setError(null);

      const qs = new URLSearchParams();
      if (params?.from) qs.set("from", params.from);
      if (params?.to) qs.set("to", params.to);

      if (params?.staffId && params.staffId !== "ALL") {
        qs.set("staffId", params.staffId);
      }

      if (params?.individualId && params.individualId !== "ALL") {
        qs.set("individualId", params.individualId);
      }

      if (params?.status && params.status !== "ALL") {
        qs.set("status", params.status);
      }

      const res = await fetch(
        `/api/reports/health-incident${qs.toString() ? `?${qs.toString()}` : ""}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(
          `Failed to load: ${res.status} ${res.statusText}. ${txt.slice(0, 200)}`
        );
      }

      const data: ApiResponse = await res.json();
      setItems(data.items ?? []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to load Health & Incident reports");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const staffOptions: Option[] = useMemo(() => {
    const map = new Map<string, string>();
    for (const it of items) {
      const name = it.staffName ?? "—";
      if (it.staffId) map.set(it.staffId, name);
    }
    const opts = Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: "ALL", label: "ALL" }, ...opts];
  }, [items]);

  const individualOptions: Option[] = useMemo(() => {
    const map = new Map<string, string>();
    for (const it of items) {
      if (it.individualId) map.set(it.individualId, it.individualName);
    }
    const opts = Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: "ALL", label: "ALL" }, ...opts];
  }, [items]);

  function handleApplyFilter() {
    loadData({
      from: fromDate || undefined,
      to: toDate || undefined,
      staffId,
      individualId,
      status,
    });
  }

  function openDetail(id: string) {
    router.push(`/reports/health-incident/${id}`);
  }

  function displayDate(it: HealthIncidentListItem) {
    return isoDateOnly(it.date) || isoDateOnly(it.createdAt) || "";
  }

  function displayShift(it: HealthIncidentListItem) {
    const s = safeStr(it.shiftStart);
    const e = safeStr(it.shiftEnd);
    if (!s && !e) return "—";
    if (s && e) return `${s} – ${e}`;
    return s || e || "—";
  }

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">
          Health & Incident Report
        </h1>
        <p className="text-sm text-slate-400">
          View and search Health & Incident cases submitted from BAC Mobile.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-md shadow-black/40">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-5">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                DSP (Staff)
              </label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="h-10 rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
              >
                {staffOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                Individual
              </label>
              <select
                value={individualId}
                onChange={(e) => setIndividualId(e.target.value)}
                className="h-10 rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
              >
                {individualOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="h-10 rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
              >
                <option value="ALL">ALL</option>
                <option value="DRAFT">DRAFT</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="IN_REVIEW">IN_REVIEW</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="INVESTIGATED">INVESTIGATED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                From date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-10 rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                To date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-10 rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
              />
            </div>
          </div>

          <button
            onClick={handleApplyFilter}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-bac-primary px-6 text-sm font-medium text-white shadow hover:bg-bac-primary/90 focus:outline-none focus:ring-2 focus:ring-bac-primary focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Apply filter
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-500/60 bg-red-950/60 px-3 py-2 text-xs text-red-200">
            Error: {error}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/90 shadow-lg shadow-black/40">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/95 text-[11px] uppercase tracking-wide text-slate-200">
                <th className="px-3 py-2 text-left">Case #</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Individual</th>
                <th className="px-3 py-2 text-left">Staff</th>
                <th className="px-3 py-2 text-left">CI</th>
                <th className="px-3 py-2 text-left">Shift</th>
                <th className="px-3 py-2 text-left">Incident Type</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-slate-300">
                    Loading...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-slate-400">
                    No data.
                  </td>
                </tr>
              )}

              {!loading &&
                items.map((it) => (
                  <tr
                    key={it.id}
                    onClick={() => openDetail(it.id)}
                    className="cursor-pointer border-t border-slate-800 odd:bg-slate-950 even:bg-slate-900/70 hover:bg-slate-800/70"
                    title="Click to open case detail"
                  >
                    <td className="px-3 py-2 text-slate-100 whitespace-nowrap font-semibold">
                      {safeStr(it.caseNumber) || "—"}
                    </td>

                    <td className="px-3 py-2 text-slate-100 whitespace-nowrap">
                      {displayDate(it)}
                    </td>

                    <td className="px-3 py-2 text-[13px] font-medium text-slate-100">
                      {it.individualName}
                    </td>

                    <td className="px-3 py-2 text-[13px] font-medium text-slate-100">
                      {it.staffName ?? "—"}
                    </td>

                    <td className="px-3 py-2 text-slate-100">
                      {safeStr(it.ciName) || "—"}
                    </td>

                    <td className="px-3 py-2 text-slate-100 whitespace-nowrap">
                      {displayShift(it)}
                    </td>

                    <td className="px-3 py-2 text-slate-100">
                      {it.incidentType ?? "—"}
                    </td>

                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-3 py-0.5 text-[11px] font-medium ${statusBadge(
                          it.status
                        )}`}
                      >
                        {it.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
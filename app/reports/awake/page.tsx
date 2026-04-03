// web/app/reports/awake/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AwakeReportItem = {
  id: string;
  date: string;
  dateLocal?: string;

  individualId: string;
  individualName: string;

  staffId: string;
  staffName: string | null;

  serviceCode: string;
  serviceName: string;

  scheduleStart: string;
  scheduleEnd: string;
  visitStart: string;
  visitEnd: string;

  reminderCount: number;
  confirmCount: number;

  status: "PASSED" | "FAILED";
  autoCheckoutReason?: string | null;
  autoCheckedOutAt?: string | null;
};

type ApiResponse = { items: AwakeReportItem[] };
type Option = { value: string; label: string };

export default function AwakeReportPage() {
  const router = useRouter();

  const [items, setItems] = useState<AwakeReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [staffId, setStaffId] = useState("ALL");
  const [individualId, setIndividualId] = useState("ALL");
  const [status, setStatus] = useState("ALL");

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
      if (params?.staffId && params.staffId !== "ALL")
        qs.set("staffId", params.staffId);
      if (params?.individualId && params.individualId !== "ALL")
        qs.set("individualId", params.individualId);
      if (params?.status && params.status !== "ALL")
        qs.set("status", params.status);

      const res = await fetch(
        `/api/reports/awake${qs.toString() ? `?${qs.toString()}` : ""}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(
          `Failed to load: ${res.status} ${res.statusText}. ${txt.slice(
            0,
            200
          )}`
        );
      }

      const data: ApiResponse = await res.json();
      setItems(data.items ?? []);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to load Awake Report");
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
    router.push(`/reports/awake/${id}`);
  }

  function formatDateOnly(v?: string) {
    if (!v) return "";
    return v.slice(0, 10);
  }

  function statusBadge(v: "PASSED" | "FAILED") {
    if (v === "PASSED") {
      return "bg-emerald-600/90 text-white";
    }
    return "bg-red-600/90 text-white";
  }

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-violet-300">
          Awake Report
        </h1>
        <p className="text-sm text-slate-400">
          Audit and review Awake Monitoring activity for compliance tracking.
        </p>
      </div>

      <div className="rounded-2xl border border-violet-700/40 bg-slate-900/90 p-4 shadow-lg shadow-black/40">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-5">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-violet-200">
                DSP (Staff)
              </label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="h-10 rounded-lg border border-violet-700/40 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                {staffOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-violet-200">
                Individual
              </label>
              <select
                value={individualId}
                onChange={(e) => setIndividualId(e.target.value)}
                className="h-10 rounded-lg border border-violet-700/40 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                {individualOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-violet-200">
                From date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-10 rounded-lg border border-violet-700/40 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-violet-200">
                To date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-10 rounded-lg border border-violet-700/40 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-violet-200">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 rounded-lg border border-violet-700/40 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                <option value="ALL">ALL</option>
                <option value="PASSED">PASSED</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleApplyFilter}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-violet-600 px-6 text-sm font-medium text-white shadow hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-slate-900"
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

      <div className="overflow-hidden rounded-2xl border border-violet-700/30 bg-slate-950/95 shadow-lg shadow-black/40">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/95 text-[11px] uppercase tracking-wide text-amber-300">
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Individual</th>
                <th className="px-3 py-2 text-left">Staff</th>
                <th className="px-3 py-2 text-left">Service</th>
                <th className="px-3 py-2 text-left">Schedule</th>
                <th className="px-3 py-2 text-left">Visit</th>
                <th className="px-3 py-2 text-left">Reminders</th>
                <th className="px-3 py-2 text-left">Confirms</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-4 text-center text-slate-300"
                  >
                    Loading...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-4 text-center text-slate-400"
                  >
                    No data.
                  </td>
                </tr>
              )}

              {!loading &&
                items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => openDetail(item.id)}
                    className="cursor-pointer border-t border-slate-800 odd:bg-slate-950 even:bg-slate-900/70 hover:bg-violet-950/35"
                    title="Click to open Awake Report detail"
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-slate-100">
                      {item.dateLocal || formatDateOnly(item.date)}
                    </td>

                    <td className="px-3 py-2 text-[13px] font-medium text-slate-100">
                      {item.individualName}
                    </td>

                    <td className="px-3 py-2 text-[13px] font-medium text-slate-100">
                      {item.staffName ?? "—"}
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-[13px] text-slate-100">
                          {item.serviceName}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.serviceCode}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap text-slate-100">
                      {item.scheduleStart && item.scheduleEnd
                        ? `${item.scheduleStart} – ${item.scheduleEnd}`
                        : "—"}
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap text-slate-100">
                      {item.visitStart
                        ? `${item.visitStart} – ${item.visitEnd || "—"}`
                        : "—"}
                    </td>

                    <td className="px-3 py-2 text-center text-amber-300 font-semibold">
                      {item.reminderCount}
                    </td>

                    <td className="px-3 py-2 text-center text-emerald-300 font-semibold">
                      {item.confirmCount}
                    </td>

                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-3 py-0.5 text-[11px] font-medium ${statusBadge(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="px-3 py-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(item.id);
                        }}
                        className="rounded-lg border border-violet-500/40 bg-violet-600/20 px-3 py-1 text-[11px] font-medium text-violet-200 hover:bg-violet-600/30"
                      >
                        VIEW
                      </button>
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
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DailyNoteItem = {
  id: string;
  date: string; // ISO

  individualId: string;
  individualName: string;

  staffId: string;
  staffName: string | null;

  serviceCode: string;
  serviceName: string;

  scheduleStart: string;
  scheduleEnd: string;
  visitStart: string | null;
  visitEnd: string | null;

  mileage: number | null;
  isCanceled: boolean;

  // paths (optional; can be null)
  staffReportDocPath?: string | null;
  staffReportPdfPath?: string | null;
  individualReportDocPath?: string | null;
  individualReportPdfPath?: string | null;
};

type ApiResponse = { items: DailyNoteItem[] };

type Option = { value: string; label: string };

export default function DailyNotesReportPage() {
  const router = useRouter();

  const [items, setItems] = useState<DailyNoteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [staffId, setStaffId] = useState("ALL");
  const [individualId, setIndividualId] = useState("ALL");

  async function loadData(params?: {
    from?: string;
    to?: string;
    staffId?: string;
    individualId?: string;
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

      const res = await fetch(
        `/api/reports/daily-notes${qs.toString() ? `?${qs.toString()}` : ""}`,
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
      setError(err.message ?? "Failed to load Daily Notes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Build dropdown options from currently loaded items (fast + simple)
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
    });
  }

  function formatDateOnly(iso: string) {
    if (!iso) return "";
    return iso.slice(0, 10);
  }

  // Direct download base (client side)
  const DOWNLOAD_BASE =
    process.env.NEXT_PUBLIC_BAC_API_BASE_URL || "http://127.0.0.1:3333";

  function downloadUrl(dailyNoteId: string, type: "staff-doc" | "staff-pdf") {
    return `${DOWNLOAD_BASE}/reports/daily-notes/${dailyNoteId}/download/${type}`;
  }

  function renderDocPdfLinks(dailyNoteId: string) {
    return (
      <div
        className="flex items-center gap-2 whitespace-nowrap"
        onClick={(e) => e.stopPropagation()} // IMPORTANT: keep row click working
      >
        <a
          href={downloadUrl(dailyNoteId, "staff-doc")}
          className="text-bac-primary underline underline-offset-2 hover:text-bac-green"
          title="Download DOC"
        >
          DOC
        </a>
        <span className="text-slate-600">|</span>
        <a
          href={downloadUrl(dailyNoteId, "staff-pdf")}
          className="text-bac-primary underline underline-offset-2 hover:text-bac-green"
          title="Download PDF"
        >
          PDF
        </a>
      </div>
    );
  }

  function openPreview(id: string) {
    router.push(`/reports/daily-notes/${id}`);
  }

  return (
    <div className="px-6 py-6 space-y-6">
      {/* TITLE */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">
          Daily Notes Report
        </h1>
        <p className="text-sm text-slate-400">
          View and search Daily Notes submitted from BAC Mobile.
        </p>
      </div>

      {/* FILTER BAR */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-md shadow-black/40">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-4">
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

      {/* TABLE */}
      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/90 shadow-lg shadow-black/40">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/95 text-[11px] uppercase tracking-wide text-slate-200">
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Individual</th>
                <th className="px-3 py-2 text-left">Staff</th>
                <th className="px-3 py-2 text-left">Service</th>
                <th className="px-3 py-2 text-left">Schedule (Start–End)</th>
                <th className="px-3 py-2 text-left">Visit (Start–End)</th>
                <th className="px-3 py-2 text-left">Mileage</th>
                <th className="px-3 py-2 text-left">Canceled?</th>
                <th className="px-3 py-2 text-left">Report</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-4 text-center text-slate-300"
                  >
                    Loading...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
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
                    onClick={() => openPreview(item.id)}
                    className="cursor-pointer border-t border-slate-800 odd:bg-slate-950 even:bg-slate-900/70 hover:bg-slate-800/70"
                    title="Click to open Daily Note preview"
                  >
                    <td className="px-3 py-2 text-slate-100 whitespace-nowrap">
                      {formatDateOnly(item.date)}
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

                    <td className="px-3 py-2 text-slate-100 whitespace-nowrap">
                      {item.scheduleStart} – {item.scheduleEnd}
                    </td>

                    <td className="px-3 py-2 text-slate-100 whitespace-nowrap">
                      {item.visitStart && item.visitEnd
                        ? `${item.visitStart} – ${item.visitEnd}`
                        : "—"}
                    </td>

                    <td className="px-3 py-2 text-slate-100 text-center">
                      {item.mileage ?? 0}
                    </td>

                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-3 py-0.5 text-[11px] font-medium ${
                          item.isCanceled
                            ? "bg-red-700/80 text-white"
                            : "bg-emerald-700/80 text-white"
                        }`}
                      >
                        {item.isCanceled ? "Yes" : "No"}
                      </span>
                    </td>

                    <td className="px-3 py-2">{renderDocPdfLinks(item.id)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

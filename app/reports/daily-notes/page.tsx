"use client";

import React, { useEffect, useMemo, useState } from "react";

type DailyNoteItem = {
  id: string;
  date: string;
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

  // ✅ New (preferred)
  staffReportDocFileId?: string | null;
  staffReportPdfFileId?: string | null;
  individualReportDocFileId?: string | null;
  individualReportPdfFileId?: string | null;

  // ✅ Legacy fallback (older API)
  staffReportFileId: string | null;
  individualReportFileId: string | null;
};

type ApiResponse = {
  items: DailyNoteItem[];
};

type ViewMode = "all" | "staff" | "individual";

export default function DailyNotesReportPage() {
  const [items, setItems] = useState<DailyNoteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [viewMode, setViewMode] = useState<ViewMode>("all");

  async function loadData(params?: { from?: string; to?: string }) {
    try {
      setLoading(true);
      setError(null);

      const qs = new URLSearchParams();
      if (params?.from) qs.set("from", params.from);
      if (params?.to) qs.set("to", params.to);

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

  function handleApplyFilter() {
    loadData({
      from: fromDate || undefined,
      to: toDate || undefined,
    });
  }

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const staffHas =
        !!item.staffReportDocFileId ||
        !!item.staffReportPdfFileId ||
        !!item.staffReportFileId;

      const individualHas =
        !!item.individualReportDocFileId ||
        !!item.individualReportPdfFileId ||
        !!item.individualReportFileId;

      if (viewMode === "staff") return staffHas;
      if (viewMode === "individual") return individualHas;
      return true;
    });
  }, [items, viewMode]);

  function driveViewUrl(fileId: string) {
    return `https://drive.google.com/file/d/${fileId}/view`;
  }

  function renderDocPdfLinks(opts: {
    docId?: string | null;
    pdfId?: string | null;
    // legacy fallback (assume it's PDF)
    legacySingleId?: string | null;
  }) {
    const docId = opts.docId ?? null;
    const pdfId = opts.pdfId ?? null;
    const legacyPdfId = opts.legacySingleId ?? null;

    const finalPdfId = pdfId || legacyPdfId;

    if (!docId && !finalPdfId) {
      return <span className="text-slate-500">—</span>;
    }

    return (
      <div className="flex items-center gap-2 whitespace-nowrap">
        {docId ? (
          <a
            href={driveViewUrl(docId)}
            target="_blank"
            rel="noreferrer"
            className="text-bac-primary underline underline-offset-2 hover:text-bac-green"
            title="Open DOC"
          >
            DOC
          </a>
        ) : (
          <span className="text-slate-600">DOC</span>
        )}

        <span className="text-slate-600">|</span>

        {finalPdfId ? (
          <a
            href={driveViewUrl(finalPdfId)}
            target="_blank"
            rel="noreferrer"
            className="text-bac-primary underline underline-offset-2 hover:text-bac-green"
            title="Open PDF"
          >
            PDF
          </a>
        ) : (
          <span className="text-slate-600">PDF</span>
        )}
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-6">
      {/* TITLE + view mode */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Daily Notes Report
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            View and search Daily Notes submitted from BAC Mobile.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="inline-flex rounded-full bg-slate-800 p-1 text-xs">
          <button
            className={`px-4 py-1 rounded-full transition ${
              viewMode === "all"
                ? "bg-bac-primary text-white"
                : "text-slate-300 hover:text-white"
            }`}
            onClick={() => setViewMode("all")}
          >
            All
          </button>
          <button
            className={`px-4 py-1 rounded-full transition ${
              viewMode === "staff"
                ? "bg-bac-primary text-white"
                : "text-slate-300 hover:text-white"
            }`}
            onClick={() => setViewMode("staff")}
          >
            Staff Reports
          </button>
          <button
            className={`px-4 py-1 rounded-full transition ${
              viewMode === "individual"
                ? "bg-bac-primary text-white"
                : "text-slate-300 hover:text-white"
            }`}
            onClick={() => setViewMode("individual")}
          >
            Individual Reports
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-md shadow-black/40">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                From date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-10 rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
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
                className="h-10 rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
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
                <th className="px-3 py-2 text-left">Staff Report</th>
                <th className="px-3 py-2 text-left">Individual Report</th>
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

              {!loading && visibleItems.length === 0 && (
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
                visibleItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-800 odd:bg-slate-950 even:bg-slate-900/70 hover:bg-slate-800/70"
                  >
                    <td className="px-3 py-2 text-slate-100 whitespace-nowrap">
                      {item.date}
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-slate-100">
                          {item.individualName}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.individualId}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-slate-100">
                          {item.staffName ?? "—"}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.staffId}
                        </span>
                      </div>
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

                    <td className="px-3 py-2">
                      {renderDocPdfLinks({
                        docId: item.staffReportDocFileId,
                        pdfId: item.staffReportPdfFileId,
                        legacySingleId: item.staffReportFileId,
                      })}
                    </td>

                    <td className="px-3 py-2">
                      {renderDocPdfLinks({
                        docId: item.individualReportDocFileId,
                        pdfId: item.individualReportPdfFileId,
                        legacySingleId: item.individualReportFileId,
                      })}
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

"use client";

import React, { useMemo, useState } from "react";

type PayrollRow = {
  staffId: string;
  staffName: string;
  staffType: "DSP" | "OFFICE";
  rate: number; // hourly rate
  hours: number;
  otHours: number;
  regularPay: number;
  otPay: number;
  totalPay: number;
};

type PayrollRun = {
  id: string;
  periodFrom: string; // YYYY-MM-DD (Sun)
  periodTo: string; // YYYY-MM-DD (Sat)
  generatedAt: string; // ISO
  totals: {
    totalHours: number;
    totalOtHours: number;
    totalPay: number;
  };
  rows: PayrollRow[];
  exports?: {
    docUrl?: string | null;
    pdfUrl?: string | null;
  };
};

function money(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

export default function PayrollPage() {
  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "";

  // Default: current payroll week (Sun-Sat)
  const [periodFrom, setPeriodFrom] = useState<string>(() => {
    const now = new Date();
    const day = now.getDay();
    const s = new Date(now);
    s.setDate(now.getDate() - day);
    s.setHours(0, 0, 0, 0);
    return s.toISOString().slice(0, 10);
  });

  const [periodTo, setPeriodTo] = useState<string>(() => {
    const now = new Date();
    const day = now.getDay();
    const s = new Date(now);
    s.setDate(now.getDate() - day);
    s.setHours(0, 0, 0, 0);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e.toISOString().slice(0, 10);
  });

  const [staffTypeFilter, setStaffTypeFilter] = useState<
    "ALL" | "DSP" | "OFFICE"
  >("ALL");

  const [isGenerating, setIsGenerating] = useState(false);
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const rows = run?.rows || [];
    if (staffTypeFilter === "ALL") return rows;
    return rows.filter((r) => r.staffType === staffTypeFilter);
  }, [run, staffTypeFilter]);

  const viewTotals = useMemo(() => {
    const rows = filteredRows;
    const totalHours = rows.reduce((s, r) => s + (r.hours || 0), 0);
    const totalOtHours = rows.reduce((s, r) => s + (r.otHours || 0), 0);
    const totalPay = rows.reduce((s, r) => s + (r.totalPay || 0), 0);
    return { totalHours, totalOtHours, totalPay };
  }, [filteredRows]);

  async function generatePayroll() {
    setError(null);
    setIsGenerating(true);

    try {
      // Expected endpoint (placeholder):
      // POST /payroll/generate { from, to }
      // Backend rules:
      // - OFFICE: hours come from TimeKeeping ONLY; OT applies only if total hours > 40
      // - DSP: hours come from Visits ONLY; OT applies only if total hours > 40
      const res = await fetch(`${API_BASE}/payroll/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          from: periodFrom,
          to: periodTo,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Generate failed (${res.status}). ${t || ""}`.trim());
      }

      const json = (await res.json()) as PayrollRun;
      setRun(json);
    } catch (e: any) {
      setError(e?.message || "Generate failed");
    } finally {
      setIsGenerating(false);
    }
  }

  async function exportDoc() {
    if (!run) return;
    setError(null);

    try {
      // Expected endpoint (placeholder):
      // POST /payroll/export/doc { runId }
      const res = await fetch(`${API_BASE}/payroll/export/doc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ runId: run.id }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Export DOC failed (${res.status}). ${t || ""}`.trim());
      }

      const json = (await res.json()) as { docUrl: string };
      setRun((prev) =>
        prev
          ? {
              ...prev,
              exports: { ...(prev.exports || {}), docUrl: json.docUrl },
            }
          : prev
      );

      if (json.docUrl) window.open(json.docUrl, "_blank");
    } catch (e: any) {
      setError(e?.message || "Export DOC failed");
    }
  }

  async function exportPdf() {
    if (!run) return;
    setError(null);

    try {
      // Expected endpoint (placeholder):
      // POST /payroll/export/pdf { runId }
      const res = await fetch(`${API_BASE}/payroll/export/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ runId: run.id }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Export PDF failed (${res.status}). ${t || ""}`.trim());
      }

      const json = (await res.json()) as { pdfUrl: string };
      setRun((prev) =>
        prev
          ? {
              ...prev,
              exports: { ...(prev.exports || {}), pdfUrl: json.pdfUrl },
            }
          : prev
      );

      if (json.pdfUrl) window.open(json.pdfUrl, "_blank");
    } catch (e: any) {
      setError(e?.message || "Export PDF failed");
    }
  }

  return (
    <div className="min-h-screen bg-bac-bg text-bac-text">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Payroll</h1>
            <p className="text-sm text-bac-muted">
              Weekly payroll (Sun–Sat). Office uses Time Keeping only. DSP uses
              Visits only. OT is 1.5× after 40 hours.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <button
              onClick={generatePayroll}
              disabled={isGenerating}
              className="h-10 rounded-xl bg-bac-primary px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {isGenerating ? "Generating..." : "Generate Payroll"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 grid grid-cols-1 gap-3 rounded-2xl border border-bac-border bg-bac-panel p-4 md:grid-cols-4">
          <div className="flex flex-col">
            <label className="text-xs text-bac-muted">Period Start (Sun)</label>
            <input
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="h-10 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-bac-muted">Period End (Sat)</label>
            <input
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              className="h-10 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-bac-muted">Staff Type</label>
            <select
              value={staffTypeFilter}
              onChange={(e) =>
                setStaffTypeFilter(e.target.value as "ALL" | "DSP" | "OFFICE")
              }
              className="h-10 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
            >
              <option value="ALL">All</option>
              <option value="OFFICE">Office</option>
              <option value="DSP">DSP</option>
            </select>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
            <div className="text-xs text-bac-muted">Current View Total</div>
            <div className="mt-1 text-xl font-semibold">
              {money(viewTotals.totalPay)}
            </div>
            <div className="text-xs text-bac-muted">
              {viewTotals.totalHours.toFixed(2)} hrs •{" "}
              {viewTotals.totalOtHours.toFixed(2)} OT hrs
            </div>
          </div>
        </div>

        {/* Actions + status */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
            <div className="text-sm font-semibold">Payroll Run</div>

            <div className="mt-2 text-sm text-bac-muted">
              Period:{" "}
              <span className="text-bac-text">
                {run ? `${run.periodFrom} → ${run.periodTo}` : "-"}
              </span>
            </div>

            <div className="mt-1 text-sm text-bac-muted">
              Generated at:{" "}
              <span className="text-bac-text">
                {run ? new Date(run.generatedAt).toLocaleString() : "-"}
              </span>
            </div>

            <div className="mt-3 text-xs text-bac-muted">
              Policy lock:
              <ul className="mt-1 list-disc pl-5">
                <li>Office hours from Time Keeping only</li>
                <li>DSP hours from Visits only</li>
                <li>OT after 40h at 1.5×</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
            <div className="text-sm font-semibold">Export</div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={exportDoc}
                disabled={!run}
                className="h-10 flex-1 rounded-xl border border-bac-border bg-bac-bg px-4 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >
                Export DOC
              </button>
              <button
                onClick={exportPdf}
                disabled={!run}
                className="h-10 flex-1 rounded-xl border border-bac-border bg-bac-bg px-4 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >
                Export PDF
              </button>
            </div>

            <div className="mt-3 text-xs text-bac-muted">
              {run?.exports?.docUrl ? (
                <div>
                  DOC:{" "}
                  <a
                    className="text-bac-primary underline"
                    href={run.exports.docUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </div>
              ) : (
                <div>DOC: -</div>
              )}
              {run?.exports?.pdfUrl ? (
                <div>
                  PDF:{" "}
                  <a
                    className="text-bac-primary underline"
                    href={run.exports.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </div>
              ) : (
                <div>PDF: -</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
            <div className="text-sm font-semibold">Messages</div>

            {error ? (
              <div className="mt-3 rounded-xl border border-bac-border bg-bac-bg p-3 text-sm text-bac-red">
                {error}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-bac-border bg-bac-bg p-3 text-xs text-bac-muted">
                Tip: Admin generates payroll weekly (Sun–Sat). On Thursdays,
                click Generate, then export DOC to send to taxer.
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 rounded-2xl border border-bac-border bg-bac-panel">
          <div className="flex items-center justify-between border-b border-bac-border px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Payroll Details</div>
              <div className="text-xs text-bac-muted">
                Showing: {staffTypeFilter} • Rows: {filteredRows.length}
              </div>
            </div>

            <div className="text-xs text-bac-muted">
              Regular + OT totals calculated by backend rules.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-bac-muted">
                <tr className="border-b border-bac-border">
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Rate</th>
                  <th className="px-4 py-3">Hours</th>
                  <th className="px-4 py-3">OT Hours</th>
                  <th className="px-4 py-3">Regular Pay</th>
                  <th className="px-4 py-3">OT Pay</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {!run ? (
                  <tr>
                    <td className="px-4 py-6 text-bac-muted" colSpan={8}>
                      No payroll generated yet. Click{" "}
                      <span className="text-bac-text font-medium">
                        Generate Payroll
                      </span>
                      .
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-bac-muted" colSpan={8}>
                      No rows match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => (
                    <tr key={r.staffId} className="border-b border-bac-border">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.staffName}</div>
                        <div className="text-xs text-bac-muted">
                          {r.staffId}
                        </div>
                      </td>
                      <td className="px-4 py-3">{r.staffType}</td>
                      <td className="px-4 py-3">{money(r.rate)}</td>
                      <td className="px-4 py-3">{r.hours.toFixed(2)}</td>
                      <td className="px-4 py-3">{r.otHours.toFixed(2)}</td>
                      <td className="px-4 py-3">{money(r.regularPay)}</td>
                      <td className="px-4 py-3">{money(r.otPay)}</td>
                      <td className="px-4 py-3 font-semibold">
                        {money(r.totalPay)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {run ? (
            <div className="px-4 py-3 text-xs text-bac-muted">
              Run totals (all rows): {run.totals.totalHours.toFixed(2)} hrs •{" "}
              {run.totals.totalOtHours.toFixed(2)} OT hrs •{" "}
              {money(run.totals.totalPay)}
            </div>
          ) : (
            <div className="px-4 py-3 text-xs text-bac-muted">
              Once generated, payroll runs are saved as history (backend).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

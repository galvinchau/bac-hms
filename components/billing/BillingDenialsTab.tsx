"use client";

import React, { useMemo } from "react";
import { BILLING_DENIALS_DEMO } from "./billingDemoData";

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
      <div className="text-xs text-bac-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold text-bac-text">{value}</div>
    </div>
  );
}

function statusClass(status: string) {
  switch (status) {
    case "OPEN":
      return "bg-bac-red/15 text-bac-red border-bac-red/30";
    case "IN_PROGRESS":
      return "bg-yellow-500/15 text-yellow-200 border-yellow-500/30";
    case "RESOLVED":
      return "bg-bac-green/15 text-bac-green border-bac-green/30";
    default:
      return "bg-white/10 text-bac-text border-bac-border";
  }
}

export default function BillingDenialsTab() {
  const summary = useMemo(() => {
    const rows = BILLING_DENIALS_DEMO;
    return {
      open: rows.filter((row) => row.status === "OPEN").length,
      inProgress: rows.filter((row) => row.status === "IN_PROGRESS").length,
      resolved: rows.filter((row) => row.status === "RESOLVED").length,
      deniedUnits: rows.reduce((sum, row) => sum + row.deniedUnits, 0),
      deniedAmount: rows.reduce((sum, row) => sum + row.deniedAmount, 0),
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Denial Date From</div>
            <input
              type="date"
              defaultValue="2026-03-01"
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Denial Date To</div>
            <input
              type="date"
              defaultValue="2026-03-31"
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Payer</div>
            <select className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none">
              <option>All</option>
              <option>ODP</option>
              <option>CHC</option>
              <option>Private</option>
              <option>Other</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Root Cause</div>
            <select className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none">
              <option>All</option>
              <option>AUTH</option>
              <option>EVV</option>
              <option>RATE</option>
              <option>DUPLICATE</option>
              <option>OTHER</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Status</div>
            <select className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none">
              <option>All</option>
              <option>OPEN</option>
              <option>IN_PROGRESS</option>
              <option>RESOLVED</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Search</div>
            <input
              placeholder="Search..."
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SummaryCard label="Open" value={summary.open} />
        <SummaryCard label="In Progress" value={summary.inProgress} />
        <SummaryCard label="Resolved" value={summary.resolved} />
        <SummaryCard label="Denied Units" value={summary.deniedUnits} />
        <SummaryCard
          label="Denied Amount"
          value={`$${summary.deniedAmount.toFixed(2)}`}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-bac-border bg-bac-panel">
        <div className="overflow-x-auto">
          <table className="min-w-[1300px] w-full text-left text-sm">
            <thead className="border-b border-bac-border text-bac-muted">
              <tr>
                <th className="px-4 py-3">Claim No</th>
                <th className="px-4 py-3">Individual</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Denied Units</th>
                <th className="px-4 py-3">Denied Amount</th>
                <th className="px-4 py-3">Denial Code</th>
                <th className="px-4 py-3">Denial Reason</th>
                <th className="px-4 py-3">Root Cause</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Linked Auth</th>
                <th className="px-4 py-3">Linked Visit</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bac-border">
              {BILLING_DENIALS_DEMO.map((row) => (
                <tr key={row.id} className="text-bac-text hover:bg-white/3">
                  <td className="px-4 py-3 font-medium">{row.claimNumber}</td>
                  <td className="px-4 py-3">{row.individualName}</td>
                  <td className="px-4 py-3">{row.serviceCode}</td>
                  <td className="px-4 py-3">{row.deniedUnits}</td>
                  <td className="px-4 py-3">${row.deniedAmount.toFixed(2)}</td>
                  <td className="px-4 py-3">{row.denialCode || "—"}</td>
                  <td className="px-4 py-3">{row.denialReason || "—"}</td>
                  <td className="px-4 py-3">{row.rootCause}</td>
                  <td className="px-4 py-3">{row.assignedTo || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(
                        row.status
                      )}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.linkedAuth || "—"}</td>
                  <td className="px-4 py-3">{row.linkedVisit || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm hover:bg-white/5">
                        View
                      </button>
                      <button className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm hover:bg-white/5">
                        Open Claim
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {BILLING_DENIALS_DEMO.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-bac-muted">
                    No denials found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="border-t border-bac-border px-4 py-3 text-xs text-bac-muted">
          Phase 1 layout only. Real denial workflow and follow-up notes will be
          added later.
        </div>
      </div>
    </div>
  );
}
"use client";

import React, { useMemo } from "react";
import { BILLING_CLAIMS_DEMO } from "./billingDemoData";

function badgeClass(status: string) {
  switch (status) {
    case "PAID":
      return "bg-bac-green/15 text-bac-green border-bac-green/30";
    case "DENIED":
      return "bg-bac-red/15 text-bac-red border-bac-red/30";
    case "DRAFT":
      return "bg-yellow-500/15 text-yellow-200 border-yellow-500/30";
    case "SUBMITTED":
      return "bg-white/10 text-bac-text border-bac-border";
    case "VOID":
      return "bg-white/10 text-bac-muted border-bac-border";
    default:
      return "bg-white/10 text-bac-text border-bac-border";
  }
}

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

export default function BillingClaimsTab() {
  const summary = useMemo(() => {
    const rows = BILLING_CLAIMS_DEMO;
    return {
      draft: rows.filter((row) => row.status === "DRAFT").length,
      submitted: rows.filter((row) => row.status === "SUBMITTED").length,
      paid: rows.filter((row) => row.status === "PAID").length,
      denied: rows.filter((row) => row.status === "DENIED").length,
      voided: rows.filter((row) => row.status === "VOID").length,
      outstanding: rows.reduce((sum, row) => sum + (row.balance || 0), 0),
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Billing Date From</div>
            <input
              type="date"
              defaultValue="2026-03-01"
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Billing Date To</div>
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
            <div className="mb-1 text-xs text-bac-muted">Claim Status</div>
            <select className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none">
              <option>All</option>
              <option>Draft</option>
              <option>Submitted</option>
              <option>Paid</option>
              <option>Denied</option>
              <option>Void</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <div className="mb-1 text-xs text-bac-muted">Individual</div>
            <input
              placeholder="Individual..."
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none"
            />
          </div>
          <div className="md:col-span-3">
            <div className="mb-1 text-xs text-bac-muted">Search</div>
            <input
              placeholder="Search claim..."
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <SummaryCard label="Draft" value={summary.draft} />
        <SummaryCard label="Submitted" value={summary.submitted} />
        <SummaryCard label="Paid" value={summary.paid} />
        <SummaryCard label="Denied" value={summary.denied} />
        <SummaryCard label="Void" value={summary.voided} />
        <SummaryCard
          label="Outstanding Balance"
          value={`$${summary.outstanding.toFixed(2)}`}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-bac-border bg-bac-panel">
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full text-left text-sm">
            <thead className="border-b border-bac-border text-bac-muted">
              <tr>
                <th className="px-4 py-3">Claim No</th>
                <th className="px-4 py-3">Billing Date</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Payer</th>
                <th className="px-4 py-3">Individual</th>
                <th className="px-4 py-3">Service Summary</th>
                <th className="px-4 py-3">Units</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submission Date</th>
                <th className="px-4 py-3">Payment Date</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bac-border">
              {BILLING_CLAIMS_DEMO.map((row) => (
                <tr key={row.id} className="text-bac-text hover:bg-white/3">
                  <td className="px-4 py-3 font-medium">{row.claimNumber}</td>
                  <td className="px-4 py-3">{row.billingDate}</td>
                  <td className="px-4 py-3">
                    {row.periodFrom} → {row.periodTo}
                  </td>
                  <td className="px-4 py-3">{row.payer}</td>
                  <td className="px-4 py-3">{row.individualName}</td>
                  <td className="px-4 py-3">{row.serviceSummary}</td>
                  <td className="px-4 py-3">{row.units}</td>
                  <td className="px-4 py-3">${row.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass(
                        row.status
                      )}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.submissionDate || "—"}</td>
                  <td className="px-4 py-3">{row.paymentDate || "—"}</td>
                  <td className="px-4 py-3">${(row.balance || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">{row.source}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm hover:bg-white/5">
                        View
                      </button>
                      <button className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm hover:bg-white/5">
                        Export
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {BILLING_CLAIMS_DEMO.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-bac-muted">
                    No claims found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="border-t border-bac-border px-4 py-3 text-xs text-bac-muted">
          Phase 1 layout only. Claims detail and real claim creation will be
          added in the next phases.
        </div>
      </div>
    </div>
  );
}
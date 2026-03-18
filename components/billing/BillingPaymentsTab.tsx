"use client";

import React, { useMemo } from "react";
import { BILLING_PAYMENTS_DEMO } from "./billingDemoData";

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

export default function BillingPaymentsTab() {
  const summary = useMemo(() => {
    const rows = BILLING_PAYMENTS_DEMO;
    return {
      received: rows.reduce((sum, row) => sum + row.amount, 0),
      applied: rows.reduce((sum, row) => sum + row.applied, 0),
      unapplied: rows.reduce((sum, row) => sum + row.unapplied, 0),
      claimsPaid: rows.reduce((sum, row) => sum + row.claimsCount, 0),
      partialPaid: rows.filter((row) => row.status === "PARTIAL").length,
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SummaryCard label="Total Received" value={`$${summary.received.toFixed(2)}`} />
        <SummaryCard label="Applied" value={`$${summary.applied.toFixed(2)}`} />
        <SummaryCard label="Unapplied" value={`$${summary.unapplied.toFixed(2)}`} />
        <SummaryCard label="Claims Paid" value={summary.claimsPaid} />
        <SummaryCard label="Partial Paid" value={summary.partialPaid} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 xl:col-span-1">
          <div className="text-base font-semibold text-bac-text">
            Payment Entry
          </div>
          <div className="mt-1 text-sm text-bac-muted">
            Manual payment posting placeholder for Phase 1.
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div>
              <div className="mb-1 text-xs text-bac-muted">Payment Date</div>
              <input
                type="date"
                className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
              />
            </div>

            <div>
              <div className="mb-1 text-xs text-bac-muted">Payer</div>
              <select className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none">
                <option>ODP</option>
                <option>CHC</option>
                <option>Private</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <div className="mb-1 text-xs text-bac-muted">Amount</div>
              <input
                placeholder="0.00"
                className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none"
              />
            </div>

            <div>
              <div className="mb-1 text-xs text-bac-muted">Reference No</div>
              <input
                placeholder="Reference..."
                className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none"
              />
            </div>

            <div>
              <div className="mb-1 text-xs text-bac-muted">Method</div>
              <select className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none">
                <option>EFT</option>
                <option>Check</option>
                <option>Manual</option>
              </select>
            </div>

            <div>
              <div className="mb-1 text-xs text-bac-muted">Notes</div>
              <textarea className="min-h-[100px] w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text outline-none" />
            </div>

            <div className="flex gap-2 pt-1">
              <button className="rounded-xl border border-bac-border bg-bac-bg px-4 py-2 text-sm text-bac-text hover:bg-white/5">
                Save Payment
              </button>
              <button className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95">
                Apply to Claims
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-bac-border bg-bac-panel xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="border-b border-bac-border text-bac-muted">
                <tr>
                  <th className="px-4 py-3">Payment No</th>
                  <th className="px-4 py-3">Received Date</th>
                  <th className="px-4 py-3">Payer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Applied</th>
                  <th className="px-4 py-3">Unapplied</th>
                  <th className="px-4 py-3">Claims Count</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reference No</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bac-border">
                {BILLING_PAYMENTS_DEMO.map((row) => (
                  <tr key={row.id} className="text-bac-text hover:bg-white/3">
                    <td className="px-4 py-3 font-medium">{row.paymentNumber}</td>
                    <td className="px-4 py-3">{row.receivedDate}</td>
                    <td className="px-4 py-3">{row.payer}</td>
                    <td className="px-4 py-3">${row.amount.toFixed(2)}</td>
                    <td className="px-4 py-3">${row.applied.toFixed(2)}</td>
                    <td className="px-4 py-3">${row.unapplied.toFixed(2)}</td>
                    <td className="px-4 py-3">{row.claimsCount}</td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3">{row.referenceNo || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm hover:bg-white/5">
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {BILLING_PAYMENTS_DEMO.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-bac-muted">
                      No payments found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="border-t border-bac-border px-4 py-3 text-xs text-bac-muted">
            Phase 1 layout only. Real payment posting and reconciliation logic
            will be added later.
          </div>
        </div>
      </div>
    </div>
  );
}
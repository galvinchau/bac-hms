// bac-hms/web/app/reports/billing/page.tsx
"use client";

import React from "react";
import Link from "next/link";

export default function BillingReportsPage() {
  return (
    <div className="min-h-[calc(100vh-60px)] bg-bac-bg p-6">
      <div className="mb-6 rounded-3xl border border-amber-500/20 bg-gradient-to-r from-amber-950/25 via-bac-panel to-violet-950/20 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-bac-text">
              Billing Reports
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-bac-muted">
              Planned reporting area for authorization usage, billing-ready totals,
              payer support review, and export workflows.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/reports"
              className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm font-medium text-bac-text hover:bg-white/5"
            >
              Back to Reports
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-bac-border bg-bac-panel p-6">
        <h2 className="text-xl font-semibold text-bac-text">Billing Reporting Roadmap</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-bac-muted">
          This page is ready for future billing reporting without causing broken
          navigation. We can later connect it to authorization and billing modules
          for real totals, usage, claim preparation, and export summaries.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-bac-border bg-bac-bg p-5">
            <div className="text-lg font-semibold text-bac-text">Authorization Usage</div>
            <div className="mt-2 text-sm text-bac-muted">
              Track consumed vs remaining authorized units.
            </div>
          </div>
          <div className="rounded-2xl border border-bac-border bg-bac-bg p-5">
            <div className="text-lg font-semibold text-bac-text">Billing Ready</div>
            <div className="mt-2 text-sm text-bac-muted">
              Show visits ready to move into billing workflows.
            </div>
          </div>
          <div className="rounded-2xl border border-bac-border bg-bac-bg p-5">
            <div className="text-lg font-semibold text-bac-text">Claim Support</div>
            <div className="mt-2 text-sm text-bac-muted">
              Organize output for payer review and claim support.
            </div>
          </div>
          <div className="rounded-2xl border border-bac-border bg-bac-bg p-5">
            <div className="text-lg font-semibold text-bac-text">Exports</div>
            <div className="mt-2 text-sm text-bac-muted">
              Prepare report packages and export history.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
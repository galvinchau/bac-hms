"use client";

import Link from "next/link";
import React from "react";

type Props = {
  onRefresh?: () => void;
  onExport?: () => void;
  onCreateClaims?: () => void;
};

export default function BillingHeader({
  onRefresh,
  onExport,
  onCreateClaims,
}: Props) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="text-xl font-semibold text-bac-text">Billing</div>
        <div className="mt-1 text-sm text-bac-muted">
          Prepare billing from completed visits, validate authorization and
          rates, create claims, and track payment status.
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
        >
          Refresh
        </button>

        <button
          type="button"
          onClick={onExport}
          className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
        >
          Export
        </button>

        <Link
          href="/visited-maintenance"
          className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
        >
          Go to Visited Maintenance
        </Link>

        <button
          type="button"
          onClick={onCreateClaims}
          className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95 active:scale-[0.99]"
        >
          Create Claims
        </button>
      </div>
    </div>
  );
}
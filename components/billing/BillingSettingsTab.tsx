"use client";

import React from "react";
import BillingRateSetupCard from "./BillingRateSetupCard";

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
      <div className="text-base font-semibold text-bac-text">{title}</div>
      <div className="mt-1 text-sm text-bac-muted">{subtitle}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-xs text-bac-muted">{label}</div>
      {children}
    </div>
  );
}

export default function BillingSettingsTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card
          title="Claim Numbering"
          subtitle="Configure numbering pattern for future claim generation."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Claim Prefix">
              <input
                defaultValue="CL-"
                className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
              />
            </Field>

            <Field label="Next Sequence">
              <input
                defaultValue="5001"
                className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
              />
            </Field>

            <label className="inline-flex items-center gap-2 text-sm text-bac-text sm:col-span-2">
              <input type="checkbox" className="rounded border-bac-border" />
              <span>Reset numbering each year</span>
            </label>
          </div>
        </Card>

        <Card
          title="Default Grouping"
          subtitle="Set default grouping rules for workspace and claim creation."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Default Mode">
              <select className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none">
                <option>Weekly</option>
                <option>Daily</option>
                <option>Custom Range</option>
              </select>
            </Field>

            <Field label="Default Payer Split">
              <select className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none">
                <option>Separate by Payer</option>
                <option>Do Not Separate</option>
              </select>
            </Field>

            <label className="inline-flex items-center gap-2 text-sm text-bac-text">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-bac-border"
              />
              <span>Group by Individual</span>
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-bac-text">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-bac-border"
              />
              <span>Group by Service</span>
            </label>
          </div>
        </Card>

        <Card
          title="Validation Rules"
          subtitle="Control which workspace rows are ready, on hold, or blocked."
        >
          <div className="grid grid-cols-1 gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-bac-text">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-bac-border"
              />
              <span>Exclude canceled visits</span>
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-bac-text">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-bac-border"
              />
              <span>Hold if no rate</span>
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-bac-text">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-bac-border"
              />
              <span>Hold if authorization is missing</span>
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-bac-text">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-bac-border"
              />
              <span>Exclude incomplete EVV visits</span>
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-bac-text">
              <input type="checkbox" className="rounded border-bac-border" />
              <span>Allow manual override</span>
            </label>
          </div>
        </Card>

        <Card
          title="Export / Print"
          subtitle="Configure default export text and print placeholders."
        >
          <div className="grid grid-cols-1 gap-3">
            <Field label="PDF Title">
              <input
                defaultValue="Blue Angels Care Billing Summary"
                className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
              />
            </Field>

            <Field label="Header Text">
              <input
                defaultValue="Blue Angels Care, LLC"
                className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
              />
            </Field>

            <Field label="Notes Template">
              <textarea
                defaultValue="Generated from completed visits. Review denied items and correct visit or authorization issues before resubmission."
                className="min-h-[110px] w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text outline-none"
              />
            </Field>
          </div>
        </Card>
      </div>

      <BillingRateSetupCard />
    </div>
  );
}
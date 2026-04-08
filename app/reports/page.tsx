// bac-hms/web/app/reports/page.tsx
"use client";

import React from "react";
import Link from "next/link";

type SummaryCardProps = {
  label: string;
  value: string;
  tone?: "violet" | "sky" | "amber" | "green";
};

function SummaryCard({ label, value, tone = "violet" }: SummaryCardProps) {
  const toneClass =
    tone === "sky"
      ? "from-sky-500/10 to-sky-900/10 border-sky-500/20"
      : tone === "amber"
        ? "from-amber-500/10 to-amber-900/10 border-amber-500/20"
        : tone === "green"
          ? "from-emerald-500/10 to-emerald-900/10 border-emerald-500/20"
          : "from-violet-500/10 to-violet-900/10 border-violet-500/20";

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${toneClass} p-5`}>
      <div className="text-sm text-bac-muted">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-bac-text">
        {value}
      </div>
    </div>
  );
}

type ReportCardProps = {
  title: string;
  description: string;
  badge: string;
  href: string;
  tone?: "violet" | "sky" | "amber" | "green";
};

function ReportCard({
  title,
  description,
  badge,
  href,
  tone = "violet",
}: ReportCardProps) {
  const badgeClass =
    tone === "sky"
      ? "border-sky-500/30 bg-sky-500/10 text-sky-200"
      : tone === "amber"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
        : tone === "green"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          : "border-violet-500/30 bg-violet-500/10 text-violet-200";

  return (
    <div className="rounded-2xl border border-bac-border bg-bac-panel p-5 transition hover:border-white/15 hover:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-bac-text">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-bac-muted">{description}</p>
        </div>

        <span
          className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${badgeClass}`}
        >
          {badge}
        </span>
      </div>

      <div className="mt-5">
        <Link
          href={href}
          className="inline-flex items-center rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95"
        >
          Open Report
        </Link>
      </div>
    </div>
  );
}

type ActivityItemProps = {
  title: string;
  detail: string;
  time: string;
};

function ActivityItem({ title, detail, time }: ActivityItemProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-bac-border bg-bac-bg px-4 py-4">
      <div>
        <div className="text-sm font-medium text-bac-text">{title}</div>
        <div className="mt-1 text-sm text-bac-muted">{detail}</div>
      </div>
      <div className="whitespace-nowrap text-xs text-bac-muted">{time}</div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <div className="min-h-[calc(100vh-60px)] bg-bac-bg p-6">
      <div className="mb-6 rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-bac-panel to-amber-950/20 p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-bac-text">
              Reports Center
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-bac-muted">
              View operational reporting across House Management, Staffing,
              Schedule, Daily Notes, Billing, Payroll, and authorization-related
              workflows. This page is the central landing area for BAC reporting.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
                House Reports
              </span>
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200">
                Schedule Reports
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                Daily Notes
              </span>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
                Billing & Payroll
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/house-management"
              className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm font-medium text-bac-text hover:bg-white/5"
            >
              Back to House Management
            </Link>
            <Link
              href="/schedule"
              className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm font-medium text-bac-text hover:bg-white/5"
            >
              Open Schedule
            </Link>
            <button
              type="button"
              className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95"
            >
              Export Center
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Available Report Modules" value="5" tone="violet" />
        <SummaryCard label="Operational Dashboards" value="3" tone="sky" />
        <SummaryCard label="Export Categories" value="6" tone="amber" />
        <SummaryCard label="System Status" value="Online" tone="green" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-bac-text">
                Core Report Modules
              </h2>
              <p className="mt-1 text-sm text-bac-muted">
                Main reporting entry points for BAC operations.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ReportCard
                title="House Reports"
                description="Occupancy, staffing coverage, resident profile gaps, alerts, and compliance snapshots."
                badge="Ready"
                href="/reports/house"
                tone="violet"
              />
              <ReportCard
                title="Staffing Reports"
                description="Assigned staff, on-duty coverage, 2+ DSP shifts, and staffing health indicators."
                badge="Ready"
                href="/reports/staffing"
                tone="sky"
              />
              <ReportCard
                title="Schedule Reports"
                description="Schedule-linked reporting entry for coverage review, weekly shifts, and conflicts."
                badge="Ready"
                href="/reports/schedule"
                tone="green"
              />
              <ReportCard
                title="Daily Notes Reports"
                description="Track note completeness, missing notes, signature readiness, and documentation flow."
                badge="Phase Next"
                href="/reports/daily-notes"
                tone="amber"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-bac-text">
                Extended Report Areas
              </h2>
              <p className="mt-1 text-sm text-bac-muted">
                Additional reporting sections for future expansion.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ReportCard
                title="Billing Reports"
                description="Authorization usage, billing-ready totals, service support output, and export follow-up."
                badge="Phase Next"
                href="/reports/billing"
                tone="amber"
              />
              <ReportCard
                title="Payroll Reports"
                description="Reserved section for payroll hours, overtime, and payroll summary reporting."
                badge="Coming Soon"
                href="/reports/billing"
                tone="green"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <h2 className="text-xl font-semibold text-bac-text">Quick Actions</h2>
            <p className="mt-1 text-sm text-bac-muted">
              Jump directly into common reporting workflows.
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <Link
                href="/reports/house"
                className="rounded-xl border border-bac-border bg-bac-bg px-4 py-3 text-sm font-medium text-bac-text hover:bg-white/5"
              >
                Open House Reports
              </Link>
              <Link
                href="/reports/staffing"
                className="rounded-xl border border-bac-border bg-bac-bg px-4 py-3 text-sm font-medium text-bac-text hover:bg-white/5"
              >
                Open Staffing Reports
              </Link>
              <Link
                href="/reports/schedule"
                className="rounded-xl border border-bac-border bg-bac-bg px-4 py-3 text-sm font-medium text-bac-text hover:bg-white/5"
              >
                Open Schedule Reports
              </Link>
              <Link
                href="/reports/daily-notes"
                className="rounded-xl border border-bac-border bg-bac-bg px-4 py-3 text-sm font-medium text-bac-text hover:bg-white/5"
              >
                Open Daily Notes Reports
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <h2 className="text-xl font-semibold text-bac-text">Recent Activity</h2>
            <p className="mt-1 text-sm text-bac-muted">
              Report center startup history.
            </p>

            <div className="mt-4 space-y-3">
              <ActivityItem
                title="Reports Center deployed"
                detail="Go to Reports button now routes to a live reports hub."
                time="Today"
              />
              <ActivityItem
                title="House Reports route added"
                detail="House reporting entry page is now available."
                time="Today"
              />
              <ActivityItem
                title="Staffing & Schedule routes added"
                detail="Reporting pages now connect users into core operations."
                time="Today"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
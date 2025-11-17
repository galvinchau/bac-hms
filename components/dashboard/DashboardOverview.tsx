// components/dashboard/DashboardOverview.tsx
"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Summary = {
  totalIndividuals: number;
  totalEmployees: number;
  unitsPlannedWeek: number;
  unitsActualWeek: number;
  weeklyUnitBalance: number;
  shiftsInProgress: number;
  shiftsCompleted: number;
  shiftsCancelled: number;
  shiftsTotal: number;
  currentWeekLabel: string;
};

const emptySummary: Summary = {
  totalIndividuals: 0,
  totalEmployees: 0,
  unitsPlannedWeek: 0,
  unitsActualWeek: 0,
  weeklyUnitBalance: 0,
  shiftsInProgress: 0,
  shiftsCompleted: 0,
  shiftsCancelled: 0,
  shiftsTotal: 0,
  currentWeekLabel: "Current week",
};

export default function DashboardOverview() {
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/dashboard/summary");
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to load dashboard summary.");
        }
        const data = (await res.json()) as Summary;
        if (!cancelled) {
          setSummary(data);
        }
      } catch (err: any) {
        console.error("DashboardOverview load error", err);
        if (!cancelled) {
          setError("Failed to load dashboard summary.");
          setSummary(emptySummary);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const weeklyUnitsData = [
    { name: "Planned", value: summary.unitsPlannedWeek },
    { name: "Actual", value: summary.unitsActualWeek },
    { name: "Delta", value: summary.weeklyUnitBalance },
  ];

  const shiftsStatusData = [
    { name: "Total", value: summary.shiftsTotal },
    { name: "Completed", value: summary.shiftsCompleted },
    { name: "In progress", value: summary.shiftsInProgress },
    { name: "Cancelled", value: summary.shiftsCancelled },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold mb-1">Dashboard</h1>
        <p className="text-sm text-bac-muted">
          Overview of caseload and schedule status for the current week.
        </p>
      </div>

      {/* Error banner (nếu có) */}
      {error && (
        <div className="rounded-xl border border-red-700 bg-red-900/30 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Dòng 1: 4 thẻ lớn */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-bac-border bg-bac-panel p-4">
          <div className="text-xs font-medium text-bac-muted">INDIVIDUALS</div>
          <div className="mt-2 text-3xl font-semibold">
            {summary.totalIndividuals}
          </div>
          <div className="mt-1 text-xs text-bac-muted">Active caseload</div>
        </div>

        <div className="rounded-xl border border-bac-border bg-bac-panel p-4">
          <div className="text-xs font-medium text-bac-muted">EMPLOYEES</div>
          <div className="mt-2 text-3xl font-semibold">
            {summary.totalEmployees}
          </div>
          <div className="mt-1 text-xs text-bac-muted">
            DSPs &amp; office staff
          </div>
        </div>

        <div className="rounded-xl border border-bac-border bg-bac-panel p-4">
          <div className="text-xs font-medium text-bac-muted">
            UNITS THIS WEEK (PLANNED)
          </div>
          <div className="mt-2 text-3xl font-semibold">
            {summary.unitsPlannedWeek}
          </div>
          <div className="mt-1 text-xs text-bac-muted">
            All scheduled shifts
          </div>
        </div>

        <div className="rounded-xl border border-bac-border bg-bac-panel p-4">
          <div className="text-xs font-medium text-bac-muted">
            UNITS THIS WEEK (ACTUAL)
          </div>
          <div className="mt-2 text-3xl font-semibold">
            {summary.unitsActualWeek}
          </div>
          <div className="mt-1 text-xs text-bac-muted">
            Based on submitted visits
          </div>
        </div>
      </div>

      {/* Dòng 2: 4 thẻ nhỏ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-bac-border bg-bac-panel p-4">
          <div className="text-xs font-medium text-bac-muted">
            WEEKLY UNIT BALANCE
          </div>
          <div
            className={`mt-2 text-3xl font-semibold ${
              summary.weeklyUnitBalance < 0
                ? "text-red-400"
                : summary.weeklyUnitBalance > 0
                ? "text-emerald-400"
                : "text-bac-text"
            }`}
          >
            {summary.weeklyUnitBalance}
          </div>
          <div className="mt-1 text-xs text-bac-muted">
            Actual units vs planned
          </div>
        </div>

        <div className="rounded-xl border border-bac-border bg-bac-panel p-4">
          <div className="text-xs font-medium text-bac-muted">
            SHIFTS IN PROGRESS
          </div>
          <div className="mt-2 text-3xl font-semibold">
            {summary.shiftsInProgress}
          </div>
          <div className="mt-1 text-xs text-bac-muted">
            Currently active visits
          </div>
        </div>

        <div className="rounded-xl border border-bac-border bg-bac-panel p-4">
          <div className="text-xs font-medium text-bac-muted">
            COMPLETED SHIFTS THIS WEEK
          </div>
          <div className="mt-2 text-3xl font-semibold">
            {summary.shiftsCompleted}
          </div>
          <div className="mt-1 text-xs text-bac-muted">
            Closed with check-in &amp; check-out
          </div>
        </div>

        <div className="rounded-xl border border-bac-border bg-bac-panel p-4">
          <div className="text-xs font-medium text-bac-muted">
            CANCELLED SHIFTS THIS WEEK
          </div>
          <div className="mt-2 text-3xl font-semibold text-amber-300">
            {summary.shiftsCancelled}
          </div>
          <div className="mt-1 text-xs text-bac-muted">
            Marked as cancelled in schedule
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly units */}
        <div className="rounded-xl border border-bac-border bg-bac-panel p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-bac-muted">
              Weekly units
            </div>
            <div className="text-xs text-bac-muted">
              {summary.currentWeekLabel}
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyUnitsData}>
                <defs>
                  <linearGradient
                    id="weeklyGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1f2937"
                  vertical={false}
                />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#020617",
                    borderColor: "#1f2937",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" fill="url(#weeklyGradient)" radius={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Shifts status */}
        <div className="rounded-xl border border-bac-border bg-bac-panel p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-bac-muted">
              Shifts status
            </div>
            <div className="text-xs text-bac-muted">
              {summary.currentWeekLabel}
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shiftsStatusData}>
                <defs>
                  <linearGradient
                    id="shiftsGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#4ade80" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#022c22" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1f2937"
                  vertical={false}
                />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#020617",
                    borderColor: "#1f2937",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" fill="url(#shiftsGradient)" radius={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-bac-border bg-bac-panel p-4">
          <div className="text-xs font-medium text-bac-muted mb-2">
            Internal announcements
          </div>
          <p className="text-sm text-bac-muted">
            This area can be used to post internal memos, schedule changes, or
            upcoming audits. For now, this is sample text — we can later connect
            it to a real &quot;News/Announcements&quot; table.
          </p>
        </div>

        <div className="rounded-xl border border-bac-border bg-bac-panel p-4">
          <div className="text-xs font-medium text-bac-muted mb-2">
            Current week notes
          </div>
          <p className="text-sm text-bac-muted">
            Example: highlight individuals that are close to hitting their ISP
            units, onboarding progress for new DSPs, or open incident reports.
          </p>
        </div>
      </div>

      {loading && (
        <div className="text-xs text-bac-muted">
          Loading latest numbers from the server…
        </div>
      )}
    </div>
  );
}

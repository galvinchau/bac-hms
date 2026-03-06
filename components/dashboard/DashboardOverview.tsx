"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

type HealthIncidentItem = {
  id: string;
  status?: string | null;
  date?: string | null;
  createdAt?: string | null;
  submittedAt?: string | null;
  staffName?: string | null;
  individualName?: string | null;
  incidentType?: string | null;
};

type HealthIncidentListResponse = {
  items?: HealthIncidentItem[];
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

function safeStr(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function fmtDateTime(value?: string | null) {
  const s = safeStr(value).trim();
  if (!s) return "—";

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;

  return d.toLocaleString();
}

export default function DashboardOverview() {
  const router = useRouter();

  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [incidentItems, setIncidentItems] = useState<HealthIncidentItem[]>([]);
  const [incidentLoading, setIncidentLoading] = useState(true);
  const [incidentPopupDismissed, setIncidentPopupDismissed] = useState(false);

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

  useEffect(() => {
    let cancelled = false;

    async function loadIncidentAlerts() {
      try {
        setIncidentLoading(true);

        const res = await fetch("/api/reports/health-incident?status=SUBMITTED", {
          cache: "no-store",
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to load incident alerts.");
        }

        const data = (await res.json()) as HealthIncidentListResponse;
        const items = Array.isArray(data?.items) ? data.items : [];

        if (!cancelled) {
          setIncidentItems(items);
          setIncidentPopupDismissed(false);
        }
      } catch (err) {
        console.error("DashboardOverview incident alert load error", err);
        if (!cancelled) {
          setIncidentItems([]);
        }
      } finally {
        if (!cancelled) {
          setIncidentLoading(false);
        }
      }
    }

    loadIncidentAlerts();

    const timer = window.setInterval(() => {
      loadIncidentAlerts();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const latestIncident = useMemo(() => {
    if (!incidentItems.length) return null;

    return [...incidentItems].sort((a, b) => {
      const ta = new Date(
        safeStr(a.submittedAt) || safeStr(a.createdAt) || safeStr(a.date) || 0
      ).getTime();
      const tb = new Date(
        safeStr(b.submittedAt) || safeStr(b.createdAt) || safeStr(b.date) || 0
      ).getTime();
      return tb - ta;
    })[0];
  }, [incidentItems]);

  const showIncidentPopup =
    !incidentLoading &&
    !incidentPopupDismissed &&
    Array.isArray(incidentItems) &&
    incidentItems.length > 0;

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
      {/* Emergency Incident Popup */}
      {showIncidentPopup && (
        <div className="rounded-2xl border border-red-300/40 bg-red-700 px-5 py-4 text-white shadow-2xl shadow-red-950/40">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-red-100 animate-pulse">
                  Emergency Alert
                </span>
                <span className="text-sm font-semibold text-red-100">
                  New Health / Incident Report Submitted
                </span>
              </div>

              <div className="mt-2 text-2xl font-bold">
                {incidentItems.length} new incident report
                {incidentItems.length > 1 ? "s" : ""} require attention.
              </div>

              {latestIncident && (
                <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-red-50 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <span className="font-semibold">Individual:</span>{" "}
                    {safeStr(latestIncident.individualName) || "—"}
                  </div>
                  <div>
                    <span className="font-semibold">DSP:</span>{" "}
                    {safeStr(latestIncident.staffName) || "—"}
                  </div>
                  <div>
                    <span className="font-semibold">Incident Type:</span>{" "}
                    {safeStr(latestIncident.incidentType) || "—"}
                  </div>
                  <div>
                    <span className="font-semibold">Submitted:</span>{" "}
                    {fmtDateTime(
                      latestIncident.submittedAt ||
                        latestIncident.createdAt ||
                        latestIncident.date
                    )}
                  </div>
                </div>
              )}

              <div className="mt-3 text-sm text-red-100">
                Please review the report promptly and follow the required company
                procedures.
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <button
                onClick={() => router.push("/reports/health-incident")}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/30 bg-white px-4 text-sm font-semibold text-red-700 shadow hover:bg-red-50"
              >
                View Reports
              </button>

              <button
                onClick={() => setIncidentPopupDismissed(true)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/30 bg-red-800/40 px-4 text-sm font-semibold text-white hover:bg-red-800/70"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

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
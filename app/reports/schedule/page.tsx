// bac-hms/web/app/reports/schedule/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type HouseRisk = "GOOD" | "WARNING" | "CRITICAL";
type OccupancyStatus = "AVAILABLE" | "NEAR_FULL" | "FULL";
type AlertAction =
  | "VIEW_RESIDENTS"
  | "VIEW_STAFFING"
  | "VIEW_COVERAGE"
  | "VIEW_DASHBOARD";

type HouseItem = {
  id: string;
  code: string;
  name: string;
  address: string;
  programType: string;
  capacity: number;
  currentResidents: number;
  assignedStaff: number;
  complianceScore: number;
  openAlerts: number;
  status: string;
  risk: HouseRisk;
  supervisor: string;
  county: string;
  phone: string;
  primaryOccupancyModel: string;
  houseBillingNote: string;
};

type DashboardResponse = {
  house: {
    id: string;
    code: string;
    name: string;
    address: string;
    programType: string;
    county: string;
    phone: string;
    capacity: number;
    currentResidents: number;
    supervisor: string;
  };
  summary: {
    residents: number;
    fullTime247: number;
    homeVisitSplit: number;
    highNeedResidents: number;
    multiDspShifts: number;
    complianceScore: number;
    behaviorIntensive?: number;
    capacityUsed?: number;
    remainingBeds?: number;
    occupancyStatus?: OccupancyStatus;
    profileGaps?: number;
  };
  occupancy?: {
    capacity: number;
    currentResidents: number;
    remainingBeds: number;
    occupancyStatus: OccupancyStatus;
  };
  coverage: Array<{
    id: string;
    time: string;
    service: string;
    shiftStatus: string;
    staffAssigned: Array<{
      name: string;
      role: string;
    }>;
    individualsCovered: string[];
    staffingRatioLabel: string;
    awakeRequired?: boolean;
    behaviorSupport?: boolean;
    note?: string | null;
  }>;
  alerts: Array<{
    id: string;
    level: "CRITICAL" | "WARNING" | "INFO";
    title: string;
    detail: string;
    actionLabel: string;
    action?: AlertAction;
  }>;
  compliance: Array<{
    key: string;
    label: string;
    score: number;
    status: "GOOD" | "WARNING" | "CRITICAL";
    lastReviewed: string;
  }>;
  timeline: Array<{
    id: string;
    at: string;
    title: string;
    description: string;
    level?: "CRITICAL" | "WARNING" | "INFO";
  }>;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3333";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json();
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "violet" | "sky" | "amber" | "green";
}) {
  const toneClass =
    tone === "sky"
      ? "border-sky-500/20 bg-sky-500/5"
      : tone === "amber"
        ? "border-amber-500/20 bg-amber-500/5"
        : tone === "green"
          ? "border-emerald-500/20 bg-emerald-500/5"
          : tone === "violet"
            ? "border-violet-500/20 bg-violet-500/5"
            : "border-bac-border bg-bac-panel";

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <div className="text-sm text-bac-muted">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-bac-text">
        {value}
      </div>
    </div>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "good" | "warning" | "critical" | "info" | "muted";
}) {
  const cls =
    tone === "good"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : tone === "warning"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
        : tone === "critical"
          ? "border-red-500/30 bg-red-500/10 text-red-200"
          : tone === "info"
            ? "border-sky-500/30 bg-sky-500/10 text-sky-200"
            : "border-bac-border bg-bac-bg text-bac-muted";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

function mapAlertTone(level: "CRITICAL" | "WARNING" | "INFO") {
  if (level === "CRITICAL") return "critical" as const;
  if (level === "WARNING") return "warning" as const;
  return "info" as const;
}

function shiftStatusTone(status: string) {
  const normalized = String(status || "").toUpperCase();
  if (
    normalized.includes("NOT_COMPLETED") ||
    normalized.includes("FAILED") ||
    normalized.includes("CANCEL")
  ) {
    return "critical" as const;
  }
  if (normalized.includes("IN_PROGRESS")) return "warning" as const;
  if (normalized.includes("COMPLETED")) return "good" as const;
  return "info" as const;
}

export default function ScheduleReportsPage() {
  const [houses, setHouses] = useState<HouseItem[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState("");
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);

  const [housesLoading, setHousesLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadHouses(preferredHouseId?: string) {
    try {
      setHousesLoading(true);
      setError("");

      const data = await fetchJson<{ items: HouseItem[]; total: number }>(
        `${API_BASE}/house-management/houses`
      );

      const items = data.items || [];
      setHouses(items);

      setSelectedHouseId((prev) => {
        if (preferredHouseId && items.some((h) => h.id === preferredHouseId)) {
          return preferredHouseId;
        }
        if (prev && items.some((h) => h.id === prev)) {
          return prev;
        }
        return items[0]?.id || "";
      });
    } catch (err) {
      setHouses([]);
      setSelectedHouseId("");
      setError(err instanceof Error ? err.message : "Failed to load houses.");
    } finally {
      setHousesLoading(false);
    }
  }

  async function loadDashboard(houseId: string) {
    try {
      setDashboardLoading(true);
      setError("");

      const data = await fetchJson<DashboardResponse>(
        `${API_BASE}/house-management/dashboard/${houseId}`
      );

      setDashboardData(data);
    } catch (err) {
      setDashboardData(null);
      setError(err instanceof Error ? err.message : "Failed to load schedule report.");
    } finally {
      setDashboardLoading(false);
    }
  }

  useEffect(() => {
    void loadHouses();
  }, []);

  useEffect(() => {
    if (!selectedHouseId) {
      setDashboardData(null);
      return;
    }
    void loadDashboard(selectedHouseId);
  }, [selectedHouseId]);

  const selectedHouse = useMemo(() => {
    return houses.find((h) => h.id === selectedHouseId) || null;
  }, [houses, selectedHouseId]);

  const awakeShiftCount = useMemo(() => {
    return (dashboardData?.coverage || []).filter((item) => item.awakeRequired).length;
  }, [dashboardData?.coverage]);

  const behaviorCoverageCount = useMemo(() => {
    return (dashboardData?.coverage || []).filter((item) => item.behaviorSupport).length;
  }, [dashboardData?.coverage]);

  const uncoveredShiftCount = useMemo(() => {
    return (dashboardData?.coverage || []).filter(
      (item) => !item.staffAssigned || item.staffAssigned.length === 0
    ).length;
  }, [dashboardData?.coverage]);

  const scheduleAlerts = useMemo(() => {
    return (dashboardData?.alerts || []).filter(
      (alert) =>
        alert.action === "VIEW_COVERAGE" ||
        alert.action === "VIEW_STAFFING" ||
        alert.title.toLowerCase().includes("shift") ||
        alert.title.toLowerCase().includes("awake") ||
        alert.title.toLowerCase().includes("staff")
    );
  }, [dashboardData?.alerts]);

  return (
    <div className="min-h-[calc(100vh-60px)] bg-bac-bg p-6">
      <div className="mb-6 rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 via-bac-panel to-sky-950/20 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-bac-text">
              Schedule Reports
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-bac-muted">
              Live schedule reporting view for coverage, awake-required shifts,
              uncovered assignments, and house-level shift activity.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/reports"
              className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm font-medium text-bac-text hover:bg-white/5"
            >
              Back to Reports
            </Link>
            <Link
              href="/schedule"
              className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95"
            >
              Open Schedule Module
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-bac-border bg-bac-panel p-5">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <div className="text-sm text-bac-muted">Selected House</div>
            <div className="mt-2 text-lg font-semibold text-bac-text">
              {dashboardData?.house?.name || selectedHouse?.name || "—"}
            </div>
            <div className="mt-1 text-sm text-bac-muted">
              {dashboardData?.house?.address || selectedHouse?.address || "No address available"}
            </div>
          </div>

          <div className="min-w-[320px]">
            <label className="mb-2 block text-sm font-medium text-bac-text">
              House
            </label>
            <select
              value={selectedHouseId}
              onChange={(e) => setSelectedHouseId(e.target.value)}
              className="h-11 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
              disabled={housesLoading}
            >
              {houses.length > 0 ? (
                houses.map((house) => (
                  <option key={house.id} value={house.id}>
                    {house.name} ({house.code})
                  </option>
                ))
              ) : (
                <option value="">{housesLoading ? "Loading..." : "No houses"}</option>
              )}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          label="Today Shifts"
          value={dashboardData?.coverage?.length ?? 0}
          tone="violet"
        />
        <MetricCard
          label="Awake Shifts"
          value={awakeShiftCount}
          tone="amber"
        />
        <MetricCard
          label="Uncovered Shifts"
          value={uncoveredShiftCount}
          tone="amber"
        />
        <MetricCard
          label="2+ DSP Shifts"
          value={dashboardData?.summary?.multiDspShifts ?? 0}
          tone="sky"
        />
        <MetricCard
          label="Behavior Coverage"
          value={behaviorCoverageCount}
          tone="green"
        />
        <MetricCard
          label="Schedule Alerts"
          value={scheduleAlerts.length}
          tone="sky"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <h2 className="text-xl font-semibold text-bac-text">Today Coverage</h2>
            <p className="mt-1 text-sm text-bac-muted">
              Live shift coverage from the selected house dashboard.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[1180px] w-full text-left text-sm">
                <thead className="border-b border-bac-border text-bac-muted">
                  <tr>
                    <th className="px-3 py-3">Time</th>
                    <th className="px-3 py-3">Service</th>
                    <th className="px-3 py-3">Staff Assigned</th>
                    <th className="px-3 py-3">Individuals Covered</th>
                    <th className="px-3 py-3">Ratio</th>
                    <th className="px-3 py-3">Special</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bac-border text-bac-text">
                  {dashboardData?.coverage?.length ? (
                    dashboardData.coverage.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-3">{item.time || "—"}</td>
                        <td className="px-3 py-3">
                          <div className="font-medium">{item.service || "—"}</div>
                          {item.note ? (
                            <div className="text-xs text-bac-muted">{item.note}</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          {item.staffAssigned?.length ? (
                            <div className="space-y-1">
                              {item.staffAssigned.map((staff, idx) => (
                                <div key={`${item.id}-${idx}`} className="text-sm">
                                  {staff.name}{" "}
                                  <span className="text-xs text-bac-muted">
                                    ({staff.role})
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <StatusPill tone="critical">Uncovered</StatusPill>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {item.individualsCovered?.join(", ") || "—"}
                        </td>
                        <td className="px-3 py-3">{item.staffingRatioLabel || "—"}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {item.awakeRequired ? (
                              <StatusPill tone="warning">Awake Required</StatusPill>
                            ) : null}
                            {item.behaviorSupport ? (
                              <StatusPill tone="info">Behavior Support</StatusPill>
                            ) : null}
                            {!item.awakeRequired && !item.behaviorSupport ? (
                              <StatusPill tone="muted">Standard</StatusPill>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill tone={shiftStatusTone(item.shiftStatus)}>
                            {item.shiftStatus || "—"}
                          </StatusPill>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-bac-muted">
                        {dashboardLoading ? "Loading coverage..." : "No coverage data."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <h2 className="text-xl font-semibold text-bac-text">Schedule Alerts</h2>
            <p className="mt-1 text-sm text-bac-muted">
              House-level alerts related to schedule coverage and shift follow-up.
            </p>

            <div className="mt-4 space-y-3">
              {scheduleAlerts.length ? (
                scheduleAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-2xl border border-bac-border bg-bac-bg p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <StatusPill tone={mapAlertTone(alert.level)}>
                          {alert.level}
                        </StatusPill>
                        <div className="font-semibold text-bac-text">{alert.title}</div>
                      </div>
                      <div className="text-xs text-bac-muted">{alert.actionLabel}</div>
                    </div>
                    <div className="mt-2 text-sm text-bac-muted">{alert.detail}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-bac-border bg-bac-bg p-4 text-sm text-bac-muted">
                  {dashboardLoading ? "Loading alerts..." : "No schedule-related alerts."}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <h2 className="text-xl font-semibold text-bac-text">Schedule Summary</h2>
            <p className="mt-1 text-sm text-bac-muted">
              Quick view of current house schedule activity.
            </p>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-bac-text">Open Alerts</div>
                  <StatusPill tone={scheduleAlerts.length > 0 ? "warning" : "good"}>
                    {scheduleAlerts.length}
                  </StatusPill>
                </div>
                <div className="mt-2 text-sm text-bac-muted">
                  Alerts currently relevant to scheduling, coverage, or awake shifts.
                </div>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-bac-text">Current Residents</div>
                  <StatusPill tone="info">
                    {dashboardData?.summary?.residents ?? selectedHouse?.currentResidents ?? 0}
                  </StatusPill>
                </div>
                <div className="mt-2 text-sm text-bac-muted">
                  House resident count used to interpret coverage pressure.
                </div>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-bac-text">Supervisor</div>
                  <StatusPill tone={dashboardData?.house?.supervisor ? "good" : "muted"}>
                    {dashboardData?.house?.supervisor ? "Set" : "Not Set"}
                  </StatusPill>
                </div>
                <div className="mt-2 text-sm text-bac-muted">
                  {dashboardData?.house?.supervisor || "No supervisor shown for this house."}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <h2 className="text-xl font-semibold text-bac-text">Recent Timeline</h2>
            <p className="mt-1 text-sm text-bac-muted">
              Latest house timeline activity related to shift updates.
            </p>

            <div className="mt-4 space-y-3">
              {dashboardData?.timeline?.length ? (
                dashboardData.timeline.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-bac-border bg-bac-bg p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-bac-text">{item.title}</div>
                      <StatusPill tone="muted">
                        {item.level || "INFO"}
                      </StatusPill>
                    </div>
                    <div className="mt-2 text-sm text-bac-muted">{item.description}</div>
                    <div className="mt-2 text-xs text-bac-muted">{item.at}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-bac-border bg-bac-bg p-4 text-sm text-bac-muted">
                  {dashboardLoading ? "Loading timeline..." : "No timeline activity."}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <h2 className="text-xl font-semibold text-bac-text">Quick Links</h2>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                href="/schedule"
                className="rounded-xl border border-bac-border bg-bac-bg px-4 py-3 text-sm font-medium text-bac-text hover:bg-white/5"
              >
                Open Live Schedule
              </Link>
              <Link
                href="/reports/house"
                className="rounded-xl border border-bac-border bg-bac-bg px-4 py-3 text-sm font-medium text-bac-text hover:bg-white/5"
              >
                Go to House Reports
              </Link>
              <Link
                href="/reports/staffing"
                className="rounded-xl border border-bac-border bg-bac-bg px-4 py-3 text-sm font-medium text-bac-text hover:bg-white/5"
              >
                Go to Staffing Reports
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
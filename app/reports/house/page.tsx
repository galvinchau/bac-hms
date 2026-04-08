// bac-hms/web/app/reports/house/page.tsx
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

type DashboardResidentSnapshotItem = {
  id: string;
  code?: string;
  name: string;
  maNumber?: string;
  roomLabel?: string;
  residentialPlacementType?: "FULL_TIME_247" | "HOME_VISIT_SPLIT" | null | string;
  behaviorSupportLevel?: "NONE" | "MODERATE" | "INTENSIVE" | string;
  appointmentLoad?: "LOW" | "MODERATE" | "HIGH" | string;
  careRateTier?: string;
  housingCoverage?: string;
  homeVisitSchedule?: string;
  status?: string;
  profileFlags?: {
    missingRoomLabel?: boolean;
    missingCareRateTier?: boolean;
    missingHousingCoverage?: boolean;
    missingHomeVisitSchedule?: boolean;
  };
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
  residentSnapshot?: DashboardResidentSnapshotItem[];
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

function mapComplianceTone(status: "GOOD" | "WARNING" | "CRITICAL") {
  if (status === "GOOD") return "good" as const;
  if (status === "WARNING") return "warning" as const;
  return "critical" as const;
}

function formatOccupancyStatus(status?: OccupancyStatus) {
  if (!status) return "—";
  if (status === "NEAR_FULL") return "Near Full";
  if (status === "FULL") return "Full";
  return "Available";
}

function formatPlacementType(value?: string | null) {
  if (!value) return "—";
  if (value === "FULL_TIME_247") return "24/7 Full-Time";
  if (value === "HOME_VISIT_SPLIT") return "Home-Visit Split";
  return value;
}

export default function HouseReportsPage() {
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
      setError(err instanceof Error ? err.message : "Failed to load house report.");
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

  const occupancyStatus = dashboardData?.occupancy?.occupancyStatus || dashboardData?.summary?.occupancyStatus;
  const complianceScore = dashboardData?.summary?.complianceScore ?? selectedHouse?.complianceScore ?? 0;
  const residentCount = dashboardData?.summary?.residents ?? selectedHouse?.currentResidents ?? 0;
  const assignedStaff = selectedHouse?.assignedStaff ?? 0;
  const remainingBeds =
    dashboardData?.occupancy?.remainingBeds ??
    dashboardData?.summary?.remainingBeds ??
    Math.max((selectedHouse?.capacity ?? 0) - (selectedHouse?.currentResidents ?? 0), 0);

  return (
    <div className="min-h-[calc(100vh-60px)] bg-bac-bg p-6">
      <div className="mb-6 rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-bac-panel to-amber-950/20 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-bac-text">
              House Reports
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-bac-muted">
              Live reporting view for house occupancy, resident profile gaps, alerts,
              staffing snapshot, compliance, and current house-level coverage.
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
              href="/house-management"
              className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95"
            >
              Open House Management
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
        <MetricCard label="Residents" value={residentCount} tone="violet" />
        <MetricCard label="Assigned Staff" value={assignedStaff} tone="sky" />
        <MetricCard label="Remaining Beds" value={remainingBeds} tone="amber" />
        <MetricCard
          label="Occupancy Status"
          value={formatOccupancyStatus(occupancyStatus)}
          tone="green"
        />
        <MetricCard
          label="Open Alerts"
          value={dashboardData?.alerts?.length ?? selectedHouse?.openAlerts ?? 0}
          tone="amber"
        />
        <MetricCard label="Compliance Score" value={`${complianceScore}%`} tone="sky" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <h2 className="text-xl font-semibold text-bac-text">House Overview</h2>
            <p className="mt-1 text-sm text-bac-muted">
              Live operational summary for the selected house.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                <div className="text-sm text-bac-muted">Program Type</div>
                <div className="mt-2 text-base font-semibold text-bac-text">
                  {dashboardData?.house?.programType || selectedHouse?.programType || "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                <div className="text-sm text-bac-muted">Supervisor</div>
                <div className="mt-2 text-base font-semibold text-bac-text">
                  {dashboardData?.house?.supervisor || selectedHouse?.supervisor || "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                <div className="text-sm text-bac-muted">Capacity</div>
                <div className="mt-2 text-base font-semibold text-bac-text">
                  {dashboardData?.house?.capacity ?? selectedHouse?.capacity ?? "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                <div className="text-sm text-bac-muted">Profile Gaps</div>
                <div className="mt-2 text-base font-semibold text-bac-text">
                  {dashboardData?.summary?.profileGaps ?? "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <h2 className="text-xl font-semibold text-bac-text">Open Alerts</h2>
            <p className="mt-1 text-sm text-bac-muted">
              Current operational alerts for the selected house.
            </p>

            <div className="mt-4 space-y-3">
              {dashboardData?.alerts?.length ? (
                dashboardData.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-2xl border border-bac-border bg-bac-bg p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <StatusPill tone={mapAlertTone(alert.level)}>{alert.level}</StatusPill>
                        <div className="font-semibold text-bac-text">{alert.title}</div>
                      </div>
                      <div className="text-xs text-bac-muted">{alert.actionLabel}</div>
                    </div>
                    <div className="mt-2 text-sm text-bac-muted">{alert.detail}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-bac-border bg-bac-bg p-4 text-sm text-bac-muted">
                  No alerts found.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <h2 className="text-xl font-semibold text-bac-text">Resident Snapshot</h2>
            <p className="mt-1 text-sm text-bac-muted">
              Resident-level view for placement type, behavior, and profile completeness.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="border-b border-bac-border text-bac-muted">
                  <tr>
                    <th className="px-3 py-3">Resident</th>
                    <th className="px-3 py-3">MA #</th>
                    <th className="px-3 py-3">Room</th>
                    <th className="px-3 py-3">Placement</th>
                    <th className="px-3 py-3">Behavior</th>
                    <th className="px-3 py-3">Housing</th>
                    <th className="px-3 py-3">Care Tier</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bac-border text-bac-text">
                  {dashboardData?.residentSnapshot?.length ? (
                    dashboardData.residentSnapshot.map((resident) => (
                      <tr key={resident.id}>
                        <td className="px-3 py-3">
                          <div className="font-medium">{resident.name}</div>
                          <div className="text-xs text-bac-muted">{resident.code || resident.id}</div>
                        </td>
                        <td className="px-3 py-3">{resident.maNumber || "—"}</td>
                        <td className="px-3 py-3">{resident.roomLabel || "—"}</td>
                        <td className="px-3 py-3">
                          {formatPlacementType(resident.residentialPlacementType)}
                        </td>
                        <td className="px-3 py-3">{resident.behaviorSupportLevel || "—"}</td>
                        <td className="px-3 py-3">{resident.housingCoverage || "—"}</td>
                        <td className="px-3 py-3">{resident.careRateTier || "—"}</td>
                        <td className="px-3 py-3">{resident.status || "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-bac-muted">
                        {dashboardLoading ? "Loading resident snapshot..." : "No resident snapshot data."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <h2 className="text-xl font-semibold text-bac-text">Compliance Snapshot</h2>
            <p className="mt-1 text-sm text-bac-muted">
              Current compliance breakdown from house dashboard.
            </p>

            <div className="mt-4 space-y-3">
              {dashboardData?.compliance?.length ? (
                dashboardData.compliance.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-2xl border border-bac-border bg-bac-bg p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-bac-text">{item.label}</div>
                      <StatusPill tone={mapComplianceTone(item.status)}>
                        {item.status}
                      </StatusPill>
                    </div>
                    <div className="mt-2 text-sm text-bac-muted">
                      Score: <span className="font-medium text-bac-text">{item.score}%</span>
                    </div>
                    <div className="mt-1 text-xs text-bac-muted">
                      Last reviewed: {item.lastReviewed}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-bac-border bg-bac-bg p-4 text-sm text-bac-muted">
                  {dashboardLoading ? "Loading compliance..." : "No compliance data."}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <h2 className="text-xl font-semibold text-bac-text">Today Coverage</h2>
            <p className="mt-1 text-sm text-bac-muted">
              Current day shift coverage for this house.
            </p>

            <div className="mt-4 space-y-3">
              {dashboardData?.coverage?.length ? (
                dashboardData.coverage.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-bac-border bg-bac-bg p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-bac-text">{item.service}</div>
                        <div className="mt-1 text-sm text-bac-muted">{item.time}</div>
                      </div>
                      <StatusPill tone="info">{item.shiftStatus}</StatusPill>
                    </div>

                    <div className="mt-3 text-sm text-bac-muted">
                      Staff:{" "}
                      <span className="text-bac-text">
                        {item.staffAssigned?.map((s) => s.name).join(", ") || "—"}
                      </span>
                    </div>

                    <div className="mt-1 text-sm text-bac-muted">
                      Individuals:{" "}
                      <span className="text-bac-text">
                        {item.individualsCovered?.join(", ") || "—"}
                      </span>
                    </div>

                    <div className="mt-1 text-sm text-bac-muted">
                      Ratio: <span className="text-bac-text">{item.staffingRatioLabel || "—"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-bac-border bg-bac-bg p-4 text-sm text-bac-muted">
                  {dashboardLoading ? "Loading coverage..." : "No coverage data."}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <h2 className="text-xl font-semibold text-bac-text">Quick Links</h2>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                href="/house-management"
                className="rounded-xl border border-bac-border bg-bac-bg px-4 py-3 text-sm font-medium text-bac-text hover:bg-white/5"
              >
                Open House Management
              </Link>
              <Link
                href="/reports/staffing"
                className="rounded-xl border border-bac-border bg-bac-bg px-4 py-3 text-sm font-medium text-bac-text hover:bg-white/5"
              >
                Go to Staffing Reports
              </Link>
              <Link
                href="/reports/schedule"
                className="rounded-xl border border-bac-border bg-bac-bg px-4 py-3 text-sm font-medium text-bac-text hover:bg-white/5"
              >
                Go to Schedule Reports
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
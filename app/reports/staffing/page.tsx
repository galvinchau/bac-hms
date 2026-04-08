// bac-hms/web/app/reports/staffing/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type HouseRisk = "GOOD" | "WARNING" | "CRITICAL";
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

type StaffingResponse = {
  houseId: string;
  houseName: string;
  summary: {
    assignedStaff: number;
    onDutyNow: number;
    multiDspShifts: number;
    behaviorSpecialistVisits: number;
    medCertStaff: number;
    trainingOverdue: number;
  };
  items: Array<{
    id: string;
    name: string;
    role: string;
    isPrimaryStaff?: boolean;
    shiftToday: string;
    trainingStatus: "CURRENT" | "DUE_SOON" | "OVERDUE" | string;
    medCertified: boolean;
    cpr: "CURRENT" | "EXPIRED" | string;
    driver: "ACTIVE" | "INACTIVE" | string;
    clearance: "CURRENT" | "EXPIRED" | string;
    status: "ON_DUTY" | "OFF_DUTY" | string;
  }>;
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
  alerts: Array<{
    id: string;
    level: "CRITICAL" | "WARNING" | "INFO";
    title: string;
    detail: string;
    actionLabel: string;
    action?: AlertAction;
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

function mapTrainingTone(status: string) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "OVERDUE") return "critical" as const;
  if (normalized === "DUE_SOON") return "warning" as const;
  return "good" as const;
}

function roleTone(role: string) {
  const normalized = String(role || "").toUpperCase();
  if (normalized.includes("SUPERVISOR")) return "violet" as const;
  if (normalized.includes("BEHAVIOR")) return "amber" as const;
  if (normalized.includes("MED")) return "sky" as const;
  return "green" as const;
}

export default function StaffingReportsPage() {
  const [houses, setHouses] = useState<HouseItem[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState("");
  const [staffingData, setStaffingData] = useState<StaffingResponse | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);

  const [housesLoading, setHousesLoading] = useState(false);
  const [staffingLoading, setStaffingLoading] = useState(false);
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

  async function loadStaffing(houseId: string) {
    try {
      setStaffingLoading(true);
      setError("");

      const data = await fetchJson<StaffingResponse>(
        `${API_BASE}/house-management/staffing/${houseId}`
      );

      setStaffingData(data);
    } catch (err) {
      setStaffingData(null);
      setError(err instanceof Error ? err.message : "Failed to load staffing report.");
    } finally {
      setStaffingLoading(false);
    }
  }

  async function loadDashboard(houseId: string) {
    try {
      setDashboardLoading(true);

      const data = await fetchJson<DashboardResponse>(
        `${API_BASE}/house-management/dashboard/${houseId}`
      );

      setDashboardData(data);
    } catch {
      setDashboardData(null);
    } finally {
      setDashboardLoading(false);
    }
  }

  useEffect(() => {
    void loadHouses();
  }, []);

  useEffect(() => {
    if (!selectedHouseId) {
      setStaffingData(null);
      setDashboardData(null);
      return;
    }

    void Promise.all([
      loadStaffing(selectedHouseId),
      loadDashboard(selectedHouseId),
    ]);
  }, [selectedHouseId]);

  const selectedHouse = useMemo(() => {
    return houses.find((h) => h.id === selectedHouseId) || null;
  }, [houses, selectedHouseId]);

  const staffingAlerts = useMemo(() => {
    const alerts = dashboardData?.alerts || [];
    return alerts.filter(
      (alert) =>
        alert.action === "VIEW_STAFFING" ||
        alert.action === "VIEW_COVERAGE" ||
        alert.title.toLowerCase().includes("staff") ||
        alert.title.toLowerCase().includes("awake")
    );
  }, [dashboardData?.alerts]);

  const primaryStaffCount = useMemo(() => {
    return (staffingData?.items || []).filter((item) => item.isPrimaryStaff).length;
  }, [staffingData?.items]);

  return (
    <div className="min-h-[calc(100vh-60px)] bg-bac-bg p-6">
      <div className="mb-6 rounded-3xl border border-sky-500/20 bg-gradient-to-r from-sky-950/40 via-bac-panel to-violet-950/20 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-bac-text">
              Staffing Reports
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-bac-muted">
              Live staffing report view for assigned staff, on-duty coverage, 2+ DSP shifts,
              certification readiness, and staffing-related house alerts.
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
              {staffingData?.houseName || dashboardData?.house?.name || selectedHouse?.name || "—"}
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
          label="Assigned Staff"
          value={staffingData?.summary?.assignedStaff ?? 0}
          tone="violet"
        />
        <MetricCard
          label="On Duty Right Now"
          value={staffingData?.summary?.onDutyNow ?? 0}
          tone="green"
        />
        <MetricCard
          label="2+ DSP Shifts"
          value={staffingData?.summary?.multiDspShifts ?? 0}
          tone="amber"
        />
        <MetricCard
          label="Behavior Specialists"
          value={staffingData?.summary?.behaviorSpecialistVisits ?? 0}
          tone="sky"
        />
        <MetricCard
          label="Med-Cert Staff"
          value={staffingData?.summary?.medCertStaff ?? 0}
          tone="sky"
        />
        <MetricCard
          label="Training Overdue"
          value={staffingData?.summary?.trainingOverdue ?? 0}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <h2 className="text-xl font-semibold text-bac-text">Staff Roster</h2>
            <p className="mt-1 text-sm text-bac-muted">
              Live assigned staffing view for the selected house.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[1120px] w-full text-left text-sm">
                <thead className="border-b border-bac-border text-bac-muted">
                  <tr>
                    <th className="px-3 py-3">Employee</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Primary</th>
                    <th className="px-3 py-3">Shift Today</th>
                    <th className="px-3 py-3">Training</th>
                    <th className="px-3 py-3">Med Cert</th>
                    <th className="px-3 py-3">CPR</th>
                    <th className="px-3 py-3">Driver</th>
                    <th className="px-3 py-3">Clearance</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bac-border text-bac-text">
                  {staffingData?.items?.length ? (
                    staffingData.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-3">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-bac-muted">{item.id}</div>
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill tone="info">{item.role || "DSP"}</StatusPill>
                        </td>
                        <td className="px-3 py-3">
                          {item.isPrimaryStaff ? (
                            <StatusPill tone="info">Primary</StatusPill>
                          ) : (
                            <StatusPill tone="muted">No</StatusPill>
                          )}
                        </td>
                        <td className="px-3 py-3">{item.shiftToday || "—"}</td>
                        <td className="px-3 py-3">
                          <StatusPill tone={mapTrainingTone(item.trainingStatus)}>
                            {item.trainingStatus === "CURRENT"
                              ? "Current"
                              : item.trainingStatus === "DUE_SOON"
                                ? "Due Soon"
                                : "Overdue"}
                          </StatusPill>
                        </td>
                        <td className="px-3 py-3">
                          {item.medCertified ? (
                            <StatusPill tone="good">Yes</StatusPill>
                          ) : (
                            <StatusPill tone="critical">No</StatusPill>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill tone={item.cpr === "CURRENT" ? "good" : "critical"}>
                            {item.cpr === "CURRENT" ? "Current" : "Expired"}
                          </StatusPill>
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill tone={item.driver === "ACTIVE" ? "good" : "muted"}>
                            {item.driver === "ACTIVE" ? "Active" : "Inactive"}
                          </StatusPill>
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill
                            tone={item.clearance === "CURRENT" ? "good" : "critical"}
                          >
                            {item.clearance === "CURRENT" ? "Current" : "Expired"}
                          </StatusPill>
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill
                            tone={item.status === "ON_DUTY" ? "info" : "muted"}
                          >
                            {item.status === "ON_DUTY" ? "On Duty" : "Off Duty"}
                          </StatusPill>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-bac-muted">
                        {staffingLoading ? "Loading staffing roster..." : "No staffing data."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <h2 className="text-xl font-semibold text-bac-text">Staffing Alerts</h2>
            <p className="mt-1 text-sm text-bac-muted">
              Staffing-related alerts pulled from house dashboard.
            </p>

            <div className="mt-4 space-y-3">
              {staffingAlerts.length ? (
                staffingAlerts.map((alert) => (
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
                  {dashboardLoading ? "Loading alerts..." : "No staffing-specific alerts."}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <h2 className="text-xl font-semibold text-bac-text">Coverage Snapshot</h2>
            <p className="mt-1 text-sm text-bac-muted">
              Quick staffing health indicators for the selected house.
            </p>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-bac-text">Primary Staff Assigned</div>
                  <StatusPill tone={primaryStaffCount > 0 ? "good" : "warning"}>
                    {primaryStaffCount}
                  </StatusPill>
                </div>
                <div className="mt-2 text-sm text-bac-muted">
                  Number of currently assigned primary staff records.
                </div>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-bac-text">Staff with Shift Today</div>
                  <StatusPill
                    tone={
                      (staffingData?.items || []).filter((item) => item.shiftToday).length > 0
                        ? "good"
                        : "muted"
                    }
                  >
                    {(staffingData?.items || []).filter((item) => item.shiftToday).length}
                  </StatusPill>
                </div>
                <div className="mt-2 text-sm text-bac-muted">
                  Assigned staff who currently have a shift scheduled today.
                </div>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-bac-text">House Supervisor</div>
                  <StatusPill
                    tone={dashboardData?.house?.supervisor ? "good" : "muted"}
                  >
                    {dashboardData?.house?.supervisor ? "Set" : "Not Set"}
                  </StatusPill>
                </div>
                <div className="mt-2 text-sm text-bac-muted">
                  {dashboardData?.house?.supervisor || "No supervisor found in house dashboard."}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <h2 className="text-xl font-semibold text-bac-text">Role Mix</h2>
            <p className="mt-1 text-sm text-bac-muted">
              Assigned house-role breakdown from active roster.
            </p>

            <div className="mt-4 space-y-3">
              {Array.from(
                (staffingData?.items || []).reduce((map, item) => {
                  const key = item.role || "DSP";
                  map.set(key, (map.get(key) || 0) + 1);
                  return map;
                }, new Map<string, number>())
              ).length ? (
                Array.from(
                  (staffingData?.items || []).reduce((map, item) => {
                    const key = item.role || "DSP";
                    map.set(key, (map.get(key) || 0) + 1);
                    return map;
                  }, new Map<string, number>())
                ).map(([role, count]) => (
                  <div
                    key={role}
                    className="flex items-center justify-between rounded-2xl border border-bac-border bg-bac-bg px-4 py-3"
                  >
                    <StatusPill tone="info">{role}</StatusPill>
                    <div className="text-sm font-semibold text-bac-text">{count}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-bac-border bg-bac-bg p-4 text-sm text-bac-muted">
                  No role mix data.
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
                Open Staffing Tab
              </Link>
              <Link
                href="/reports/house"
                className="rounded-xl border border-bac-border bg-bac-bg px-4 py-3 text-sm font-medium text-bac-text hover:bg-white/5"
              >
                Go to House Reports
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
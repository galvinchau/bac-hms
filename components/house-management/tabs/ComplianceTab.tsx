// bac-hms/web/components/house-management/tabs/ComplianceTab.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  SectionCard,
  StatCard,
  Badge,
  Modal,
  FormField,
  Select,
} from "../shared";

type ComplianceStatus = "GOOD" | "WARNING" | "CRITICAL";

type FireDrillSummary = {
  monthlyCompliant: boolean;
  sleepingDrillOverdue: boolean;
  lastDrillDate: string;
  lastSleepingDrillDate: string;
};

type MonthlyDrillMatrixRow = {
  year: number;
  month: number;
  label: string;
  hasDrill: boolean;
  hasSleepingDrill: boolean;
  status: "OK" | "MISSING" | "SLEEPING_DONE";
};

type FireDrillRow = {
  id: string;
  date: string;
  drillTimeLabel: string;
  isSleepingDrill: boolean;
  isUnannounced: boolean;
  isUnderNormalStaffing: boolean;
  evacuationTimeMinutes: number | null;
  allIndividualsEvacuated: boolean;
  alarmType: string;
  alarmOperative: boolean | null;
  exitRouteUsed: string;
  alternateExitUsed: boolean;
  meetingPlace: string;
  problemsEncountered: string;
  correctiveAction: string;
  conductedBy: string;
  staffPresent: string;
  notes: string;
};

type ComplianceResponse = {
  houseId: string;
  houseName: string;
  house?: {
    id: string;
    code: string;
    name: string;
    address: string;
    county: string;
    phone: string;
    programType: string;
  };
  summary: {
    overallComplianceScore: number;
    warningItems: number;
    criticalItems: number;
    lastReviewDate: string;
  };
  fireDrillSummary?: FireDrillSummary;
  availableAuditYears?: number[];
  monthlyDrillMatrix?: MonthlyDrillMatrixRow[];
  items: Array<{
    key: string;
    label: string;
    score: number;
    status: ComplianceStatus;
    lastReviewed: string;
  }>;
  drills: FireDrillRow[];
  incidents: Array<{
    id: string;
    title: string;
    detail: string;
    status: ComplianceStatus;
    actionLabel?: string;
    action?: string;
  }>;
};

type FireDrillFormState = {
  id?: string;
  date: string;
  drillTimeLabel: string;
  isSleepingDrill: boolean;
  isUnannounced: boolean;
  isUnderNormalStaffing: boolean;
  evacuationTimeMinutes: string;
  allIndividualsEvacuated: boolean;
  alarmType: string;
  alarmOperative: string;
  exitRouteUsed: string;
  alternateExitUsed: boolean;
  meetingPlace: string;
  problemsEncountered: string;
  correctiveAction: string;
  conductedBy: string;
  staffPresent: string;
  notes: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3333";

function toneFromStatus(status: ComplianceStatus) {
  if (status === "GOOD") return "success" as const;
  if (status === "WARNING") return "warning" as const;
  return "danger" as const;
}

function toneFromBoolean(ok: boolean) {
  return ok ? ("success" as const) : ("danger" as const);
}

function toneFromMatrixStatus(status: MonthlyDrillMatrixRow["status"]) {
  if (status === "SLEEPING_DONE") return "amber" as const;
  if (status === "OK") return "success" as const;
  return "danger" as const;
}

function matrixLabel(status: MonthlyDrillMatrixRow["status"]) {
  if (status === "SLEEPING_DONE") return "Sleeping Done";
  if (status === "OK") return "OK";
  return "Missing";
}

function alarmBadgeValue(value: boolean | null) {
  if (value === true) return { text: "Operative", variant: "success" as const };
  if (value === false) return { text: "Not Working", variant: "danger" as const };
  return { text: "N/A", variant: "muted" as const };
}

function emptyFireDrillForm(): FireDrillFormState {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  return {
    date: `${y}-${m}-${d}`,
    drillTimeLabel: "",
    isSleepingDrill: false,
    isUnannounced: true,
    isUnderNormalStaffing: true,
    evacuationTimeMinutes: "",
    allIndividualsEvacuated: true,
    alarmType: "Smoke Detector",
    alarmOperative: "true",
    exitRouteUsed: "",
    alternateExitUsed: false,
    meetingPlace: "",
    problemsEncountered: "",
    correctiveAction: "",
    conductedBy: "",
    staffPresent: "",
    notes: "",
  };
}

function parseYmd(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function buildMatrixForYear(
  drills: FireDrillRow[],
  targetYear: number
): MonthlyDrillMatrixRow[] {
  const rows: MonthlyDrillMatrixRow[] = [];

  for (let month = 0; month < 12; month += 1) {
    const monthlyRows = drills.filter((row) => {
      const date = parseYmd(row.date);
      if (!date) return false;
      return date.getFullYear() === targetYear && date.getMonth() === month;
    });

    const hasDrill = monthlyRows.length > 0;
    const hasSleepingDrill = monthlyRows.some((row) => row.isSleepingDrill);
    const d = new Date(targetYear, month, 1);

    rows.push({
      year: targetYear,
      month: month + 1,
      label: d.toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      }),
      hasDrill,
      hasSleepingDrill,
      status: hasSleepingDrill
        ? "SLEEPING_DONE"
        : hasDrill
          ? "OK"
          : "MISSING",
    });
  }

  return rows;
}

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

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const data = await response.json();
      message =
        data?.message && Array.isArray(data.message)
          ? data.message.join(" | ")
          : data?.message || message;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
  }

  return response.json();
}

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const data = await response.json();
      message =
        data?.message && Array.isArray(data.message)
          ? data.message.join(" | ")
          : data?.message || message;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
  }

  return response.json();
}

export default function ComplianceTab({
  selectedHouseName,
  complianceData,
}: {
  selectedHouseName: string;
  complianceData: ComplianceResponse;
}) {
  const [localData, setLocalData] = useState<ComplianceResponse>(complianceData);
  const [openFireDrillModal, setOpenFireDrillModal] = useState(false);
  const [fireDrillForm, setFireDrillForm] = useState<FireDrillFormState>(
    emptyFireDrillForm()
  );
  const [fireDrillSaving, setFireDrillSaving] = useState(false);
  const [fireDrillError, setFireDrillError] = useState("");
  const [selectedAuditYear, setSelectedAuditYear] = useState<string>("2026");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    setLocalData(complianceData);
    const years =
      complianceData.availableAuditYears && complianceData.availableAuditYears.length > 0
        ? complianceData.availableAuditYears
        : [2026];
    setSelectedAuditYear(String(years[0]));
    setFromDate("");
    setToDate("");
  }, [complianceData]);

  const items = localData?.items || [];
  const incidents = localData?.incidents || [];
  const drills = localData?.drills || [];
  const fireDrillSummary = localData?.fireDrillSummary;

  const isEditMode = Boolean(fireDrillForm.id);

  const availableAuditYears = useMemo(() => {
    if (localData?.availableAuditYears && localData.availableAuditYears.length > 0) {
      return localData.availableAuditYears.filter((year) => year >= 2026);
    }

    const years = Array.from(
      new Set(
        drills
          .map((drill) => parseYmd(drill.date)?.getFullYear())
          .filter((year): year is number => typeof year === "number" && year >= 2026)
      )
    ).sort((a, b) => b - a);

    return years.length > 0 ? years : [2026];
  }, [localData?.availableAuditYears, drills]);

  const resolvedAuditYear = useMemo(() => {
    const parsed = Number(selectedAuditYear);
    if (Number.isFinite(parsed) && parsed >= 2026) return parsed;
    return availableAuditYears[0] || 2026;
  }, [selectedAuditYear, availableAuditYears]);

  const monthlyDrillMatrix = useMemo(() => {
    return buildMatrixForYear(drills, resolvedAuditYear);
  }, [drills, resolvedAuditYear]);

  const filteredDrills = useMemo(() => {
    const from = parseYmd(fromDate);
    const to = parseYmd(toDate);

    return [...drills]
      .filter((drill) => {
        const date = parseYmd(drill.date);
        if (!date) return false;

        if (from && date < from) return false;
        if (to && date > to) return false;

        return true;
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [drills, fromDate, toDate]);

  async function reloadCompliance() {
    const data = await fetchJson<ComplianceResponse>(
      `${API_BASE}/house-management/compliance/${localData.houseId}`
    );
    setLocalData(data);

    const years =
      data.availableAuditYears && data.availableAuditYears.length > 0
        ? data.availableAuditYears
        : [2026];

    setSelectedAuditYear((prev) => {
      const prevNum = Number(prev);
      return years.includes(prevNum) ? prev : String(years[0]);
    });
  }

  function openAddFireDrillModal() {
    setFireDrillError("");
    setFireDrillForm(emptyFireDrillForm());
    setOpenFireDrillModal(true);
  }

  function openEditFireDrillModal(drill: FireDrillRow) {
    setFireDrillError("");
    setFireDrillForm({
      id: drill.id,
      date: drill.date || "",
      drillTimeLabel: drill.drillTimeLabel || "",
      isSleepingDrill: Boolean(drill.isSleepingDrill),
      isUnannounced: Boolean(drill.isUnannounced),
      isUnderNormalStaffing: Boolean(drill.isUnderNormalStaffing),
      evacuationTimeMinutes:
        typeof drill.evacuationTimeMinutes === "number"
          ? String(drill.evacuationTimeMinutes)
          : "",
      allIndividualsEvacuated: Boolean(drill.allIndividualsEvacuated),
      alarmType: drill.alarmType || "",
      alarmOperative:
        drill.alarmOperative === true
          ? "true"
          : drill.alarmOperative === false
            ? "false"
            : "",
      exitRouteUsed: drill.exitRouteUsed || "",
      alternateExitUsed: Boolean(drill.alternateExitUsed),
      meetingPlace: drill.meetingPlace || "",
      problemsEncountered: drill.problemsEncountered || "",
      correctiveAction: drill.correctiveAction || "",
      conductedBy: drill.conductedBy || "",
      staffPresent: drill.staffPresent || "",
      notes: drill.notes || "",
    });
    setOpenFireDrillModal(true);
  }

  function handleResetFilters() {
    setSelectedAuditYear(String(availableAuditYears[0] || 2026));
    setFromDate("");
    setToDate("");
  }

  async function handleSaveFireDrill() {
    try {
      setFireDrillError("");

      if (!fireDrillForm.date) {
        setFireDrillError("Drill Date is required.");
        return;
      }

      if (!fireDrillForm.drillTimeLabel.trim()) {
        setFireDrillError("Drill Time is required.");
        return;
      }

      if (!fireDrillForm.conductedBy.trim()) {
        setFireDrillError("Conducted By is required.");
        return;
      }

      const payload = {
        houseId: localData.houseId,
        drillDate: fireDrillForm.date,
        drillTimeLabel: fireDrillForm.drillTimeLabel,
        isSleepingDrill: fireDrillForm.isSleepingDrill,
        isUnannounced: fireDrillForm.isUnannounced,
        isUnderNormalStaffing: fireDrillForm.isUnderNormalStaffing,
        evacuationTimeMinutes: fireDrillForm.evacuationTimeMinutes
          ? Number(fireDrillForm.evacuationTimeMinutes)
          : undefined,
        allIndividualsEvacuated: fireDrillForm.allIndividualsEvacuated,
        alarmType: fireDrillForm.alarmType,
        alarmOperative:
          fireDrillForm.alarmOperative === ""
            ? undefined
            : fireDrillForm.alarmOperative === "true",
        exitRouteUsed: fireDrillForm.exitRouteUsed,
        alternateExitUsed: fireDrillForm.alternateExitUsed,
        meetingPlace: fireDrillForm.meetingPlace,
        problemsEncountered: fireDrillForm.problemsEncountered,
        correctiveAction: fireDrillForm.correctiveAction,
        conductedBy: fireDrillForm.conductedBy,
        staffPresent: fireDrillForm.staffPresent,
        notes: fireDrillForm.notes,
      };

      setFireDrillSaving(true);

      if (isEditMode && fireDrillForm.id) {
        await patchJson(
          `${API_BASE}/house-management/fire-drills/${fireDrillForm.id}`,
          payload
        );
      } else {
        await postJson(`${API_BASE}/house-management/fire-drills`, payload);
      }

      await reloadCompliance();
      setOpenFireDrillModal(false);
      setFireDrillForm(emptyFireDrillForm());
    } catch (error) {
      setFireDrillError(
        error instanceof Error ? error.message : "Failed to save fire drill."
      );
    } finally {
      setFireDrillSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title={`Compliance — ${selectedHouseName}`}
        subtitle="Live 6400-focused dashboard for house compliance, fire drill audit tracking, and corrective-action follow-up."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Overall Score"
            value={`${localData.summary.overallComplianceScore}%`}
            tone={
              localData.summary.overallComplianceScore >= 90
                ? "success"
                : localData.summary.overallComplianceScore >= 80
                  ? "warning"
                  : "danger"
            }
          />
          <StatCard
            label="Warning Items"
            value={localData.summary.warningItems}
            tone="warning"
          />
          <StatCard
            label="Critical Items"
            value={localData.summary.criticalItems}
            tone="danger"
          />
          <StatCard
            label="Last Review"
            value={localData.summary.lastReviewDate || "—"}
            tone="sky"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Fire Drill Audit Summary"
        subtitle="Monthly 6400 compliance snapshot for this house."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Monthly Compliance"
            value={fireDrillSummary?.monthlyCompliant ? "OK" : "Missing"}
            tone={fireDrillSummary?.monthlyCompliant ? "success" : "danger"}
          />
          <StatCard
            label="Sleeping Drill (6 Months)"
            value={fireDrillSummary?.sleepingDrillOverdue ? "Overdue" : "OK"}
            tone={fireDrillSummary?.sleepingDrillOverdue ? "danger" : "success"}
          />
          <StatCard
            label="Last Drill"
            value={fireDrillSummary?.lastDrillDate || "—"}
            tone="violet"
          />
          <StatCard
            label="Last Sleeping Drill"
            value={fireDrillSummary?.lastSleepingDrillDate || "—"}
            tone="amber"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Fire Drill Filters"
        subtitle="Use Audit Year for the matrix and From/To for detailed record lookup."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <FormField label="Audit Year">
            <Select
              value={String(resolvedAuditYear)}
              onChange={(v) => setSelectedAuditYear(v)}
              options={availableAuditYears.map((year) => ({
                value: String(year),
                label: String(year),
              }))}
            />
          </FormField>

          <FormField label="From Date">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
            />
          </FormField>

          <FormField label="To Date">
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
            />
          </FormField>

          <div className="flex items-end gap-2">
            <button
              onClick={handleResetFilters}
              className="h-10 rounded-xl border border-bac-border bg-bac-panel px-4 text-sm text-bac-text hover:bg-white/5"
            >
              Reset
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={`12-Month Fire Drill Matrix — ${resolvedAuditYear}`}
        subtitle="Quick audit view to spot missing months and sleeping drills."
      >
        {monthlyDrillMatrix.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="border-b border-bac-border text-bac-muted">
                <tr>
                  <th className="px-3 py-3">Month</th>
                  <th className="px-3 py-3">Drill</th>
                  <th className="px-3 py-3">Sleeping Drill</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bac-border">
                {monthlyDrillMatrix.map((row) => (
                  <tr key={`${row.year}-${row.month}`} className="text-bac-text">
                    <td className="px-3 py-3 font-medium">{row.label}</td>
                    <td className="px-3 py-3">
                      <Badge variant={toneFromBoolean(row.hasDrill)}>
                        {row.hasDrill ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={row.hasSleepingDrill ? "amber" : "muted"}>
                        {row.hasSleepingDrill ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={toneFromMatrixStatus(row.status)}>
                        {matrixLabel(row.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-bac-border bg-bac-bg px-4 py-6 text-sm text-bac-muted">
            No fire drill history available yet.
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <SectionCard
          title="Compliance Breakdown"
          subtitle="Real compliance rows from House Compliance items."
          className="xl:col-span-7"
        >
          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="border-b border-bac-border text-bac-muted">
                  <tr>
                    <th className="px-3 py-3">Area</th>
                    <th className="px-3 py-3">Score</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Last Reviewed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bac-border">
                  {items.map((item) => (
                    <tr key={item.key} className="text-bac-text">
                      <td className="px-3 py-3">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-bac-muted">{item.key}</div>
                      </td>
                      <td className="px-3 py-3">{item.score}%</td>
                      <td className="px-3 py-3">
                        <Badge variant={toneFromStatus(item.status)}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">{item.lastReviewed || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-bac-border bg-bac-bg px-4 py-6 text-sm text-bac-muted">
              No compliance items found for this house yet.
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="House Summary"
          subtitle="Live house context used by compliance review."
          className="xl:col-span-5"
        >
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-bac-border bg-bac-bg px-4 py-3">
              <div className="text-bac-muted">House</div>
              <div className="mt-1 font-medium text-bac-text">
                {localData.house?.name || selectedHouseName}
              </div>
            </div>
            <div className="rounded-xl border border-bac-border bg-bac-bg px-4 py-3">
              <div className="text-bac-muted">Program Type</div>
              <div className="mt-1 font-medium text-bac-text">
                {localData.house?.programType || "Residential 6400"}
              </div>
            </div>
            <div className="rounded-xl border border-bac-border bg-bac-bg px-4 py-3">
              <div className="text-bac-muted">Address</div>
              <div className="mt-1 font-medium text-bac-text">
                {localData.house?.address || "—"}
              </div>
            </div>
            <div className="rounded-xl border border-bac-border bg-bac-bg px-4 py-3">
              <div className="text-bac-muted">County</div>
              <div className="mt-1 font-medium text-bac-text">
                {localData.house?.county || "—"}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <SectionCard
          title="Fire Drill Records"
          subtitle="Use From/To above to review prior audit periods in detail."
          className="xl:col-span-8"
          right={
            <button
              onClick={openAddFireDrillModal}
              className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95"
            >
              + Add Fire Drill
            </button>
          }
        >
          {filteredDrills.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full text-left text-sm">
                <thead className="border-b border-bac-border text-bac-muted">
                  <tr>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Time</th>
                    <th className="px-3 py-3">Sleeping</th>
                    <th className="px-3 py-3">Unannounced</th>
                    <th className="px-3 py-3">Normal Staffing</th>
                    <th className="px-3 py-3">Evac Time</th>
                    <th className="px-3 py-3">Alarm</th>
                    <th className="px-3 py-3">Route</th>
                    <th className="px-3 py-3">Meeting Place</th>
                    <th className="px-3 py-3">Conducted By</th>
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bac-border">
                  {filteredDrills.map((drill) => {
                    const alarmInfo = alarmBadgeValue(drill.alarmOperative);
                    return (
                      <tr key={drill.id} className="text-bac-text align-top">
                        <td className="px-3 py-3">{drill.date}</td>
                        <td className="px-3 py-3">{drill.drillTimeLabel || "—"}</td>
                        <td className="px-3 py-3">
                          <Badge variant={drill.isSleepingDrill ? "amber" : "muted"}>
                            {drill.isSleepingDrill ? "Yes" : "No"}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={drill.isUnannounced ? "success" : "warning"}>
                            {drill.isUnannounced ? "Yes" : "No"}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <Badge
                            variant={
                              drill.isUnderNormalStaffing ? "success" : "warning"
                            }
                          >
                            {drill.isUnderNormalStaffing ? "Yes" : "No"}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          {typeof drill.evacuationTimeMinutes === "number"
                            ? `${drill.evacuationTimeMinutes} min`
                            : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1">
                            <div>{drill.alarmType || "—"}</div>
                            <Badge variant={alarmInfo.variant}>{alarmInfo.text}</Badge>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div>{drill.exitRouteUsed || "—"}</div>
                          {drill.alternateExitUsed ? (
                            <div className="mt-1">
                              <Badge variant="amber">Alternate</Badge>
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">{drill.meetingPlace || "—"}</td>
                        <td className="px-3 py-3">{drill.conductedBy || "—"}</td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => openEditFireDrillModal(drill)}
                            className="rounded-lg border border-bac-border bg-bac-bg px-3 py-1.5 text-xs text-bac-text hover:bg-white/5"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-bac-border bg-bac-bg px-4 py-6 text-sm text-bac-muted">
                No fire drill records found for the selected date range.
              </div>
              <div>
                <button
                  onClick={openAddFireDrillModal}
                  className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
                >
                  Add Fire Drill
                </button>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Corrective Action / Watchlist"
          subtitle="Open compliance incidents or current operational watchlist items."
          className="xl:col-span-4"
        >
          <div className="space-y-3">
            {incidents.length > 0 ? (
              incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="rounded-xl border border-bac-border bg-bac-bg px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-bac-text">{incident.title}</div>
                    <Badge variant={toneFromStatus(incident.status)}>
                      {incident.status}
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm text-bac-muted">{incident.detail}</div>
                  {incident.actionLabel ? (
                    <div className="mt-2 text-xs text-bac-muted">
                      Action: {incident.actionLabel}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-bac-border bg-bac-bg px-4 py-6 text-sm text-bac-muted">
                No current corrective action items for this house.
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <Modal
        open={openFireDrillModal}
        title={isEditMode ? "Edit Fire Drill" : "Add Fire Drill"}
        onClose={() => setOpenFireDrillModal(false)}
      >
        {fireDrillError && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {fireDrillError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Drill Date">
            <input
              type="date"
              value={fireDrillForm.date}
              onChange={(e) =>
                setFireDrillForm((prev) => ({ ...prev, date: e.target.value }))
              }
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
            />
          </FormField>

          <FormField label="Drill Time">
            <input
              value={fireDrillForm.drillTimeLabel}
              onChange={(e) =>
                setFireDrillForm((prev) => ({
                  ...prev,
                  drillTimeLabel: e.target.value,
                }))
              }
              placeholder="10:00 AM"
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
            />
          </FormField>

          <FormField label="Alarm Type">
            <input
              value={fireDrillForm.alarmType}
              onChange={(e) =>
                setFireDrillForm((prev) => ({
                  ...prev,
                  alarmType: e.target.value,
                }))
              }
              placeholder="Smoke Detector / Fire Alarm Panel"
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
            />
          </FormField>

          <FormField label="Alarm Operative">
            <Select
              value={fireDrillForm.alarmOperative}
              onChange={(v) =>
                setFireDrillForm((prev) => ({
                  ...prev,
                  alarmOperative: v,
                }))
              }
              options={[
                { value: "", label: "Select" },
                { value: "true", label: "Yes" },
                { value: "false", label: "No" },
              ]}
            />
          </FormField>

          <FormField label="Evacuation Time (minutes)">
            <input
              type="number"
              min="0"
              value={fireDrillForm.evacuationTimeMinutes}
              onChange={(e) =>
                setFireDrillForm((prev) => ({
                  ...prev,
                  evacuationTimeMinutes: e.target.value,
                }))
              }
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
            />
          </FormField>

          <FormField label="Conducted By">
            <input
              value={fireDrillForm.conductedBy}
              onChange={(e) =>
                setFireDrillForm((prev) => ({
                  ...prev,
                  conductedBy: e.target.value,
                }))
              }
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
            />
          </FormField>

          <FormField label="Exit Route Used">
            <input
              value={fireDrillForm.exitRouteUsed}
              onChange={(e) =>
                setFireDrillForm((prev) => ({
                  ...prev,
                  exitRouteUsed: e.target.value,
                }))
              }
              placeholder="Front Exit / Rear Exit"
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
            />
          </FormField>

          <FormField label="Meeting Place">
            <input
              value={fireDrillForm.meetingPlace}
              onChange={(e) =>
                setFireDrillForm((prev) => ({
                  ...prev,
                  meetingPlace: e.target.value,
                }))
              }
              placeholder="Front Parking Area"
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
            />
          </FormField>

          <FormField label="Staff Present">
            <input
              value={fireDrillForm.staffPresent}
              onChange={(e) =>
                setFireDrillForm((prev) => ({
                  ...prev,
                  staffPresent: e.target.value,
                }))
              }
              placeholder="John, Mary"
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3 md:col-span-2">
            <label className="flex items-center gap-2 rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text">
              <input
                type="checkbox"
                checked={fireDrillForm.isSleepingDrill}
                onChange={(e) =>
                  setFireDrillForm((prev) => ({
                    ...prev,
                    isSleepingDrill: e.target.checked,
                  }))
                }
              />
              Sleeping Drill
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text">
              <input
                type="checkbox"
                checked={fireDrillForm.isUnannounced}
                onChange={(e) =>
                  setFireDrillForm((prev) => ({
                    ...prev,
                    isUnannounced: e.target.checked,
                  }))
                }
              />
              Unannounced
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text">
              <input
                type="checkbox"
                checked={fireDrillForm.isUnderNormalStaffing}
                onChange={(e) =>
                  setFireDrillForm((prev) => ({
                    ...prev,
                    isUnderNormalStaffing: e.target.checked,
                  }))
                }
              />
              Under Normal Staffing
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text">
              <input
                type="checkbox"
                checked={fireDrillForm.allIndividualsEvacuated}
                onChange={(e) =>
                  setFireDrillForm((prev) => ({
                    ...prev,
                    allIndividualsEvacuated: e.target.checked,
                  }))
                }
              />
              All Individuals Evacuated
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text md:col-span-2">
              <input
                type="checkbox"
                checked={fireDrillForm.alternateExitUsed}
                onChange={(e) =>
                  setFireDrillForm((prev) => ({
                    ...prev,
                    alternateExitUsed: e.target.checked,
                  }))
                }
              />
              Alternate Exit Used
            </label>
          </div>

          <FormField label="Problems Encountered" className="md:col-span-2">
            <textarea
              value={fireDrillForm.problemsEncountered}
              onChange={(e) =>
                setFireDrillForm((prev) => ({
                  ...prev,
                  problemsEncountered: e.target.value,
                }))
              }
              className="min-h-[90px] w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text outline-none"
            />
          </FormField>

          <FormField label="Corrective Action" className="md:col-span-2">
            <textarea
              value={fireDrillForm.correctiveAction}
              onChange={(e) =>
                setFireDrillForm((prev) => ({
                  ...prev,
                  correctiveAction: e.target.value,
                }))
              }
              className="min-h-[90px] w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text outline-none"
            />
          </FormField>

          <FormField label="Notes" className="md:col-span-2">
            <textarea
              value={fireDrillForm.notes}
              onChange={(e) =>
                setFireDrillForm((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              className="min-h-[110px] w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text outline-none"
            />
          </FormField>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => setOpenFireDrillModal(false)}
            className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveFireDrill}
            disabled={fireDrillSaving}
            className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {fireDrillSaving
              ? isEditMode
                ? "Saving..."
                : "Creating..."
              : isEditMode
                ? "Save Changes"
                : "Create Fire Drill"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
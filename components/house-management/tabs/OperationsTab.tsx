// bac-hms/web/components/house-management/tabs/OperationsTab.tsx

"use client";

import React from "react";
import {
  Badge,
  IncidentBox,
  NoteBox,
  SectionCard,
  StatCard,
} from "../shared";

type OperationsResponse = {
  houseId: string;
  houseName: string;
  summary: {
    todayShifts: number;
    awakeShifts: number;
    onDutyStaff: number;
    intensiveResidents: number;
    openIncidents: number;
    unstaffedShifts: number;
  };
  coverage: Array<{
    id: string;
    time: string;
    service: string;
    resident: string;
    staff: string[];
    status: string;
    awake: boolean;
    note?: string | null;
  }>;
  awakeMonitoring: Array<{
    id: string;
    resident: string;
    time: string;
    staff: string[];
    note?: string | null;
  }>;
  notes: Array<{
    id: string;
    time: string;
    title: string;
    detail: string;
    level: "INFO" | "WARNING";
  }>;
  incidents: Array<{
    id: string;
    title: string;
    detail: string;
    status: "GOOD" | "WARNING" | "CRITICAL";
  }>;
  phase2: Array<{
    key: string;
    label: string;
    description: string;
  }>;
};

function renderShiftStatus(status: string) {
  const normalized = String(status || "").trim().toUpperCase();

  if (normalized === "IN_PROGRESS") {
    return <Badge variant="success">In Progress</Badge>;
  }

  if (normalized === "COMPLETED") {
    return <Badge variant="muted">Completed</Badge>;
  }

  if (normalized === "NOT_STARTED" || normalized === "UPCOMING") {
    return <Badge variant="default">Not Started</Badge>;
  }

  if (normalized === "NOT_COMPLETED") {
    return <Badge variant="warning">Not Completed</Badge>;
  }

  if (normalized === "CANCELLED") {
    return <Badge variant="danger">Cancelled</Badge>;
  }

  if (normalized === "BACKUP_PLAN") {
    return <Badge variant="amber">Backup Plan</Badge>;
  }

  return <Badge variant="muted">{status || "Unknown"}</Badge>;
}

function WatchItem({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string | number;
  tone: "success" | "warning" | "danger" | "muted" | "violet" | "sky";
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-bac-text">{label}</div>
          {hint ? <div className="mt-1 text-xs text-bac-muted">{hint}</div> : null}
        </div>
        <Badge variant={tone}>{value}</Badge>
      </div>
    </div>
  );
}

export default function OperationsTab({
  data,
  selectedHouseName,
}: {
  data: OperationsResponse;
  selectedHouseName: string;
}) {
  const resolvedHouseName = data?.houseName || selectedHouseName || "House";

  const shiftsMissingNotes = data.coverage.filter(
    (item) => !String(item.note || "").trim()
  ).length;

  const upcomingShifts = data.coverage.filter((item) => {
    const normalized = String(item.status || "").trim().toUpperCase();
    return normalized === "UPCOMING" || normalized === "NOT_STARTED";
  }).length;

  const inProgressShifts = data.coverage.filter(
    (item) => String(item.status || "").trim().toUpperCase() === "IN_PROGRESS"
  ).length;

  const shiftsWithAssignedStaff = data.coverage.filter(
    (item) => item.staff.length > 0
  ).length;

  return (
    <div className="space-y-4">
      <SectionCard
        title={`Daily Operations — ${resolvedHouseName}`}
        subtitle="Real-time residential operations using today’s coverage, awake monitoring, staffing activity, incidents, and shift notes."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <StatCard
            label="Today Shifts"
            value={data.summary.todayShifts}
            tone="violet"
          />
          <StatCard
            label="Awake Shifts"
            value={data.summary.awakeShifts}
            tone="warning"
          />
          <StatCard
            label="On-Duty Staff"
            value={data.summary.onDutyStaff}
            tone="success"
          />
          <StatCard
            label="Intensive Residents"
            value={data.summary.intensiveResidents}
            tone="sky"
          />
          <StatCard
            label="Open Incidents"
            value={data.summary.openIncidents}
            tone={data.summary.openIncidents > 0 ? "danger" : "success"}
          />
          <StatCard
            label="Unstaffed Shifts"
            value={data.summary.unstaffedShifts}
            tone={data.summary.unstaffedShifts > 0 ? "warning" : "success"}
          />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <SectionCard
          title="Today Coverage"
          subtitle="Shift-by-shift view of residential support activity for this house."
          className="xl:col-span-7"
        >
          <div className="space-y-3">
            {data.coverage.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-bac-border bg-bac-bg p-4 text-sm text-bac-muted">
                No shifts found for today.
              </div>
            ) : (
              data.coverage.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-bac-border bg-bac-bg p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-base font-medium text-bac-text">
                        {item.service}
                      </div>
                      <div className="mt-1 text-sm text-bac-muted">
                        {item.time} • Resident: {item.resident}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {renderShiftStatus(item.status)}
                      {item.awake ? (
                        <Badge variant="warning">Awake Required</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-bac-muted">
                    Staff:{" "}
                    {item.staff.length > 0 ? item.staff.join(", ") : "No staff assigned"}
                  </div>

                  {item.note ? (
                    <div className="mt-2 text-sm text-bac-muted">{item.note}</div>
                  ) : (
                    <div className="mt-2 text-sm text-bac-muted italic">
                      No shift note added yet.
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <div className="space-y-4 xl:col-span-5">
          <SectionCard
            title="Awake Monitoring"
            subtitle="Shifts that currently require awake monitoring."
          >
            <div className="space-y-3">
              {data.awakeMonitoring.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-bac-border bg-bac-bg p-4 text-sm text-bac-muted">
                  No awake monitoring shifts found for today.
                </div>
              ) : (
                data.awakeMonitoring.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-bac-border bg-bac-bg p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-bac-text">{item.resident}</div>
                      <Badge variant="warning">Awake</Badge>
                    </div>
                    <div className="mt-2 text-sm text-bac-muted">{item.time}</div>
                    <div className="mt-2 text-sm text-bac-muted">
                      Staff:{" "}
                      {item.staff.length > 0 ? item.staff.join(", ") : "No staff assigned"}
                    </div>
                    {item.note ? (
                      <div className="mt-2 text-sm text-bac-muted">{item.note}</div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Open Incidents"
            subtitle="Unresolved house compliance or operational incidents."
          >
            <div className="space-y-3">
              {data.incidents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-bac-border bg-bac-bg p-4 text-sm text-bac-muted">
                  No open incidents for this house.
                </div>
              ) : (
                data.incidents.map((incident) => (
                  <IncidentBox
                    key={incident.id}
                    title={incident.title}
                    detail={incident.detail}
                    status={incident.status}
                  />
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <SectionCard
          title="Shift Notes / Behavior Support"
          subtitle="Recent shift notes and notable support updates from live operations."
          className="xl:col-span-7"
        >
          <div className="space-y-3">
            {data.notes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-bac-border bg-bac-bg p-4 text-sm text-bac-muted">
                No shift notes available yet.
              </div>
            ) : (
              data.notes.map((note) => (
                <NoteBox
                  key={note.id}
                  title={note.title}
                  meta={`${note.level} • ${note.time}`}
                  body={note.detail}
                />
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Operational Watchlist"
          subtitle="Live risk signals and operational indicators based on current house data."
          className="xl:col-span-5"
        >
          <div className="space-y-3">
            <WatchItem
              label="Shifts missing assigned staff"
              value={data.summary.unstaffedShifts}
              tone={data.summary.unstaffedShifts > 0 ? "warning" : "success"}
              hint="Coverage gaps that may need staffing action."
            />

            <WatchItem
              label="Shifts requiring awake monitoring"
              value={data.summary.awakeShifts}
              tone={data.summary.awakeShifts > 0 ? "warning" : "muted"}
              hint="Residential shifts that require awake status support."
            />

            <WatchItem
              label="Intensive-support residents"
              value={data.summary.intensiveResidents}
              tone={data.summary.intensiveResidents > 0 ? "danger" : "muted"}
              hint="Residents marked with intensive behavior support needs."
            />

            <WatchItem
              label="Upcoming shifts today"
              value={upcomingShifts}
              tone={upcomingShifts > 0 ? "violet" : "muted"}
              hint="Shifts scheduled later today."
            />

            <WatchItem
              label="Shifts currently in progress"
              value={inProgressShifts}
              tone={inProgressShifts > 0 ? "success" : "muted"}
              hint="Active residential operations happening now."
            />

            <WatchItem
              label="Shifts missing notes"
              value={shiftsMissingNotes}
              tone={shiftsMissingNotes > 0 ? "warning" : "success"}
              hint="Shifts without notes or backup notes entered."
            />

            <WatchItem
              label="Shifts with staff assigned"
              value={`${shiftsWithAssignedStaff} / ${data.coverage.length}`}
              tone={
                data.coverage.length > 0 && shiftsWithAssignedStaff === data.coverage.length
                  ? "success"
                  : "sky"
              }
              hint="Assigned coverage compared to total scheduled shifts."
            />

            <WatchItem
              label="Open incidents"
              value={data.summary.openIncidents}
              tone={data.summary.openIncidents > 0 ? "danger" : "success"}
              hint="Unresolved compliance or operational issues."
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
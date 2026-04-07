// bac-hms/web/components/house-management/tabs/DashboardTab.tsx

"use client";

import React from "react";
import {
  AlertItem,
  Badge,
  ComplianceItem,
  CoverageShift,
  HouseSummary,
  InfoItem,
  ProgressBar,
  renderShiftStatusBadge,
  SectionCard,
  StatCard,
  TimelineItem,
} from "../shared";

type OccupancyStatus = "AVAILABLE" | "NEAR_FULL" | "FULL";

type ResidentSnapshotItem = {
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

export default function DashboardTab({
  selectedHouse,
  fullTime247Count,
  homeVisitSplitCount,
  highNeedCount,
  multiDspShiftCount,
  coverage,
  alerts,
  compliance,
  timeline,
  onGoResidents,
  onGoStaffing,

  behaviorIntensiveCount = 0,
  capacityUsed,
  remainingBeds,
  occupancyStatus,
  profileGaps = 0,
  occupancy,
  residentSnapshot = [],
}: {
  selectedHouse: HouseSummary;
  fullTime247Count: number;
  homeVisitSplitCount: number;
  highNeedCount: number;
  multiDspShiftCount: number;
  coverage: CoverageShift[];
  alerts: AlertItem[];
  compliance: ComplianceItem[];
  timeline: TimelineItem[];
  onGoResidents: () => void;
  onGoStaffing: () => void;

  behaviorIntensiveCount?: number;
  capacityUsed?: number;
  remainingBeds?: number;
  occupancyStatus?: OccupancyStatus;
  profileGaps?: number;
  occupancy?: {
    capacity: number;
    currentResidents: number;
    remainingBeds: number;
    occupancyStatus: OccupancyStatus;
  };
  residentSnapshot?: ResidentSnapshotItem[];
}) {
  const resolvedCapacityUsed = capacityUsed ?? selectedHouse.currentResidents ?? 0;
  const resolvedRemainingBeds =
    remainingBeds ??
    Math.max((selectedHouse.capacity || 0) - (selectedHouse.currentResidents || 0), 0);

  const resolvedOccupancyStatus =
    occupancyStatus ??
    occupancy?.occupancyStatus ??
    (selectedHouse.capacity > 0 && selectedHouse.currentResidents >= selectedHouse.capacity
      ? "FULL"
      : selectedHouse.capacity > 0 &&
        selectedHouse.currentResidents >= selectedHouse.capacity - 1
      ? "NEAR_FULL"
      : "AVAILABLE");

  function renderOccupancyBadge(status: OccupancyStatus) {
    if (status === "FULL") return <Badge variant="danger">Full</Badge>;
    if (status === "NEAR_FULL") return <Badge variant="warning">Near Full</Badge>;
    return <Badge variant="success">Available</Badge>;
  }

  function renderBehaviorBadge(value?: string) {
    if (value === "INTENSIVE") return <Badge variant="danger">Intensive</Badge>;
    if (value === "MODERATE") return <Badge variant="warning">Moderate</Badge>;
    return <Badge variant="muted">None</Badge>;
  }

  function renderAppointmentBadge(value?: string) {
    if (value === "HIGH") return <Badge variant="warning">High</Badge>;
    if (value === "MODERATE") return <Badge variant="muted">Moderate</Badge>;
    return <Badge variant="success">Low</Badge>;
  }

  function renderResidentialTypeBadge(value?: string | null) {
    if (value === "HOME_VISIT_SPLIT") return <Badge variant="sky">Home-Visit Split</Badge>;
    if (value === "FULL_TIME_247") return <Badge variant="violet">24/7 Full-Time</Badge>;
    return <Badge variant="muted">—</Badge>;
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title={`${selectedHouse.name} Dashboard`}
        subtitle={`${selectedHouse.programType} • ${selectedHouse.address}`}
        right={
          <>
            <button
              onClick={onGoResidents}
              className="rounded-xl border border-bac-border bg-bac-bg px-4 py-2 text-sm text-bac-text hover:bg-white/5"
            >
              View Residents
            </button>
            <button
              onClick={onGoStaffing}
              className="rounded-xl border border-bac-border bg-bac-bg px-4 py-2 text-sm text-bac-text hover:bg-white/5"
            >
              View Staffing
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-8">
          <StatCard label="Residents" value={selectedHouse.currentResidents} />
          <StatCard label="24/7 Full-Time" value={fullTime247Count} tone="violet" />
          <StatCard label="Home-Visit Split" value={homeVisitSplitCount} tone="sky" />
          <StatCard label="High-Need Residents" value={highNeedCount} tone="danger" />
          <StatCard
            label="Behavior Intensive"
            value={behaviorIntensiveCount}
            tone="warning"
          />
          <StatCard label="Profile Gaps" value={profileGaps} tone="warning" />
          <StatCard
            label="Remaining Beds"
            value={resolvedRemainingBeds}
            tone={resolvedOccupancyStatus === "FULL" ? "danger" : "success"}
          />
          <StatCard
            label="Compliance"
            value={`${selectedHouse.complianceScore}%`}
            tone="success"
          />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <SectionCard
          title="House Profile"
          subtitle="Core house profile, occupancy strategy, and residential care model."
          className="xl:col-span-4"
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoItem label="House Name" value={selectedHouse.name} />
                <InfoItem label="House Code" value={selectedHouse.code} />
                <InfoItem label="Program Type" value={selectedHouse.programType} />
                <InfoItem label="County" value={selectedHouse.county} />
                <InfoItem label="Capacity" value={String(selectedHouse.capacity)} />
                <InfoItem
                  label="Current Census"
                  value={String(selectedHouse.currentResidents)}
                />
                <InfoItem label="Supervisor" value={selectedHouse.supervisor} />
                <InfoItem label="Phone" value={selectedHouse.phone} />
              </div>
            </div>

            <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-bac-text">Occupancy Snapshot</div>
                {renderOccupancyBadge(resolvedOccupancyStatus)}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoItem
                  label="Capacity Used"
                  value={`${resolvedCapacityUsed} / ${occupancy?.capacity ?? selectedHouse.capacity ?? 0}`}
                />
                <InfoItem label="Remaining Beds" value={String(resolvedRemainingBeds)} />
                <InfoItem label="Occupancy Status" value={resolvedOccupancyStatus} />
                <InfoItem label="Profile Gaps" value={String(profileGaps)} />
              </div>
            </div>

            <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
              <div className="text-sm font-medium text-bac-text">Residential Model Notes</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="violet">24/7 Housing Revenue</Badge>
                <Badge variant="sky">Home Visit Scheduling</Badge>
                <Badge variant="warning">Variable Care Rate</Badge>
                <Badge variant="danger">High-Need Multi-DSP Ready</Badge>
              </div>
              <div className="mt-3 text-sm text-bac-muted">
                This layout assumes BAC may operate houses with 1 resident most often, but also
                supports 2+ residents, shared-support structures, and residents who temporarily
                return home while the housing component remains full-time.
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Today Coverage"
          subtitle="Current and upcoming house shifts, including multi-DSP support and behavioral needs."
          className="xl:col-span-8"
        >
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="border-b border-bac-border text-bac-muted">
                <tr>
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">Service</th>
                  <th className="px-3 py-3">Staff Assigned</th>
                  <th className="px-3 py-3">Residents Covered</th>
                  <th className="px-3 py-3">Ratio</th>
                  <th className="px-3 py-3">Special</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bac-border">
                {coverage.map((shift) => (
                  <tr key={shift.id} className="text-bac-text">
                    <td className="px-3 py-3 font-medium">{shift.time}</td>
                    <td className="px-3 py-3">{shift.service}</td>
                    <td className="px-3 py-3">
                      <div className="space-y-1">
                        {shift.staffAssigned.map((staff, index) => (
                          <div key={`${shift.id}-${index}`} className="text-sm">
                            {staff.name}{" "}
                            <span className="text-bac-muted">({staff.role})</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-1">
                        {shift.individualsCovered.map((name, index) => (
                          <div key={`${shift.id}-resident-${index}`}>{name}</div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="sky">{shift.staffingRatioLabel}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {shift.awakeRequired ? <Badge variant="violet">Awake</Badge> : null}
                        {shift.behaviorSupport ? (
                          <Badge variant="danger">Behavior Support</Badge>
                        ) : null}
                        {!shift.awakeRequired && !shift.behaviorSupport ? (
                          <span className="text-bac-muted">—</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {renderShiftStatusBadge(shift.shiftStatus)}
                    </td>
                    <td className="px-3 py-3 text-bac-muted">{shift.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <SectionCard
          title="Alerts & Action Needed"
          subtitle="Office attention for staffing intensity, meds, behavior-support coordination, and residential profile quality."
          className="xl:col-span-5"
        >
          <div className="space-y-3">
            {alerts.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-bac-border bg-bac-bg p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {a.level === "CRITICAL" ? (
                        <Badge variant="danger">Critical</Badge>
                      ) : a.level === "WARNING" ? (
                        <Badge variant="warning">Warning</Badge>
                      ) : (
                        <Badge variant="muted">Info</Badge>
                      )}
                      <div className="font-medium text-bac-text">{a.title}</div>
                    </div>
                    <div className="mt-2 text-sm text-bac-muted">{a.detail}</div>
                  </div>

                  <button className="rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text hover:bg-white/5">
                    {a.actionLabel}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Compliance Score Breakdown"
          subtitle="Audit readiness across house, meds, safety, training, and behavior support."
          className="xl:col-span-4"
        >
          <div className="space-y-4">
            {compliance.map((item) => (
              <div
                key={item.key}
                className="rounded-2xl border border-bac-border bg-bac-bg p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-bac-text">{item.label}</div>
                  <div className="text-sm font-semibold text-bac-text">{item.score}%</div>
                </div>
                <ProgressBar value={item.score} status={item.status} />
                <div className="mt-2 flex items-center justify-between text-xs text-bac-muted">
                  <span>Last reviewed: {item.lastReviewed}</span>
                  <span>
                    {item.status === "GOOD"
                      ? "Good"
                      : item.status === "WARNING"
                      ? "Warning"
                      : "Critical"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Recent Activity Timeline"
          subtitle="Daily operational, behavioral, medication, and staffing events."
          className="xl:col-span-3"
        >
          <div className="space-y-4">
            {timeline.map((item) => (
              <div key={item.id} className="relative pl-4">
                <div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-violet-400" />
                <div className="text-xs text-bac-muted">{item.at}</div>
                <div className="mt-1 text-sm font-medium text-bac-text">{item.title}</div>
                <div className="mt-1 text-sm text-bac-muted">{item.description}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Resident Snapshot"
        subtitle="Quick residential view for rooming, placement type, behavior support, appointments, and profile completeness."
      >
        <div className="overflow-x-auto">
          <table className="min-w-[1450px] w-full text-left text-sm">
            <thead className="border-b border-bac-border text-bac-muted">
              <tr>
                <th className="px-3 py-3">Resident</th>
                <th className="px-3 py-3">MA #</th>
                <th className="px-3 py-3">Room</th>
                <th className="px-3 py-3">Residential Type</th>
                <th className="px-3 py-3">Behavior</th>
                <th className="px-3 py-3">Appointments</th>
                <th className="px-3 py-3">Care Rate</th>
                <th className="px-3 py-3">Housing</th>
                <th className="px-3 py-3">Home Visit</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Profile Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bac-border">
              {residentSnapshot.map((resident) => {
                const flags: string[] = [];
                if (resident.profileFlags?.missingRoomLabel) flags.push("Missing Room");
                if (resident.profileFlags?.missingCareRateTier) {
                  flags.push("Missing Care Tier");
                }
                if (resident.profileFlags?.missingHousingCoverage) {
                  flags.push("Missing Housing");
                }
                if (resident.profileFlags?.missingHomeVisitSchedule) {
                  flags.push("Missing Home Visit");
                }

                return (
                  <tr key={resident.id} className="text-bac-text">
                    <td className="px-3 py-3">
                      <div className="font-medium">{resident.name}</div>
                      <div className="text-xs text-bac-muted">
                        {resident.code || resident.id}
                      </div>
                    </td>
                    <td className="px-3 py-3">{resident.maNumber || "—"}</td>
                    <td className="px-3 py-3">{resident.roomLabel || "—"}</td>
                    <td className="px-3 py-3">
                      {renderResidentialTypeBadge(resident.residentialPlacementType)}
                    </td>
                    <td className="px-3 py-3">
                      {renderBehaviorBadge(resident.behaviorSupportLevel)}
                    </td>
                    <td className="px-3 py-3">
                      {renderAppointmentBadge(resident.appointmentLoad)}
                    </td>
                    <td className="px-3 py-3">{resident.careRateTier || "—"}</td>
                    <td className="px-3 py-3">{resident.housingCoverage || "—"}</td>
                    <td className="px-3 py-3">{resident.homeVisitSchedule || "—"}</td>
                    <td className="px-3 py-3">
                      {resident.status === "ACTIVE" ? (
                        <Badge variant="success">Active</Badge>
                      ) : resident.status ? (
                        <Badge variant="muted">{resident.status}</Badge>
                      ) : (
                        <span className="text-bac-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {flags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {flags.map((flag) => (
                            <Badge key={`${resident.id}-${flag}`} variant="warning">
                              {flag}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="success">Complete</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}

              {residentSnapshot.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-3 py-10 text-center text-sm text-bac-muted"
                  >
                    No resident snapshot data available.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
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
}) {
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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <StatCard label="Residents" value={selectedHouse.currentResidents} />
          <StatCard label="24/7 Full-Time" value={fullTime247Count} tone="violet" />
          <StatCard label="Home-Visit Split" value={homeVisitSplitCount} tone="sky" />
          <StatCard label="High-Need Residents" value={highNeedCount} tone="danger" />
          <StatCard label="Multi-DSP Shifts" value={multiDspShiftCount} tone="warning" />
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
                <InfoItem label="Current Census" value={String(selectedHouse.currentResidents)} />
                <InfoItem label="Supervisor" value={selectedHouse.supervisor} />
                <InfoItem label="Phone" value={selectedHouse.phone} />
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
          subtitle="Office attention for staffing intensity, meds, and behavior-support coordination."
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
    </div>
  );
}
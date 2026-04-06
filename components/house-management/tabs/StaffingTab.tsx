"use client";

import React from "react";
import { RatioBox, SectionCard, StaffRow, StatCard, Badge } from "../shared";

export default function StaffingTab({
  selectedHouseName,
  staff,
  specialistsCount,
  multiDspShiftCount,
}: {
  selectedHouseName: string;
  staff: StaffRow[];
  specialistsCount: number;
  multiDspShiftCount: number;
}) {
  return (
    <div className="space-y-4">
      <SectionCard
        title={`Staffing — ${selectedHouseName}`}
        subtitle="House coverage, multi-DSP shifts, specialty support, training readiness, and care intensity."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <StatCard label="Assigned Staff" value={staff.length} />
          <StatCard
            label="On Duty Now"
            value={staff.filter((s) => s.status === "ON_DUTY").length}
            tone="success"
          />
          <StatCard label="Multi-DSP Shifts" value={multiDspShiftCount} tone="warning" />
          <StatCard label="Behavior Specialist Visits" value={specialistsCount} tone="sky" />
          <StatCard
            label="Med-Cert Staff"
            value={staff.filter((s) => s.medCertified).length}
            tone="violet"
          />
          <StatCard
            label="Training Overdue"
            value={staff.filter((s) => s.trainingStatus === "OVERDUE").length}
            tone="danger"
          />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <SectionCard
          title="Staff Roster"
          subtitle="Assigned employees, specialists, certifications, and house-readiness."
          className="xl:col-span-8"
        >
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="border-b border-bac-border text-bac-muted">
                <tr>
                  <th className="px-3 py-3">Employee</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Shift Today</th>
                  <th className="px-3 py-3">Training</th>
                  <th className="px-3 py-3">Med Cert</th>
                  <th className="px-3 py-3">CPR</th>
                  <th className="px-3 py-3">Driver</th>
                  <th className="px-3 py-3">Clearance</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bac-border">
                {staff.map((s) => (
                  <tr key={s.id} className="text-bac-text">
                    <td className="px-3 py-3">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-bac-muted">{s.id}</div>
                    </td>
                    <td className="px-3 py-3">{s.role}</td>
                    <td className="px-3 py-3">{s.shiftToday}</td>
                    <td className="px-3 py-3">
                      {s.trainingStatus === "CURRENT" ? (
                        <Badge variant="success">Current</Badge>
                      ) : s.trainingStatus === "DUE_SOON" ? (
                        <Badge variant="warning">Due Soon</Badge>
                      ) : (
                        <Badge variant="danger">Overdue</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {s.medCertified ? (
                        <Badge variant="success">Yes</Badge>
                      ) : (
                        <Badge variant="danger">No</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {s.cpr === "CURRENT" ? (
                        <Badge variant="success">Current</Badge>
                      ) : (
                        <Badge variant="danger">Expired</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {s.driver === "ACTIVE" ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="muted">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {s.clearance === "CURRENT" ? (
                        <Badge variant="success">Current</Badge>
                      ) : (
                        <Badge variant="danger">Expired</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {s.status === "ON_DUTY" ? (
                        <Badge variant="violet">On Duty</Badge>
                      ) : (
                        <Badge variant="muted">Off Duty</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Coverage & Intensity"
          subtitle="Coverage health for shared houses and high-need residents."
          className="xl:col-span-4"
        >
          <div className="space-y-3">
            <RatioBox label="Current House Ratio" value="2 DSP : 3 Residents" status="GOOD" />
            <RatioBox
              label="High-Need Shift Coverage"
              value="3 DSP : 1 Resident overnight"
              status="WARNING"
            />
            <RatioBox
              label="Medication-Capable Coverage"
              value="Available on all core shifts"
              status="GOOD"
            />
            <RatioBox
              label="Behavior Specialist Access"
              value="1 specialist visit today"
              status="GOOD"
            />
            <RatioBox
              label="Weekend Backup Depth"
              value="Needs one more trained DSP"
              status="CRITICAL"
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
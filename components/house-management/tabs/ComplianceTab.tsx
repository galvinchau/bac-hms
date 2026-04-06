"use client";

import React from "react";
import {
  ChecklistItem,
  ComplianceItem,
  FireDrillRow,
  IncidentBox,
  SectionCard,
  StatCard,
  Badge,
} from "../shared";

export default function ComplianceTab({
  selectedHouseName,
  compliance,
  drills,
}: {
  selectedHouseName: string;
  compliance: ComplianceItem[];
  drills: FireDrillRow[];
}) {
  return (
    <div className="space-y-4">
      <SectionCard
        title={`Compliance — ${selectedHouseName}`}
        subtitle="6400-focused dashboard for house, medication, training, and behavior-support compliance."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {compliance.map((c) => (
            <StatCard
              key={c.key}
              label={c.label}
              value={`${c.score}%`}
              tone={
                c.status === "GOOD"
                  ? "success"
                  : c.status === "WARNING"
                  ? "warning"
                  : "danger"
              }
            />
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <SectionCard
          title="Fire Drill"
          subtitle="Fire drill area retained inside House Management."
          className="xl:col-span-6"
          right={
            <button className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95">
              + New Drill
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="border-b border-bac-border text-bac-muted">
                <tr>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Location</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Shift Time</th>
                  <th className="px-3 py-3">Result</th>
                  <th className="px-3 py-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bac-border">
                {drills.map((d) => (
                  <tr key={d.id} className="text-bac-text">
                    <td className="px-3 py-3">
                      <div className="font-medium">{d.date}</div>
                      <div className="text-xs text-bac-muted">{d.id}</div>
                    </td>
                    <td className="px-3 py-3">{d.location}</td>
                    <td className="px-3 py-3">
                      <Badge variant="muted">{d.drillType}</Badge>
                    </td>
                    <td className="px-3 py-3">{d.shiftTime}</td>
                    <td className="px-3 py-3">
                      {d.result === "PASS" ? (
                        <Badge variant="success">PASS</Badge>
                      ) : d.result === "FAIL" ? (
                        <Badge variant="danger">FAIL</Badge>
                      ) : (
                        <Badge variant="muted">N/A</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="muted">{d.source}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Safety & Environment"
          subtitle="Residential safety readiness for house operations."
          className="xl:col-span-3"
        >
          <ChecklistItem label="Smoke detectors checked" status="GOOD" />
          <ChecklistItem label="Exits clear and posted" status="GOOD" />
          <ChecklistItem label="First aid kit complete" status="WARNING" />
          <ChecklistItem label="Fire extinguisher current" status="GOOD" />
          <ChecklistItem label="Emergency contacts posted" status="CRITICAL" />
        </SectionCard>

        <SectionCard
          title="Medication & Behavior Documentation"
          subtitle="High-volume daily documentation areas."
          className="xl:col-span-3"
        >
          <ChecklistItem label="Daily medication logs current" status="GOOD" />
          <ChecklistItem label="Behavior note packets complete" status="WARNING" />
          <ChecklistItem label="Specialist visit notes uploaded" status="WARNING" />
          <ChecklistItem label="Refusal / exception review complete" status="GOOD" />
          <ChecklistItem label="Doctor follow-up forms complete" status="CRITICAL" />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <SectionCard
          title="Staff Training Compliance"
          subtitle="Residential training, medication certification, CPR, and behavior-related readiness."
          className="xl:col-span-7"
        >
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead className="border-b border-bac-border text-bac-muted">
                <tr>
                  <th className="px-3 py-3">Staff</th>
                  <th className="px-3 py-3">Training Item</th>
                  <th className="px-3 py-3">Completed</th>
                  <th className="px-3 py-3">Expires</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bac-border text-bac-text">
                <tr>
                  <td className="px-3 py-3">Anna Smith</td>
                  <td className="px-3 py-3">CPR / First Aid</td>
                  <td className="px-3 py-3">2025-11-08</td>
                  <td className="px-3 py-3">2026-11-08</td>
                  <td className="px-3 py-3">
                    <Badge variant="success">Current</Badge>
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-3">Mike Lee</td>
                  <td className="px-3 py-3">Medication Administration</td>
                  <td className="px-3 py-3">2025-06-12</td>
                  <td className="px-3 py-3">2026-06-12</td>
                  <td className="px-3 py-3">
                    <Badge variant="warning">Due Soon</Badge>
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-3">Sara Long</td>
                  <td className="px-3 py-3">Behavior Support Crisis Response</td>
                  <td className="px-3 py-3">2024-03-22</td>
                  <td className="px-3 py-3">2025-03-22</td>
                  <td className="px-3 py-3">
                    <Badge variant="danger">Expired</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Incident / Corrective Action"
          subtitle="Behavior events, medication concerns, and follow-up actions."
          className="xl:col-span-5"
        >
          <div className="space-y-3">
            <IncidentBox
              title="Medication refusal follow-up"
              detail="Resident refused evening medication; supervisor review pending."
              status="WARNING"
            />
            <IncidentBox
              title="Behavior escalation corrective action"
              detail="Staff coaching note still missing after specialist review."
              status="CRITICAL"
            />
            <IncidentBox
              title="Appointment escort issue closed"
              detail="Transport coordination process reviewed and documented."
              status="GOOD"
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
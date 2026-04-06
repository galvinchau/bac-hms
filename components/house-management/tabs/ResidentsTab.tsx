"use client";

import React from "react";
import {
  renderCareRateBadge,
  renderResidentialTypeBadge,
  Badge,
  ResidentRow,
  SectionCard,
  StatCard,
} from "../shared";

export default function ResidentsTab({
  selectedHouseName,
  residents,
  fullTime247Count,
  homeVisitSplitCount,
  highNeedCount,
}: {
  selectedHouseName: string;
  residents: ResidentRow[];
  fullTime247Count: number;
  homeVisitSplitCount: number;
  highNeedCount: number;
}) {
  return (
    <div className="space-y-4">
      <SectionCard
        title={`Residents — ${selectedHouseName}`}
        subtitle="Residential roster with care model, housing status, home visits, meds, appointments, and behavior support."
        right={
          <button className="rounded-xl border border-bac-border bg-bac-bg px-4 py-2 text-sm text-bac-text hover:bg-white/5">
            Assign Resident
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <StatCard label="Total Residents" value={residents.length} />
          <StatCard label="24/7 Full-Time" value={fullTime247Count} tone="violet" />
          <StatCard label="Home-Visit Split" value={homeVisitSplitCount} tone="sky" />
          <StatCard label="High Need" value={highNeedCount} tone="danger" />
          <StatCard label="Daily Med Users" value={residents.length} tone="success" />
          <StatCard
            label="Behavior Intensive"
            value={residents.filter((r) => r.behaviorSupportLevel === "INTENSIVE").length}
            tone="warning"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Resident Roster"
        subtitle="Designed for both single-resident homes and multi-resident house models."
      >
        <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full text-left text-sm">
            <thead className="border-b border-bac-border text-bac-muted">
              <tr>
                <th className="px-3 py-3">Resident</th>
                <th className="px-3 py-3">MA #</th>
                <th className="px-3 py-3">Room</th>
                <th className="px-3 py-3">Residential Type</th>
                <th className="px-3 py-3">Home Visit</th>
                <th className="px-3 py-3">Housing</th>
                <th className="px-3 py-3">Care Rate Tier</th>
                <th className="px-3 py-3">ISP</th>
                <th className="px-3 py-3">Risk</th>
                <th className="px-3 py-3">Behavior</th>
                <th className="px-3 py-3">Medication</th>
                <th className="px-3 py-3">Appointments</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bac-border">
              {residents.map((r) => (
                <tr key={r.id} className="text-bac-text">
                  <td className="px-3 py-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-bac-muted">{r.id}</div>
                  </td>
                  <td className="px-3 py-3">{r.maNumber}</td>
                  <td className="px-3 py-3">{r.room}</td>
                  <td className="px-3 py-3">{renderResidentialTypeBadge(r.residentialType)}</td>
                  <td className="px-3 py-3">{r.homeVisitSchedule}</td>
                  <td className="px-3 py-3">
                    <Badge variant="violet">{r.housingCoverage}</Badge>
                  </td>
                  <td className="px-3 py-3">{renderCareRateBadge(r.careRateTier)}</td>
                  <td className="px-3 py-3">
                    {r.ispStatus === "CURRENT" ? (
                      <Badge variant="success">Current</Badge>
                    ) : r.ispStatus === "DUE_SOON" ? (
                      <Badge variant="warning">Due Soon</Badge>
                    ) : (
                      <Badge variant="danger">Overdue</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {r.riskFlag === "HIGH" ? (
                      <Badge variant="danger">High</Badge>
                    ) : (
                      <Badge variant="muted">Standard</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {r.behaviorSupportLevel === "INTENSIVE" ? (
                      <Badge variant="danger">Intensive</Badge>
                    ) : r.behaviorSupportLevel === "MODERATE" ? (
                      <Badge variant="warning">Moderate</Badge>
                    ) : (
                      <Badge variant="muted">None</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {r.medProfile === "MULTIPLE_DAILY" ? (
                      <Badge variant="violet">Multiple Daily</Badge>
                    ) : (
                      <Badge variant="success">Daily</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {r.appointmentLoad === "HIGH" ? (
                      <Badge variant="warning">High</Badge>
                    ) : r.appointmentLoad === "MODERATE" ? (
                      <Badge variant="muted">Moderate</Badge>
                    ) : (
                      <Badge variant="success">Low</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {r.status === "ACTIVE" ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="muted">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm hover:bg-white/5">
                        View
                      </button>
                      <button className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm hover:bg-white/5">
                        Documents
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
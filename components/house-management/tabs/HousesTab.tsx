"use client";

import React from "react";
import { HouseSummary, renderRiskBadge, SectionCard, Select, StatCard, TextInput, ProgressBar, Badge } from "../shared";

export default function HousesTab({
  houses,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  countyFilter,
  setCountyFilter,
  riskFilter,
  setRiskFilter,
  onViewDashboard,
}: {
  houses: HouseSummary[];
  search: string;
  setSearch: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  countyFilter: string;
  setCountyFilter: (v: string) => void;
  riskFilter: string;
  setRiskFilter: (v: string) => void;
  onViewDashboard: (houseId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionCard
        title="House Directory"
        subtitle="Overview of residential homes, occupancy model, staffing load, care complexity, and compliance."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="mb-1 text-xs text-bac-muted">Search</div>
            <TextInput
              value={search}
              onChange={setSearch}
              placeholder="Search by house name, address, code, supervisor..."
            />
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Status</div>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "ALL", label: "All" },
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
              ]}
            />
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">County</div>
            <Select
              value={countyFilter}
              onChange={setCountyFilter}
              options={[
                { value: "ALL", label: "All" },
                { value: "Blair", label: "Blair" },
                { value: "Centre", label: "Centre" },
              ]}
            />
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Risk</div>
            <Select
              value={riskFilter}
              onChange={setRiskFilter}
              options={[
                { value: "ALL", label: "All" },
                { value: "GOOD", label: "Good" },
                { value: "WARNING", label: "Warning" },
                { value: "CRITICAL", label: "Critical" },
              ]}
            />
          </div>

          <div className="md:col-span-2 flex items-end">
            <div className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-muted">
              Records: {houses.length}
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {houses.map((house) => (
          <div
            key={house.id}
            className="rounded-3xl border border-bac-border bg-bac-panel p-5"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-lg font-semibold text-bac-text">{house.name}</div>
                  {renderRiskBadge(house.risk)}
                  <Badge variant="muted">{house.code}</Badge>
                </div>

                <div className="mt-2 text-sm text-bac-muted">{house.address}</div>
                <div className="mt-1 text-xs text-bac-muted">
                  {house.programType} • {house.county} County • Supervisor: {house.supervisor}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onViewDashboard(house.id)}
                  className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95"
                >
                  View Dashboard
                </button>
                <button
                  onClick={() => alert("UI only. Wire edit later.")}
                  className="rounded-xl border border-bac-border bg-bac-bg px-4 py-2 text-sm text-bac-text hover:bg-white/5"
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Capacity" value={house.capacity} />
              <StatCard label="Residents" value={house.currentResidents} />
              <StatCard label="Assigned Staff" value={house.assignedStaff} />
              <StatCard
                label="Open Alerts"
                value={house.openAlerts}
                tone={house.openAlerts > 0 ? "warning" : "success"}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-medium text-bac-text">Occupancy Model</div>
                  <Badge variant="sky">{house.primaryOccupancyModel}</Badge>
                </div>
                <div className="text-sm text-bac-muted">
                  Designed to support 1 resident per home in most cases, while still allowing
                  2+ residents with adjusted staffing and care-rate complexity.
                </div>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-medium text-bac-text">Compliance Score</div>
                  <div className="text-sm font-semibold text-bac-text">
                    {house.complianceScore}%
                  </div>
                </div>
                <ProgressBar
                  value={house.complianceScore}
                  status={
                    house.complianceScore >= 90
                      ? "GOOD"
                      : house.complianceScore >= 80
                      ? "WARNING"
                      : "CRITICAL"
                  }
                />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-bac-border bg-bac-bg p-4">
              <div className="text-xs text-bac-muted">Residential Billing Note</div>
              <div className="mt-2 text-sm text-bac-text">{house.houseBillingNote}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
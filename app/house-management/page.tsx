"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

import HouseTabs from "@/components/house-management/HouseTabs";
import {
  Badge,
  FormField,
  HouseTabKey,
  Modal,
  Select,
} from "@/components/house-management/shared";
import {
  DEMO_ALERTS,
  DEMO_APPOINTMENTS,
  DEMO_CHORES,
  DEMO_COMPLIANCE,
  DEMO_COVERAGE,
  DEMO_DRILLS,
  DEMO_HOUSES,
  DEMO_MEALS,
  DEMO_MEDS,
  DEMO_RESIDENTS,
  DEMO_SPECIALISTS,
  DEMO_STAFF,
  DEMO_TIMELINE,
} from "@/components/house-management/demo-data";

import HousesTab from "@/components/house-management/tabs/HousesTab";
import DashboardTab from "@/components/house-management/tabs/DashboardTab";
import ResidentsTab from "@/components/house-management/tabs/ResidentsTab";
import StaffingTab from "@/components/house-management/tabs/StaffingTab";
import ComplianceTab from "@/components/house-management/tabs/ComplianceTab";
import OperationsTab from "@/components/house-management/tabs/OperationsTab";

export default function HouseManagementPage() {
  const [tab, setTab] = useState<HouseTabKey>("HOUSES");
  const [selectedHouseId, setSelectedHouseId] = useState<string>(DEMO_HOUSES[0].id);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [countyFilter, setCountyFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [openHouseModal, setOpenHouseModal] = useState(false);

  const selectedHouse =
    DEMO_HOUSES.find((h) => h.id === selectedHouseId) ?? DEMO_HOUSES[0];

  const filteredHouses = useMemo(() => {
    const q = search.trim().toLowerCase();

    return DEMO_HOUSES.filter((h) => {
      if (statusFilter !== "ALL" && h.status !== statusFilter) return false;
      if (countyFilter !== "ALL" && h.county !== countyFilter) return false;
      if (riskFilter !== "ALL" && h.risk !== riskFilter) return false;

      if (!q) return true;

      const hay =
        `${h.name} ${h.code} ${h.address} ${h.county} ${h.supervisor}`.toLowerCase();
      return hay.includes(q);
    });
  }, [search, statusFilter, countyFilter, riskFilter]);

  const fullTime247Count = DEMO_RESIDENTS.filter(
    (r) => r.residentialType === "FULL_TIME_247"
  ).length;

  const homeVisitSplitCount = DEMO_RESIDENTS.filter(
    (r) => r.residentialType === "HOME_VISIT_SPLIT"
  ).length;

  const highNeedCount = DEMO_RESIDENTS.filter((r) => r.riskFlag === "HIGH").length;

  const multiDspShiftCount = DEMO_COVERAGE.filter(
    (s) => s.staffAssigned.length >= 2
  ).length;

  return (
    <div className="min-h-[calc(100vh-60px)] bg-bac-bg p-6">
      <div className="mb-6 rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-bac-panel to-amber-950/20 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-2xl font-semibold tracking-tight text-bac-text">
              House Management
            </div>
            <div className="mt-1 text-sm text-bac-muted">
              Manage residential homes, occupancy, 24/7 care operations, staffing,
              medication, appointments, behavior support, and 6400 compliance.
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="violet">Residential 6400</Badge>
              <Badge variant="amber">24 / 7 Housing & Care</Badge>
              <Badge variant="sky">Home-Visit Split Supported</Badge>
              <Badge variant="muted">Layout Preview Only</Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedHouseId}
              onChange={(v) => {
                setSelectedHouseId(v);
                setTab("DASHBOARD");
              }}
              options={DEMO_HOUSES.map((h) => ({
                value: h.id,
                label: `${h.name} (${h.code})`,
              }))}
            />

            <button
              onClick={() => setOpenHouseModal(true)}
              className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
            >
              + New House
            </button>

            <button
              onClick={() => alert("UI only. Wire export later.")}
              className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
            >
              Export
            </button>

            <Link
              href="/reports"
              className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95"
            >
              Go to Reports
            </Link>
          </div>
        </div>
      </div>

      <HouseTabs value={tab} onChange={setTab} />

      {tab === "HOUSES" && (
        <HousesTab
          houses={filteredHouses}
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          countyFilter={countyFilter}
          setCountyFilter={setCountyFilter}
          riskFilter={riskFilter}
          setRiskFilter={setRiskFilter}
          onViewDashboard={(houseId) => {
            setSelectedHouseId(houseId);
            setTab("DASHBOARD");
          }}
        />
      )}

      {tab === "DASHBOARD" && (
        <DashboardTab
          selectedHouse={selectedHouse}
          fullTime247Count={fullTime247Count}
          homeVisitSplitCount={homeVisitSplitCount}
          highNeedCount={highNeedCount}
          multiDspShiftCount={multiDspShiftCount}
          coverage={DEMO_COVERAGE}
          alerts={DEMO_ALERTS}
          compliance={DEMO_COMPLIANCE}
          timeline={DEMO_TIMELINE}
          onGoResidents={() => setTab("RESIDENTS")}
          onGoStaffing={() => setTab("STAFFING")}
        />
      )}

      {tab === "RESIDENTS" && (
        <ResidentsTab
          selectedHouseName={selectedHouse.name}
          residents={DEMO_RESIDENTS}
          fullTime247Count={fullTime247Count}
          homeVisitSplitCount={homeVisitSplitCount}
          highNeedCount={highNeedCount}
        />
      )}

      {tab === "STAFFING" && (
        <StaffingTab
          selectedHouseName={selectedHouse.name}
          staff={DEMO_STAFF}
          specialistsCount={DEMO_SPECIALISTS.length}
          multiDspShiftCount={multiDspShiftCount}
        />
      )}

      {tab === "COMPLIANCE" && (
        <ComplianceTab
          selectedHouseName={selectedHouse.name}
          compliance={DEMO_COMPLIANCE}
          drills={DEMO_DRILLS}
        />
      )}

      {tab === "OPERATIONS" && (
        <OperationsTab
          selectedHouseName={selectedHouse.name}
          meals={DEMO_MEALS}
          meds={DEMO_MEDS}
          chores={DEMO_CHORES}
          appointments={DEMO_APPOINTMENTS}
          specialists={DEMO_SPECIALISTS}
        />
      )}

      <Modal
        open={openHouseModal}
        title="New House (Layout Preview Only)"
        onClose={() => setOpenHouseModal(false)}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="House Name">
            <input className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none" />
          </FormField>
          <FormField label="House Code">
            <input className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none" />
          </FormField>
          <FormField label="Program Type">
            <Select
              value="Residential 6400"
              onChange={() => {}}
              options={[{ value: "Residential 6400", label: "Residential 6400" }]}
            />
          </FormField>
          <FormField label="Capacity">
            <input
              type="number"
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
            />
          </FormField>
          <FormField label="Primary Occupancy Model">
            <Select
              value="SINGLE"
              onChange={() => {}}
              options={[
                { value: "SINGLE", label: "Single Resident Focus" },
                { value: "DOUBLE", label: "Two Residents Typical" },
                { value: "MIXED", label: "Mixed Occupancy" },
              ]}
            />
          </FormField>
          <FormField label="County">
            <Select
              value="Blair"
              onChange={() => {}}
              options={[
                { value: "Blair", label: "Blair" },
                { value: "Centre", label: "Centre" },
              ]}
            />
          </FormField>
          <FormField label="Phone">
            <input className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none" />
          </FormField>
          <FormField label="Address" className="md:col-span-2">
            <input className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none" />
          </FormField>
          <FormField label="Billing / Occupancy Note" className="md:col-span-2">
            <textarea className="min-h-[100px] w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text outline-none" />
          </FormField>
          <FormField label="Care Complexity Note" className="md:col-span-2">
            <textarea className="min-h-[100px] w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text outline-none" />
          </FormField>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => setOpenHouseModal(false)}
            className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={() => alert("UI only. Wire create API later.")}
            className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95"
          >
            Create House
          </button>
        </div>
      </Modal>
    </div>
  );
}
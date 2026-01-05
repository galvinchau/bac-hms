// app/firedrill/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

type FireDrillRow = {
  id: string;
  date: string; // YYYY-MM-DD
  location: string; // Home / Community / Day Program...
  individualName: string;
  dspName: string;

  drillType: "FIRE" | "EVAC" | "SHELTER" | "OTHER";
  shiftTime: string; // e.g. 10:00 - 11:00
  result: "PASS" | "FAIL" | "N/A";

  notes?: string | null;
  createdAt?: string;
  source: "MANUAL" | "MOBILE" | "IMPORT";
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Badge({
  variant,
  children,
}: {
  variant: "default" | "success" | "warning" | "danger" | "muted";
  children: React.ReactNode;
}) {
  const cls =
    variant === "success"
      ? "bg-bac-green/15 text-bac-green border-bac-green/30"
      : variant === "warning"
      ? "bg-yellow-500/15 text-yellow-200 border-yellow-500/30"
      : variant === "danger"
      ? "bg-bac-red/15 text-bac-red border-bac-red/30"
      : variant === "muted"
      ? "bg-white/5 text-bac-muted border-bac-border"
      : "bg-white/10 text-bac-text border-bac-border";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        cls
      )}
    >
      {children}
    </span>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none focus:ring-2 focus:ring-bac-primary/40"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary/40"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-bac-border bg-bac-bg shadow-xl">
        <div className="flex items-center justify-between border-b border-bac-border px-5 py-4">
          <div className="text-base font-semibold text-bac-text">{title}</div>
          <button
            onClick={onClose}
            className="rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text hover:bg-white/5"
          >
            Close
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

const DEMO: FireDrillRow[] = [
  {
    id: "FD-2001",
    date: "2026-01-02",
    location: "Residential Home",
    individualName: "John Doe",
    dspName: "Anna Smith",
    drillType: "FIRE",
    shiftTime: "09:00 - 10:00",
    result: "PASS",
    notes: "Exited within target time. All staff followed procedure.",
    source: "MANUAL",
  },
  {
    id: "FD-2002",
    date: "2026-01-03",
    location: "Residential Home",
    individualName: "Emily Stone",
    dspName: "Mike Lee",
    drillType: "EVAC",
    shiftTime: "14:00 - 15:00",
    result: "FAIL",
    notes: "Delay due to missing key; corrective action assigned.",
    source: "MANUAL",
  },
  {
    id: "FD-2003",
    date: "2026-01-04",
    location: "Community",
    individualName: "Kevin Brown",
    dspName: "Anna Smith",
    drillType: "SHELTER",
    shiftTime: "11:00 - 12:00",
    result: "N/A",
    notes: "Shelter-in-place discussion during outing.",
    source: "IMPORT",
  },
];

export default function FireDrillPage() {
  // Filters
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-01-31");
  const [q, setQ] = useState("");
  const [drillType, setDrillType] = useState("ALL");
  const [result, setResult] = useState("ALL");
  const [location, setLocation] = useState("ALL");

  // Tabs
  const [tab, setTab] = useState<"LOG" | "COMPLIANCE" | "SETTINGS">("LOG");

  // Modal
  const [selected, setSelected] = useState<FireDrillRow | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [openNew, setOpenNew] = useState(false);

  const rows = useMemo(() => {
    const qLower = q.trim().toLowerCase();

    return DEMO.filter((r) => {
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;

      if (drillType !== "ALL" && r.drillType !== drillType) return false;
      if (result !== "ALL" && r.result !== result) return false;
      if (location !== "ALL" && r.location !== location) return false;

      if (!qLower) return true;
      const hay =
        `${r.id} ${r.individualName} ${r.dspName} ${r.location} ${r.drillType}`.toLowerCase();
      return hay.includes(qLower);
    });
  }, [from, to, q, drillType, result, location]);

  const compliance = useMemo(() => {
    // UI-only demo compliance: % pass among FIRE/EVAC
    const targetRows = rows.filter(
      (r) => r.drillType === "FIRE" || r.drillType === "EVAC"
    );
    const total = targetRows.length;
    const pass = targetRows.filter((r) => r.result === "PASS").length;
    const fail = targetRows.filter((r) => r.result === "FAIL").length;
    const rate = total === 0 ? 0 : Math.round((pass / total) * 100);
    return { total, pass, fail, rate };
  }, [rows]);

  const openDetails = (r: FireDrillRow) => {
    setSelected(r);
    setOpenDetail(true);
  };

  return (
    <div className="min-h-[calc(100vh-60px)] bg-bac-bg p-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-semibold text-bac-text">
            Fire Drill (6400)
          </div>
          <div className="mt-1 text-sm text-bac-muted">
            Track drills, review compliance, and keep documentation ready for
            audits.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/reports"
            className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
          >
            Go to Reports
          </Link>

          <button
            className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
            onClick={() => alert("UI only. Wire API later: export PDF/CSV")}
          >
            Export
          </button>

          <button
            className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95 active:scale-[0.99]"
            onClick={() => setOpenNew(true)}
          >
            + New Drill
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          className={cx(
            "rounded-xl border px-4 py-2 text-sm",
            tab === "LOG"
              ? "border-bac-primary bg-bac-primary/15 text-bac-text"
              : "border-bac-border bg-bac-panel text-bac-muted hover:bg-white/5"
          )}
          onClick={() => setTab("LOG")}
        >
          Drill Log
        </button>
        <button
          className={cx(
            "rounded-xl border px-4 py-2 text-sm",
            tab === "COMPLIANCE"
              ? "border-bac-primary bg-bac-primary/15 text-bac-text"
              : "border-bac-border bg-bac-panel text-bac-muted hover:bg-white/5"
          )}
          onClick={() => setTab("COMPLIANCE")}
        >
          Compliance
        </button>
        <button
          className={cx(
            "rounded-xl border px-4 py-2 text-sm",
            tab === "SETTINGS"
              ? "border-bac-primary bg-bac-primary/15 text-bac-text"
              : "border-bac-border bg-bac-panel text-bac-muted hover:bg-white/5"
          )}
          onClick={() => setTab("SETTINGS")}
        >
          Settings
        </button>
      </div>

      {/* LOG TAB */}
      {tab === "LOG" ? (
        <>
          {/* Filters */}
          <div className="mb-4 rounded-2xl border border-bac-border bg-bac-panel p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">From</div>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary/40"
                />
              </div>
              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">To</div>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary/40"
                />
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">Drill Type</div>
                <Select
                  value={drillType}
                  onChange={setDrillType}
                  options={[
                    { value: "ALL", label: "All" },
                    { value: "FIRE", label: "Fire" },
                    { value: "EVAC", label: "Evacuation" },
                    { value: "SHELTER", label: "Shelter-in-place" },
                    { value: "OTHER", label: "Other" },
                  ]}
                />
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">Result</div>
                <Select
                  value={result}
                  onChange={setResult}
                  options={[
                    { value: "ALL", label: "All" },
                    { value: "PASS", label: "Pass" },
                    { value: "FAIL", label: "Fail" },
                    { value: "N/A", label: "N/A" },
                  ]}
                />
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">Location</div>
                <Select
                  value={location}
                  onChange={setLocation}
                  options={[
                    { value: "ALL", label: "All" },
                    { value: "Residential Home", label: "Residential Home" },
                    { value: "Community", label: "Community" },
                    { value: "Day Program", label: "Day Program" },
                  ]}
                />
              </div>

              <div className="md:col-span-4">
                <div className="mb-1 text-xs text-bac-muted">Search</div>
                <TextInput
                  value={q}
                  onChange={setQ}
                  placeholder="Search by Individual, DSP, Location, ID..."
                />
              </div>

              <div className="md:col-span-12 flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="muted">Records: {rows.length}</Badge>
                <Badge variant="success">
                  Pass: {rows.filter((r) => r.result === "PASS").length}
                </Badge>
                <Badge variant="danger">
                  Fail: {rows.filter((r) => r.result === "FAIL").length}
                </Badge>
                <Badge variant="muted">
                  N/A: {rows.filter((r) => r.result === "N/A").length}
                </Badge>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-bac-border bg-bac-panel">
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-left text-sm">
                <thead className="border-b border-bac-border text-bac-muted">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Individual</th>
                    <th className="px-4 py-3">DSP</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Drill Type</th>
                    <th className="px-4 py-3">Shift Time</th>
                    <th className="px-4 py-3">Result</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bac-border">
                  {rows.map((r) => (
                    <tr key={r.id} className="text-bac-text hover:bg-white/3">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.date}</div>
                        <div className="text-xs text-bac-muted">{r.id}</div>
                      </td>
                      <td className="px-4 py-3">{r.individualName}</td>
                      <td className="px-4 py-3">{r.dspName}</td>
                      <td className="px-4 py-3">{r.location}</td>
                      <td className="px-4 py-3">
                        <Badge variant="muted">{r.drillType}</Badge>
                      </td>
                      <td className="px-4 py-3">{r.shiftTime}</td>
                      <td className="px-4 py-3">
                        {r.result === "PASS" && (
                          <Badge variant="success">PASS</Badge>
                        )}
                        {r.result === "FAIL" && (
                          <Badge variant="danger">FAIL</Badge>
                        )}
                        {r.result === "N/A" && (
                          <Badge variant="muted">N/A</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="muted">{r.source}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm hover:bg-white/5"
                            onClick={() => openDetails(r)}
                          >
                            Details
                          </button>
                          <button
                            className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm hover:bg-white/5"
                            onClick={() =>
                              alert("UI only. Wire API later: edit drill")
                            }
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-10 text-center text-bac-muted"
                      >
                        No records found for the current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="border-t border-bac-border px-4 py-3 text-xs text-bac-muted">
              Note: This is layout-only. Next step we will connect API + real
              data.
            </div>
          </div>
        </>
      ) : null}

      {/* COMPLIANCE TAB */}
      {tab === "COMPLIANCE" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5 lg:col-span-2">
            <div className="text-base font-semibold text-bac-text">
              Monthly Compliance Summary
            </div>
            <div className="mt-1 text-sm text-bac-muted">
              Quick view for audit readiness (UI demo).
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                <div className="text-xs text-bac-muted">Total (Fire/Evac)</div>
                <div className="mt-1 text-2xl font-semibold text-bac-text">
                  {compliance.total}
                </div>
              </div>
              <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                <div className="text-xs text-bac-muted">Pass</div>
                <div className="mt-1 text-2xl font-semibold text-bac-text">
                  {compliance.pass}
                </div>
              </div>
              <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                <div className="text-xs text-bac-muted">Fail</div>
                <div className="mt-1 text-2xl font-semibold text-bac-text">
                  {compliance.fail}
                </div>
              </div>
              <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                <div className="text-xs text-bac-muted">Pass Rate</div>
                <div className="mt-1 text-2xl font-semibold text-bac-text">
                  {compliance.rate}%
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-bac-border bg-bac-bg p-4 text-sm text-bac-muted">
              Next: we’ll compute compliance by Individual, by home, by month,
              and auto-generate PDF packets for ODP audits.
            </div>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <div className="text-base font-semibold text-bac-text">
              Quick Actions
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <button
                className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95"
                onClick={() => setOpenNew(true)}
              >
                + New Drill
              </button>
              <button
                className="rounded-xl border border-bac-border bg-bac-bg px-4 py-2 text-sm text-bac-text hover:bg-white/5"
                onClick={() =>
                  alert("UI only. Wire later: generate monthly PDF")
                }
              >
                Generate Monthly Packet
              </button>
              <button
                className="rounded-xl border border-bac-border bg-bac-bg px-4 py-2 text-sm text-bac-text hover:bg-white/5"
                onClick={() =>
                  alert("UI only. Wire later: export compliance CSV")
                }
              >
                Export Compliance CSV
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* SETTINGS TAB */}
      {tab === "SETTINGS" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <div className="text-base font-semibold text-bac-text">
              Policy Defaults (UI only)
            </div>
            <div className="mt-1 text-sm text-bac-muted">
              Configure defaults for audit and workflow (wire later).
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs text-bac-muted">
                  Required Drill Frequency
                </div>
                <Select
                  value={"MONTHLY"}
                  onChange={() => {}}
                  options={[
                    { value: "MONTHLY", label: "Monthly" },
                    { value: "QUARTERLY", label: "Quarterly" },
                  ]}
                />
              </div>
              <div>
                <div className="mb-1 text-xs text-bac-muted">
                  Default Location
                </div>
                <Select
                  value={"Residential Home"}
                  onChange={() => {}}
                  options={[
                    { value: "Residential Home", label: "Residential Home" },
                    { value: "Community", label: "Community" },
                    { value: "Day Program", label: "Day Program" },
                  ]}
                />
              </div>
              <div className="sm:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">
                  Audit Notes Template
                </div>
                <textarea
                  className="min-h-[110px] w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text outline-none"
                  defaultValue={
                    "Drill conducted per 6400 requirements. Staff trained, exits verified, and documentation completed."
                  }
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                className="rounded-xl border border-bac-border bg-bac-bg px-4 py-2 text-sm text-bac-text hover:bg-white/5"
                onClick={() => alert("UI only. Wire API later: save settings")}
              >
                Save Settings
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <div className="text-base font-semibold text-bac-text">
              About Fire Drill Module
            </div>
            <div className="mt-2 text-sm text-bac-muted space-y-2">
              <p>
                This module will store Fire Drill logs and generate audit-ready
                reports.
              </p>
              <p>
                Next step: connect database tables + role permissions
                (Admin/OFC/DSP).
              </p>
              <p className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                For now: layout only to remove 404 and provide UI baseline.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Details Modal */}
      <Modal
        open={openDetail}
        title="Fire Drill Details"
        onClose={() => {
          setOpenDetail(false);
          setSelected(null);
        }}
      >
        {!selected ? (
          <div className="text-bac-muted">No record selected.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
              <div className="text-xs text-bac-muted">Record</div>
              <div className="mt-1 text-sm font-medium text-bac-text">
                {selected.id}
              </div>

              <div className="mt-3 text-xs text-bac-muted">Date</div>
              <div className="mt-1 text-sm font-medium text-bac-text">
                {selected.date}
              </div>

              <div className="mt-3 text-xs text-bac-muted">Location</div>
              <div className="mt-1 text-sm font-medium text-bac-text">
                {selected.location}
              </div>

              <div className="mt-3 text-xs text-bac-muted">Drill Type</div>
              <div className="mt-1">
                <Badge variant="muted">{selected.drillType}</Badge>
              </div>

              <div className="mt-3 text-xs text-bac-muted">Result</div>
              <div className="mt-1">
                {selected.result === "PASS" && (
                  <Badge variant="success">PASS</Badge>
                )}
                {selected.result === "FAIL" && (
                  <Badge variant="danger">FAIL</Badge>
                )}
                {selected.result === "N/A" && (
                  <Badge variant="muted">N/A</Badge>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
              <div className="text-xs text-bac-muted">Individual</div>
              <div className="mt-1 text-sm font-medium text-bac-text">
                {selected.individualName}
              </div>

              <div className="mt-3 text-xs text-bac-muted">DSP</div>
              <div className="mt-1 text-sm font-medium text-bac-text">
                {selected.dspName}
              </div>

              <div className="mt-3 text-xs text-bac-muted">Shift Time</div>
              <div className="mt-1 text-sm font-medium text-bac-text">
                {selected.shiftTime}
              </div>

              <div className="mt-3 text-xs text-bac-muted">Notes</div>
              <div className="mt-1 rounded-2xl border border-bac-border bg-bac-bg p-3 text-sm text-bac-text">
                {selected.notes || "—"}
              </div>

              <div className="mt-3 text-xs text-bac-muted">Source</div>
              <div className="mt-1">
                <Badge variant="muted">{selected.source}</Badge>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* New Modal (UI only) */}
      <Modal
        open={openNew}
        title="New Fire Drill (UI only)"
        onClose={() => setOpenNew(false)}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs text-bac-muted">Date</div>
            <input
              type="date"
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
              defaultValue="2026-01-05"
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-bac-muted">Drill Type</div>
            <Select
              value={"FIRE"}
              onChange={() => {}}
              options={[
                { value: "FIRE", label: "Fire" },
                { value: "EVAC", label: "Evacuation" },
                { value: "SHELTER", label: "Shelter-in-place" },
                { value: "OTHER", label: "Other" },
              ]}
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-bac-muted">Location</div>
            <Select
              value={"Residential Home"}
              onChange={() => {}}
              options={[
                { value: "Residential Home", label: "Residential Home" },
                { value: "Community", label: "Community" },
                { value: "Day Program", label: "Day Program" },
              ]}
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-bac-muted">Result</div>
            <Select
              value={"PASS"}
              onChange={() => {}}
              options={[
                { value: "PASS", label: "Pass" },
                { value: "FAIL", label: "Fail" },
                { value: "N/A", label: "N/A" },
              ]}
            />
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Notes</div>
            <textarea className="min-h-[120px] w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text outline-none" />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
            onClick={() => setOpenNew(false)}
          >
            Cancel
          </button>
          <button
            className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95"
            onClick={() => alert("UI only. Wire API later: create drill")}
          >
            Create
          </button>
        </div>
      </Modal>
    </div>
  );
}

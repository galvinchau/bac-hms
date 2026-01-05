// app/authorizations/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

type AuthStatus = "ACTIVE" | "PENDING" | "EXPIRED" | "SUSPENDED";
type AuthRow = {
  id: string; // AUTH-xxxx
  individualName: string;
  payer: "ODP" | "CHC" | "PRIVATE" | "OTHER";
  program?: string | null;

  serviceCode: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD

  unitsAuthorized: number;
  unitsUsed: number; // demo
  unitsRemaining: number; // demo

  status: AuthStatus;
  notes?: string | null;

  createdBy?: string | null;
  source: "MANUAL" | "IMPORT";
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
      <div className="w-full max-w-4xl rounded-2xl border border-bac-border bg-bac-bg shadow-xl">
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

// UI demo data only
const DEMO: AuthRow[] = [
  {
    id: "AUTH-4001",
    individualName: "John Doe",
    payer: "ODP",
    program: "ID/A",
    serviceCode: "In-Home",
    startDate: "2026-01-01",
    endDate: "2026-03-31",
    unitsAuthorized: 312,
    unitsUsed: 48,
    unitsRemaining: 264,
    status: "ACTIVE",
    notes: "Quarterly authorization. Monitor utilization weekly.",
    source: "MANUAL",
    createdBy: "Office",
  },
  {
    id: "AUTH-4002",
    individualName: "Emily Stone",
    payer: "CHC",
    program: "CHC",
    serviceCode: "Companion",
    startDate: "2026-01-15",
    endDate: "2026-02-14",
    unitsAuthorized: 80,
    unitsUsed: 26,
    unitsRemaining: 54,
    status: "ACTIVE",
    source: "IMPORT",
    createdBy: "Import",
  },
  {
    id: "AUTH-4003",
    individualName: "Kevin Brown",
    payer: "ODP",
    program: "ID/A",
    serviceCode: "Community",
    startDate: "2025-10-01",
    endDate: "2025-12-31",
    unitsAuthorized: 120,
    unitsUsed: 120,
    unitsRemaining: 0,
    status: "EXPIRED",
    notes: "Expired. Need renewal for next quarter.",
    source: "MANUAL",
    createdBy: "Office",
  },
  {
    id: "AUTH-4004",
    individualName: "Emily Stone",
    payer: "ODP",
    program: "ID/A",
    serviceCode: "In-Home",
    startDate: "2026-02-01",
    endDate: "2026-04-30",
    unitsAuthorized: 280,
    unitsUsed: 0,
    unitsRemaining: 280,
    status: "PENDING",
    notes: "Waiting approval letter.",
    source: "MANUAL",
    createdBy: "Office",
  },
];

export default function AuthorizationsPage() {
  const [tab, setTab] = useState<"AUTH" | "UTIL" | "SETTINGS">("AUTH");

  // Filters (AUTH tab)
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-12-31");
  const [payer, setPayer] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [service, setService] = useState("ALL");
  const [q, setQ] = useState("");

  // Modal
  const [selected, setSelected] = useState<AuthRow | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [openNew, setOpenNew] = useState(false);

  const rows = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return DEMO.filter((r) => {
      // overlap check for date range (simple demo)
      if (from && r.endDate < from) return false;
      if (to && r.startDate > to) return false;

      if (payer !== "ALL" && r.payer !== payer) return false;
      if (status !== "ALL" && r.status !== status) return false;
      if (service !== "ALL" && r.serviceCode !== service) return false;

      if (!qLower) return true;
      const hay = `${r.id} ${r.individualName} ${r.serviceCode} ${r.payer} ${
        r.program ?? ""
      }`.toLowerCase();
      return hay.includes(qLower);
    });
  }, [from, to, payer, status, service, q]);

  const summary = useMemo(() => {
    const count = rows.length;
    const active = rows.filter((r) => r.status === "ACTIVE").length;
    const pending = rows.filter((r) => r.status === "PENDING").length;
    const expired = rows.filter((r) => r.status === "EXPIRED").length;

    const authorized = rows.reduce((a, r) => a + (r.unitsAuthorized || 0), 0);
    const used = rows.reduce((a, r) => a + (r.unitsUsed || 0), 0);
    const remaining = rows.reduce((a, r) => a + (r.unitsRemaining || 0), 0);

    return { count, active, pending, expired, authorized, used, remaining };
  }, [rows]);

  const utilRows = useMemo(() => {
    // UI only: group by individual+service
    const map = new Map<
      string,
      {
        individualName: string;
        serviceCode: string;
        payer: string;
        authorized: number;
        used: number;
        remaining: number;
      }
    >();

    rows.forEach((r) => {
      const key = `${r.individualName}||${r.serviceCode}||${r.payer}`;
      const cur = map.get(key);
      if (!cur) {
        map.set(key, {
          individualName: r.individualName,
          serviceCode: r.serviceCode,
          payer: r.payer,
          authorized: r.unitsAuthorized,
          used: r.unitsUsed,
          remaining: r.unitsRemaining,
        });
      } else {
        cur.authorized += r.unitsAuthorized;
        cur.used += r.unitsUsed;
        cur.remaining += r.unitsRemaining;
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.individualName.localeCompare(b.individualName)
    );
  }, [rows]);

  const openDetails = (r: AuthRow) => {
    setSelected(r);
    setOpenDetail(true);
  };

  return (
    <div className="min-h-[calc(100vh-60px)] bg-bac-bg p-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-semibold text-bac-text">
            Authorizations
          </div>
          <div className="mt-1 text-sm text-bac-muted">
            Track authorized units by payer and service, monitor utilization,
            and prevent overuse.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/billing"
            className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
          >
            Go to Billing
          </Link>

          <button
            className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
            onClick={() => alert("UI only. Wire API later: export")}
          >
            Export
          </button>

          <button
            className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95 active:scale-[0.99]"
            onClick={() => setOpenNew(true)}
          >
            + New Authorization
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["AUTH", "Authorizations"],
            ["UTIL", "Utilization"],
            ["SETTINGS", "Settings"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className={cx(
              "rounded-xl border px-4 py-2 text-sm",
              tab === key
                ? "border-bac-primary bg-bac-primary/15 text-bac-text"
                : "border-bac-border bg-bac-panel text-bac-muted hover:bg-white/5"
            )}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* AUTH TAB */}
      {tab === "AUTH" ? (
        <>
          {/* Filters */}
          <div className="mb-4 rounded-2xl border border-bac-border bg-bac-panel p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">
                  From (overlap)
                </div>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary/40"
                />
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">To (overlap)</div>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary/40"
                />
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">Payer</div>
                <Select
                  value={payer}
                  onChange={setPayer}
                  options={[
                    { value: "ALL", label: "All" },
                    { value: "ODP", label: "ODP" },
                    { value: "CHC", label: "CHC" },
                    { value: "PRIVATE", label: "Private" },
                    { value: "OTHER", label: "Other" },
                  ]}
                />
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">Status</div>
                <Select
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: "ALL", label: "All" },
                    { value: "ACTIVE", label: "Active" },
                    { value: "PENDING", label: "Pending" },
                    { value: "EXPIRED", label: "Expired" },
                    { value: "SUSPENDED", label: "Suspended" },
                  ]}
                />
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">Service</div>
                <Select
                  value={service}
                  onChange={setService}
                  options={[
                    { value: "ALL", label: "All" },
                    { value: "In-Home", label: "In-Home" },
                    { value: "Companion", label: "Companion" },
                    { value: "Community", label: "Community" },
                  ]}
                />
              </div>

              <div className="md:col-span-4">
                <div className="mb-1 text-xs text-bac-muted">Search</div>
                <TextInput
                  value={q}
                  onChange={setQ}
                  placeholder="Search by Individual, Service, Auth ID..."
                />
              </div>

              <div className="md:col-span-12 flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="muted">Records: {summary.count}</Badge>
                <Badge variant="success">Active: {summary.active}</Badge>
                <Badge variant="warning">Pending: {summary.pending}</Badge>
                <Badge variant="danger">Expired: {summary.expired}</Badge>
                <Badge variant="muted">Authorized: {summary.authorized}</Badge>
                <Badge variant="muted">Used: {summary.used}</Badge>
                <Badge variant="muted">Remaining: {summary.remaining}</Badge>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-bac-border bg-bac-panel">
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full text-left text-sm">
                <thead className="border-b border-bac-border text-bac-muted">
                  <tr>
                    <th className="px-4 py-3">Authorization</th>
                    <th className="px-4 py-3">Individual</th>
                    <th className="px-4 py-3">Payer</th>
                    <th className="px-4 py-3">Program</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Start</th>
                    <th className="px-4 py-3">End</th>
                    <th className="px-4 py-3">Authorized</th>
                    <th className="px-4 py-3">Used</th>
                    <th className="px-4 py-3">Remaining</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bac-border">
                  {rows.map((r) => (
                    <tr key={r.id} className="text-bac-text hover:bg-white/3">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.id}</div>
                        <div className="text-xs text-bac-muted">
                          {r.serviceCode}
                        </div>
                      </td>
                      <td className="px-4 py-3">{r.individualName}</td>
                      <td className="px-4 py-3">
                        <Badge variant="muted">{r.payer}</Badge>
                      </td>
                      <td className="px-4 py-3">{r.program ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-lg border border-bac-border bg-bac-bg px-2 py-1 text-xs">
                          {r.serviceCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">{r.startDate}</td>
                      <td className="px-4 py-3">{r.endDate}</td>
                      <td className="px-4 py-3">{r.unitsAuthorized}</td>
                      <td className="px-4 py-3">{r.unitsUsed}</td>
                      <td className="px-4 py-3 font-medium">
                        {r.unitsRemaining}
                      </td>
                      <td className="px-4 py-3">
                        {r.status === "ACTIVE" && (
                          <Badge variant="success">ACTIVE</Badge>
                        )}
                        {r.status === "PENDING" && (
                          <Badge variant="warning">PENDING</Badge>
                        )}
                        {r.status === "EXPIRED" && (
                          <Badge variant="danger">EXPIRED</Badge>
                        )}
                        {r.status === "SUSPENDED" && (
                          <Badge variant="muted">SUSPENDED</Badge>
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
                              alert("UI only. Wire API later: edit/suspend")
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
                        colSpan={13}
                        className="px-4 py-10 text-center text-bac-muted"
                      >
                        No authorizations found for the current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="border-t border-bac-border px-4 py-3 text-xs text-bac-muted">
              Layout-only now. Next step: compute used/remaining from approved
              Visits and block overuse.
            </div>
          </div>
        </>
      ) : null}

      {/* UTIL TAB */}
      {tab === "UTIL" ? (
        <div className="overflow-hidden rounded-2xl border border-bac-border bg-bac-panel">
          <div className="border-b border-bac-border px-5 py-4">
            <div className="text-base font-semibold text-bac-text">
              Utilization (UI demo)
            </div>
            <div className="mt-1 text-sm text-bac-muted">
              Summary by Individual + Service. Later we’ll show weekly trends
              and warnings.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="border-b border-bac-border text-bac-muted">
                <tr>
                  <th className="px-4 py-3">Individual</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Payer</th>
                  <th className="px-4 py-3">Authorized</th>
                  <th className="px-4 py-3">Used</th>
                  <th className="px-4 py-3">Remaining</th>
                  <th className="px-4 py-3">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bac-border">
                {utilRows.map((r) => {
                  const pct =
                    r.authorized === 0
                      ? 0
                      : Math.round((r.used / r.authorized) * 100);
                  const badge =
                    pct >= 90 ? "danger" : pct >= 75 ? "warning" : "success";

                  return (
                    <tr
                      key={`${r.individualName}-${r.serviceCode}-${r.payer}`}
                      className="text-bac-text"
                    >
                      <td className="px-4 py-3">{r.individualName}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-lg border border-bac-border bg-bac-bg px-2 py-1 text-xs">
                          {r.serviceCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="muted">{r.payer}</Badge>
                      </td>
                      <td className="px-4 py-3">{r.authorized}</td>
                      <td className="px-4 py-3">{r.used}</td>
                      <td className="px-4 py-3 font-medium">{r.remaining}</td>
                      <td className="px-4 py-3">
                        <Badge variant={badge as any}>{pct}%</Badge>
                      </td>
                    </tr>
                  );
                })}

                {utilRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-bac-muted"
                    >
                      No utilization data for current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="border-t border-bac-border px-4 py-3 text-xs text-bac-muted">
            Next: add warnings when Remaining goes below threshold and block
            scheduling above authorization.
          </div>
        </div>
      ) : null}

      {/* SETTINGS TAB */}
      {tab === "SETTINGS" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-6">
            <div className="text-base font-semibold text-bac-text">
              Authorization Settings (UI only)
            </div>
            <div className="mt-2 text-sm text-bac-muted">
              Configure alert thresholds and overuse prevention.
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs text-bac-muted">
                  Warning Threshold (%)
                </div>
                <input
                  defaultValue="75"
                  className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
                />
              </div>
              <div>
                <div className="mb-1 text-xs text-bac-muted">
                  Critical Threshold (%)
                </div>
                <input
                  defaultValue="90"
                  className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">
                  Notes Template
                </div>
                <textarea
                  defaultValue="Authorization is monitored weekly. Please renew before end date to avoid service interruption."
                  className="min-h-[120px] w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text outline-none"
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

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-6">
            <div className="text-base font-semibold text-bac-text">Notes</div>
            <div className="mt-2 text-sm text-bac-muted space-y-2">
              <p>
                Later: used units will be computed from approved/completed
                visits (excluding canceled).
              </p>
              <p>
                Scheduling will show warnings if utilization is high and
                optionally block overuse.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Detail Modal */}
      <Modal
        open={openDetail}
        title="Authorization Details"
        onClose={() => {
          setOpenDetail(false);
          setSelected(null);
        }}
      >
        {!selected ? (
          <div className="text-bac-muted">No authorization selected.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
              <div className="text-xs text-bac-muted">Authorization</div>
              <div className="mt-1 text-sm font-semibold text-bac-text">
                {selected.id}
              </div>

              <div className="mt-3 text-xs text-bac-muted">Individual</div>
              <div className="mt-1 text-sm font-medium text-bac-text">
                {selected.individualName}
              </div>

              <div className="mt-3 text-xs text-bac-muted">Payer</div>
              <div className="mt-1">
                <Badge variant="muted">{selected.payer}</Badge>
              </div>

              <div className="mt-3 text-xs text-bac-muted">Program</div>
              <div className="mt-1 text-sm font-medium text-bac-text">
                {selected.program ?? "—"}
              </div>

              <div className="mt-3 text-xs text-bac-muted">Service</div>
              <div className="mt-1 text-sm font-medium text-bac-text">
                {selected.serviceCode}
              </div>

              <div className="mt-3 text-xs text-bac-muted">Status</div>
              <div className="mt-1">
                <Badge
                  variant={
                    selected.status === "ACTIVE"
                      ? "success"
                      : selected.status === "PENDING"
                      ? "warning"
                      : selected.status === "EXPIRED"
                      ? "danger"
                      : "muted"
                  }
                >
                  {selected.status}
                </Badge>
              </div>
            </div>

            <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
              <div className="text-xs text-bac-muted">Date Range</div>
              <div className="mt-1 text-sm font-medium text-bac-text">
                {selected.startDate} → {selected.endDate}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                  <div className="text-xs text-bac-muted">Authorized</div>
                  <div className="mt-1 text-lg font-semibold text-bac-text">
                    {selected.unitsAuthorized}
                  </div>
                </div>
                <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                  <div className="text-xs text-bac-muted">Used</div>
                  <div className="mt-1 text-lg font-semibold text-bac-text">
                    {selected.unitsUsed}
                  </div>
                </div>
                <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                  <div className="text-xs text-bac-muted">Remaining</div>
                  <div className="mt-1 text-lg font-semibold text-bac-text">
                    {selected.unitsRemaining}
                  </div>
                </div>
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
        title="New Authorization (UI only)"
        onClose={() => setOpenNew(false)}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs text-bac-muted">Individual</div>
            <input
              placeholder="Type individual name..."
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-bac-muted">Payer</div>
            <Select
              value={"ODP"}
              onChange={() => {}}
              options={[
                { value: "ODP", label: "ODP" },
                { value: "CHC", label: "CHC" },
                { value: "PRIVATE", label: "Private" },
                { value: "OTHER", label: "Other" },
              ]}
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-bac-muted">Service</div>
            <Select
              value={"In-Home"}
              onChange={() => {}}
              options={[
                { value: "In-Home", label: "In-Home" },
                { value: "Companion", label: "Companion" },
                { value: "Community", label: "Community" },
              ]}
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-bac-muted">Units Authorized</div>
            <input
              defaultValue="40"
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-bac-muted">Start Date</div>
            <input
              type="date"
              defaultValue="2026-02-01"
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-bac-muted">End Date</div>
            <input
              type="date"
              defaultValue="2026-04-30"
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
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
            onClick={() =>
              alert("UI only. Wire API later: create authorization")
            }
          >
            Create
          </button>
        </div>
      </Modal>
    </div>
  );
}

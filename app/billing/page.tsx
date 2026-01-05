// app/billing/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

type ClaimStatus = "DRAFT" | "SUBMITTED" | "PAID" | "DENIED" | "VOID";
type ClaimRow = {
  id: string; // CL-xxxx
  periodFrom: string; // YYYY-MM-DD
  periodTo: string; // YYYY-MM-DD
  billingDate: string; // YYYY-MM-DD

  payer: "ODP" | "CHC" | "PRIVATE" | "OTHER";
  individualName: string;
  dspName: string;

  serviceCode: string;
  units: number;
  rate: number; // $/unit
  amount: number; // units * rate

  status: ClaimStatus;
  notes?: string | null;

  source: "VISITS" | "MANUAL" | "IMPORT";
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
const DEMO: ClaimRow[] = [
  {
    id: "CL-3001",
    periodFrom: "2026-01-01",
    periodTo: "2026-01-07",
    billingDate: "2026-01-08",
    payer: "ODP",
    individualName: "John Doe",
    dspName: "Anna Smith",
    serviceCode: "In-Home",
    units: 21,
    rate: 17.5,
    amount: 367.5,
    status: "DRAFT",
    source: "VISITS",
  },
  {
    id: "CL-3002",
    periodFrom: "2026-01-01",
    periodTo: "2026-01-07",
    billingDate: "2026-01-08",
    payer: "CHC",
    individualName: "Emily Stone",
    dspName: "Mike Lee",
    serviceCode: "Companion",
    units: 14,
    rate: 18.0,
    amount: 252.0,
    status: "SUBMITTED",
    source: "VISITS",
  },
  {
    id: "CL-3003",
    periodFrom: "2025-12-25",
    periodTo: "2025-12-31",
    billingDate: "2026-01-02",
    payer: "ODP",
    individualName: "Kevin Brown",
    dspName: "Anna Smith",
    serviceCode: "Community",
    units: 8,
    rate: 19.0,
    amount: 152.0,
    status: "PAID",
    source: "IMPORT",
  },
  {
    id: "CL-3004",
    periodFrom: "2025-12-25",
    periodTo: "2025-12-31",
    billingDate: "2026-01-02",
    payer: "ODP",
    individualName: "Emily Stone",
    dspName: "Mike Lee",
    serviceCode: "In-Home",
    units: 6,
    rate: 17.5,
    amount: 105.0,
    status: "DENIED",
    notes: "Missing EVV confirmation. Resubmit with corrected visit.",
    source: "MANUAL",
  },
];

export default function BillingPage() {
  const [tab, setTab] = useState<
    "CLAIMS" | "INVOICES" | "PAYMENTS" | "SETTINGS"
  >("CLAIMS");

  // filters (Claims tab)
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-01-31");
  const [payer, setPayer] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");

  // modal
  const [selected, setSelected] = useState<ClaimRow | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [openNew, setOpenNew] = useState(false);

  const rows = useMemo(() => {
    const qLower = q.trim().toLowerCase();

    return DEMO.filter((r) => {
      if (from && r.billingDate < from) return false;
      if (to && r.billingDate > to) return false;

      if (payer !== "ALL" && r.payer !== payer) return false;
      if (status !== "ALL" && r.status !== status) return false;

      if (!qLower) return true;
      const hay =
        `${r.id} ${r.individualName} ${r.dspName} ${r.serviceCode} ${r.payer}`.toLowerCase();
      return hay.includes(qLower);
    });
  }, [from, to, payer, status, q]);

  const totals = useMemo(() => {
    const count = rows.length;
    const units = rows.reduce((a, r) => a + (r.units || 0), 0);
    const amount = rows.reduce((a, r) => a + (r.amount || 0), 0);

    const draft = rows.filter((r) => r.status === "DRAFT").length;
    const submitted = rows.filter((r) => r.status === "SUBMITTED").length;
    const paid = rows.filter((r) => r.status === "PAID").length;
    const denied = rows.filter((r) => r.status === "DENIED").length;

    return { count, units, amount, draft, submitted, paid, denied };
  }, [rows]);

  const openDetails = (r: ClaimRow) => {
    setSelected(r);
    setOpenDetail(true);
  };

  return (
    <div className="min-h-[calc(100vh-60px)] bg-bac-bg p-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-semibold text-bac-text">Billing</div>
          <div className="mt-1 text-sm text-bac-muted">
            Prepare claims from visits, track submission status, and reconcile
            payments.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/visited-maintenance"
            className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
          >
            Go to Visited Maintenance
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
            + New Claim
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["CLAIMS", "Claims"],
            ["INVOICES", "Invoices"],
            ["PAYMENTS", "Payments"],
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

      {/* CLAIMS TAB */}
      {tab === "CLAIMS" ? (
        <>
          {/* Filters */}
          <div className="mb-4 rounded-2xl border border-bac-border bg-bac-panel p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">
                  Billing Date From
                </div>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary/40"
                />
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">
                  Billing Date To
                </div>
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
                    { value: "DRAFT", label: "Draft" },
                    { value: "SUBMITTED", label: "Submitted" },
                    { value: "PAID", label: "Paid" },
                    { value: "DENIED", label: "Denied" },
                    { value: "VOID", label: "Void" },
                  ]}
                />
              </div>

              <div className="md:col-span-4">
                <div className="mb-1 text-xs text-bac-muted">Search</div>
                <TextInput
                  value={q}
                  onChange={setQ}
                  placeholder="Search by Individual, DSP, Service, Claim ID..."
                />
              </div>

              <div className="md:col-span-12 flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="muted">Claims: {totals.count}</Badge>
                <Badge variant="muted">Units: {totals.units}</Badge>
                <Badge variant="muted">
                  Amount: ${totals.amount.toFixed(2)}
                </Badge>
                <Badge variant="warning">Draft: {totals.draft}</Badge>
                <Badge variant="default">Submitted: {totals.submitted}</Badge>
                <Badge variant="success">Paid: {totals.paid}</Badge>
                <Badge variant="danger">Denied: {totals.denied}</Badge>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-bac-border bg-bac-panel">
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full text-left text-sm">
                <thead className="border-b border-bac-border text-bac-muted">
                  <tr>
                    <th className="px-4 py-3">Claim</th>
                    <th className="px-4 py-3">Billing Date</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Payer</th>
                    <th className="px-4 py-3">Individual</th>
                    <th className="px-4 py-3">DSP</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Units</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3">Amount</th>
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
                      <td className="px-4 py-3">{r.billingDate}</td>
                      <td className="px-4 py-3">
                        {r.periodFrom} → {r.periodTo}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="muted">{r.payer}</Badge>
                      </td>
                      <td className="px-4 py-3">{r.individualName}</td>
                      <td className="px-4 py-3">{r.dspName}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-lg border border-bac-border bg-bac-bg px-2 py-1 text-xs">
                          {r.serviceCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">{r.units}</td>
                      <td className="px-4 py-3">${r.rate.toFixed(2)}</td>
                      <td className="px-4 py-3 font-medium">
                        ${r.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {r.status === "DRAFT" && (
                          <Badge variant="warning">DRAFT</Badge>
                        )}
                        {r.status === "SUBMITTED" && (
                          <Badge variant="default">SUBMITTED</Badge>
                        )}
                        {r.status === "PAID" && (
                          <Badge variant="success">PAID</Badge>
                        )}
                        {r.status === "DENIED" && (
                          <Badge variant="danger">DENIED</Badge>
                        )}
                        {r.status === "VOID" && (
                          <Badge variant="muted">VOID</Badge>
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
                              alert("UI only. Wire API later: submit/void")
                            }
                          >
                            Actions
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
                        No claims found for the current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="border-t border-bac-border px-4 py-3 text-xs text-bac-muted">
              Layout-only now. Next step: generate claims from Visits + link
              denials to Visited Maintenance.
            </div>
          </div>
        </>
      ) : null}

      {/* INVOICES TAB */}
      {tab === "INVOICES" ? (
        <div className="rounded-2xl border border-bac-border bg-bac-panel p-6">
          <div className="text-base font-semibold text-bac-text">Invoices</div>
          <div className="mt-2 text-sm text-bac-muted">
            Layout placeholder. Next: build invoice batches for Private/Other
            payers and export PDF.
          </div>
          <div className="mt-4 rounded-2xl border border-bac-border bg-bac-bg p-4 text-sm text-bac-muted">
            UI only: We will add invoice list + invoice detail + PDF export
            later.
          </div>
        </div>
      ) : null}

      {/* PAYMENTS TAB */}
      {tab === "PAYMENTS" ? (
        <div className="rounded-2xl border border-bac-border bg-bac-panel p-6">
          <div className="text-base font-semibold text-bac-text">Payments</div>
          <div className="mt-2 text-sm text-bac-muted">
            Layout placeholder. Next: import remittance (835) or manual payment
            posting, then match to claims.
          </div>
          <div className="mt-4 rounded-2xl border border-bac-border bg-bac-bg p-4 text-sm text-bac-muted">
            UI only: We will add payment posting + reconciliation later.
          </div>
        </div>
      ) : null}

      {/* SETTINGS TAB */}
      {tab === "SETTINGS" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-6">
            <div className="text-base font-semibold text-bac-text">
              Billing Settings (UI only)
            </div>
            <div className="mt-2 text-sm text-bac-muted">
              Configure payer rules, claim numbering, and export formats.
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs text-bac-muted">
                  Default Claim Prefix
                </div>
                <input
                  defaultValue="CL-"
                  className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
                />
              </div>
              <div>
                <div className="mb-1 text-xs text-bac-muted">Next Sequence</div>
                <input
                  defaultValue="3005"
                  className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">
                  Notes Template
                </div>
                <textarea
                  defaultValue="Generated from completed visits. Review denied items and correct EVV/units before resubmission."
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
                Billing will later pull from Visits (Completed, non-canceled),
                apply service rates, and group into weekly/biweekly claim
                batches.
              </p>
              <p>
                Denied claims will link back to Visited Maintenance to correct
                EVV or units.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Claim Detail Modal */}
      <Modal
        open={openDetail}
        title="Claim Details"
        onClose={() => {
          setOpenDetail(false);
          setSelected(null);
        }}
      >
        {!selected ? (
          <div className="text-bac-muted">No claim selected.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
              <div className="text-xs text-bac-muted">Claim</div>
              <div className="mt-1 text-sm font-semibold text-bac-text">
                {selected.id}
              </div>

              <div className="mt-3 text-xs text-bac-muted">Payer</div>
              <div className="mt-1">
                <Badge variant="muted">{selected.payer}</Badge>
              </div>

              <div className="mt-3 text-xs text-bac-muted">Billing Date</div>
              <div className="mt-1 text-sm font-medium text-bac-text">
                {selected.billingDate}
              </div>

              <div className="mt-3 text-xs text-bac-muted">Period</div>
              <div className="mt-1 text-sm font-medium text-bac-text">
                {selected.periodFrom} → {selected.periodTo}
              </div>

              <div className="mt-3 text-xs text-bac-muted">Status</div>
              <div className="mt-1">
                <Badge
                  variant={
                    selected.status === "PAID"
                      ? "success"
                      : selected.status === "DENIED"
                      ? "danger"
                      : selected.status === "DRAFT"
                      ? "warning"
                      : "muted"
                  }
                >
                  {selected.status}
                </Badge>
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

              <div className="mt-3 text-xs text-bac-muted">Service</div>
              <div className="mt-1 text-sm font-medium text-bac-text">
                {selected.serviceCode}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                  <div className="text-xs text-bac-muted">Units</div>
                  <div className="mt-1 text-lg font-semibold text-bac-text">
                    {selected.units}
                  </div>
                </div>
                <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                  <div className="text-xs text-bac-muted">Rate</div>
                  <div className="mt-1 text-lg font-semibold text-bac-text">
                    ${selected.rate.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                  <div className="text-xs text-bac-muted">Amount</div>
                  <div className="mt-1 text-lg font-semibold text-bac-text">
                    ${selected.amount.toFixed(2)}
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

      {/* New Claim Modal (UI only) */}
      <Modal
        open={openNew}
        title="New Claim (UI only)"
        onClose={() => setOpenNew(false)}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs text-bac-muted">Billing Date</div>
            <input
              type="date"
              defaultValue="2026-01-15"
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
            onClick={() => alert("UI only. Wire API later: create claim")}
          >
            Create
          </button>
        </div>
      </Modal>
    </div>
  );
}

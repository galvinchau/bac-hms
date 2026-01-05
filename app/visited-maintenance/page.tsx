// app/visited-maintenance/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

type VisitRow = {
  id: string;
  date: string; // YYYY-MM-DD
  individualName: string;
  dspName: string;
  serviceCode: string;

  plannedStart: string; // HH:mm
  plannedEnd: string; // HH:mm

  checkIn: string | null; // HH:mm
  checkOut: string | null; // HH:mm

  unitsPlanned: number;
  unitsActual: number;

  status: "OPEN" | "COMPLETED" | "CANCELED";
  cancelReason?: string | null;

  source: "SCHEDULE" | "MOBILE" | "MANUAL";
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

function IconButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-bac-border bg-bac-panel text-bac-text hover:bg-white/5 active:scale-[0.98]"
    >
      {children}
    </button>
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
      <div className="w-full max-w-2xl rounded-2xl border border-bac-border bg-bac-bg shadow-xl">
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

// ✅ Demo data (UI only). Replace later with API fetch.
const DEMO: VisitRow[] = [
  {
    id: "V-1001",
    date: "2026-01-03",
    individualName: "John Doe",
    dspName: "Anna Smith",
    serviceCode: "In-Home",
    plannedStart: "09:00",
    plannedEnd: "12:00",
    checkIn: "09:05",
    checkOut: "12:02",
    unitsPlanned: 3,
    unitsActual: 3,
    status: "COMPLETED",
    source: "MOBILE",
  },
  {
    id: "V-1002",
    date: "2026-01-03",
    individualName: "Emily Stone",
    dspName: "Mike Lee",
    serviceCode: "Companion",
    plannedStart: "13:00",
    plannedEnd: "15:00",
    checkIn: null,
    checkOut: null,
    unitsPlanned: 2,
    unitsActual: 0,
    status: "CANCELED",
    cancelReason: "Individual not available",
    source: "SCHEDULE",
  },
  {
    id: "V-1003",
    date: "2026-01-04",
    individualName: "Kevin Brown",
    dspName: "Anna Smith",
    serviceCode: "Community",
    plannedStart: "10:00",
    plannedEnd: "11:00",
    checkIn: null,
    checkOut: null,
    unitsPlanned: 1,
    unitsActual: 0,
    status: "OPEN",
    source: "SCHEDULE",
  },
];

export default function VisitedMaintenancePage() {
  // Filters
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-01-07");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [source, setSource] = useState("ALL");

  // Selection / edit
  const [selected, setSelected] = useState<VisitRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const rows = useMemo(() => {
    // UI demo filter only
    const qLower = q.trim().toLowerCase();
    return DEMO.filter((r) => {
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;

      if (status !== "ALL" && r.status !== status) return false;
      if (source !== "ALL" && r.source !== source) return false;

      if (!qLower) return true;
      const hay =
        `${r.id} ${r.individualName} ${r.dspName} ${r.serviceCode}`.toLowerCase();
      return hay.includes(qLower);
    });
  }, [from, to, q, status, source]);

  const summary = useMemo(() => {
    const total = rows.length;
    const canceled = rows.filter((r) => r.status === "CANCELED").length;
    const open = rows.filter((r) => r.status === "OPEN").length;
    const completed = rows.filter((r) => r.status === "COMPLETED").length;

    const plannedUnits = rows.reduce((a, r) => a + (r.unitsPlanned || 0), 0);
    const actualUnits = rows.reduce((a, r) => a + (r.unitsActual || 0), 0);

    return { total, canceled, open, completed, plannedUnits, actualUnits };
  }, [rows]);

  const onOpenEdit = (r: VisitRow) => {
    setSelected(r);
    setEditOpen(true);
  };

  return (
    <div className="min-h-[calc(100vh-60px)] bg-bac-bg p-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-semibold text-bac-text">
            Visited Maintenance
          </div>
          <div className="mt-1 text-sm text-bac-muted">
            Search, review, and correct visit records (Check-in/out, Units,
            Canceled).
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/schedule"
            className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
          >
            Go to Schedule
          </Link>
          <button
            className="rounded-xl border border-bac-border bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95 active:scale-[0.99]"
            onClick={() => alert("UI only. Wire API later: export CSV/PDF")}
          >
            Export
          </button>
        </div>
      </div>

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

          <div className="md:col-span-3">
            <div className="mb-1 text-xs text-bac-muted">Status</div>
            <Select
              value={status}
              onChange={setStatus}
              options={[
                { value: "ALL", label: "All" },
                { value: "OPEN", label: "Open" },
                { value: "COMPLETED", label: "Completed" },
                { value: "CANCELED", label: "Canceled" },
              ]}
            />
          </div>

          <div className="md:col-span-3">
            <div className="mb-1 text-xs text-bac-muted">Source</div>
            <Select
              value={source}
              onChange={setSource}
              options={[
                { value: "ALL", label: "All" },
                { value: "SCHEDULE", label: "Schedule" },
                { value: "MOBILE", label: "Mobile" },
                { value: "MANUAL", label: "Manual" },
              ]}
            />
          </div>

          <div className="md:col-span-4">
            <div className="mb-1 text-xs text-bac-muted">Search</div>
            <TextInput
              value={q}
              onChange={setQ}
              placeholder="Search by Individual, DSP, Service, Visit ID..."
            />
          </div>

          <div className="md:col-span-12 flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="muted">Total: {summary.total}</Badge>
            <Badge variant="success">Completed: {summary.completed}</Badge>
            <Badge variant="warning">Open: {summary.open}</Badge>
            <Badge variant="danger">Canceled: {summary.canceled}</Badge>
            <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
              <span className="text-bac-muted">
                Planned Units:{" "}
                <span className="text-bac-text">{summary.plannedUnits}</span>
              </span>
              <span className="text-bac-muted">
                Actual Units:{" "}
                <span className="text-bac-text">{summary.actualUnits}</span>
              </span>
            </div>
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
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Planned</th>
                <th className="px-4 py-3">Visited</th>
                <th className="px-4 py-3">Units</th>
                <th className="px-4 py-3">Status</th>
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
                  <td className="px-4 py-3">
                    <span className="rounded-lg border border-bac-border bg-bac-bg px-2 py-1 text-xs">
                      {r.serviceCode}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.plannedStart} - {r.plannedEnd}
                  </td>
                  <td className="px-4 py-3">
                    {r.checkIn && r.checkOut ? (
                      <span>
                        {r.checkIn} - {r.checkOut}
                      </span>
                    ) : (
                      <span className="text-bac-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-bac-muted text-xs">
                      Planned / Actual
                    </div>
                    <div className="font-medium">
                      {r.unitsPlanned} / {r.unitsActual}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "COMPLETED" && (
                      <Badge variant="success">Completed</Badge>
                    )}
                    {r.status === "OPEN" && (
                      <Badge variant="warning">Open</Badge>
                    )}
                    {r.status === "CANCELED" && (
                      <div className="flex flex-col gap-1">
                        <Badge variant="danger">Canceled</Badge>
                        {r.cancelReason ? (
                          <span className="text-xs text-bac-muted line-clamp-2">
                            {r.cancelReason}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="muted">{r.source}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <IconButton title="Edit" onClick={() => onOpenEdit(r)}>
                        ✏️
                      </IconButton>
                      <IconButton
                        title="View Service Note (Reports)"
                        onClick={() =>
                          alert("UI only. Wire link to reports later.")
                        }
                      >
                        📄
                      </IconButton>
                      <IconButton
                        title="Fix Units"
                        onClick={() =>
                          alert("UI only. Wire API later: recalc units")
                        }
                      >
                        🧮
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}

              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-bac-muted"
                  >
                    No records found for the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-bac-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-bac-muted">
            Tip: use Visited Maintenance to correct missing check-in/out, units,
            and cancellation details.
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text hover:bg-white/5"
              onClick={() => alert("UI only. Add pagination later.")}
            >
              Prev
            </button>
            <button
              className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text hover:bg-white/5"
              onClick={() => alert("UI only. Add pagination later.")}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        title="Edit Visit"
        onClose={() => {
          setEditOpen(false);
          setSelected(null);
        }}
      >
        {!selected ? (
          <div className="text-bac-muted">No row selected.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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

                <div className="mt-3 text-xs text-bac-muted">Date</div>
                <div className="mt-1 text-sm font-medium text-bac-text">
                  {selected.date}
                </div>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
                <div className="text-xs text-bac-muted">Planned</div>
                <div className="mt-1 text-sm font-medium text-bac-text">
                  {selected.plannedStart} - {selected.plannedEnd}
                </div>

                <div className="mt-3 text-xs text-bac-muted">
                  Visited (edit later)
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <div className="mb-1 text-xs text-bac-muted">Check-in</div>
                    <input
                      className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
                      placeholder="HH:mm"
                      defaultValue={selected.checkIn ?? ""}
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-bac-muted">Check-out</div>
                    <input
                      className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
                      placeholder="HH:mm"
                      defaultValue={selected.checkOut ?? ""}
                    />
                  </div>
                </div>

                <div className="mt-3 text-xs text-bac-muted">Status</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge
                    variant={selected.status === "OPEN" ? "warning" : "muted"}
                  >
                    Open
                  </Badge>
                  <Badge
                    variant={
                      selected.status === "COMPLETED" ? "success" : "muted"
                    }
                  >
                    Completed
                  </Badge>
                  <Badge
                    variant={
                      selected.status === "CANCELED" ? "danger" : "muted"
                    }
                  >
                    Canceled
                  </Badge>
                </div>

                {selected.status === "CANCELED" ? (
                  <div className="mt-3">
                    <div className="mb-1 text-xs text-bac-muted">
                      Cancel Reason
                    </div>
                    <textarea
                      className="min-h-[90px] w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text outline-none"
                      defaultValue={selected.cancelReason ?? ""}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
                onClick={() => {
                  setEditOpen(false);
                  setSelected(null);
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95 active:scale-[0.99]"
                onClick={() =>
                  alert("UI only. Wire API later: save visit updates")
                }
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

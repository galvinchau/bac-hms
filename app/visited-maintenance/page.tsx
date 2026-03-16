"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type VisitStatus = "OPEN" | "COMPLETED" | "CANCELED";
type VisitSource = "SCHEDULE" | "MOBILE" | "MANUAL";
type ReviewTab =
  | "ALL"
  | "NEEDS_REVIEW"
  | "MISSING_CLOCK"
  | "UNIT_VARIANCE"
  | "CANCELED"
  | "OPEN";

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

  status: VisitStatus;
  cancelReason?: string | null;

  source: VisitSource;

  noteLinked?: boolean;
  reviewed?: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function toMinutes(hhmm: string | null | undefined) {
  if (!hhmm) return null;
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

function diffMinutes(start: string | null | undefined, end: string | null | undefined) {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s == null || e == null) return null;
  if (e >= s) return e - s;
  return e + 24 * 60 - s;
}

function formatMinutes(mins: number | null) {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function fmtDateLabel(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

function Badge({
  variant,
  children,
  className,
}: {
  variant: "default" | "success" | "warning" | "danger" | "muted" | "info";
  children: React.ReactNode;
  className?: string;
}) {
  const cls =
    variant === "success"
      ? "bg-bac-green/15 text-bac-green border-bac-green/30"
      : variant === "warning"
        ? "bg-yellow-500/15 text-yellow-200 border-yellow-500/30"
        : variant === "danger"
          ? "bg-bac-red/15 text-bac-red border-bac-red/30"
          : variant === "info"
            ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
            : variant === "muted"
              ? "bg-white/5 text-bac-muted border-bac-border"
              : "bg-white/10 text-bac-text border-bac-border";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        cls,
        className
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
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cx(
        "h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none focus:ring-2 focus:ring-bac-primary/40",
        className
      )}
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

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cx(
        "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm",
        checked
          ? "border-bac-primary bg-bac-primary/15 text-bac-text"
          : "border-bac-border bg-bac-panel text-bac-muted hover:bg-white/5"
      )}
    >
      <span
        className={cx(
          "inline-block h-2.5 w-2.5 rounded-full",
          checked ? "bg-bac-primary" : "bg-bac-muted"
        )}
      />
      {label}
    </button>
  );
}

function StatCard({
  title,
  value,
  sub,
  tone = "default",
}: {
  title: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const toneCls =
    tone === "success"
      ? "border-bac-green/30 bg-bac-green/8"
      : tone === "warning"
        ? "border-yellow-500/30 bg-yellow-500/8"
        : tone === "danger"
          ? "border-bac-red/30 bg-bac-red/8"
          : tone === "info"
            ? "border-sky-500/30 bg-sky-500/8"
            : "border-bac-border bg-bac-panel";

  return (
    <div className={cx("rounded-2xl border p-4", toneCls)}>
      <div className="text-xs uppercase tracking-wide text-bac-muted">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-bac-text">{value}</div>
      {sub ? <div className="mt-1 text-xs text-bac-muted">{sub}</div> : null}
    </div>
  );
}

function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
        active
          ? "border-bac-primary bg-bac-primary/15 text-bac-text"
          : "border-bac-border bg-bac-panel text-bac-muted hover:bg-white/5"
      )}
    >
      <span>{label}</span>
      {typeof count === "number" ? (
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-bac-text">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function SectionCard({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-bac-border bg-bac-panel">
      <div className="flex flex-col gap-3 border-b border-bac-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-bac-text">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-bac-muted">{subtitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
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
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-bac-border bg-bac-bg shadow-xl">
        <div className="flex items-center justify-between border-b border-bac-border px-5 py-4">
          <div className="text-base font-semibold text-bac-text">{title}</div>
          <button
            onClick={onClose}
            className="rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text hover:bg-white/5"
          >
            Close
          </button>
        </div>
        <div className="max-h-[calc(90vh-70px)] overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function RowActionsMenu({
  open,
  onToggle,
  onClose,
  onViewEdit,
  onOpenIndividual,
  onOpenDsp,
  onOpenSchedule,
  onOpenReport,
  onRecalculateUnits,
  onMarkReviewed,
  onDeleteVisit,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onViewEdit: () => void;
  onOpenIndividual: () => void;
  onOpenDsp: () => void;
  onOpenSchedule: () => void;
  onOpenReport: () => void;
  onRecalculateUnits: () => void;
  onMarkReviewed: () => void;
  onDeleteVisit: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        title="Actions"
        onClick={onToggle}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-bac-border bg-bac-panel text-lg font-semibold text-bac-text hover:bg-white/5 active:scale-[0.98]"
      >
        ⋯
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-2xl border border-bac-border bg-bac-panel shadow-2xl">
          <div className="border-b border-bac-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-bac-muted">
            Visit Actions
          </div>

          <button
            type="button"
            onClick={() => {
              onViewEdit();
              onClose();
            }}
            className="flex w-full items-center px-4 py-3 text-left text-sm text-bac-text hover:bg-white/5"
          >
            View / Edit Visit Details
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenIndividual();
              onClose();
            }}
            className="flex w-full items-center px-4 py-3 text-left text-sm text-bac-text hover:bg-white/5"
          >
            Open Individual Details
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenDsp();
              onClose();
            }}
            className="flex w-full items-center px-4 py-3 text-left text-sm text-bac-text hover:bg-white/5"
          >
            Open DSP Details
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenSchedule();
              onClose();
            }}
            className="flex w-full items-center px-4 py-3 text-left text-sm text-bac-text hover:bg-white/5"
          >
            Open Schedule
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenReport();
              onClose();
            }}
            className="flex w-full items-center px-4 py-3 text-left text-sm text-bac-text hover:bg-white/5"
          >
            Open Related Report
          </button>

          <div className="border-t border-bac-border" />

          <button
            type="button"
            onClick={() => {
              onRecalculateUnits();
              onClose();
            }}
            className="flex w-full items-center px-4 py-3 text-left text-sm text-bac-text hover:bg-white/5"
          >
            Recalculate Units
          </button>

          <button
            type="button"
            onClick={() => {
              onMarkReviewed();
              onClose();
            }}
            className="flex w-full items-center px-4 py-3 text-left text-sm text-bac-text hover:bg-white/5"
          >
            Mark as Reviewed
          </button>

          <div className="border-t border-bac-border" />

          <button
            type="button"
            onClick={() => {
              onDeleteVisit();
              onClose();
            }}
            className="flex w-full items-center px-4 py-3 text-left text-sm text-bac-red hover:bg-bac-red/10"
          >
            Delete Visit
          </button>
        </div>
      ) : null}
    </div>
  );
}

function getVisitMeta(row: VisitRow) {
  const plannedMinutes = diffMinutes(row.plannedStart, row.plannedEnd);
  const actualMinutes = diffMinutes(row.checkIn, row.checkOut);

  const missingClock =
    row.status !== "CANCELED" && (!row.checkIn || !row.checkOut);

  const unitVariance = (row.unitsActual || 0) - (row.unitsPlanned || 0);
  const hasUnitVariance = unitVariance !== 0;

  const timeVariance =
    plannedMinutes != null && actualMinutes != null
      ? actualMinutes - plannedMinutes
      : null;

  const needsReview =
    row.status === "CANCELED" ||
    row.status === "OPEN" ||
    missingClock ||
    hasUnitVariance ||
    row.source === "MANUAL";

  return {
    plannedMinutes,
    actualMinutes,
    missingClock,
    unitVariance,
    hasUnitVariance,
    timeVariance,
    needsReview,
  };
}

function getRiskFlags(row: VisitRow) {
  const meta = getVisitMeta(row);

  const missingCheckOut = Boolean(row.checkIn && !row.checkOut);
  const unitVarianceOver2 = Math.abs(meta.unitVariance) > 2;
  const visitOver16h = (meta.actualMinutes ?? 0) > 16 * 60;
  const manualEdit = row.source === "MANUAL";
  const canceledWithUnits = row.status === "CANCELED" && (row.unitsActual || 0) > 0;

  const reasons = [
    missingCheckOut ? "Missing check-out" : null,
    unitVarianceOver2 ? "Unit variance > 2" : null,
    visitOver16h ? "Visit > 16h" : null,
    manualEdit ? "Manual edit" : null,
    canceledWithUnits ? "Canceled but still has actual units" : null,
  ].filter(Boolean) as string[];

  return {
    missingCheckOut,
    unitVarianceOver2,
    visitOver16h,
    manualEdit,
    canceledWithUnits,
    isHighRisk: reasons.length > 0,
    reasons,
  };
}

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
    noteLinked: true,
    reviewed: true,
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
    noteLinked: false,
    reviewed: false,
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
    noteLinked: false,
    reviewed: false,
  },
  {
    id: "V-1004",
    date: "2026-01-04",
    individualName: "Liam Carter",
    dspName: "Sophie Hill",
    serviceCode: "Respite",
    plannedStart: "08:00",
    plannedEnd: "10:00",
    checkIn: "08:04",
    checkOut: "09:10",
    unitsPlanned: 2,
    unitsActual: 1,
    status: "COMPLETED",
    source: "MOBILE",
    noteLinked: true,
    reviewed: false,
  },
  {
    id: "V-1005",
    date: "2026-01-05",
    individualName: "Grace Walker",
    dspName: "Mike Lee",
    serviceCode: "Companion",
    plannedStart: "14:00",
    plannedEnd: "17:00",
    checkIn: "14:01",
    checkOut: "17:35",
    unitsPlanned: 3,
    unitsActual: 4,
    status: "COMPLETED",
    source: "MANUAL",
    noteLinked: true,
    reviewed: false,
  },
  {
    id: "V-1006",
    date: "2026-01-06",
    individualName: "Noah Adams",
    dspName: "Anna Smith",
    serviceCode: "In-Home",
    plannedStart: "18:00",
    plannedEnd: "20:00",
    checkIn: "18:00",
    checkOut: null,
    unitsPlanned: 2,
    unitsActual: 0,
    status: "OPEN",
    source: "MOBILE",
    noteLinked: false,
    reviewed: false,
  },
];

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function sevenDaysAgoISO() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export default function VisitedMaintenancePage() {
  const [from, setFrom] = useState(sevenDaysAgoISO());
  const [to, setTo] = useState(todayISO());
  const [q, setQ] = useState("");

  const [status, setStatus] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [dsp, setDsp] = useState("ALL");
  const [service, setService] = useState("ALL");
  const [sortBy, setSortBy] = useState("DATE_DESC");

  const [onlyExceptions, setOnlyExceptions] = useState(false);
  const [onlyUnreviewed, setOnlyUnreviewed] = useState(false);

  const [tab, setTab] = useState<ReviewTab>("ALL");

  const [rowsData, setRowsData] = useState<VisitRow[]>(DEMO);
  const [selected, setSelected] = useState<VisitRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [inlineFixId, setInlineFixId] = useState<string | null>(null);
  const [fixCheckIn, setFixCheckIn] = useState("");
  const [fixCheckOut, setFixCheckOut] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [bulkReviewing, setBulkReviewing] = useState(false);

  const dspOptions = useMemo(() => {
    const arr = Array.from(new Set(rowsData.map((r) => r.dspName))).sort();
    return [{ value: "ALL", label: "All DSPs" }].concat(
      arr.map((v) => ({ value: v, label: v }))
    );
  }, [rowsData]);

  const serviceOptions = useMemo(() => {
    const arr = Array.from(new Set(rowsData.map((r) => r.serviceCode))).sort();
    return [{ value: "ALL", label: "All Services" }].concat(
      arr.map((v) => ({ value: v, label: v }))
    );
  }, [rowsData]);

  useEffect(() => {
    let cancelled = false;

    async function loadVisits() {
      if (!API_BASE) return;

      setLoading(true);
      setLoadError("");

      try {
        const res = await fetch(`${API_BASE}/visited-maintenance/visits`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Failed to load visits (${res.status})`);
        }

        const data = await res.json();

        if (!cancelled && Array.isArray(data)) {
          setRowsData(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setLoadError(err?.message || "Failed to load visits.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadVisits();

    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const qLower = q.trim().toLowerCase();

    const filtered = rowsData.filter((r) => {
      const meta = getVisitMeta(r);

      if (from && r.date < from) return false;
      if (to && r.date > to) return false;

      if (status !== "ALL" && r.status !== status) return false;
      if (source !== "ALL" && r.source !== source) return false;
      if (dsp !== "ALL" && r.dspName !== dsp) return false;
      if (service !== "ALL" && r.serviceCode !== service) return false;

      if (onlyExceptions && !meta.needsReview) return false;
      if (onlyUnreviewed && r.reviewed) return false;

      if (tab === "NEEDS_REVIEW" && !meta.needsReview) return false;
      if (tab === "MISSING_CLOCK" && !meta.missingClock) return false;
      if (tab === "UNIT_VARIANCE" && !meta.hasUnitVariance) return false;
      if (tab === "CANCELED" && r.status !== "CANCELED") return false;
      if (tab === "OPEN" && r.status !== "OPEN") return false;

      if (!qLower) return true;
      const hay =
        `${r.id} ${r.individualName} ${r.dspName} ${r.serviceCode} ${r.source} ${r.status}`.toLowerCase();
      return hay.includes(qLower);
    });

    const sorted = [...filtered].sort((a, b) => {
      const ma = getVisitMeta(a);
      const mb = getVisitMeta(b);

      switch (sortBy) {
        case "DATE_ASC":
          return `${a.date} ${a.plannedStart}`.localeCompare(`${b.date} ${b.plannedStart}`);
        case "DATE_DESC":
          return `${b.date} ${b.plannedStart}`.localeCompare(`${a.date} ${a.plannedStart}`);
        case "INDIVIDUAL_ASC":
          return a.individualName.localeCompare(b.individualName);
        case "DSP_ASC":
          return a.dspName.localeCompare(b.dspName);
        case "UNITS_VARIANCE_DESC":
          return Math.abs(mb.unitVariance) - Math.abs(ma.unitVariance);
        case "EXCEPTION_FIRST":
          return Number(mb.needsReview) - Number(ma.needsReview);
        default:
          return 0;
      }
    });

    return sorted;
  }, [
    from,
    to,
    q,
    status,
    source,
    dsp,
    service,
    sortBy,
    onlyExceptions,
    onlyUnreviewed,
    tab,
    rowsData,
  ]);

  const summary = useMemo(() => {
    const total = rows.length;
    const canceled = rows.filter((r) => r.status === "CANCELED").length;
    const open = rows.filter((r) => r.status === "OPEN").length;
    const completed = rows.filter((r) => r.status === "COMPLETED").length;

    const plannedUnits = rows.reduce((a, r) => a + (r.unitsPlanned || 0), 0);
    const actualUnits = rows.reduce((a, r) => a + (r.unitsActual || 0), 0);

    const missingClock = rows.filter((r) => getVisitMeta(r).missingClock).length;
    const unitVariance = rows.filter((r) => getVisitMeta(r).hasUnitVariance).length;
    const needsReview = rows.filter((r) => getVisitMeta(r).needsReview).length;
    const unreviewed = rows.filter((r) => !r.reviewed).length;

    return {
      total,
      canceled,
      open,
      completed,
      plannedUnits,
      actualUnits,
      missingClock,
      unitVariance,
      needsReview,
      unreviewed,
    };
  }, [rows]);

  const allSummary = useMemo(() => {
    const base = rowsData;
    return {
      all: base.length,
      needsReview: base.filter((r) => getVisitMeta(r).needsReview).length,
      missingClock: base.filter((r) => getVisitMeta(r).missingClock).length,
      unitVariance: base.filter((r) => getVisitMeta(r).hasUnitVariance).length,
      canceled: base.filter((r) => r.status === "CANCELED").length,
      open: base.filter((r) => r.status === "OPEN").length,
    };
  }, [rowsData]);

  const visibleIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const selectedVisibleCount = selectedIds.filter((id) => visibleIds.includes(id)).length;
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const onOpenEdit = (r: VisitRow) => {
    setSelected(r);
    setEditOpen(true);
  };

  const clearFilters = () => {
    setFrom(sevenDaysAgoISO());
    setTo(todayISO());
    setQ("");
    setStatus("ALL");
    setSource("ALL");
    setDsp("ALL");
    setService("ALL");
    setSortBy("DATE_DESC");
    setOnlyExceptions(false);
    setOnlyUnreviewed(false);
    setTab("ALL");
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const startInlineFix = (row: VisitRow) => {
    setInlineFixId(row.id);
    setFixCheckIn(row.checkIn ?? "");
    setFixCheckOut(row.checkOut ?? "");
    if (!expandedIds.includes(row.id)) {
      setExpandedIds((prev) => [...prev, row.id]);
    }
  };

  const cancelInlineFix = () => {
    setInlineFixId(null);
    setFixCheckIn("");
    setFixCheckOut("");
  };

  const saveInlineFix = () => {
    if (!inlineFixId) return;

    setRowsData((prev) =>
      prev.map((row) =>
        row.id === inlineFixId
          ? {
              ...row,
              checkIn: fixCheckIn || null,
              checkOut: fixCheckOut || null,
            }
          : row
      )
    );

    setInlineFixId(null);
    setFixCheckIn("");
    setFixCheckOut("");
  };

  const markSelectedReviewed = async () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one visit first.");
      return;
    }

    if (!API_BASE) {
      setRowsData((prev) =>
        prev.map((row) =>
          selectedIds.includes(row.id) ? { ...row, reviewed: true } : row
        )
      );
      setSelectedIds([]);
      return;
    }

    try {
      setBulkReviewing(true);

      const idsToReview = [...selectedIds];

      const res = await fetch(`${API_BASE}/visited-maintenance/visits/review-bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ visitIds: idsToReview }),
      });

      if (!res.ok) {
        throw new Error(`Failed to mark selected visits as reviewed (${res.status})`);
      }

      setRowsData((prev) =>
        prev.map((row) =>
          idsToReview.includes(row.id) ? { ...row, reviewed: true } : row
        )
      );

      if (selected && idsToReview.includes(selected.id)) {
        setSelected((prev) => (prev ? { ...prev, reviewed: true } : prev));
      }

      setSelectedIds([]);
    } catch (err: any) {
      alert(err?.message || "Failed to mark selected visits as reviewed.");
    } finally {
      setBulkReviewing(false);
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const markOneReviewed = async (id: string) => {
    if (!API_BASE) {
      setRowsData((prev) =>
        prev.map((row) => (row.id === id ? { ...row, reviewed: true } : row))
      );
      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, reviewed: true } : prev));
      }
      return;
    }

    try {
      setReviewingId(id);

      const res = await fetch(`${API_BASE}/visited-maintenance/visits/${id}/review`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error(`Failed to mark visit as reviewed (${res.status})`);
      }

      setRowsData((prev) =>
        prev.map((row) => (row.id === id ? { ...row, reviewed: true } : row))
      );

      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, reviewed: true } : prev));
      }
    } catch (err: any) {
      alert(err?.message || "Failed to mark visit as reviewed.");
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] bg-bac-bg px-4 py-6 xl:px-6">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-2xl font-semibold text-bac-text">
            Visited Maintenance
          </div>
          <div className="mt-1 max-w-3xl text-sm text-bac-muted">
            Review visit execution against the planned schedule. Identify missing
            check-in/out, canceled shifts, unit mismatches, manual adjustments,
            and records that need office review before billing or payroll.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/schedule"
            className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
          >
            Go to Schedule
          </Link>

          <button
            className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5 disabled:opacity-60"
            onClick={markSelectedReviewed}
            disabled={bulkReviewing}
          >
            {bulkReviewing ? "Saving..." : "Bulk Actions"}
          </button>

          <button
            className="rounded-xl border border-bac-border bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95 active:scale-[0.99]"
            onClick={() => alert("UI only. Wire API later: export CSV / PDF")}
          >
            Export
          </button>
        </div>
      </div>

      {loadError ? (
        <div className="mb-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          Failed to load live API data. Showing current local data. {loadError}
        </div>
      ) : null}

      {selectedIds.length > 0 ? (
        <div className="mb-4 rounded-2xl border border-bac-primary/40 bg-bac-primary/10 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-bac-text">
              <span className="font-semibold">{selectedIds.length}</span> visit(s) selected.
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={markSelectedReviewed}
                disabled={bulkReviewing}
                className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
              >
                {bulkReviewing ? "Saving..." : "Mark selected as reviewed"}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
              >
                Clear selection
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Total Visits" value={summary.total} sub="Current filtered result" />
        <StatCard
          title="Completed"
          value={summary.completed}
          sub="Ready / mostly clean"
          tone="success"
        />
        <StatCard title="Open" value={summary.open} sub="Still incomplete" tone="warning" />
        <StatCard
          title="Canceled"
          value={summary.canceled}
          sub="Need cancel verification"
          tone="danger"
        />
        <StatCard
          title="Missing Clock"
          value={summary.missingClock}
          sub="Check-in or check-out missing"
          tone="info"
        />
        <StatCard
          title="Unit Variance"
          value={summary.unitVariance}
          sub={`Planned ${summary.plannedUnits} / Actual ${summary.actualUnits}`}
          tone="default"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <TabButton
          active={tab === "ALL"}
          label="All"
          count={allSummary.all}
          onClick={() => setTab("ALL")}
        />
        <TabButton
          active={tab === "NEEDS_REVIEW"}
          label="Needs Review"
          count={allSummary.needsReview}
          onClick={() => setTab("NEEDS_REVIEW")}
        />
        <TabButton
          active={tab === "MISSING_CLOCK"}
          label="Missing Clock"
          count={allSummary.missingClock}
          onClick={() => setTab("MISSING_CLOCK")}
        />
        <TabButton
          active={tab === "UNIT_VARIANCE"}
          label="Unit Variance"
          count={allSummary.unitVariance}
          onClick={() => setTab("UNIT_VARIANCE")}
        />
        <TabButton
          active={tab === "CANCELED"}
          label="Canceled"
          count={allSummary.canceled}
          onClick={() => setTab("CANCELED")}
        />
        <TabButton
          active={tab === "OPEN"}
          label="Open"
          count={allSummary.open}
          onClick={() => setTab("OPEN")}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-9">
          <SectionCard
            title="Filters"
            subtitle="Use filters to isolate exceptions before connecting real API data."
            right={
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text hover:bg-white/5"
              >
                Reset
              </button>
            }
          >
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

              <div className="md:col-span-2">
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

              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">DSP</div>
                <Select value={dsp} onChange={setDsp} options={dspOptions} />
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">Service</div>
                <Select value={service} onChange={setService} options={serviceOptions} />
              </div>

              <div className="md:col-span-5">
                <div className="mb-1 text-xs text-bac-muted">Search</div>
                <TextInput
                  value={q}
                  onChange={setQ}
                  placeholder="Search by Individual, DSP, Service, Visit ID..."
                />
              </div>

              <div className="md:col-span-3">
                <div className="mb-1 text-xs text-bac-muted">Sort by</div>
                <Select
                  value={sortBy}
                  onChange={setSortBy}
                  options={[
                    { value: "DATE_DESC", label: "Date (Newest first)" },
                    { value: "DATE_ASC", label: "Date (Oldest first)" },
                    { value: "INDIVIDUAL_ASC", label: "Individual A-Z" },
                    { value: "DSP_ASC", label: "DSP A-Z" },
                    { value: "UNITS_VARIANCE_DESC", label: "Largest Unit Variance" },
                    { value: "EXCEPTION_FIRST", label: "Exceptions First" },
                  ]}
                />
              </div>

              <div className="md:col-span-4 flex flex-wrap items-end gap-2">
                <Toggle
                  checked={onlyExceptions}
                  onChange={setOnlyExceptions}
                  label="Only exceptions"
                />
                <Toggle
                  checked={onlyUnreviewed}
                  onChange={setOnlyUnreviewed}
                  label="Only unreviewed"
                />
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="xl:col-span-3">
          <SectionCard
            title="Review Snapshot"
            subtitle="Helpful office metrics before billing / payroll review."
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-bac-muted">Needs Review</span>
                <span className="font-medium text-bac-text">{summary.needsReview}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-bac-muted">Unreviewed</span>
                <span className="font-medium text-bac-text">{summary.unreviewed}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-bac-muted">Planned Units</span>
                <span className="font-medium text-bac-text">{summary.plannedUnits}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-bac-muted">Actual Units</span>
                <span className="font-medium text-bac-text">{summary.actualUnits}</span>
              </div>
              <div className="h-px bg-bac-border" />
              <div className="rounded-xl border border-bac-border bg-bac-bg p-3 text-xs text-bac-muted">
                Suggested workflow:
                <div className="mt-2 space-y-1">
                  <div>1. Open / Missing Clock</div>
                  <div>2. Canceled verification</div>
                  <div>3. Unit variance review</div>
                  <div>4. Final report / export</div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-bac-border bg-bac-panel">
        <div className="w-full">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="border-b border-bac-border text-bac-muted">
              <tr>
                <th className="w-[44px] px-2 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="h-4 w-4 rounded border-bac-border bg-bac-bg"
                    aria-label="Select all visible"
                  />
                </th>
                <th className="px-3 py-3 w-[12%]">Visit</th>
                <th className="px-3 py-3 w-[11%]">Individual</th>
                <th className="px-3 py-3 w-[10%]">DSP</th>
                <th className="px-3 py-3 w-[9%]">Service</th>
                <th className="px-3 py-3 w-[11%]">Planned</th>
                <th className="px-3 py-3 w-[11%]">Visited</th>
                <th className="px-3 py-3 w-[12%]">Duration</th>
                <th className="px-3 py-3 w-[10%]">Units</th>
                <th className="px-3 py-3 w-[10%]">Status</th>
                <th className="px-3 py-3 w-[88px] text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-bac-border">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-bac-muted">
                    Loading visits...
                  </td>
                </tr>
              ) : null}

              {!loading &&
                rows.map((r) => {
                  const meta = getVisitMeta(r);
                  const risk = getRiskFlags(r);
                  const isExpanded = expandedIds.includes(r.id);
                  const isSelected = selectedIds.includes(r.id);
                  const isFixing = inlineFixId === r.id;
                  const isReviewingThisRow = reviewingId === r.id;

                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        className={cx(
                          "text-bac-text hover:bg-white/3",
                          risk.isHighRisk && "bg-bac-red/[0.04]"
                        )}
                      >
                        <td className="px-2 py-3 align-top text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(r.id)}
                            className="mt-1 h-4 w-4 rounded border-bac-border bg-bac-bg"
                            aria-label={`Select ${r.id}`}
                          />
                        </td>

                        <td
                          className="cursor-pointer px-3 py-3 align-top"
                          onClick={() => toggleExpand(r.id)}
                          title="Click to expand"
                        >
                          <div className="font-medium">{fmtDateLabel(r.date)}</div>
                          {isExpanded ? <div className="text-xs text-bac-muted">{r.id}</div> : null}
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {r.reviewed ? (
                              <Badge variant="success">Reviewed</Badge>
                            ) : (
                              <Badge variant="muted">Pending Review</Badge>
                            )}

                            {risk.isHighRisk ? <Badge variant="danger">High Risk</Badge> : null}

                            <span className="text-xs text-bac-muted">
                              {isExpanded ? "▾ Detail" : "▸ Detail"}
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-3 align-top">
                          <div className="font-medium break-words">{r.individualName}</div>
                        </td>

                        <td className="px-3 py-3 align-top">
                          <div className="break-words">{r.dspName}</div>
                        </td>

                        <td className="px-3 py-3 align-top">
                          <span className="inline-flex max-w-full rounded-lg border border-bac-border bg-bac-bg px-2 py-1 text-xs">
                            {r.serviceCode}
                          </span>
                        </td>

                        <td className="px-3 py-3 align-top">
                          <div>
                            {r.plannedStart} - {r.plannedEnd}
                          </div>
                          <div className="text-xs text-bac-muted">
                            {formatMinutes(meta.plannedMinutes)}
                          </div>
                        </td>

                        <td className="px-3 py-3 align-top">
                          {r.checkIn && r.checkOut ? (
                            <>
                              <div>
                                {r.checkIn} - {r.checkOut}
                              </div>
                              <div className="text-xs text-bac-muted">
                                {formatMinutes(meta.actualMinutes)}
                              </div>
                            </>
                          ) : r.checkIn && !r.checkOut ? (
                            <>
                              <div>{r.checkIn} - —</div>
                              <div className="text-xs text-bac-red">Missing check-out</div>
                              <button
                                type="button"
                                onClick={() => startInlineFix(r)}
                                className="mt-2 rounded-lg border border-bac-red/30 bg-bac-red/10 px-2 py-1 text-xs text-bac-red hover:bg-bac-red/15"
                              >
                                Fix
                              </button>
                            </>
                          ) : !r.checkIn && r.checkOut ? (
                            <>
                              <div>— - {r.checkOut}</div>
                              <div className="text-xs text-bac-red">Missing check-in</div>
                              <button
                                type="button"
                                onClick={() => startInlineFix(r)}
                                className="mt-2 rounded-lg border border-bac-red/30 bg-bac-red/10 px-2 py-1 text-xs text-bac-red hover:bg-bac-red/15"
                              >
                                Fix
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-bac-muted">—</span>
                              {meta.missingClock && r.status !== "CANCELED" ? (
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => startInlineFix(r)}
                                    className="mt-2 rounded-lg border border-bac-red/30 bg-bac-red/10 px-2 py-1 text-xs text-bac-red hover:bg-bac-red/15"
                                  >
                                    Fix
                                  </button>
                                </div>
                              ) : null}
                            </>
                          )}
                        </td>

                        <td className="px-3 py-3 align-top">
                          <div className="text-xs text-bac-muted">Planned / Actual</div>
                          <div className="font-medium">
                            {formatMinutes(meta.plannedMinutes)} / {formatMinutes(meta.actualMinutes)}
                          </div>
                          <div
                            className={cx(
                              "text-xs",
                              meta.timeVariance == null
                                ? "text-bac-muted"
                                : meta.timeVariance === 0
                                  ? "text-bac-muted"
                                  : meta.timeVariance > 0
                                    ? "text-bac-green"
                                    : "text-bac-red"
                            )}
                          >
                            Δ{" "}
                            {meta.timeVariance == null
                              ? "—"
                              : meta.timeVariance > 0
                                ? `+${meta.timeVariance}m`
                                : `${meta.timeVariance}m`}
                          </div>
                        </td>

                        <td className="px-3 py-3 align-top">
                          <div className="text-xs text-bac-muted">Planned / Actual</div>
                          <div className="font-medium">
                            {r.unitsPlanned} / {r.unitsActual}
                          </div>
                          <div
                            className={cx(
                              "text-xs",
                              meta.unitVariance === 0
                                ? "text-bac-muted"
                                : meta.unitVariance > 0
                                  ? "text-bac-green"
                                  : "text-bac-red"
                            )}
                          >
                            Δ {meta.unitVariance > 0 ? `+${meta.unitVariance}` : meta.unitVariance}
                          </div>
                        </td>

                        <td className="px-3 py-3 align-top">
                          {r.status === "COMPLETED" && <Badge variant="success">Completed</Badge>}
                          {r.status === "OPEN" && <Badge variant="warning">Open</Badge>}
                          {r.status === "CANCELED" && (
                            <div className="flex flex-col gap-1">
                              <Badge variant="danger">Canceled</Badge>
                              {r.cancelReason ? (
                                <span className="text-xs text-bac-muted break-words">
                                  {r.cancelReason}
                                </span>
                              ) : null}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-3 align-top text-right">
                          <RowActionsMenu
                            open={openActionId === r.id}
                            onToggle={() =>
                              setOpenActionId((prev) => (prev === r.id ? null : r.id))
                            }
                            onClose={() => setOpenActionId(null)}
                            onViewEdit={() => onOpenEdit(r)}
                            onOpenIndividual={() =>
                              alert(`UI only. Open Individual Details: ${r.individualName}`)
                            }
                            onOpenDsp={() =>
                              alert(`UI only. Open DSP Details: ${r.dspName}`)
                            }
                            onOpenSchedule={() =>
                              alert(`UI only. Open Schedule for visit ${r.id}`)
                            }
                            onOpenReport={() =>
                              alert(`UI only. Open Related Report for visit ${r.id}`)
                            }
                            onRecalculateUnits={() =>
                              alert(`UI only. Recalculate Units for visit ${r.id}`)
                            }
                            onMarkReviewed={() => markOneReviewed(r.id)}
                            onDeleteVisit={() =>
                              alert(`UI only. Delete Visit ${r.id}`)
                            }
                          />
                          {isReviewingThisRow ? (
                            <div className="mt-2 text-[11px] text-bac-muted">Saving...</div>
                          ) : null}
                        </td>
                      </tr>

                      {isExpanded ? (
                        <tr className="bg-white/[0.02]">
                          <td colSpan={11} className="px-4 py-4">
                            <div className="rounded-2xl border border-bac-border bg-bac-bg/70 p-4">
                              <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                                <div className="xl:col-span-4 rounded-2xl border border-bac-border bg-bac-panel p-4">
                                  <div className="text-sm font-semibold text-bac-text">
                                    Quick Visit Detail
                                  </div>
                                  <div className="mt-3 space-y-2 text-sm">
                                    <div>
                                      <span className="text-bac-muted">Visit ID: </span>
                                      <span className="text-bac-text">{r.id}</span>
                                    </div>
                                    <div>
                                      <span className="text-bac-muted">Date: </span>
                                      <span className="text-bac-text">{fmtDateLabel(r.date)}</span>
                                    </div>
                                    <div>
                                      <span className="text-bac-muted">Individual: </span>
                                      <span className="text-bac-text">{r.individualName}</span>
                                    </div>
                                    <div>
                                      <span className="text-bac-muted">DSP: </span>
                                      <span className="text-bac-text">{r.dspName}</span>
                                    </div>
                                    <div>
                                      <span className="text-bac-muted">Service: </span>
                                      <span className="text-bac-text">{r.serviceCode}</span>
                                    </div>
                                    <div>
                                      <span className="text-bac-muted">Source: </span>
                                      <span className="text-bac-text">{r.source}</span>
                                    </div>
                                    <div className="pt-1 flex flex-wrap gap-2">
                                      {r.reviewed ? (
                                        <Badge variant="success">Reviewed</Badge>
                                      ) : (
                                        <Badge variant="warning">Needs Review</Badge>
                                      )}
                                      {risk.isHighRisk ? (
                                        <Badge variant="danger">High Risk</Badge>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>

                                <div className="xl:col-span-4 rounded-2xl border border-bac-border bg-bac-panel p-4">
                                  <div className="text-sm font-semibold text-bac-text">
                                    Quick Review Summary
                                  </div>
                                  <div className="mt-3 space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="text-bac-muted">Planned Duration</span>
                                      <span className="text-bac-text">
                                        {formatMinutes(meta.plannedMinutes)}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-bac-muted">Actual Duration</span>
                                      <span className="text-bac-text">
                                        {formatMinutes(meta.actualMinutes)}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-bac-muted">Unit Variance</span>
                                      <span className="text-bac-text">
                                        {meta.unitVariance > 0
                                          ? `+${meta.unitVariance}`
                                          : meta.unitVariance}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-bac-muted">Missing Clock</span>
                                      <span className="text-bac-text">
                                        {meta.missingClock ? "Yes" : "No"}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-bac-muted">Report Linked</span>
                                      <span className="text-bac-text">
                                        {r.noteLinked ? "Yes" : "No"}
                                      </span>
                                    </div>
                                  </div>

                                  {risk.isHighRisk ? (
                                    <div className="mt-4 rounded-xl border border-bac-red/30 bg-bac-red/10 p-3">
                                      <div className="text-sm font-semibold text-bac-red">
                                        Risk Flags
                                      </div>
                                      <div className="mt-2 space-y-1 text-xs text-bac-text">
                                        {risk.reasons.map((reason) => (
                                          <div key={reason}>• {reason}</div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>

                                <div className="xl:col-span-4 rounded-2xl border border-bac-border bg-bac-panel p-4">
                                  <div className="text-sm font-semibold text-bac-text">
                                    Quick Actions
                                  </div>

                                  {isFixing ? (
                                    <div className="mt-3 space-y-3">
                                      <div className="text-xs text-bac-muted">
                                        Inline Fix Missing Clock
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <div className="mb-1 text-xs text-bac-muted">
                                            Check-in
                                          </div>
                                          <TextInput
                                            value={fixCheckIn}
                                            onChange={setFixCheckIn}
                                            placeholder="HH:mm"
                                            className="h-9"
                                          />
                                        </div>
                                        <div>
                                          <div className="mb-1 text-xs text-bac-muted">
                                            Check-out
                                          </div>
                                          <TextInput
                                            value={fixCheckOut}
                                            onChange={setFixCheckOut}
                                            placeholder="HH:mm"
                                            className="h-9"
                                          />
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          onClick={saveInlineFix}
                                          className="rounded-xl bg-bac-primary px-3 py-2 text-sm font-medium text-white hover:opacity-95"
                                        >
                                          Save Fix
                                        </button>
                                        <button
                                          type="button"
                                          onClick={cancelInlineFix}
                                          className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text hover:bg-white/5"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {meta.missingClock ? (
                                        <button
                                          type="button"
                                          onClick={() => startInlineFix(r)}
                                          className="rounded-xl border border-bac-red/30 bg-bac-red/10 px-3 py-2 text-sm text-bac-red hover:bg-bac-red/15"
                                        >
                                          Fix Missing Clock
                                        </button>
                                      ) : null}

                                      <button
                                        type="button"
                                        onClick={() => markOneReviewed(r.id)}
                                        disabled={reviewingId === r.id}
                                        className="rounded-xl border border-bac-green/30 bg-bac-green/10 px-3 py-2 text-sm text-bac-green hover:bg-bac-green/15 disabled:opacity-60"
                                      >
                                        {reviewingId === r.id ? "Saving..." : "Mark Reviewed"}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => onOpenEdit(r)}
                                        className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text hover:bg-white/5"
                                      >
                                        Open Full Edit
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}

              {!loading && rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-10 text-center text-bac-muted"
                  >
                    No records found for the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-bac-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-xs text-bac-muted">
            Tip: Visited Maintenance should become the operational review hub for
            visit integrity before billing, payroll, and reports are finalized.
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-muted">
              Selected: {selectedVisibleCount}
            </div>
            <button
              className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text hover:bg-white/5"
              onClick={() => alert("UI only. Add page state later.")}
            >
              Prev
            </button>
            <div className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-muted">
              Page 1 of 1
            </div>
            <button
              className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text hover:bg-white/5"
              onClick={() => alert("UI only. Add page state later.")}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={editOpen}
        title="Edit Visit Review"
        onClose={() => {
          setEditOpen(false);
          setSelected(null);
        }}
      >
        {!selected ? (
          <div className="text-bac-muted">No row selected.</div>
        ) : (
          (() => {
            const meta = getVisitMeta(selected);
            const risk = getRiskFlags(selected);

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <div className="xl:col-span-1 space-y-4">
                    <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
                      <div className="text-sm font-semibold text-bac-text">Visit Summary</div>

                      <div className="mt-4 space-y-3 text-sm">
                        <div>
                          <div className="text-xs text-bac-muted">Visit ID</div>
                          <div className="mt-1 font-medium text-bac-text">{selected.id}</div>
                        </div>
                        <div>
                          <div className="text-xs text-bac-muted">Date</div>
                          <div className="mt-1 font-medium text-bac-text">
                            {fmtDateLabel(selected.date)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-bac-muted">Individual</div>
                          <div className="mt-1 font-medium text-bac-text">
                            {selected.individualName}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-bac-muted">DSP</div>
                          <div className="mt-1 font-medium text-bac-text">{selected.dspName}</div>
                        </div>
                        <div>
                          <div className="text-xs text-bac-muted">Service</div>
                          <div className="mt-1 font-medium text-bac-text">
                            {selected.serviceCode}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-bac-muted">Source</div>
                          <div className="mt-1">
                            <Badge variant="muted">{selected.source}</Badge>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selected.reviewed ? (
                            <Badge variant="success">Reviewed</Badge>
                          ) : (
                            <Badge variant="warning">Needs Review</Badge>
                          )}
                          {risk.isHighRisk ? <Badge variant="danger">High Risk</Badge> : null}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
                      <div className="text-sm font-semibold text-bac-text">Review Summary</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {meta.needsReview ? <Badge variant="warning">Needs Review</Badge> : null}
                        {meta.missingClock ? <Badge variant="danger">Missing Clock</Badge> : null}
                        {meta.hasUnitVariance ? <Badge variant="info">Unit Variance</Badge> : null}
                        {selected.source === "MANUAL" ? <Badge variant="muted">Manual Edit</Badge> : null}
                        {selected.status === "CANCELED" ? <Badge variant="danger">Canceled</Badge> : null}
                        {!selected.noteLinked ? <Badge variant="muted">No Report Linked</Badge> : null}
                        {selected.noteLinked ? <Badge variant="success">Report Linked</Badge> : null}
                      </div>

                      {risk.isHighRisk ? (
                        <div className="mt-4 rounded-xl border border-bac-red/30 bg-bac-red/10 p-3">
                          <div className="text-sm font-semibold text-bac-red">Risk Flags</div>
                          <div className="mt-2 space-y-1 text-xs text-bac-text">
                            {risk.reasons.map((reason) => (
                              <div key={reason}>• {reason}</div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="xl:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
                        <div className="text-sm font-semibold text-bac-text">Planned</div>
                        <div className="mt-4">
                          <div className="text-xs text-bac-muted">Time</div>
                          <div className="mt-1 text-sm font-medium text-bac-text">
                            {selected.plannedStart} - {selected.plannedEnd}
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="text-xs text-bac-muted">Duration</div>
                          <div className="mt-1 text-sm font-medium text-bac-text">
                            {formatMinutes(meta.plannedMinutes)}
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="text-xs text-bac-muted">Units Planned</div>
                          <div className="mt-1 text-sm font-medium text-bac-text">
                            {selected.unitsPlanned}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
                        <div className="text-sm font-semibold text-bac-text">Actual / Editable</div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
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

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <div className="mb-1 text-xs text-bac-muted">Actual Units</div>
                            <input
                              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
                              placeholder="0"
                              defaultValue={String(selected.unitsActual)}
                            />
                          </div>
                          <div>
                            <div className="mb-1 text-xs text-bac-muted">Status</div>
                            <select
                              defaultValue={selected.status}
                              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
                            >
                              <option value="OPEN">OPEN</option>
                              <option value="COMPLETED">COMPLETED</option>
                              <option value="CANCELED">CANCELED</option>
                            </select>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="mb-1 text-xs text-bac-muted">Cancel Reason</div>
                          <textarea
                            className="min-h-[90px] w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text outline-none"
                            defaultValue={selected.cancelReason ?? ""}
                            placeholder="Enter cancel reason if applicable..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
                      <div className="text-sm font-semibold text-bac-text">Office Review Note</div>
                      <div className="mt-3">
                        <textarea
                          className="min-h-[110px] w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text outline-none"
                          placeholder="UI only. Add office review comment, correction note, or audit explanation..."
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
                      <div className="text-sm font-semibold text-bac-text">Audit Snapshot</div>
                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                        <div className="rounded-xl border border-bac-border bg-bac-bg p-3">
                          <div className="text-xs text-bac-muted">Planned Duration</div>
                          <div className="mt-1 font-medium text-bac-text">
                            {formatMinutes(meta.plannedMinutes)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-bac-border bg-bac-bg p-3">
                          <div className="text-xs text-bac-muted">Actual Duration</div>
                          <div className="mt-1 font-medium text-bac-text">
                            {formatMinutes(meta.actualMinutes)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-bac-border bg-bac-bg p-3">
                          <div className="text-xs text-bac-muted">Unit Variance</div>
                          <div className="mt-1 font-medium text-bac-text">
                            {meta.unitVariance > 0 ? `+${meta.unitVariance}` : meta.unitVariance}
                          </div>
                        </div>
                        <div className="rounded-xl border border-bac-border bg-bac-bg p-3">
                          <div className="text-xs text-bac-muted">Missing Clock</div>
                          <div className="mt-1 font-medium text-bac-text">
                            {meta.missingClock ? "Yes" : "No"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
                      onClick={() => alert("UI only. Open related report later.")}
                    >
                      Open Related Report
                    </button>
                    <button
                      className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
                      onClick={() => alert("UI only. Recalculate units later.")}
                    >
                      Recalculate Units
                    </button>
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
                      onClick={() => alert("UI only. Wire API later: save visit review changes")}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </Modal>
    </div>
  );
}
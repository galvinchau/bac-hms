// bac-hms/web/components/house-management/shared.tsx

"use client";

import React from "react";

export type HouseStatus = "ACTIVE" | "INACTIVE";
export type RiskLevel = "GOOD" | "WARNING" | "CRITICAL";
export type ShiftStatus =
  | "IN_PROGRESS"
  | "UPCOMING"
  | "COMPLETED"
  | "CANCELLED"
  | "BACKUP_PLAN";

export type AlertLevel = "CRITICAL" | "WARNING" | "INFO";
export type ResidentialType = "FULL_TIME_247" | "HOME_VISIT_SPLIT";
export type ComplianceStatus = "GOOD" | "WARNING" | "CRITICAL";

export type HouseTabKey =
  | "HOUSES"
  | "DASHBOARD"
  | "RESIDENTS"
  | "STAFFING"
  | "COMPLIANCE"
  | "OPERATIONS";

export type HouseSummary = {
  id: string;
  code: string;
  name: string;
  address: string;
  programType: string;
  capacity: number;
  currentResidents: number;
  assignedStaff: number;
  complianceScore: number;
  openAlerts: number;
  status: HouseStatus;
  risk: RiskLevel;
  supervisor: string;
  county: string;
  phone: string;
  primaryOccupancyModel: "SINGLE" | "DOUBLE" | "MIXED";
  houseBillingNote: string;
};

export type ResidentRow = {
  id: string;
  name: string;
  maNumber: string;
  age: number;
  gender: string;
  room: string;
  residentialType: ResidentialType;
  homeVisitSchedule: string;
  housingCoverage: "24/7";
  careRateTier: "HIGHER" | "STANDARD" | "LOWER_SHARED";
  ispStatus: "CURRENT" | "DUE_SOON" | "OVERDUE";
  riskFlag: "STANDARD" | "HIGH";
  behaviorSupportLevel: "NONE" | "MODERATE" | "INTENSIVE";
  medProfile: "DAILY" | "MULTIPLE_DAILY";
  appointmentLoad: "LOW" | "MODERATE" | "HIGH";
  status: "ACTIVE" | "INACTIVE";
};

export type StaffRow = {
  id: string;
  name: string;
  role: "DSP" | "SUPERVISOR" | "MANAGER" | "BEHAVIOR_SPECIALIST";
  shiftToday: string;
  trainingStatus: "CURRENT" | "DUE_SOON" | "OVERDUE";
  medCertified: boolean;
  cpr: "CURRENT" | "EXPIRED";
  driver: "ACTIVE" | "INACTIVE";
  clearance: "CURRENT" | "EXPIRED";
  status: "ON_DUTY" | "OFF_DUTY";
};

export type CoverageShift = {
  id: string;
  time: string;
  service: string;
  shiftStatus: ShiftStatus;
  staffAssigned: Array<{
    name: string;
    role: string;
  }>;
  individualsCovered: string[];
  staffingRatioLabel: string;
  awakeRequired?: boolean;
  behaviorSupport?: boolean;
  note?: string;
};

export type ComplianceItem = {
  key: string;
  label: string;
  score: number;
  status: ComplianceStatus;
  lastReviewed: string;
};

export type TimelineItem = {
  id: string;
  at: string;
  title: string;
  description: string;
  level?: AlertLevel;
};

export type AlertItem = {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
  actionLabel: string;
};

export type FireDrillRow = {
  id: string;
  date: string;
  location: string;
  drillType: "FIRE" | "EVAC" | "SHELTER" | "OTHER";
  shiftTime: string;
  result: "PASS" | "FAIL" | "N/A";
  notes?: string | null;
  source: "MANUAL" | "MOBILE" | "IMPORT";
};

export type MealRow = {
  meal: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  servedBy: string;
  completion: string;
  notes: string;
};

export type MedTaskRow = {
  resident: string;
  schedule: string;
  status: "DONE" | "PENDING" | "REFUSED";
  notes: string;
};

export type ChoreRow = {
  task: string;
  assignedTo: string;
  status: "DONE" | "PENDING";
  notes: string;
};

export type AppointmentRow = {
  resident: string;
  appointmentType: string;
  when: string;
  escort: string;
  status: "SCHEDULED" | "COMPLETED" | "FOLLOW_UP";
};

export type SpecialistVisitRow = {
  resident: string;
  specialist: string;
  focus: string;
  when: string;
  status: "DONE" | "UPCOMING";
};

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Badge({
  variant,
  children,
}: {
  variant:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "muted"
    | "violet"
    | "amber"
    | "sky";
  children: React.ReactNode;
}) {
  const cls =
    variant === "success"
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
      : variant === "warning"
      ? "border-yellow-500/30 bg-yellow-500/15 text-yellow-200"
      : variant === "danger"
      ? "border-red-500/30 bg-red-500/15 text-red-300"
      : variant === "muted"
      ? "border-bac-border bg-white/5 text-bac-muted"
      : variant === "violet"
      ? "border-violet-500/30 bg-violet-500/15 text-violet-200"
      : variant === "amber"
      ? "border-amber-500/30 bg-amber-500/15 text-amber-200"
      : variant === "sky"
      ? "border-sky-500/30 bg-sky-500/15 text-sky-200"
      : "border-bac-border bg-white/10 text-bac-text";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        cls
      )}
    >
      {children}
    </span>
  );
}

export function SectionCard({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-2xl border border-bac-border bg-bac-panel p-5",
        className
      )}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-base font-semibold text-bac-text">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-sm text-bac-muted">{subtitle}</div>
          ) : null}
        </div>
        {right ? <div className="flex items-center gap-2">{right}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger" | "violet" | "sky";
}) {
  const ring =
    tone === "success"
      ? "from-emerald-500/10 to-transparent"
      : tone === "warning"
      ? "from-yellow-500/10 to-transparent"
      : tone === "danger"
      ? "from-red-500/10 to-transparent"
      : tone === "violet"
      ? "from-violet-500/10 to-transparent"
      : tone === "sky"
      ? "from-sky-500/10 to-transparent"
      : "from-white/5 to-transparent";

  return (
    <div
      className={cx(
        "rounded-2xl border border-bac-border bg-bac-bg p-4",
        "bg-gradient-to-br",
        ring
      )}
    >
      <div className="text-xs text-bac-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-bac-text">{value}</div>
      {hint ? <div className="mt-2 text-xs text-bac-muted">{hint}</div> : null}
    </div>
  );
}

export function TextInput({
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
      className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none focus:ring-2 focus:ring-violet-500/30"
    />
  );
}

export function Select({
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
      className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none focus:ring-2 focus:ring-violet-500/30"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-5xl rounded-3xl border border-bac-border bg-bac-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-bac-border px-5 py-4">
          <div className="text-base font-semibold text-bac-text">{title}</div>
          <button
            onClick={onClose}
            className="rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text hover:bg-white/5"
          >
            Close
          </button>
        </div>
        <div className="max-h-[80vh] overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  status,
}: {
  value: number;
  status: ComplianceStatus;
}) {
  const color =
    status === "GOOD"
      ? "bg-emerald-500"
      : status === "WARNING"
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/6">
      <div className={cx("h-full rounded-full", color)} style={{ width: `${value}%` }} />
    </div>
  );
}

export function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-bac-muted">{label}</div>
      <div className="mt-1 text-sm font-medium text-bac-text">{value}</div>
    </div>
  );
}

export function RatioBox({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: ComplianceStatus;
}) {
  return (
    <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-bac-text">{label}</div>
        {status === "GOOD" ? (
          <Badge variant="success">Good</Badge>
        ) : status === "WARNING" ? (
          <Badge variant="warning">Warning</Badge>
        ) : (
          <Badge variant="danger">Critical</Badge>
        )}
      </div>
      <div className="mt-2 text-sm text-bac-muted">{value}</div>
    </div>
  );
}

export function ChecklistItem({
  label,
  status,
}: {
  label: string;
  status: ComplianceStatus;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-bac-border bg-bac-bg px-4 py-3">
      <div className="text-sm text-bac-text">{label}</div>
      {status === "GOOD" ? (
        <Badge variant="success">Good</Badge>
      ) : status === "WARNING" ? (
        <Badge variant="warning">Warning</Badge>
      ) : (
        <Badge variant="danger">Critical</Badge>
      )}
    </div>
  );
}

export function IncidentBox({
  title,
  detail,
  status,
}: {
  title: string;
  detail: string;
  status: ComplianceStatus;
}) {
  return (
    <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium text-bac-text">{title}</div>
        {status === "GOOD" ? (
          <Badge variant="success">Closed</Badge>
        ) : status === "WARNING" ? (
          <Badge variant="warning">Pending</Badge>
        ) : (
          <Badge variant="danger">Open</Badge>
        )}
      </div>
      <div className="mt-2 text-sm text-bac-muted">{detail}</div>
    </div>
  );
}

export function NoteBox({
  title,
  meta,
  body,
}: {
  title: string;
  meta: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
      <div className="text-sm font-medium text-bac-text">{title}</div>
      <div className="mt-1 text-xs text-bac-muted">{meta}</div>
      <div className="mt-3 text-sm leading-6 text-bac-muted">{body}</div>
    </div>
  );
}

export function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1 text-xs text-bac-muted">{label}</div>
      {children}
    </div>
  );
}

export function renderRiskBadge(risk: RiskLevel) {
  if (risk === "GOOD") return <Badge variant="success">Good</Badge>;
  if (risk === "WARNING") return <Badge variant="warning">Warning</Badge>;
  return <Badge variant="danger">Critical</Badge>;
}

export function renderShiftStatusBadge(status: ShiftStatus) {
  if (status === "IN_PROGRESS") return <Badge variant="success">In Progress</Badge>;
  if (status === "UPCOMING") return <Badge variant="default">Upcoming</Badge>;
  if (status === "COMPLETED") return <Badge variant="muted">Completed</Badge>;
  if (status === "CANCELLED") return <Badge variant="danger">Cancelled</Badge>;
  return <Badge variant="amber">Backup Plan</Badge>;
}

export function renderResidentialTypeBadge(type: ResidentialType) {
  if (type === "FULL_TIME_247") {
    return <Badge variant="violet">24/7 Full-Time</Badge>;
  }
  return <Badge variant="sky">Home-Visit Split</Badge>;
}

export function renderCareRateBadge(tier: ResidentRow["careRateTier"]) {
  if (tier === "HIGHER") return <Badge variant="success">Higher Care Rate</Badge>;
  if (tier === "STANDARD") return <Badge variant="warning">Standard Care Rate</Badge>;
  return <Badge variant="muted">Lower Shared Rate</Badge>;
}
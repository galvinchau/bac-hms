// web/app/firedrill/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

type HouseStatus = "ACTIVE" | "INACTIVE";
type RiskLevel = "GOOD" | "WARNING" | "CRITICAL";
type ShiftStatus =
  | "IN_PROGRESS"
  | "UPCOMING"
  | "COMPLETED"
  | "CANCELLED"
  | "BACKUP_PLAN";

type AlertLevel = "CRITICAL" | "WARNING" | "INFO";

type ResidentialType = "FULL_TIME_247" | "HOME_VISIT_SPLIT";

type ComplianceStatus = "GOOD" | "WARNING" | "CRITICAL";

type HouseSummary = {
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

type ResidentRow = {
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

type StaffRow = {
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

type CoverageShift = {
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

type ComplianceItem = {
  key: string;
  label: string;
  score: number;
  status: ComplianceStatus;
  lastReviewed: string;
};

type TimelineItem = {
  id: string;
  at: string;
  title: string;
  description: string;
  level?: AlertLevel;
};

type AlertItem = {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
  actionLabel: string;
};

type FireDrillRow = {
  id: string;
  date: string;
  location: string;
  drillType: "FIRE" | "EVAC" | "SHELTER" | "OTHER";
  shiftTime: string;
  result: "PASS" | "FAIL" | "N/A";
  notes?: string | null;
  source: "MANUAL" | "MOBILE" | "IMPORT";
};

type MealRow = {
  meal: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  servedBy: string;
  completion: string;
  notes: string;
};

type MedTaskRow = {
  resident: string;
  schedule: string;
  status: "DONE" | "PENDING" | "REFUSED";
  notes: string;
};

type ChoreRow = {
  task: string;
  assignedTo: string;
  status: "DONE" | "PENDING";
  notes: string;
};

type AppointmentRow = {
  resident: string;
  appointmentType: string;
  when: string;
  escort: string;
  status: "SCHEDULED" | "COMPLETED" | "FOLLOW_UP";
};

type SpecialistVisitRow = {
  resident: string;
  specialist: string;
  focus: string;
  when: string;
  status: "DONE" | "UPCOMING";
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Badge({
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

function SectionCard({
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

function StatCard({
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
      className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none focus:ring-2 focus:ring-violet-500/30"
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

function Modal({
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

function ProgressBar({
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-bac-muted">{label}</div>
      <div className="mt-1 text-sm font-medium text-bac-text">{value}</div>
    </div>
  );
}

function RatioBox({
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

function ChecklistItem({
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

function IncidentBox({
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

function ActivityBox({
  time,
  title,
  detail,
}: {
  time: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
      <div className="text-xs text-bac-muted">{time}</div>
      <div className="mt-1 text-sm font-medium text-bac-text">{title}</div>
      <div className="mt-1 text-sm text-bac-muted">{detail}</div>
    </div>
  );
}

function NoteBox({
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

function FormField({
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

const DEMO_HOUSES: HouseSummary[] = [
  {
    id: "house-1",
    code: "HM-1001",
    name: "Maple Residential Home",
    address: "202 Campbell Ave, Altoona, PA 16602",
    programType: "Residential 6400",
    capacity: 5,
    currentResidents: 1,
    assignedStaff: 8,
    complianceScore: 93,
    openAlerts: 2,
    status: "ACTIVE",
    risk: "WARNING",
    supervisor: "Anna Smith",
    county: "Blair",
    phone: "(814) 600-2313",
    primaryOccupancyModel: "SINGLE",
    houseBillingNote:
      "24/7 housing revenue remains full even when resident has scheduled home visit hours.",
  },
  {
    id: "house-2",
    code: "HM-1002",
    name: "Cedar Community Home",
    address: "415 Pine St, Hollidaysburg, PA 16648",
    programType: "Residential 6400",
    capacity: 5,
    currentResidents: 2,
    assignedStaff: 10,
    complianceScore: 96,
    openAlerts: 1,
    status: "ACTIVE",
    risk: "GOOD",
    supervisor: "Mike Lee",
    county: "Blair",
    phone: "(814) 600-2313",
    primaryOccupancyModel: "DOUBLE",
    houseBillingNote:
      "Shared house model may lower per-resident care rate while housing occupancy remains full.",
  },
  {
    id: "house-3",
    code: "HM-1003",
    name: "Sunrise Support Home",
    address: "89 Logan Blvd, Altoona, PA 16602",
    programType: "Residential 6400",
    capacity: 5,
    currentResidents: 3,
    assignedStaff: 14,
    complianceScore: 78,
    openAlerts: 4,
    status: "ACTIVE",
    risk: "CRITICAL",
    supervisor: "Kevin Brown",
    county: "Centre",
    phone: "(814) 600-2313",
    primaryOccupancyModel: "MIXED",
    houseBillingNote:
      "Higher shared-support complexity with some shifts requiring multiple DSP for one resident.",
  },
];

const DEMO_RESIDENTS: ResidentRow[] = [
  {
    id: "IND-1001",
    name: "John Doe",
    maNumber: "MA-22001",
    age: 31,
    gender: "Male",
    room: "Room 1",
    residentialType: "FULL_TIME_247",
    homeVisitSchedule: "No scheduled home visit",
    housingCoverage: "24/7",
    careRateTier: "HIGHER",
    ispStatus: "CURRENT",
    riskFlag: "HIGH",
    behaviorSupportLevel: "INTENSIVE",
    medProfile: "MULTIPLE_DAILY",
    appointmentLoad: "HIGH",
    status: "ACTIVE",
  },
  {
    id: "IND-1002",
    name: "Emily Stone",
    maNumber: "MA-22002",
    age: 28,
    gender: "Female",
    room: "Room 2",
    residentialType: "HOME_VISIT_SPLIT",
    homeVisitSchedule: "Home visit Fri 5 PM - Sun 6 PM",
    housingCoverage: "24/7",
    careRateTier: "STANDARD",
    ispStatus: "DUE_SOON",
    riskFlag: "STANDARD",
    behaviorSupportLevel: "MODERATE",
    medProfile: "DAILY",
    appointmentLoad: "MODERATE",
    status: "ACTIVE",
  },
  {
    id: "IND-1003",
    name: "Kevin Brown",
    maNumber: "MA-22003",
    age: 42,
    gender: "Male",
    room: "Room 3",
    residentialType: "FULL_TIME_247",
    homeVisitSchedule: "No scheduled home visit",
    housingCoverage: "24/7",
    careRateTier: "LOWER_SHARED",
    ispStatus: "OVERDUE",
    riskFlag: "HIGH",
    behaviorSupportLevel: "INTENSIVE",
    medProfile: "MULTIPLE_DAILY",
    appointmentLoad: "HIGH",
    status: "ACTIVE",
  },
];

const DEMO_STAFF: StaffRow[] = [
  {
    id: "EMP-1001",
    name: "Anna Smith",
    role: "SUPERVISOR",
    shiftToday: "07:00 - 15:00",
    trainingStatus: "CURRENT",
    medCertified: true,
    cpr: "CURRENT",
    driver: "ACTIVE",
    clearance: "CURRENT",
    status: "ON_DUTY",
  },
  {
    id: "EMP-1002",
    name: "Mike Lee",
    role: "DSP",
    shiftToday: "15:00 - 23:00",
    trainingStatus: "DUE_SOON",
    medCertified: true,
    cpr: "CURRENT",
    driver: "ACTIVE",
    clearance: "CURRENT",
    status: "OFF_DUTY",
  },
  {
    id: "EMP-1003",
    name: "Sara Long",
    role: "DSP",
    shiftToday: "23:00 - 07:00",
    trainingStatus: "OVERDUE",
    medCertified: false,
    cpr: "EXPIRED",
    driver: "INACTIVE",
    clearance: "CURRENT",
    status: "ON_DUTY",
  },
  {
    id: "EMP-1004",
    name: "Dr. Lisa Turner",
    role: "BEHAVIOR_SPECIALIST",
    shiftToday: "Visit 10:30 - 12:00",
    trainingStatus: "CURRENT",
    medCertified: false,
    cpr: "CURRENT",
    driver: "ACTIVE",
    clearance: "CURRENT",
    status: "OFF_DUTY",
  },
];

const DEMO_COVERAGE: CoverageShift[] = [
  {
    id: "SH-1",
    time: "07:00 - 15:00",
    service: "Residential Support",
    shiftStatus: "IN_PROGRESS",
    staffAssigned: [
      { name: "Anna Smith", role: "Supervisor" },
      { name: "Sara Long", role: "DSP" },
    ],
    individualsCovered: ["John Doe", "Emily Stone"],
    staffingRatioLabel: "2 DSP : 2 Residents",
    behaviorSupport: true,
    note: "Morning routines, medication support, breakfast, laundry setup.",
  },
  {
    id: "SH-2",
    time: "15:00 - 23:00",
    service: "Residential Support",
    shiftStatus: "UPCOMING",
    staffAssigned: [
      { name: "Mike Lee", role: "DSP" },
      { name: "Anna Smith", role: "Supervisor" },
    ],
    individualsCovered: ["All residents"],
    staffingRatioLabel: "2 DSP : 3 Residents",
    note: "Dinner support, appointments follow-up, house routines.",
  },
  {
    id: "SH-3",
    time: "23:00 - 07:00",
    service: "Overnight Awake",
    shiftStatus: "UPCOMING",
    staffAssigned: [
      { name: "Sara Long", role: "DSP" },
      { name: "Temp DSP", role: "DSP" },
      { name: "On-call DSP", role: "DSP" },
    ],
    individualsCovered: ["Kevin Brown"],
    staffingRatioLabel: "3 DSP : 1 High-Need Resident",
    awakeRequired: true,
    behaviorSupport: true,
    note: "High behavioral needs. Awake monitoring required every 60 minutes.",
  },
];

const DEMO_ALERTS: AlertItem[] = [
  {
    id: "AL-1",
    level: "CRITICAL",
    title: "Overnight high-need resident needs 3-DSP coverage",
    detail:
      "One overnight shift for Kevin Brown requires multi-DSP support; confirm all staff assigned.",
    actionLabel: "Open Staffing",
  },
  {
    id: "AL-2",
    level: "WARNING",
    title: "Medication administration audit due",
    detail:
      "Residential medication documentation should be reviewed this week for daily-use residents.",
    actionLabel: "Open Operations",
  },
  {
    id: "AL-3",
    level: "INFO",
    title: "Behavior specialist home visit today",
    detail:
      "Dr. Lisa Turner scheduled to visit at 10:30 AM for behavior support follow-up.",
    actionLabel: "Open Residents",
  },
];

const DEMO_COMPLIANCE: ComplianceItem[] = [
  {
    key: "fire",
    label: "Fire Drill",
    score: 88,
    status: "WARNING",
    lastReviewed: "2026-04-02",
  },
  {
    key: "safety",
    label: "Safety & Environment",
    score: 96,
    status: "GOOD",
    lastReviewed: "2026-04-04",
  },
  {
    key: "docs",
    label: "House Documentation",
    score: 74,
    status: "CRITICAL",
    lastReviewed: "2026-03-28",
  },
  {
    key: "training",
    label: "Staff Training",
    score: 82,
    status: "WARNING",
    lastReviewed: "2026-04-01",
  },
  {
    key: "med",
    label: "Medication Documentation",
    score: 94,
    status: "GOOD",
    lastReviewed: "2026-04-05",
  },
  {
    key: "behavior",
    label: "Behavior Support Documentation",
    score: 86,
    status: "WARNING",
    lastReviewed: "2026-04-05",
  },
];

const DEMO_TIMELINE: TimelineItem[] = [
  {
    id: "TL-1",
    at: "Today 07:05 AM",
    title: "Morning DSP team checked in",
    description: "2 DSP started residential coverage for morning routines.",
    level: "INFO",
  },
  {
    id: "TL-2",
    at: "Today 08:15 AM",
    title: "Breakfast and morning meds completed",
    description: "All active residents received meal support and medication documentation.",
    level: "INFO",
  },
  {
    id: "TL-3",
    at: "Today 10:30 AM",
    title: "Behavior specialist arrived",
    description: "Specialist home visit for intensive behavior support plan.",
    level: "INFO",
  },
  {
    id: "TL-4",
    at: "Yesterday 11:40 PM",
    title: "Awake monitoring warning",
    description: "Overnight shift alert triggered for delayed confirmation.",
    level: "WARNING",
  },
];

const DEMO_DRILLS: FireDrillRow[] = [
  {
    id: "FD-2001",
    date: "2026-04-01",
    location: "Maple Residential Home",
    drillType: "FIRE",
    shiftTime: "09:00 - 09:20",
    result: "PASS",
    notes: "All residents exited within expected time.",
    source: "MANUAL",
  },
  {
    id: "FD-2002",
    date: "2026-03-14",
    location: "Maple Residential Home",
    drillType: "EVAC",
    shiftTime: "14:00 - 14:25",
    result: "FAIL",
    notes: "Delay due to staff communication gap.",
    source: "MANUAL",
  },
];

const DEMO_MEALS: MealRow[] = [
  {
    meal: "Breakfast",
    servedBy: "Anna Smith",
    completion: "3 / 3 completed",
    notes: "One resident needed prompting and meal texture adjustment.",
  },
  {
    meal: "Lunch",
    servedBy: "Mike Lee",
    completion: "Planned",
    notes: "Medication coordination needed before lunch.",
  },
  {
    meal: "Dinner",
    servedBy: "Evening DSP Team",
    completion: "Planned",
    notes: "Two residents need direct meal prep support.",
  },
  {
    meal: "Snack",
    servedBy: "Night Shift",
    completion: "Planned",
    notes: "Overnight snack for awake resident support.",
  },
];

const DEMO_MEDS: MedTaskRow[] = [
  {
    resident: "John Doe",
    schedule: "08:00 AM / 12:00 PM / 08:00 PM",
    status: "DONE",
    notes: "Multiple daily meds documented.",
  },
  {
    resident: "Emily Stone",
    schedule: "09:00 AM",
    status: "DONE",
    notes: "Daily medication completed.",
  },
  {
    resident: "Kevin Brown",
    schedule: "08:00 AM / 02:00 PM / 09:00 PM",
    status: "PENDING",
    notes: "Evening dose needs second staff witness.",
  },
];

const DEMO_CHORES: ChoreRow[] = [
  {
    task: "Laundry",
    assignedTo: "Morning DSP",
    status: "DONE",
    notes: "2 loads completed.",
  },
  {
    task: "Kitchen cleaning",
    assignedTo: "Evening DSP",
    status: "PENDING",
    notes: "To be completed after dinner.",
  },
  {
    task: "Room organization support",
    assignedTo: "Afternoon DSP",
    status: "PENDING",
    notes: "Resident assistance required.",
  },
];

const DEMO_APPOINTMENTS: AppointmentRow[] = [
  {
    resident: "John Doe",
    appointmentType: "Psychiatry Follow-up",
    when: "Tomorrow 09:30 AM",
    escort: "Anna Smith",
    status: "SCHEDULED",
  },
  {
    resident: "Emily Stone",
    appointmentType: "Primary Care",
    when: "Completed today 01:00 PM",
    escort: "Mike Lee",
    status: "COMPLETED",
  },
  {
    resident: "Kevin Brown",
    appointmentType: "Neurology Follow-up",
    when: "Next Monday 11:00 AM",
    escort: "TBD",
    status: "FOLLOW_UP",
  },
];

const DEMO_SPECIALISTS: SpecialistVisitRow[] = [
  {
    resident: "John Doe",
    specialist: "Dr. Lisa Turner",
    focus: "Behavior intervention and staff coaching",
    when: "Today 10:30 AM",
    status: "DONE",
  },
  {
    resident: "Kevin Brown",
    specialist: "Behavior Consultant",
    focus: "Escalation response review",
    when: "Friday 02:00 PM",
    status: "UPCOMING",
  },
];

export default function HouseManagementPage() {
  const [tab, setTab] = useState<
    "HOUSES" | "DASHBOARD" | "RESIDENTS" | "STAFFING" | "COMPLIANCE" | "OPERATIONS"
  >("HOUSES");

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

  function renderRiskBadge(risk: RiskLevel) {
    if (risk === "GOOD") return <Badge variant="success">Good</Badge>;
    if (risk === "WARNING") return <Badge variant="warning">Warning</Badge>;
    return <Badge variant="danger">Critical</Badge>;
  }

  function renderShiftStatusBadge(status: ShiftStatus) {
    if (status === "IN_PROGRESS") return <Badge variant="success">In Progress</Badge>;
    if (status === "UPCOMING") return <Badge variant="default">Upcoming</Badge>;
    if (status === "COMPLETED") return <Badge variant="muted">Completed</Badge>;
    if (status === "CANCELLED") return <Badge variant="danger">Cancelled</Badge>;
    return <Badge variant="amber">Backup Plan</Badge>;
  }

  function renderResidentialTypeBadge(type: ResidentialType) {
    if (type === "FULL_TIME_247") {
      return <Badge variant="violet">24/7 Full-Time</Badge>;
    }
    return <Badge variant="sky">Home-Visit Split</Badge>;
  }

  function renderCareRateBadge(
    tier: ResidentRow["careRateTier"]
  ) {
    if (tier === "HIGHER") return <Badge variant="success">Higher Care Rate</Badge>;
    if (tier === "STANDARD") return <Badge variant="warning">Standard Care Rate</Badge>;
    return <Badge variant="muted">Lower Shared Rate</Badge>;
  }

  return (
    <div className="min-h-[calc(100vh-60px)] bg-bac-bg p-6">
      {/* Header */}
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

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {[
          ["HOUSES", "Houses"],
          ["DASHBOARD", "Dashboard"],
          ["RESIDENTS", "Residents"],
          ["STAFFING", "Staffing"],
          ["COMPLIANCE", "Compliance"],
          ["OPERATIONS", "Daily Operations"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() =>
              setTab(
                key as
                  | "HOUSES"
                  | "DASHBOARD"
                  | "RESIDENTS"
                  | "STAFFING"
                  | "COMPLIANCE"
                  | "OPERATIONS"
              )
            }
            className={cx(
              "rounded-xl border px-4 py-2 text-sm transition",
              tab === key
                ? "border-violet-500/40 bg-violet-500/15 text-bac-text"
                : "border-bac-border bg-bac-panel text-bac-muted hover:bg-white/5"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* HOUSES */}
      {tab === "HOUSES" ? (
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
                  Records: {filteredHouses.length}
                </div>
              </div>
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredHouses.map((house) => (
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
                      onClick={() => {
                        setSelectedHouseId(house.id);
                        setTab("DASHBOARD");
                      }}
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
      ) : null}

      {/* DASHBOARD */}
      {tab === "DASHBOARD" ? (
        <div className="space-y-4">
          <SectionCard
            title={`${selectedHouse.name} Dashboard`}
            subtitle={`${selectedHouse.programType} • ${selectedHouse.address}`}
            right={
              <>
                <button
                  onClick={() => setTab("RESIDENTS")}
                  className="rounded-xl border border-bac-border bg-bac-bg px-4 py-2 text-sm text-bac-text hover:bg-white/5"
                >
                  View Residents
                </button>
                <button
                  onClick={() => setTab("STAFFING")}
                  className="rounded-xl border border-bac-border bg-bac-bg px-4 py-2 text-sm text-bac-text hover:bg-white/5"
                >
                  View Staffing
                </button>
              </>
            }
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
              <StatCard label="Residents" value={selectedHouse.currentResidents} />
              <StatCard label="24/7 Full-Time" value={fullTime247Count} tone="violet" />
              <StatCard label="Home-Visit Split" value={homeVisitSplitCount} tone="sky" />
              <StatCard label="High-Need Residents" value={highNeedCount} tone="danger" />
              <StatCard label="Multi-DSP Shifts" value={multiDspShiftCount} tone="warning" />
              <StatCard
                label="Compliance"
                value={`${selectedHouse.complianceScore}%`}
                tone="success"
              />
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <SectionCard
              title="House Profile"
              subtitle="Core house profile, occupancy strategy, and residential care model."
              className="xl:col-span-4"
            >
              <div className="space-y-4">
                <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoItem label="House Name" value={selectedHouse.name} />
                    <InfoItem label="House Code" value={selectedHouse.code} />
                    <InfoItem label="Program Type" value={selectedHouse.programType} />
                    <InfoItem label="County" value={selectedHouse.county} />
                    <InfoItem label="Capacity" value={String(selectedHouse.capacity)} />
                    <InfoItem label="Current Census" value={String(selectedHouse.currentResidents)} />
                    <InfoItem label="Supervisor" value={selectedHouse.supervisor} />
                    <InfoItem label="Phone" value={selectedHouse.phone} />
                  </div>
                </div>

                <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                  <div className="text-sm font-medium text-bac-text">Residential Model Notes</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="violet">24/7 Housing Revenue</Badge>
                    <Badge variant="sky">Home Visit Scheduling</Badge>
                    <Badge variant="warning">Variable Care Rate</Badge>
                    <Badge variant="danger">High-Need Multi-DSP Ready</Badge>
                  </div>
                  <div className="mt-3 text-sm text-bac-muted">
                    This layout assumes BAC may operate houses with 1 resident most often, but also
                    supports 2+ residents, shared-support structures, and residents who temporarily
                    return home while the housing component remains full-time.
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Today Coverage"
              subtitle="Current and upcoming house shifts, including multi-DSP support and behavioral needs."
              className="xl:col-span-8"
            >
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full text-left text-sm">
                  <thead className="border-b border-bac-border text-bac-muted">
                    <tr>
                      <th className="px-3 py-3">Time</th>
                      <th className="px-3 py-3">Service</th>
                      <th className="px-3 py-3">Staff Assigned</th>
                      <th className="px-3 py-3">Residents Covered</th>
                      <th className="px-3 py-3">Ratio</th>
                      <th className="px-3 py-3">Special</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bac-border">
                    {DEMO_COVERAGE.map((shift) => (
                      <tr key={shift.id} className="text-bac-text">
                        <td className="px-3 py-3 font-medium">{shift.time}</td>
                        <td className="px-3 py-3">{shift.service}</td>
                        <td className="px-3 py-3">
                          <div className="space-y-1">
                            {shift.staffAssigned.map((staff, index) => (
                              <div key={`${shift.id}-${index}`} className="text-sm">
                                {staff.name}{" "}
                                <span className="text-bac-muted">({staff.role})</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="space-y-1">
                            {shift.individualsCovered.map((name, index) => (
                              <div key={`${shift.id}-resident-${index}`}>{name}</div>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant="sky">{shift.staffingRatioLabel}</Badge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {shift.awakeRequired ? (
                              <Badge variant="violet">Awake</Badge>
                            ) : null}
                            {shift.behaviorSupport ? (
                              <Badge variant="danger">Behavior Support</Badge>
                            ) : null}
                            {!shift.awakeRequired && !shift.behaviorSupport ? (
                              <span className="text-bac-muted">—</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {renderShiftStatusBadge(shift.shiftStatus)}
                        </td>
                        <td className="px-3 py-3 text-bac-muted">{shift.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <SectionCard
              title="Alerts & Action Needed"
              subtitle="Office attention for staffing intensity, meds, and behavior-support coordination."
              className="xl:col-span-5"
            >
              <div className="space-y-3">
                {DEMO_ALERTS.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-2xl border border-bac-border bg-bac-bg p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          {a.level === "CRITICAL" ? (
                            <Badge variant="danger">Critical</Badge>
                          ) : a.level === "WARNING" ? (
                            <Badge variant="warning">Warning</Badge>
                          ) : (
                            <Badge variant="muted">Info</Badge>
                          )}
                          <div className="font-medium text-bac-text">{a.title}</div>
                        </div>
                        <div className="mt-2 text-sm text-bac-muted">{a.detail}</div>
                      </div>

                      <button className="rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text hover:bg-white/5">
                        {a.actionLabel}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Compliance Score Breakdown"
              subtitle="Audit readiness across house, meds, safety, training, and behavior support."
              className="xl:col-span-4"
            >
              <div className="space-y-4">
                {DEMO_COMPLIANCE.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-2xl border border-bac-border bg-bac-bg p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-bac-text">{item.label}</div>
                      <div className="text-sm font-semibold text-bac-text">{item.score}%</div>
                    </div>
                    <ProgressBar value={item.score} status={item.status} />
                    <div className="mt-2 flex items-center justify-between text-xs text-bac-muted">
                      <span>Last reviewed: {item.lastReviewed}</span>
                      <span>
                        {item.status === "GOOD"
                          ? "Good"
                          : item.status === "WARNING"
                          ? "Warning"
                          : "Critical"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Recent Activity Timeline"
              subtitle="Daily operational, behavioral, medication, and staffing events."
              className="xl:col-span-3"
            >
              <div className="space-y-4">
                {DEMO_TIMELINE.map((item) => (
                  <div key={item.id} className="relative pl-4">
                    <div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-violet-400" />
                    <div className="text-xs text-bac-muted">{item.at}</div>
                    <div className="mt-1 text-sm font-medium text-bac-text">{item.title}</div>
                    <div className="mt-1 text-sm text-bac-muted">{item.description}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {/* RESIDENTS */}
      {tab === "RESIDENTS" ? (
        <div className="space-y-4">
          <SectionCard
            title={`Residents — ${selectedHouse.name}`}
            subtitle="Residential roster with care model, housing status, home visits, meds, appointments, and behavior support."
            right={
              <button className="rounded-xl border border-bac-border bg-bac-bg px-4 py-2 text-sm text-bac-text hover:bg-white/5">
                Assign Resident
              </button>
            }
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
              <StatCard label="Total Residents" value={DEMO_RESIDENTS.length} />
              <StatCard label="24/7 Full-Time" value={fullTime247Count} tone="violet" />
              <StatCard label="Home-Visit Split" value={homeVisitSplitCount} tone="sky" />
              <StatCard label="High Need" value={highNeedCount} tone="danger" />
              <StatCard
                label="Daily Med Users"
                value={DEMO_RESIDENTS.length}
                tone="success"
              />
              <StatCard
                label="Behavior Intensive"
                value={
                  DEMO_RESIDENTS.filter((r) => r.behaviorSupportLevel === "INTENSIVE").length
                }
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
                  {DEMO_RESIDENTS.map((r) => (
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
      ) : null}

      {/* STAFFING */}
      {tab === "STAFFING" ? (
        <div className="space-y-4">
          <SectionCard
            title={`Staffing — ${selectedHouse.name}`}
            subtitle="House coverage, multi-DSP shifts, specialty support, training readiness, and care intensity."
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
              <StatCard label="Assigned Staff" value={DEMO_STAFF.length} />
              <StatCard
                label="On Duty Now"
                value={DEMO_STAFF.filter((s) => s.status === "ON_DUTY").length}
                tone="success"
              />
              <StatCard label="Multi-DSP Shifts" value={multiDspShiftCount} tone="warning" />
              <StatCard
                label="Behavior Specialist Visits"
                value={DEMO_SPECIALISTS.length}
                tone="sky"
              />
              <StatCard
                label="Med-Cert Staff"
                value={DEMO_STAFF.filter((s) => s.medCertified).length}
                tone="violet"
              />
              <StatCard
                label="Training Overdue"
                value={DEMO_STAFF.filter((s) => s.trainingStatus === "OVERDUE").length}
                tone="danger"
              />
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <SectionCard
              title="Staff Roster"
              subtitle="Assigned employees, specialists, certifications, and house-readiness."
              className="xl:col-span-8"
            >
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full text-left text-sm">
                  <thead className="border-b border-bac-border text-bac-muted">
                    <tr>
                      <th className="px-3 py-3">Employee</th>
                      <th className="px-3 py-3">Role</th>
                      <th className="px-3 py-3">Shift Today</th>
                      <th className="px-3 py-3">Training</th>
                      <th className="px-3 py-3">Med Cert</th>
                      <th className="px-3 py-3">CPR</th>
                      <th className="px-3 py-3">Driver</th>
                      <th className="px-3 py-3">Clearance</th>
                      <th className="px-3 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bac-border">
                    {DEMO_STAFF.map((s) => (
                      <tr key={s.id} className="text-bac-text">
                        <td className="px-3 py-3">
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-bac-muted">{s.id}</div>
                        </td>
                        <td className="px-3 py-3">{s.role}</td>
                        <td className="px-3 py-3">{s.shiftToday}</td>
                        <td className="px-3 py-3">
                          {s.trainingStatus === "CURRENT" ? (
                            <Badge variant="success">Current</Badge>
                          ) : s.trainingStatus === "DUE_SOON" ? (
                            <Badge variant="warning">Due Soon</Badge>
                          ) : (
                            <Badge variant="danger">Overdue</Badge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {s.medCertified ? (
                            <Badge variant="success">Yes</Badge>
                          ) : (
                            <Badge variant="danger">No</Badge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {s.cpr === "CURRENT" ? (
                            <Badge variant="success">Current</Badge>
                          ) : (
                            <Badge variant="danger">Expired</Badge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {s.driver === "ACTIVE" ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="muted">Inactive</Badge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {s.clearance === "CURRENT" ? (
                            <Badge variant="success">Current</Badge>
                          ) : (
                            <Badge variant="danger">Expired</Badge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {s.status === "ON_DUTY" ? (
                            <Badge variant="violet">On Duty</Badge>
                          ) : (
                            <Badge variant="muted">Off Duty</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard
              title="Coverage & Intensity"
              subtitle="Coverage health for shared houses and high-need residents."
              className="xl:col-span-4"
            >
              <div className="space-y-3">
                <RatioBox label="Current House Ratio" value="2 DSP : 3 Residents" status="GOOD" />
                <RatioBox
                  label="High-Need Shift Coverage"
                  value="3 DSP : 1 Resident overnight"
                  status="WARNING"
                />
                <RatioBox
                  label="Medication-Capable Coverage"
                  value="Available on all core shifts"
                  status="GOOD"
                />
                <RatioBox
                  label="Behavior Specialist Access"
                  value="1 specialist visit today"
                  status="GOOD"
                />
                <RatioBox
                  label="Weekend Backup Depth"
                  value="Needs one more trained DSP"
                  status="CRITICAL"
                />
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {/* COMPLIANCE */}
      {tab === "COMPLIANCE" ? (
        <div className="space-y-4">
          <SectionCard
            title={`Compliance — ${selectedHouse.name}`}
            subtitle="6400-focused dashboard for house, medication, training, and behavior-support compliance."
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
              {DEMO_COMPLIANCE.map((c) => (
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
                    {DEMO_DRILLS.map((d) => (
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
      ) : null}

      {/* DAILY OPERATIONS */}
      {tab === "OPERATIONS" ? (
        <div className="space-y-4">
          <SectionCard
            title={`Daily Operations — ${selectedHouse.name}`}
            subtitle="Meals, medication, laundry, appointments, specialist visits, behavior support, and daily residential care."
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
              <StatCard label="Meals Logged" value="1 / 4" tone="warning" />
              <StatCard label="Medication Tasks" value={DEMO_MEDS.length} tone="success" />
              <StatCard label="House Chores" value={DEMO_CHORES.length} tone="sky" />
              <StatCard label="Appointments" value={DEMO_APPOINTMENTS.length} tone="violet" />
              <StatCard label="Specialist Visits" value={DEMO_SPECIALISTS.length} tone="warning" />
              <StatCard label="Open Incidents" value={1} tone="danger" />
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <SectionCard
              title="Meals"
              subtitle="Meal service, feeding support, and kitchen coordination."
              className="xl:col-span-4"
            >
              <div className="space-y-3">
                {DEMO_MEALS.map((m) => (
                  <div key={m.meal} className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-bac-text">{m.meal}</div>
                      <Badge variant="muted">{m.completion}</Badge>
                    </div>
                    <div className="mt-2 text-sm text-bac-muted">Served by: {m.servedBy}</div>
                    <div className="mt-2 text-sm text-bac-muted">{m.notes}</div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Medication"
              subtitle="Most residential individuals use medication daily, often multiple times."
              className="xl:col-span-4"
            >
              <div className="space-y-3">
                {DEMO_MEDS.map((m, index) => (
                  <div
                    key={`${m.resident}-${index}`}
                    className="rounded-2xl border border-bac-border bg-bac-bg p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-bac-text">{m.resident}</div>
                      {m.status === "DONE" ? (
                        <Badge variant="success">Done</Badge>
                      ) : m.status === "PENDING" ? (
                        <Badge variant="warning">Pending</Badge>
                      ) : (
                        <Badge variant="danger">Refused</Badge>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-bac-muted">Schedule: {m.schedule}</div>
                    <div className="mt-2 text-sm text-bac-muted">{m.notes}</div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Laundry / Housekeeping"
              subtitle="Daily living support including laundry and home tasks."
              className="xl:col-span-4"
            >
              <div className="space-y-3">
                {DEMO_CHORES.map((c, index) => (
                  <div
                    key={`${c.task}-${index}`}
                    className="rounded-2xl border border-bac-border bg-bac-bg p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-bac-text">{c.task}</div>
                      {c.status === "DONE" ? (
                        <Badge variant="success">Done</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-bac-muted">Assigned to: {c.assignedTo}</div>
                    <div className="mt-2 text-sm text-bac-muted">{c.notes}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <SectionCard
              title="Appointments"
              subtitle="Ongoing doctor visits and follow-up coordination."
              className="xl:col-span-5"
            >
              <div className="space-y-3">
                {DEMO_APPOINTMENTS.map((a, index) => (
                  <div
                    key={`${a.resident}-${index}`}
                    className="rounded-2xl border border-bac-border bg-bac-bg p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-bac-text">{a.resident}</div>
                      {a.status === "SCHEDULED" ? (
                        <Badge variant="warning">Scheduled</Badge>
                      ) : a.status === "COMPLETED" ? (
                        <Badge variant="success">Completed</Badge>
                      ) : (
                        <Badge variant="violet">Follow-up</Badge>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-bac-muted">
                      {a.appointmentType} • {a.when}
                    </div>
                    <div className="mt-2 text-sm text-bac-muted">Escort: {a.escort}</div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Behavior Specialist Visits"
              subtitle="In-home specialist support for behavior management and staff coaching."
              className="xl:col-span-3"
            >
              <div className="space-y-3">
                {DEMO_SPECIALISTS.map((s, index) => (
                  <div
                    key={`${s.resident}-${index}`}
                    className="rounded-2xl border border-bac-border bg-bac-bg p-4"
                  >
                    <div className="text-sm font-medium text-bac-text">{s.resident}</div>
                    <div className="mt-1 text-sm text-bac-muted">{s.specialist}</div>
                    <div className="mt-2 text-sm text-bac-muted">{s.focus}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-bac-muted">{s.when}</span>
                      {s.status === "DONE" ? (
                        <Badge variant="success">Done</Badge>
                      ) : (
                        <Badge variant="warning">Upcoming</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Daily Notes / Behavior"
              subtitle="Shift notes, behavior observations, and care summary."
              className="xl:col-span-4"
            >
              <div className="space-y-3">
                <NoteBox
                  title="Morning shift note"
                  meta="Anna Smith • 09:45 AM"
                  body="Residents completed breakfast and medication with moderate prompts. Laundry started. One resident prepared for specialist behavior visit."
                />
                <NoteBox
                  title="Behavior support note"
                  meta="Behavior Specialist • 11:50 AM"
                  body="Observed transition difficulty before medication. Staff coaching provided on de-escalation and cueing."
                />
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {/* Modal */}
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
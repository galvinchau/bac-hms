// bac-hms/web/app/employees/[id]/page.tsx

"use client";

import React, {
  useEffect,
  useState,
  ChangeEvent,
  FormEvent,
  useMemo,
} from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

type EmploymentStatus = "Active" | "Inactive" | "On Leave";
type EmploymentType = "Full-time" | "Part-time" | "Per-diem" | "Contract";
type Gender = "Male" | "Female" | "Other" | "";
type ShiftPreference = "Morning" | "Afternoon" | "Evening" | "Overnight" | "";
type EmployeeTab = "personal" | "schedule";
type ScheduleStatusFilter =
  | ""
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "NOT_COMPLETED"
  | "CANCELLED"
  | "BACKUP_PLAN";

interface EmployeeFormValues {
  firstName: string;
  lastName: string;
  middleName: string;
  dateOfBirth: string;
  gender: Gender;
  phone: string;
  email: string;
  educationLevel: string;
  ssn: string;

  employeeId: string;
  role: string;
  status: EmploymentStatus | "";
  hireDate: string;
  terminationDate: string;
  employmentType: EmploymentType;
  branch: string;
  workLocation: string;
  supervisorName: string;

  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;

  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  emergencyEmail: string;
  emergencyPreferredLanguage: string;
  emergencyAddress: string;

  preferredShift: ShiftPreference | "";
  canWorkWeekends: boolean;
  canWorkHolidays: boolean;
  maxWeeklyHours: string;
  notes: string;

  notifyByEmail: boolean;
  notifyBySMS: boolean;
  notifyByInApp: boolean;
  sendScheduleChanges: boolean;
  sendPayrollUpdates: boolean;
  sendPolicyUpdates: boolean;

  isMobileUser: boolean;
}

interface EmployeeScheduleRow {
  id: string;
  scheduleDate: string;
  plannedStart: string;
  plannedEnd: string;
  status: string;
  awakeMonitoringRequired: boolean;
  cancelReason: string | null;
  cancelledAt: string | null;
  backupNote: string | null;
  billable: boolean;
  notes: string | null;
  assignmentType: string;
  plannedHours: number;
  dailyNoteId: string | null;
  hasDailyNote: boolean;
  individual: {
    id: string;
    code: string;
    name: string;
    branch: string | null;
    houseName: string;
    houseCode: string;
  };
  service: {
    id: string;
    code: string;
    name: string;
    category: string;
  };
  plannedDsp: {
    id: string;
    employeeId: string;
    name: string;
  } | null;
  actualDsp: {
    id: string;
    employeeId: string;
    name: string;
  } | null;
  week: {
    id: string;
    weekStart: string;
    weekEnd: string;
  };
}

interface EmployeeScheduleSummary {
  totalShifts: number;
  totalPlannedHours: number;
  cancelledShifts: number;
  backupPlanShifts: number;
  awakeShifts: number;
  completedShifts: number;
  inProgressShifts: number;
  upcomingShifts: number;
}

const emptyValues: EmployeeFormValues = {
  firstName: "",
  lastName: "",
  middleName: "",
  dateOfBirth: "",
  gender: "",
  phone: "",
  email: "",
  educationLevel: "",
  ssn: "",
  employeeId: "",
  role: "",
  status: "Active",
  hireDate: "",
  terminationDate: "",
  employmentType: "Full-time",
  branch: "",
  workLocation: "",
  supervisorName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",
  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",
  emergencyEmail: "",
  emergencyPreferredLanguage: "",
  emergencyAddress: "",
  preferredShift: "",
  canWorkWeekends: false,
  canWorkHolidays: false,
  maxWeeklyHours: "",
  notes: "",
  notifyByEmail: true,
  notifyBySMS: false,
  notifyByInApp: true,
  sendScheduleChanges: true,
  sendPayrollUpdates: true,
  sendPolicyUpdates: true,
  isMobileUser: false,
};

const emptyScheduleSummary: EmployeeScheduleSummary = {
  totalShifts: 0,
  totalPlannedHours: 0,
  cancelledShifts: 0,
  backupPlanShifts: 0,
  awakeShifts: 0,
  completedShifts: 0,
  inProgressShifts: 0,
  upcomingShifts: 0,
};

function formatFullName(first: string, middle?: string | null, last?: string | null) {
  return [first, middle || "", last || ""].join(" ").replace(/\s+/g, " ").trim();
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatHours(value: number) {
  return Number(value || 0).toFixed(2);
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "COMPLETED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "IN_PROGRESS":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "CANCELLED":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "BACKUP_PLAN":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "NOT_COMPLETED":
      return "border-orange-500/30 bg-orange-500/10 text-orange-300";
    default:
      return "border-bac-border bg-bac-bg/70 text-bac-text";
  }
}

function getTabClass(isActive: boolean) {
  return isActive
    ? "border-yellow-400 bg-yellow-400/10 text-yellow-300 font-bold shadow-[0_0_0_1px_rgba(250,204,21,0.25)]"
    : "border-bac-border/60 bg-transparent text-yellow-200 font-bold hover:border-yellow-400/60 hover:bg-yellow-400/5 hover:text-yellow-300";
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeekSunday(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function getDefaultScheduleRange() {
  const today = new Date();
  const currentWeekStart = startOfWeekSunday(today);

  const from = new Date(currentWeekStart);
  from.setDate(currentWeekStart.getDate() - 7);

  const to = new Date(currentWeekStart);
  to.setDate(currentWeekStart.getDate() + 27);

  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
  };
}

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const defaultScheduleRange = useMemo(() => getDefaultScheduleRange(), []);

  const [formValues, setFormValues] = useState<EmployeeFormValues>(emptyValues);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<EmployeeTab>("personal");

  const [scheduleRows, setScheduleRows] = useState<EmployeeScheduleRow[]>([]);
  const [scheduleSummary, setScheduleSummary] =
    useState<EmployeeScheduleSummary>(emptyScheduleSummary);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [scheduleFrom, setScheduleFrom] = useState(defaultScheduleRange.from);
  const [scheduleTo, setScheduleTo] = useState(defaultScheduleRange.to);
  const [scheduleStatus, setScheduleStatus] =
    useState<ScheduleStatusFilter>("");

  const [scheduleSearchIndividual, setScheduleSearchIndividual] = useState("");
  const [scheduleSearchService, setScheduleSearchService] = useState("");

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        setLoadError(null);

        const res = await fetch(`/api/employees/${id}`);
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.message || "Failed to load employee");
        }

        const emp = await res.json();

        const values: EmployeeFormValues = {
          firstName: emp.firstName ?? "",
          middleName: emp.middleName ?? "",
          lastName: emp.lastName ?? "",
          dateOfBirth: emp.dob ?? "",
          gender: (emp.gender as Gender) ?? "",
          phone: emp.phone ?? "",
          email: emp.email ?? "",
          educationLevel: emp.educationLevel ?? "",
          ssn: emp.ssn ?? "",
          employeeId: emp.employeeId ?? "",
          role: emp.role ?? "",
          status: (emp.status as EmploymentStatus) ?? "Active",
          hireDate: emp.hireDate ?? "",
          terminationDate: emp.terminationDate ?? "",
          employmentType: (emp.employmentType as EmploymentType) ?? "Full-time",
          branch: emp.branch ?? "",
          workLocation: emp.workLocation ?? "",
          supervisorName: emp.supervisorName ?? "",
          addressLine1: emp.address1 ?? "",
          addressLine2: emp.address2 ?? "",
          city: emp.city ?? "",
          state: emp.state ?? "",
          zipCode: emp.zip ?? "",
          emergencyName: emp.emergencyName ?? "",
          emergencyRelationship: emp.emergencyRelationship ?? "",
          emergencyPhone: emp.emergencyPhone ?? "",
          emergencyEmail: emp.emergencyEmail ?? "",
          emergencyPreferredLanguage: emp.emergencyPreferredLanguage ?? "",
          emergencyAddress: emp.emergencyAddress ?? "",
          preferredShift: (emp.preferredShift as ShiftPreference) ?? "",
          canWorkWeekends: !!emp.canWorkWeekends,
          canWorkHolidays: !!emp.canWorkHolidays,
          maxWeeklyHours:
            typeof emp.maxWeeklyHours === "number"
              ? String(emp.maxWeeklyHours)
              : "",
          notes: emp.notes ?? "",
          notifyByEmail: emp.notifyByEmail ?? true,
          notifyBySMS: emp.notifyBySMS ?? false,
          notifyByInApp: emp.notifyByInApp ?? true,
          sendScheduleChanges: emp.sendScheduleChanges ?? true,
          sendPayrollUpdates: emp.sendPayrollUpdates ?? true,
          sendPolicyUpdates: emp.sendPolicyUpdates ?? true,
          isMobileUser: emp.isMobileUser ?? false,
        };

        setFormValues(values);
      } catch (err: any) {
        console.error("Error loading employee:", err);
        setLoadError(err?.message || "Failed to load employee");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  const fetchSchedules = async () => {
    if (!id) return;

    try {
      setScheduleLoading(true);
      setScheduleError(null);

      const query = new URLSearchParams();
      if (scheduleFrom) query.set("from", scheduleFrom);
      if (scheduleTo) query.set("to", scheduleTo);
      if (scheduleStatus) query.set("status", scheduleStatus);

      const res = await fetch(
        `/api/employees/${id}/schedules${query.toString() ? `?${query.toString()}` : ""}`
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to load employee schedules");
      }

      const data = await res.json();

      setScheduleRows(data?.rows || []);
      setScheduleSummary(data?.summary || emptyScheduleSummary);
    } catch (err: any) {
      console.error("Error loading employee schedules:", err);
      setScheduleError(err?.message || "Failed to load employee schedules");
      setScheduleRows([]);
      setScheduleSummary(emptyScheduleSummary);
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "schedule") {
      fetchSchedules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setIsSubmitting(true);

      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formValues),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        console.error("Failed to update employee:", error);
        alert(error?.message || "Failed to update employee.");
        return;
      }

      const updated = await res.json();
      console.log("Employee updated:", updated);
      alert("Employee has been updated successfully.");
    } catch (err) {
      console.error("Unexpected error updating employee:", err);
      alert("Unexpected error while updating employee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push("/employees/search");
  };

  const employeeFullName = useMemo(() => {
    return formatFullName(
      formValues.firstName,
      formValues.middleName,
      formValues.lastName
    );
  }, [formValues.firstName, formValues.middleName, formValues.lastName]);

  const filteredScheduleRows = useMemo(() => {
    const individualTerm = normalizeSearch(scheduleSearchIndividual);
    const serviceTerm = normalizeSearch(scheduleSearchService);

    return scheduleRows.filter((row) => {
      const individualBlob = normalizeSearch(
        `${row.individual.name} ${row.individual.code} ${row.individual.branch || ""}`
      );

      const serviceBlob = normalizeSearch(
        `${row.service.name} ${row.service.code} ${row.service.category || ""}`
      );

      const matchesIndividual =
        !individualTerm || individualBlob.includes(individualTerm);

      const matchesService =
        !serviceTerm || serviceBlob.includes(serviceTerm);

      return matchesIndividual && matchesService;
    });
  }, [scheduleRows, scheduleSearchIndividual, scheduleSearchService]);

  const filteredScheduleSummary = useMemo(() => {
    return {
      totalRows: filteredScheduleRows.length,
      plannedHours: Number(
        filteredScheduleRows
          .reduce((sum, row) => sum + row.plannedHours, 0)
          .toFixed(2)
      ),
      upcoming: filteredScheduleRows.filter(
        (row) =>
          new Date(row.plannedStart).getTime() >= Date.now() &&
          row.status === "NOT_STARTED"
      ).length,
      inProgress: filteredScheduleRows.filter(
        (row) => row.status === "IN_PROGRESS"
      ).length,
      completed: filteredScheduleRows.filter(
        (row) => row.status === "COMPLETED"
      ).length,
      cancelled: filteredScheduleRows.filter(
        (row) => row.status === "CANCELLED"
      ).length,
      backup: filteredScheduleRows.filter(
        (row) => row.status === "BACKUP_PLAN"
      ).length,
      awake: filteredScheduleRows.filter(
        (row) => row.awakeMonitoringRequired
      ).length,
    };
  }, [filteredScheduleRows]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bac-bg text-bac-text">
        <div className="mx-auto max-w-[1600px] px-4 py-8">
          <p className="text-sm text-bac-muted">Loading employee...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-bac-bg text-bac-text">
        <div className="mx-auto max-w-[1600px] px-4 py-8">
          <p className="mb-4 text-sm text-red-400">
            Failed to load employee: {loadError}
          </p>
          <button
            onClick={handleBack}
            className="rounded-xl border border-bac-border px-4 py-2 text-sm font-medium text-bac-text hover:bg-bac-panel/70"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bac-bg text-bac-text">
      <div className="mx-auto max-w-[1600px] px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              View / Edit Employee
            </h1>
            <p className="mt-1 text-sm text-bac-muted">
              Update employee profile and employment details.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-bac-muted">
              {formValues.employeeId && (
                <span className="rounded-full border border-bac-border px-2 py-1 font-mono">
                  Employee ID: {formValues.employeeId}
                </span>
              )}
              {employeeFullName && (
                <span className="rounded-full border border-bac-border px-2 py-1">
                  {employeeFullName}
                </span>
              )}
              {formValues.role && (
                <span className="rounded-full border border-bac-border px-2 py-1">
                  {formValues.role}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-xl border border-bac-border px-4 py-2 text-sm font-medium text-bac-text hover:bg-bac-panel/70"
            >
              Back to Search
            </button>
            {activeTab === "personal" && (
              <button
                type="submit"
                form="edit-employee-form"
                disabled={isSubmitting}
                className="rounded-xl bg-bac-primary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-bac-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-bac-border/70 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("personal")}
            className={`rounded-xl border px-4 py-2 text-base transition ${getTabClass(
              activeTab === "personal"
            )}`}
          >
            Personal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className={`rounded-xl border px-4 py-2 text-base transition ${getTabClass(
              activeTab === "schedule"
            )}`}
          >
            Schedule
          </button>
        </div>

        {activeTab === "personal" && (
          <form
            id="edit-employee-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <section className="rounded-2xl border border-bac-border bg-bac-panel p-6 shadow">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Demographics</h2>
                <p className="mt-1 text-xs text-bac-muted">
                  Basic personal details for this employee.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="firstName" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formValues.firstName}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="John"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="middleName" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Middle Name
                  </label>
                  <input
                    id="middleName"
                    name="middleName"
                    type="text"
                    value={formValues.middleName}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="A."
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="lastName" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formValues.lastName}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="Doe"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="dateOfBirth" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Date of Birth
                  </label>
                  <input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={formValues.dateOfBirth}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="gender" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formValues.gender}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="phone" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formValues.phone}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="(814) 555-1234"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formValues.email}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="name.blueangelscare@gmail.com"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="educationLevel" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Education / Qualification
                  </label>
                  <select
                    id="educationLevel"
                    name="educationLevel"
                    value={formValues.educationLevel}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  >
                    <option value="">Select education level</option>
                    <option value="High school">High school / GED</option>
                    <option value="College">College / Associate</option>
                    <option value="Bachelor">Bachelor&apos;s degree</option>
                    <option value="Master">Master&apos;s degree</option>
                    <option value="Doctorate">Doctorate</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="ssn" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    SSN (9 digits)
                  </label>
                  <input
                    id="ssn"
                    name="ssn"
                    type="text"
                    inputMode="numeric"
                    maxLength={9}
                    value={formValues.ssn}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="123456789"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-bac-border bg-bac-panel p-6 shadow">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Employment Info</h2>
                <p className="mt-1 text-xs text-bac-muted">
                  Role, status, and employment details.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="employeeId" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Employee ID
                  </label>
                  <input
                    id="employeeId"
                    name="employeeId"
                    type="text"
                    value={formValues.employeeId}
                    readOnly
                    className="w-full cursor-not-allowed rounded-xl border border-bac-border bg-bac-bg/60 px-3 py-2 text-sm text-bac-muted outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="role" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Role / Position
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formValues.role}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  >
                    <option value="">Select role</option>
                    <option value="DSP">DSP</option>
                    <option value="Nurse">Nurse</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Admin">Admin</option>
                    <option value="Office Staff">Office Staff</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="status" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formValues.status}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="hireDate" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Hire Date
                  </label>
                  <input
                    id="hireDate"
                    name="hireDate"
                    type="date"
                    value={formValues.hireDate}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="terminationDate" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Termination Date
                  </label>
                  <input
                    id="terminationDate"
                    name="terminationDate"
                    type="date"
                    value={formValues.terminationDate}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="employmentType" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Employment Type
                  </label>
                  <select
                    id="employmentType"
                    name="employmentType"
                    value={formValues.employmentType}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Per-diem">Per-diem</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="branch" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Branch
                  </label>
                  <select
                    id="branch"
                    name="branch"
                    value={formValues.branch}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  >
                    <option value="">Select branch</option>
                    <option value="Altoona">Altoona</option>
                    <option value="Hollidaysburg">Hollidaysburg</option>
                    <option value="Bellefonte">Bellefonte</option>
                    <option value="State College">State College</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="workLocation" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Primary Work Location
                  </label>
                  <input
                    id="workLocation"
                    name="workLocation"
                    type="text"
                    value={formValues.workLocation}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="Altoona / Hollidaysburg / In-home services..."
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="supervisorName" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Supervisor
                  </label>
                  <input
                    id="supervisorName"
                    name="supervisorName"
                    type="text"
                    value={formValues.supervisorName}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="Name of direct supervisor"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-bac-border bg-bac-panel p-6 shadow">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Address</h2>
                <p className="mt-1 text-xs text-bac-muted">
                  Home address for this employee.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1 md:col-span-2">
                  <label htmlFor="addressLine1" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Address Line 1
                  </label>
                  <input
                    id="addressLine1"
                    name="addressLine1"
                    type="text"
                    value={formValues.addressLine1}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="Street address, PO Box, company name"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label htmlFor="addressLine2" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Address Line 2
                  </label>
                  <input
                    id="addressLine2"
                    name="addressLine2"
                    type="text"
                    value={formValues.addressLine2}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="Apartment, suite, unit, building, floor, etc."
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="city" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    City
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={formValues.city}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="Altoona"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="state" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    State
                  </label>
                  <input
                    id="state"
                    name="state"
                    type="text"
                    value={formValues.state}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm uppercase outline-none ring-bac-primary/40 focus:ring"
                    placeholder="PA"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="zipCode" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    ZIP Code
                  </label>
                  <input
                    id="zipCode"
                    name="zipCode"
                    type="text"
                    value={formValues.zipCode}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="16602"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-bac-border bg-bac-panel p-6 shadow">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Emergency Contact</h2>
                <p className="mt-1 text-xs text-bac-muted">
                  Who should we contact in case of an emergency?
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="emergencyName" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Name
                  </label>
                  <input
                    id="emergencyName"
                    name="emergencyName"
                    type="text"
                    value={formValues.emergencyName}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="Contact full name"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="emergencyRelationship" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Relationship
                  </label>
                  <input
                    id="emergencyRelationship"
                    name="emergencyRelationship"
                    type="text"
                    value={formValues.emergencyRelationship}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="Spouse, sibling, friend..."
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="emergencyPhone" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Phone
                  </label>
                  <input
                    id="emergencyPhone"
                    name="emergencyPhone"
                    type="tel"
                    value={formValues.emergencyPhone}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="(814) 555-9876"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label htmlFor="emergencyEmail" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Email
                  </label>
                  <input
                    id="emergencyEmail"
                    name="emergencyEmail"
                    type="email"
                    value={formValues.emergencyEmail}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="name.blueangelscare@gmail.com"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="emergencyPreferredLanguage" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Preferred Language
                  </label>
                  <select
                    id="emergencyPreferredLanguage"
                    name="emergencyPreferredLanguage"
                    value={formValues.emergencyPreferredLanguage}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  >
                    <option value="">Select language</option>
                    <option value="English">English</option>
                    <option value="Vietnamese">Vietnamese</option>
                    <option value="Spanish">Spanish</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1 md:col-span-3">
                  <label htmlFor="emergencyAddress" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Address
                  </label>
                  <textarea
                    id="emergencyAddress"
                    name="emergencyAddress"
                    value={formValues.emergencyAddress}
                    onChange={handleChange}
                    rows={2}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="Emergency contact full address"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-bac-border bg-bac-panel p-6 shadow">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Work Preferences</h2>
                <p className="mt-1 text-xs text-bac-muted">
                  Shift preferences and availability.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="preferredShift" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Preferred Shift
                  </label>
                  <select
                    id="preferredShift"
                    name="preferredShift"
                    value={formValues.preferredShift}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  >
                    <option value="">No specific preference</option>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                    <option value="Overnight">Overnight</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="maxWeeklyHours" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Max Weekly Hours
                  </label>
                  <input
                    id="maxWeeklyHours"
                    name="maxWeeklyHours"
                    type="number"
                    min={0}
                    value={formValues.maxWeeklyHours}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="e.g. 40"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Availability
                  </span>
                  <div className="mt-1 space-y-1 rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-xs">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="canWorkWeekends"
                        checked={formValues.canWorkWeekends}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded border-bac-border bg-bac-bg"
                      />
                      <span>Can work weekends</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="canWorkHolidays"
                        checked={formValues.canWorkHolidays}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded border-bac-border bg-bac-bg"
                      />
                      <span>Can work holidays</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-3">
                  <label htmlFor="notes" className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Additional Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formValues.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="Preferred individuals, locations, restrictions, languages, etc."
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-bac-border bg-bac-panel p-6 shadow">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">
                  Notification Preferences
                </h2>
                <p className="mt-1 text-xs text-bac-muted">
                  How should we contact this employee about updates?
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-2xl border border-bac-border bg-bac-bg/60 p-4 text-xs">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-bac-muted">
                    Channels
                  </p>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="notifyByEmail"
                      checked={formValues.notifyByEmail}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 rounded border-bac-border bg-bac-bg"
                    />
                    <span>Email notifications</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="notifyBySMS"
                      checked={formValues.notifyBySMS}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 rounded border-bac-border bg-bac-bg"
                    />
                    <span>SMS / Text messages</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="notifyByInApp"
                      checked={formValues.notifyByInApp}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 rounded border-bac-border bg-bac-bg"
                    />
                    <span>In-app notifications</span>
                  </label>
                </div>

                <div className="space-y-2 rounded-2xl border border-bac-border bg-bac-bg/60 p-4 text-xs">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-bac-muted">
                    Topics
                  </p>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="sendScheduleChanges"
                      checked={formValues.sendScheduleChanges}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 rounded border-bac-border bg-bac-bg"
                    />
                    <span>Schedule changes</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="sendPayrollUpdates"
                      checked={formValues.sendPayrollUpdates}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 rounded border-bac-border bg-bac-bg"
                    />
                    <span>Payroll & timesheet updates</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="sendPolicyUpdates"
                      checked={formValues.sendPolicyUpdates}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 rounded border-bac-border bg-bac-bg"
                    />
                    <span>Policy / compliance updates</span>
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isMobileUser"
                  checked={formValues.isMobileUser}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 rounded border-bac-border bg-bac-bg"
                />
                <span>Mobile user</span>
              </label>
              <p className="mt-1 text-xs text-bac-muted">
                Check this if this employee should have access to the mobile app.
              </p>
            </section>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleBack}
                className="rounded-xl border border-bac-border px-4 py-2 text-sm font-medium text-bac-text hover:bg-bac-panel/70"
              >
                Back to Search
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-bac-primary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-bac-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}

        {activeTab === "schedule" && (
          <div className="space-y-6">
            <section className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Employee Schedule</h2>
                <p className="mt-1 text-xs text-bac-muted">
                  Default window = previous week + current week + next 2 weeks
                  (Sunday to Saturday).
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-1">
                  <label
                    htmlFor="scheduleFrom"
                    className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                  >
                    From Date
                  </label>
                  <input
                    id="scheduleFrom"
                    type="date"
                    value={scheduleFrom}
                    onChange={(e) => setScheduleFrom(e.target.value)}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="scheduleTo"
                    className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                  >
                    To Date
                  </label>
                  <input
                    id="scheduleTo"
                    type="date"
                    value={scheduleTo}
                    onChange={(e) => setScheduleTo(e.target.value)}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="scheduleStatus"
                    className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                  >
                    Status
                  </label>
                  <select
                    id="scheduleStatus"
                    value={scheduleStatus}
                    onChange={(e) =>
                      setScheduleStatus(e.target.value as ScheduleStatusFilter)
                    }
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  >
                    <option value="">All statuses</option>
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="NOT_COMPLETED">Not Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="BACKUP_PLAN">Backup Plan</option>
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={fetchSchedules}
                    disabled={scheduleLoading}
                    className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-bac-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {scheduleLoading ? "Loading..." : "Apply Filters"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setScheduleFrom(defaultScheduleRange.from);
                      setScheduleTo(defaultScheduleRange.to);
                      setScheduleStatus("");
                      setScheduleSearchIndividual("");
                      setScheduleSearchService("");
                      setTimeout(() => {
                        fetchSchedules();
                      }, 0);
                    }}
                    className="rounded-xl border border-bac-border px-4 py-2 text-sm font-medium text-bac-text hover:bg-bac-bg/70"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor="scheduleSearchIndividual"
                    className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                  >
                    Search Individual
                  </label>
                  <input
                    id="scheduleSearchIndividual"
                    type="text"
                    value={scheduleSearchIndividual}
                    onChange={(e) => setScheduleSearchIndividual(e.target.value)}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="Name, code, or branch"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="scheduleSearchService"
                    className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                  >
                    Search Service
                  </label>
                  <input
                    id="scheduleSearchService"
                    type="text"
                    value={scheduleSearchService}
                    onChange={(e) => setScheduleSearchService(e.target.value)}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    placeholder="Service name, code, or category"
                  />
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow">
                <p className="text-xs uppercase tracking-wide text-bac-muted">
                  Total Shifts
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {filteredScheduleSummary.totalRows}
                </p>
                <p className="mt-1 text-xs text-bac-muted">
                  Server total: {scheduleSummary.totalShifts}
                </p>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow">
                <p className="text-xs uppercase tracking-wide text-bac-muted">
                  Planned Hours
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {formatHours(filteredScheduleSummary.plannedHours)}
                </p>
                <p className="mt-1 text-xs text-bac-muted">
                  Filtered results
                </p>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow">
                <p className="text-xs uppercase tracking-wide text-bac-muted">
                  Upcoming Shifts
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {filteredScheduleSummary.upcoming}
                </p>
                <p className="mt-1 text-xs text-bac-muted">
                  Not started and future
                </p>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow">
                <p className="text-xs uppercase tracking-wide text-bac-muted">
                  In Progress
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {filteredScheduleSummary.inProgress}
                </p>
                <p className="mt-1 text-xs text-bac-muted">
                  Active right now
                </p>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow">
                <p className="text-xs uppercase tracking-wide text-bac-muted">
                  Completed
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {filteredScheduleSummary.completed}
                </p>
                <p className="mt-1 text-xs text-bac-muted">
                  Finished shifts
                </p>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow">
                <p className="text-xs uppercase tracking-wide text-bac-muted">
                  Cancelled
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {filteredScheduleSummary.cancelled}
                </p>
                <p className="mt-1 text-xs text-bac-muted">
                  Cancelled by office / DSP / individual
                </p>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow">
                <p className="text-xs uppercase tracking-wide text-bac-muted">
                  Backup Plan
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {filteredScheduleSummary.backup}
                </p>
                <p className="mt-1 text-xs text-bac-muted">
                  Backup plan shifts
                </p>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow">
                <p className="text-xs uppercase tracking-wide text-bac-muted">
                  Awake Monitoring
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {filteredScheduleSummary.awake}
                </p>
                <p className="mt-1 text-xs text-bac-muted">
                  Shifts requiring awake confirmation
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow">
              {scheduleLoading ? (
                <p className="text-sm text-bac-muted">Loading schedules...</p>
              ) : scheduleError ? (
                <p className="text-sm text-red-400">
                  Failed to load schedules: {scheduleError}
                </p>
              ) : filteredScheduleRows.length === 0 ? (
                <p className="text-sm text-bac-muted">
                  No schedule shifts found for this employee with current filters.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1580px] w-full text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-bac-panel">
                      <tr className="border-b border-bac-border/60 text-xs uppercase tracking-wide text-bac-muted">
                        <th className="px-3 py-3 w-[150px]">Date</th>
                        <th className="px-3 py-3 w-[220px]">Time</th>
                        <th className="px-3 py-3 w-[260px]">Individual</th>
                        <th className="px-3 py-3 w-[300px]">Service</th>
                        <th className="px-3 py-3 w-[120px]">Hours</th>
                        <th className="px-3 py-3 w-[220px]">Assigned As</th>
                        <th className="px-3 py-3 w-[150px]">Status</th>
                        <th className="px-3 py-3 w-[140px]">Flags</th>
                        <th className="px-3 py-3 min-w-[200px]">Notes</th>
                        <th className="px-3 py-3 w-[260px]">Daily Note Report</th>
                        
                      </tr>
                    </thead>
                    <tbody>
                      {filteredScheduleRows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-bac-border/40 align-top hover:bg-bac-bg/40"
                        >
                          <td className="px-3 py-3">
                            <div className="font-medium whitespace-nowrap">
                              {formatDate(row.scheduleDate)}
                            </div>
                            <div className="mt-1 text-xs text-bac-muted">
                              Week: {formatDate(row.week.weekStart)} -{" "}
                              {formatDate(row.week.weekEnd)}
                            </div>
                          </td>

                          <td className="px-3 py-3 min-w-[220px]">
                            <div className="font-medium whitespace-nowrap">
                              {formatTime(row.plannedStart)} -{" "}
                              {formatTime(row.plannedEnd)}
                            </div>
                            <div className="mt-1 text-xs text-bac-muted">
                              Start: {formatDateTime(row.plannedStart)}
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="font-medium">
                              {row.individual.name}
                            </div>
                            <div className="mt-1 text-xs text-bac-muted whitespace-nowrap">
                              {row.individual.code || "-"}
                            </div>
                            <div className="mt-1 text-xs text-bac-muted">
                              Branch: {row.individual.branch || "-"}
                            </div>
                            {row.individual.houseName && (
                              <div className="mt-1 text-xs text-bac-muted">
                                House: {row.individual.houseName}
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-3">
                            <div className="font-medium">
                              {row.service.name}
                            </div>
                            <div className="mt-1 text-xs text-bac-muted whitespace-nowrap">
                              Code: {row.service.code || "-"}
                            </div>
                            <div className="mt-1 text-xs text-bac-muted">
                              Category: {row.service.category || "-"}
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="font-medium whitespace-nowrap">
                              {formatHours(row.plannedHours)}
                            </div>
                            <div className="mt-1 text-xs text-bac-muted whitespace-nowrap">
                              {row.billable ? "Billable" : "Non-billable"}
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="font-medium whitespace-nowrap">
                              {row.assignmentType || "-"}
                            </div>
                            {row.actualDsp && (
                              <div className="mt-1 text-xs text-bac-muted">
                                Actual: {row.actualDsp.name}
                              </div>
                            )}
                            {row.plannedDsp && (
                              <div className="mt-1 text-xs text-bac-muted">
                                Planned: {row.plannedDsp.name}
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium whitespace-nowrap ${getStatusBadgeClass(
                                row.status
                              )}`}
                            >
                              {row.status.replaceAll("_", " ")}
                            </span>
                            {row.cancelledAt && (
                              <div className="mt-2 text-xs text-bac-muted">
                                Cancelled: {formatDateTime(row.cancelledAt)}
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                              {row.awakeMonitoringRequired && (
                                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-xs text-violet-300 whitespace-nowrap">
                                  Awake
                                </span>
                              )}
                              {row.status === "BACKUP_PLAN" && (
                                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300 whitespace-nowrap">
                                  Backup
                                </span>
                              )}
                              {row.status === "CANCELLED" && (
                                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300 whitespace-nowrap">
                                  Cancelled
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="max-w-[420px] space-y-2 text-xs text-bac-muted">
                              {row.cancelReason && (
                                <div>
                                  <span className="font-semibold text-bac-text">
                                    Cancel Reason:
                                  </span>{" "}
                                  {row.cancelReason}
                                </div>
                              )}
                              {row.backupNote && (
                                <div>
                                  <span className="font-semibold text-bac-text">
                                    Backup Note:
                                  </span>{" "}
                                  {row.backupNote}
                                </div>
                              )}
                              {row.notes && (
                                <div>
                                  <span className="font-semibold text-bac-text">
                                    Shift Notes:
                                  </span>{" "}
                                  {row.notes}
                                </div>
                              )}
                              {!row.cancelReason && !row.backupNote && !row.notes && (
                                <span className="text-bac-muted/70">No notes</span>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            {row.hasDailyNote && row.dailyNoteId ? (
                              <Link
                                href={`/reports/daily-notes/${row.dailyNoteId}`}
                                className="inline-flex items-center rounded-lg border border-bac-primary/40 bg-bac-primary/10 px-3 py-1.5 text-xs font-semibold text-bac-primary hover:bg-bac-primary/20"
                              >
                                Open Report
                              </Link>
                            ) : (
                              <span className="text-xs text-bac-muted/70">No Report</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
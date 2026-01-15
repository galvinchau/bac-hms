"use client";

import React, { useMemo, useState } from "react";

type PayrollRow = {
  staffId: string;
  staffName: string;
  staffType: "DSP" | "OFFICE";

  // ✅ Sensitive + weekly add-ons (for Taxer DOC)
  employeeSSN?: string | null;

  trainingHours?: number; // HR/Admin can edit weekly
  sickHours?: number; // HR/Admin can edit weekly
  holidayHours?: number; // HR/Admin can edit weekly
  ptoHours?: number; // HR/Admin can edit weekly
  mileage?: number; // ✅ NEW: miles (HR/Admin can edit weekly)

  // Rates
  rate: number; // hourly rate
  trainingRate?: number; // default 10 (reference)
  mileageRate?: number; // ✅ NEW: default 0.30 (reference)

  // Payroll computed fields (base from backend; UI will add extras)
  hours: number;
  otHours: number;
  regularPay: number;
  otPay: number;
  totalPay: number;
};

type PayrollRun = {
  id: string;
  periodFrom: string; // YYYY-MM-DD (Sun)
  periodTo: string; // YYYY-MM-DD (Sat)
  generatedAt: string; // ISO
  totals: {
    totalHours: number;
    totalOtHours: number;
    totalPay: number;
  };
  rows: PayrollRow[];
  exports?: {
    docUrl?: string | null;
    pdfUrl?: string | null;
  };
};

// Employee roster used by Payroll (do NOT expose rate in Employee Profile)
type EmployeePayrollLite = {
  employeeId: string; // Employee.employeeId (BAC-E-....)
  firstName: string;
  lastName: string;
  role: string | null;

  dob?: string | null;
  ssn?: string | null;

  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;

  phone?: string | null;
  email?: string | null;

  // payroll-specific
  rate?: number | null;
  trainingRate?: number | null; // default 10
  mileageRate?: number | null; // ✅ NEW default 0.30
  staffType?: "DSP" | "OFFICE" | null; // optional (backend can compute)
};

type SaveRatesPayload = {
  items: Array<{
    employeeId: string;
    rate: number | null;
    trainingRate: number | null;
    mileageRate: number | null; // ✅ NEW
  }>;
};

function money(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function toNumberOrNull(v: string): number | null {
  const s = (v || "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function toNumberOrZero(v: string): number {
  const s = (v || "").trim();
  if (!s) return 0;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function fmtDateOrDash(s?: string | null) {
  const v = (s || "").trim();
  return v ? v : "-";
}

function fmtOrDash(s?: string | null) {
  const v = (s || "").toString().trim();
  return v ? v : "-";
}

function formatAddress(e: EmployeePayrollLite) {
  const parts: string[] = [];
  if (e.address1) parts.push(e.address1);
  if (e.address2) parts.push(e.address2);

  const cityStateZip = [e.city, e.state, e.zip].filter(Boolean).join(" ");
  if (cityStateZip) parts.push(cityStateZip);

  return parts.length ? parts.join(", ") : "-";
}

function clampNonNeg(n: number) {
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function format2(n: number) {
  return Number.isFinite(n) ? n.toFixed(2) : "";
}

function normalizeDecimalInputString(s: string) {
  // allow typing "", ".", "29.", "29.7", "29.75"
  // strip invalid chars except one dot
  const raw = (s ?? "").toString();
  if (!raw) return "";
  let out = "";
  let dot = false;
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") out += ch;
    else if (ch === "." && !dot) {
      out += ".";
      dot = true;
    }
  }
  return out;
}

function parseAndFormat2(s: string): { value: number | null; text: string } {
  const t = (s || "").trim();
  if (!t || t === ".") return { value: null, text: "" };
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return { value: null, text: "" };
  const fixed = n.toFixed(2);
  return { value: Number(fixed), text: fixed };
}

// ✅ Payroll formula (UI reference; backend must match)
function computeExtrasPay(r: PayrollRow) {
  const rate = Number.isFinite(r.rate) ? r.rate : 0;

  const trainingHours = clampNonNeg(r.trainingHours || 0);
  const sickHours = clampNonNeg(r.sickHours || 0);
  const holidayHours = clampNonNeg(r.holidayHours || 0);
  const ptoHours = clampNonNeg(r.ptoHours || 0);
  const mileage = clampNonNeg(r.mileage || 0);

  const trainingRate =
    typeof r.trainingRate === "number" && Number.isFinite(r.trainingRate)
      ? r.trainingRate
      : 10;

  // ✅ Mileage reimbursement default = $0.30/mile
  const mileageRate =
    typeof r.mileageRate === "number" && Number.isFinite(r.mileageRate)
      ? r.mileageRate
      : 0.3;

  // Multipliers requested:
  const sickPay = sickHours * rate * 1.0;
  const holidayPay = holidayHours * rate * 2.0;
  const ptoPay = ptoHours * rate * 1.0;

  const trainingPay = trainingHours * trainingRate;
  const mileagePay = mileage * mileageRate;

  const extrasPay = sickPay + holidayPay + ptoPay + trainingPay + mileagePay;

  return {
    trainingHours,
    sickHours,
    holidayHours,
    ptoHours,
    mileage,
    trainingRate,
    mileageRate,
    trainingPay,
    sickPay,
    holidayPay,
    ptoPay,
    mileagePay,
    extrasPay,
  };
}

export default function PayrollPage() {
  // ✅ FIX: robust API base resolution
  const API_BASE = useMemo(() => {
    const envBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "")
      .toString()
      .trim()
      .replace(/\/$/, "");

    if (envBase) return envBase;

    // client-side fallback for local dev
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      const proto = window.location.protocol;
      if (host === "localhost" || host === "127.0.0.1") {
        // common Nest port (adjust if yours differs)
        return `${proto}//${host}:4000`;
      }
    }

    // empty => we will show a clear error before calling fetch
    return "";
  }, []);

  // Tabs
  const [tab, setTab] = useState<"RUN" | "RATES">("RUN");

  // Default: current payroll week (Sun-Sat)
  const [periodFrom, setPeriodFrom] = useState<string>(() => {
    const now = new Date();
    const day = now.getDay();
    const s = new Date(now);
    s.setDate(now.getDate() - day);
    s.setHours(0, 0, 0, 0);
    return s.toISOString().slice(0, 10);
  });

  const [periodTo, setPeriodTo] = useState<string>(() => {
    const now = new Date();
    const day = now.getDay();
    const s = new Date(now);
    s.setDate(now.getDate() - day);
    s.setHours(0, 0, 0, 0);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e.toISOString().slice(0, 10);
  });

  const [staffTypeFilter, setStaffTypeFilter] = useState<
    "ALL" | "DSP" | "OFFICE"
  >("ALL");

  // RUN states
  const [isGenerating, setIsGenerating] = useState(false);
  const [run, setRun] = useState<PayrollRun | null>(null);

  // ✅ Local editable weekly extras (until backend exists)
  // key: staffId -> overrides
  const [weeklyExtras, setWeeklyExtras] = useState<
    Record<
      string,
      {
        trainingHours: number;
        sickHours: number;
        holidayHours: number;
        ptoHours: number;
        mileage: number; // ✅ NEW
      }
    >
  >({});

  // RATES states
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isSavingRates, setIsSavingRates] = useState(false);
  const [employees, setEmployees] = useState<EmployeePayrollLite[]>([]);
  const [empQ, setEmpQ] = useState("");
  const [empRoleFilter, setEmpRoleFilter] = useState<"ALL" | "DSP" | "OFFICE">(
    "ALL"
  );
  const [showSensitive, setShowSensitive] = useState(false);

  // ✅ NEW: keep editable text so user can type decimals naturally
  const [rateDraft, setRateDraft] = useState<
    Record<string, { rate: string; trainingRate: string; mileageRate: string }>
  >({});

  const [error, setError] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const rows = run?.rows || [];
    if (staffTypeFilter === "ALL") return rows;
    return rows.filter((r) => r.staffType === staffTypeFilter);
  }, [run, staffTypeFilter]);

  const mergedRows = useMemo(() => {
    // merge backend rows + local weekly extras (UI edits)
    return filteredRows.map((r) => {
      const ex = weeklyExtras[r.staffId];
      return {
        ...r,
        trainingHours:
          typeof ex?.trainingHours === "number"
            ? ex.trainingHours
            : r.trainingHours || 0,
        sickHours:
          typeof ex?.sickHours === "number" ? ex.sickHours : r.sickHours || 0,
        holidayHours:
          typeof ex?.holidayHours === "number"
            ? ex.holidayHours
            : r.holidayHours || 0,
        ptoHours:
          typeof ex?.ptoHours === "number" ? ex.ptoHours : r.ptoHours || 0,
        mileage: typeof ex?.mileage === "number" ? ex.mileage : r.mileage || 0,
      };
    });
  }, [filteredRows, weeklyExtras]);

  const viewTotals = useMemo(() => {
    const rows = mergedRows;

    // hours totals (work hours only)
    const totalHours = rows.reduce((s, r) => s + (r.hours || 0), 0);
    const totalOtHours = rows.reduce((s, r) => s + (r.otHours || 0), 0);

    // pay totals: backend totalPay + extras pay (training/sick/holiday/pto/mileage)
    const totalPay = rows.reduce((s, r) => {
      const ex = computeExtrasPay(r);
      return s + (r.totalPay || 0) + ex.extrasPay;
    }, 0);

    return { totalHours, totalOtHours, totalPay };
  }, [mergedRows]);

  const filteredEmployees = useMemo(() => {
    const q = empQ.trim().toLowerCase();
    const rows = employees;

    return rows.filter((e) => {
      const matchQ =
        !q ||
        e.employeeId.toLowerCase().includes(q) ||
        e.firstName.toLowerCase().includes(q) ||
        e.lastName.toLowerCase().includes(q) ||
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        (e.email || "").toLowerCase().includes(q) ||
        (e.role || "").toLowerCase().includes(q);

      const t = (e.staffType || "").toUpperCase() as "DSP" | "OFFICE" | "";
      const matchType = empRoleFilter === "ALL" ? true : t === empRoleFilter;

      return matchQ && matchType;
    });
  }, [employees, empQ, empRoleFilter]);

  function requireApiBaseOrThrow() {
    if (!API_BASE) {
      throw new Error(
        "API base is not configured. Set NEXT_PUBLIC_API_BASE_URL (e.g. http://localhost:4000) or ensure local fallback is correct."
      );
    }
  }

  async function generatePayroll() {
    setError(null);
    setIsGenerating(true);

    try {
      requireApiBaseOrThrow();

      // POST /payroll/generate { from, to }
      const res = await fetch(`${API_BASE}/payroll/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          from: periodFrom,
          to: periodTo,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Generate failed (${res.status}). ${t || ""}`.trim());
      }

      const json = (await res.json()) as PayrollRun;
      setRun(json);

      // init local weekly extras cache
      const next: typeof weeklyExtras = {};
      for (const r of json.rows || []) {
        next[r.staffId] = {
          trainingHours: r.trainingHours || 0,
          sickHours: r.sickHours || 0,
          holidayHours: r.holidayHours || 0,
          ptoHours: r.ptoHours || 0,
          mileage: r.mileage || 0,
        };
      }
      setWeeklyExtras(next);
    } catch (e: any) {
      setError(e?.message || "Generate failed");
    } finally {
      setIsGenerating(false);
    }
  }

  async function exportDoc() {
    if (!run) return;
    setError(null);

    try {
      requireApiBaseOrThrow();

      const res = await fetch(`${API_BASE}/payroll/export/doc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          runId: run.id,
          periodFrom,
          periodTo,
          staffTypeFilter,
          weeklyExtras,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Export DOC failed (${res.status}). ${t || ""}`.trim());
      }

      const json = (await res.json()) as { docUrl: string };
      setRun((prev) =>
        prev
          ? {
            ...prev,
            exports: { ...(prev.exports || {}), docUrl: json.docUrl },
          }
          : prev
      );

      if (json.docUrl) window.open(json.docUrl, "_blank");
    } catch (e: any) {
      setError(e?.message || "Export DOC failed");
    }
  }

  async function exportPdf() {
    if (!run) return;
    setError(null);

    try {
      requireApiBaseOrThrow();

      const res = await fetch(`${API_BASE}/payroll/export/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          runId: run.id,
          periodFrom,
          periodTo,
          staffTypeFilter,
          weeklyExtras,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Export PDF failed (${res.status}). ${t || ""}`.trim());
      }

      const json = (await res.json()) as { pdfUrl: string };
      setRun((prev) =>
        prev
          ? {
            ...prev,
            exports: { ...(prev.exports || {}), pdfUrl: json.pdfUrl },
          }
          : prev
      );

      if (json.pdfUrl) window.open(json.pdfUrl, "_blank");
    } catch (e: any) {
      setError(e?.message || "Export PDF failed");
    }
  }

  async function loadEmployees() {
    setError(null);
    setIsLoadingEmployees(true);
    try {
      requireApiBaseOrThrow();

      // GET /payroll/employees
      const res = await fetch(`${API_BASE}/payroll/employees`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(
          `Load employees failed (${res.status}). ${t || ""}`.trim()
        );
      }

      const json = (await res.json()) as EmployeePayrollLite[];
      const arr = Array.isArray(json) ? json : [];

      const normalized = arr.map((e) => ({
        ...e,
        trainingRate: typeof e.trainingRate === "number" ? e.trainingRate : 10,
        mileageRate: typeof e.mileageRate === "number" ? e.mileageRate : 0.3,
      }));

      setEmployees(normalized);

      // ✅ initialize drafts with 2-decimal strings
      const nextDraft: typeof rateDraft = {};
      for (const e of normalized) {
        nextDraft[e.employeeId] = {
          rate: typeof e.rate === "number" ? format2(e.rate) : "",
          trainingRate:
            typeof e.trainingRate === "number" ? format2(e.trainingRate) : "",
          mileageRate:
            typeof e.mileageRate === "number" ? format2(e.mileageRate) : "",
        };
      }
      setRateDraft(nextDraft);
    } catch (e: any) {
      setError(e?.message || "Load employees failed");
    } finally {
      setIsLoadingEmployees(false);
    }
  }

  function updateRateLocal(employeeId: string, rateText: string) {
    const cleaned = normalizeDecimalInputString(rateText);
    setRateDraft((prev) => ({
      ...prev,
      [employeeId]: {
        rate: cleaned,
        trainingRate: prev[employeeId]?.trainingRate ?? "",
        mileageRate: prev[employeeId]?.mileageRate ?? "",
      },
    }));

    const rate = toNumberOrNull(cleaned);
    setEmployees((prev) =>
      prev.map((e) => (e.employeeId === employeeId ? { ...e, rate } : e))
    );
  }

  function blurRate(employeeId: string) {
    const cur = rateDraft[employeeId]?.rate ?? "";
    const { value, text } = parseAndFormat2(cur);

    setRateDraft((prev) => ({
      ...prev,
      [employeeId]: {
        rate: text,
        trainingRate: prev[employeeId]?.trainingRate ?? "",
        mileageRate: prev[employeeId]?.mileageRate ?? "",
      },
    }));

    setEmployees((prev) =>
      prev.map((e) => (e.employeeId === employeeId ? { ...e, rate: value } : e))
    );
  }

  function updateTrainingRateLocal(employeeId: string, rateText: string) {
    const cleaned = normalizeDecimalInputString(rateText);
    setRateDraft((prev) => ({
      ...prev,
      [employeeId]: {
        rate: prev[employeeId]?.rate ?? "",
        trainingRate: cleaned,
        mileageRate: prev[employeeId]?.mileageRate ?? "",
      },
    }));

    const r = toNumberOrNull(cleaned);
    setEmployees((prev) =>
      prev.map((e) =>
        e.employeeId === employeeId ? { ...e, trainingRate: r } : e
      )
    );
  }

  function blurTrainingRate(employeeId: string) {
    const cur = rateDraft[employeeId]?.trainingRate ?? "";
    const { value, text } = parseAndFormat2(cur);

    setRateDraft((prev) => ({
      ...prev,
      [employeeId]: {
        rate: prev[employeeId]?.rate ?? "",
        trainingRate: text,
        mileageRate: prev[employeeId]?.mileageRate ?? "",
      },
    }));

    setEmployees((prev) =>
      prev.map((e) =>
        e.employeeId === employeeId ? { ...e, trainingRate: value } : e
      )
    );
  }

  function updateMileageRateLocal(employeeId: string, rateText: string) {
    const cleaned = normalizeDecimalInputString(rateText);
    setRateDraft((prev) => ({
      ...prev,
      [employeeId]: {
        rate: prev[employeeId]?.rate ?? "",
        trainingRate: prev[employeeId]?.trainingRate ?? "",
        mileageRate: cleaned,
      },
    }));

    const r = toNumberOrNull(cleaned);
    setEmployees((prev) =>
      prev.map((e) =>
        e.employeeId === employeeId ? { ...e, mileageRate: r } : e
      )
    );
  }

  function blurMileageRate(employeeId: string) {
    const cur = rateDraft[employeeId]?.mileageRate ?? "";
    const { value, text } = parseAndFormat2(cur);

    setRateDraft((prev) => ({
      ...prev,
      [employeeId]: {
        rate: prev[employeeId]?.rate ?? "",
        trainingRate: prev[employeeId]?.trainingRate ?? "",
        mileageRate: text,
      },
    }));

    setEmployees((prev) =>
      prev.map((e) =>
        e.employeeId === employeeId ? { ...e, mileageRate: value } : e
      )
    );
  }

  async function saveRates() {
    setError(null);
    setIsSavingRates(true);

    try {
      requireApiBaseOrThrow();

      const payload: SaveRatesPayload = {
        items: employees.map((e) => ({
          employeeId: e.employeeId,
          rate: typeof e.rate === "number" ? e.rate : null,
          trainingRate:
            typeof e.trainingRate === "number" ? e.trainingRate : null,
          mileageRate: typeof e.mileageRate === "number" ? e.mileageRate : null,
        })),
      };

      const res = await fetch(`${API_BASE}/payroll/rates/upsert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Save rates failed (${res.status}). ${t || ""}`.trim());
      }

      const json = (await res.json()) as {
        ok: true;
        employees?: EmployeePayrollLite[];
      };
      if (json?.employees && Array.isArray(json.employees)) {
        const normalized = json.employees.map((e) => ({
          ...e,
          trainingRate:
            typeof e.trainingRate === "number" ? e.trainingRate : 10,
          mileageRate: typeof e.mileageRate === "number" ? e.mileageRate : 0.3,
        }));
        setEmployees(normalized);

        const nextDraft: typeof rateDraft = {};
        for (const e of normalized) {
          nextDraft[e.employeeId] = {
            rate: typeof e.rate === "number" ? format2(e.rate) : "",
            trainingRate:
              typeof e.trainingRate === "number" ? format2(e.trainingRate) : "",
            mileageRate:
              typeof e.mileageRate === "number" ? format2(e.mileageRate) : "",
          };
        }
        setRateDraft(nextDraft);
      }
    } catch (e: any) {
      setError(e?.message || "Save rates failed");
    } finally {
      setIsSavingRates(false);
    }
  }

  function setExtra(
    staffId: string,
    key:
      | "trainingHours"
      | "sickHours"
      | "holidayHours"
      | "ptoHours"
      | "mileage",
    val: number
  ) {
    setWeeklyExtras((prev) => ({
      ...prev,
      [staffId]: {
        trainingHours: prev[staffId]?.trainingHours ?? 0,
        sickHours: prev[staffId]?.sickHours ?? 0,
        holidayHours: prev[staffId]?.holidayHours ?? 0,
        ptoHours: prev[staffId]?.ptoHours ?? 0,
        mileage: prev[staffId]?.mileage ?? 0,
        [key]: clampNonNeg(val),
      },
    }));
  }

  return (
    <div className="min-h-screen bg-bac-bg text-bac-text">
      +{" "}
      <div className="mx-auto w-full px-4 py-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Payroll</h1>
            <p className="text-sm text-bac-muted">
              Weekly payroll (Sun–Sat). Office uses Time Keeping. DSP uses
              Schedule/Visits. OT is 1.5× after 40 hours. Rates are managed here
              (not in Employee Profile).
            </p>
            <p className="mt-1 text-xs text-bac-muted">
              API Base:{" "}
              <span className="text-bac-text font-medium">
                {API_BASE || "(not set)"}
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="inline-flex overflow-hidden rounded-xl border border-bac-border bg-bac-bg">
              <button
                onClick={() => setTab("RUN")}
                className={`h-10 px-4 text-sm font-semibold ${tab === "RUN"
                    ? "bg-bac-primary text-white"
                    : "text-bac-text hover:opacity-90"
                  }`}
              >
                Weekly Run
              </button>
              <button
                onClick={() => setTab("RATES")}
                className={`h-10 px-4 text-sm font-semibold ${tab === "RATES"
                    ? "bg-bac-primary text-white"
                    : "text-bac-text hover:opacity-90"
                  }`}
              >
                Employee Rates
              </button>
            </div>

            {tab === "RUN" ? (
              <button
                onClick={generatePayroll}
                disabled={isGenerating}
                className="h-10 rounded-xl bg-bac-primary px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {isGenerating ? "Generating..." : "Generate Payroll"}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={loadEmployees}
                  disabled={isLoadingEmployees}
                  className="h-10 rounded-xl border border-bac-border bg-bac-bg px-4 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {isLoadingEmployees ? "Loading..." : "Load Employees"}
                </button>
                <button
                  onClick={saveRates}
                  disabled={isSavingRates || employees.length === 0}
                  className="h-10 rounded-xl bg-bac-primary px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {isSavingRates ? "Saving..." : "Save Rates"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="mt-4">
          {error ? (
            <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 text-sm text-bac-red">
              {error}
            </div>
          ) : (
            <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 text-xs text-bac-muted">
              Tip: Admin generates payroll weekly (Sun–Sat). On Thursdays, click
              Generate, then export DOC to send to taxer. Weekly extras
              (Training/Sick/Holiday/PTO/Mileage) are editable and included in
              DOC.
              <div className="mt-2">
                Formula: OT = 1.5× rate; Sick = 1.0× rate; Holiday = 2.0× rate;
                PTO = 1.0× rate; Training = trainingRate; Mileage = mileageRate.
              </div>
              {!API_BASE ? (
                <div className="mt-2 text-bac-red">
                  Warning: NEXT_PUBLIC_API_BASE_URL is not set and local
                  fallback could not determine API. Set it (example:
                  http://localhost:4000).
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* ======================= TAB: RUN ======================= */}
        {tab === "RUN" ? (
          <>
            {/* Filters */}
            <div className="mt-5 grid grid-cols-1 gap-3 rounded-2xl border border-bac-border bg-bac-panel p-4 md:grid-cols-4">
              <div className="flex flex-col">
                <label className="text-xs text-bac-muted">
                  Period Start (Sun)
                </label>
                <input
                  type="date"
                  value={periodFrom}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPeriodFrom(v);
                    setPeriodTo(addDaysISO(v, 6)); // ✅ always lock to Saturday
                  }}
                  className="h-10 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-bac-muted">
                  Period End (Sat)
                </label>
                <input
                  type="date"
                  value={periodTo}
                  onChange={(e) => {
                    const v = e.target.value;

                    // ✅ Always lock to Sat = periodFrom + 6
                    const mustBe = addDaysISO(periodFrom, 6);
                    setPeriodTo(mustBe);
                  }}
                  className="h-10 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-bac-muted">Staff Type</label>
                <select
                  value={staffTypeFilter}
                  onChange={(e) =>
                    setStaffTypeFilter(
                      e.target.value as "ALL" | "DSP" | "OFFICE"
                    )
                  }
                  className="h-10 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                >
                  <option value="ALL">All</option>
                  <option value="OFFICE">Office</option>
                  <option value="DSP">DSP</option>
                </select>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                <div className="text-xs text-bac-muted">Current View Total</div>
                <div className="mt-1 text-xl font-semibold">
                  {money(viewTotals.totalPay)}
                </div>
                <div className="text-xs text-bac-muted">
                  {viewTotals.totalHours.toFixed(2)} hrs •{" "}
                  {viewTotals.totalOtHours.toFixed(2)} OT hrs
                </div>
              </div>
            </div>

            {/* Actions + status */}
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
                <div className="text-sm font-semibold">Payroll Run</div>

                <div className="mt-2 text-sm text-bac-muted">
                  Period:{" "}
                  <span className="text-bac-text">
                    {run ? `${run.periodFrom} → ${run.periodTo}` : "-"}
                  </span>
                </div>

                <div className="mt-1 text-sm text-bac-muted">
                  Generated at:{" "}
                  <span className="text-bac-text">
                    {run ? new Date(run.generatedAt).toLocaleString() : "-"}
                  </span>
                </div>

                <div className="mt-3 text-xs text-bac-muted">
                  Policy lock:
                  <ul className="mt-1 list-disc pl-5">
                    <li>Office hours from Time Keeping (approved totals)</li>
                    <li>DSP hours from Schedule/Visits</li>
                    <li>OT after 40h at 1.5×</li>
                    <li>Holiday pay at 2.0× rate</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
                <div className="text-sm font-semibold">Export</div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={exportDoc}
                    disabled={!run}
                    className="h-10 flex-1 rounded-xl border border-bac-border bg-bac-bg px-4 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                  >
                    Export DOC
                  </button>
                  <button
                    onClick={exportPdf}
                    disabled={!run}
                    className="h-10 flex-1 rounded-xl border border-bac-border bg-bac-bg px-4 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                  >
                    Export PDF
                  </button>
                </div>

                <div className="mt-3 text-xs text-bac-muted">
                  {run?.exports?.docUrl ? (
                    <div>
                      DOC:{" "}
                      <a
                        className="text-bac-primary underline"
                        href={run.exports.docUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    </div>
                  ) : (
                    <div>DOC: -</div>
                  )}
                  {run?.exports?.pdfUrl ? (
                    <div>
                      PDF:{" "}
                      <a
                        className="text-bac-primary underline"
                        href={run.exports.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    </div>
                  ) : (
                    <div>PDF: -</div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
                <div className="text-sm font-semibold">Notes</div>
                <div className="mt-3 rounded-xl border border-bac-border bg-bac-bg p-3 text-xs text-bac-muted">
                  Weekly extras entry:
                  <ul className="mt-2 list-disc pl-5">
                    <li>
                      Training/Sick/Holiday/PTO/Mileage are editable per
                      employee
                    </li>
                    <li>These columns must appear in the DOC sent to Taxer</li>
                    <li>Table is wide → DOC should be Landscape</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="mt-6 rounded-2xl border border-bac-border bg-bac-panel">
              <div className="flex items-center justify-between border-b border-bac-border px-4 py-3">
                <div>
                  <div className="text-sm font-semibold">Payroll Details</div>
                  <div className="text-xs text-bac-muted">
                    Showing: {staffTypeFilter} • Rows: {mergedRows.length}
                  </div>
                </div>

                <div className="text-xs text-bac-muted">
                  Regular + OT totals calculated by backend rules. Extras are
                  added in UI (backend must match).
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-max text-left text-sm whitespace-nowrap">
                  <thead className="text-xs text-bac-muted">
                    <tr className="border-b border-bac-border">
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">SSN#</th>

                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Rate</th>

                      <th className="px-4 py-3">Hours</th>
                      <th className="px-4 py-3">OT Hours</th>

                      <th className="px-4 py-3">Training hour</th>
                      <th className="px-4 py-3">Sick hour</th>
                      <th className="px-4 py-3">Holiday hour</th>
                      <th className="px-4 py-3">PTO hour</th>

                      <th className="px-4 py-3">Mileage</th>

                      <th className="px-4 py-3">Regular Pay</th>
                      <th className="px-4 py-3">OT Pay</th>

                      <th className="px-4 py-3">Extras Pay</th>

                      <th className="px-4 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!run ? (
                      <tr>
                        <td className="px-4 py-6 text-bac-muted" colSpan={15}>
                          No payroll generated yet. Click{" "}
                          <span className="text-bac-text font-medium">
                            Generate Payroll
                          </span>
                          .
                        </td>
                      </tr>
                    ) : mergedRows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-bac-muted" colSpan={15}>
                          No rows match the current filter.
                        </td>
                      </tr>
                    ) : (
                      mergedRows.map((r) => {
                        const ex = computeExtrasPay(r);
                        const totalWithExtras =
                          (r.totalPay || 0) + ex.extrasPay;

                        return (
                          <tr
                            key={r.staffId}
                            className="border-b border-bac-border"
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium">{r.staffName}</div>
                              <div className="text-xs text-bac-muted">
                                {r.staffId}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <span className="text-xs text-bac-muted">
                                {fmtOrDash(r.employeeSSN || null)}
                              </span>
                            </td>

                            <td className="px-4 py-3">{r.staffType}</td>
                            <td className="px-4 py-3">{money(r.rate)}</td>

                            <td className="px-4 py-3">{r.hours.toFixed(2)}</td>
                            <td className="px-4 py-3">
                              {r.otHours.toFixed(2)}
                            </td>

                            <td className="px-4 py-3">
                              <input
                                defaultValue={String(ex.trainingHours || 0)}
                                onChange={(e) =>
                                  setExtra(
                                    r.staffId,
                                    "trainingHours",
                                    toNumberOrZero(e.target.value)
                                  )
                                }
                                className="h-9 w-20 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                defaultValue={String(ex.sickHours || 0)}
                                onChange={(e) =>
                                  setExtra(
                                    r.staffId,
                                    "sickHours",
                                    toNumberOrZero(e.target.value)
                                  )
                                }
                                className="h-9 w-20 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                defaultValue={String(ex.holidayHours || 0)}
                                onChange={(e) =>
                                  setExtra(
                                    r.staffId,
                                    "holidayHours",
                                    toNumberOrZero(e.target.value)
                                  )
                                }
                                className="h-9 w-20 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                defaultValue={String(ex.ptoHours || 0)}
                                onChange={(e) =>
                                  setExtra(
                                    r.staffId,
                                    "ptoHours",
                                    toNumberOrZero(e.target.value)
                                  )
                                }
                                className="h-9 w-20 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <input
                                defaultValue={String(ex.mileage || 0)}
                                onChange={(e) =>
                                  setExtra(
                                    r.staffId,
                                    "mileage",
                                    toNumberOrZero(e.target.value)
                                  )
                                }
                                className="h-9 w-24 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                              />
                              <div className="mt-1 text-[10px] text-bac-muted">
                                @ {money(ex.mileageRate)}/mile
                              </div>
                            </td>

                            <td className="px-4 py-3">{money(r.regularPay)}</td>
                            <td className="px-4 py-3">{money(r.otPay)}</td>

                            <td className="px-4 py-3">{money(ex.extrasPay)}</td>

                            <td className="px-4 py-3 font-semibold">
                              {money(totalWithExtras)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {run ? (
                <div className="px-4 py-3 text-xs text-bac-muted">
                  Totals (view): {viewTotals.totalHours.toFixed(2)} hrs •{" "}
                  {viewTotals.totalOtHours.toFixed(2)} OT hrs •{" "}
                  {money(viewTotals.totalPay)} (includes extras + mileage)
                </div>
              ) : (
                <div className="px-4 py-3 text-xs text-bac-muted">
                  Once generated, payroll runs are saved as history (backend).
                </div>
              )}
            </div>
          </>
        ) : (
          /* ======================= TAB: RATES ======================= */
          <>
            <div className="mt-5 grid grid-cols-1 gap-3 rounded-2xl border border-bac-border bg-bac-panel p-4 md:grid-cols-4">
              <div className="flex flex-col md:col-span-2">
                <label className="text-xs text-bac-muted">Search</label>
                <input
                  value={empQ}
                  onChange={(e) => setEmpQ(e.target.value)}
                  placeholder="Search by ID / name / email / role..."
                  className="h-10 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-bac-muted">Type</label>
                <select
                  value={empRoleFilter}
                  onChange={(e) =>
                    setEmpRoleFilter(e.target.value as "ALL" | "DSP" | "OFFICE")
                  }
                  className="h-10 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                >
                  <option value="ALL">All</option>
                  <option value="OFFICE">Office</option>
                  <option value="DSP">DSP</option>
                </select>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                <div className="text-xs text-bac-muted">Employees</div>
                <div className="mt-1 text-xl font-semibold">
                  {filteredEmployees.length}
                </div>
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-bac-muted">
                  <input
                    type="checkbox"
                    checked={showSensitive}
                    onChange={(e) => setShowSensitive(e.target.checked)}
                  />
                  Show sensitive fields (DOB/SSN/Address)
                </label>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-bac-border bg-bac-panel">
              <div className="flex items-center justify-between border-b border-bac-border px-4 py-3">
                <div>
                  <div className="text-sm font-semibold">
                    Employee Payroll Rates
                  </div>
                  <div className="text-xs text-bac-muted">
                    Fields: Employee ID, First/Last Name, DOB, SSN, Address,
                    Phone, Email, Role/Position, Rate, Training Rate, Mileage
                    Reimbursement.
                  </div>
                </div>

                <div className="text-xs text-bac-muted">
                  Backend must restrict this page/actions to ADMIN/HR.
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-bac-muted">
                    <tr className="border-b border-bac-border">
                      <th className="px-4 py-3">Employee ID</th>
                      <th className="px-4 py-3">First Name</th>
                      <th className="px-4 py-3">Last Name</th>
                      <th className="px-4 py-3">Role/Position</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Rate ($/hr)</th>
                      <th className="px-4 py-3">Training Rate ($/hr)</th>
                      <th className="px-4 py-3">
                        Mileage Reimbursement ($/mile)
                      </th>

                      {showSensitive ? (
                        <>
                          <th className="px-4 py-3">DOB</th>
                          <th className="px-4 py-3">SSN</th>
                          <th className="px-4 py-3">Address</th>
                        </>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length === 0 ? (
                      <tr>
                        <td
                          className="px-4 py-6 text-bac-muted"
                          colSpan={showSensitive ? 12 : 9}
                        >
                          No employees loaded. Click{" "}
                          <span className="text-bac-text font-medium">
                            Load Employees
                          </span>
                          .
                        </td>
                      </tr>
                    ) : filteredEmployees.length === 0 ? (
                      <tr>
                        <td
                          className="px-4 py-6 text-bac-muted"
                          colSpan={showSensitive ? 12 : 9}
                        >
                          No employees match the current filter.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((e) => {
                        const d = rateDraft[e.employeeId] || {
                          rate:
                            typeof e.rate === "number" ? format2(e.rate) : "",
                          trainingRate:
                            typeof e.trainingRate === "number"
                              ? format2(e.trainingRate)
                              : "",
                          mileageRate:
                            typeof e.mileageRate === "number"
                              ? format2(e.mileageRate)
                              : "",
                        };

                        return (
                          <tr
                            key={e.employeeId}
                            className="border-b border-bac-border"
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium">{e.employeeId}</div>
                              {e.staffType ? (
                                <div className="mt-1 inline-flex rounded-full border border-bac-border bg-bac-bg px-2 py-0.5 text-[10px] text-bac-muted">
                                  {e.staffType}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3">
                              {fmtOrDash(e.firstName)}
                            </td>
                            <td className="px-4 py-3">
                              {fmtOrDash(e.lastName)}
                            </td>
                            <td className="px-4 py-3">{fmtOrDash(e.role)}</td>
                            <td className="px-4 py-3">{fmtOrDash(e.phone)}</td>
                            <td className="px-4 py-3">{fmtOrDash(e.email)}</td>

                            {/* ✅ Rate: allows 29.75 typing, formats on blur */}
                            <td className="px-4 py-3">
                              <input
                                inputMode="decimal"
                                value={d.rate}
                                onChange={(ev) =>
                                  updateRateLocal(e.employeeId, ev.target.value)
                                }
                                onBlur={() => blurRate(e.employeeId)}
                                placeholder="e.g. 29.75"
                                className="h-9 w-28 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                              />
                            </td>

                            {/* ✅ TrainingRate: allows 10.15 typing, formats on blur */}
                            <td className="px-4 py-3">
                              <input
                                inputMode="decimal"
                                value={d.trainingRate}
                                onChange={(ev) =>
                                  updateTrainingRateLocal(
                                    e.employeeId,
                                    ev.target.value
                                  )
                                }
                                onBlur={() => blurTrainingRate(e.employeeId)}
                                placeholder="e.g. 10.15"
                                className="h-9 w-28 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                              />
                            </td>

                            {/* ✅ MileageRate: format 2 decimals on blur */}
                            <td className="px-4 py-3">
                              <input
                                inputMode="decimal"
                                value={d.mileageRate}
                                onChange={(ev) =>
                                  updateMileageRateLocal(
                                    e.employeeId,
                                    ev.target.value
                                  )
                                }
                                onBlur={() => blurMileageRate(e.employeeId)}
                                placeholder="e.g. 0.30"
                                className="h-9 w-32 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                              />
                            </td>

                            {showSensitive ? (
                              <>
                                <td className="px-4 py-3">
                                  {fmtDateOrDash(e.dob)}
                                </td>
                                <td className="px-4 py-3">
                                  {fmtOrDash(e.ssn)}
                                </td>
                                <td className="px-4 py-3">
                                  {formatAddress(e)}
                                </td>
                              </>
                            ) : null}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 text-xs text-bac-muted">
                Recommendation: keep rates in a dedicated Payroll table
                (effective dates later). Do NOT store/show rates in Employee
                Profile UI.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

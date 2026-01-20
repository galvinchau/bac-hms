"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type ServiceStatus = "Active" | "Inactive" | "Pending";

const CATEGORY_OPTIONS = [
  { value: "None-Residential", label: "None-Residential" },
  { value: "Residential service", label: "Residential service" },
];

// Service Type (abbrev) + Full name (same as New Service)
const SERVICE_OPTIONS: { code: string; label: string; full: string }[] = [
  { code: "PCA", label: "PCA", full: "Personal Care Assistant" },
  { code: "NT", label: "NT", full: "Nursing / Nurse Triage" },
  {
    code: "PBIS",
    label: "PBIS",
    full: "Positive Behavior Interventions and Supports",
  },
  { code: "SHHA", label: "SHHA", full: "Skilled Home Health Aide" },
  { code: "PT", label: "PT", full: "Physical Therapy" },
  { code: "CNA", label: "CNA", full: "Certified Nursing Assistant" },
  { code: "RESP", label: "RESP", full: "Respite Services" },
  { code: "SHC", label: "SHC", full: "Shared Home Care / Shared Habilitation" },
  { code: "OT", label: "OT", full: "Occupational Therapy" },
  { code: "SCM", label: "SCM", full: "Service Coordination / Case Management" },
  { code: "COMP", label: "COMP", full: "Companion Services" },

  { code: "LPN", label: "LPN", full: "Licensed Practical Nurse" },
  { code: "HCSS", label: "HCSS", full: "In-Home & Community Support Services" },
  { code: "SDP", label: "SDP", full: "Structured Day Program" },
  { code: "OTA", label: "OTA", full: "Occupational Therapy Assistant" },
  { code: "MSW", label: "MSW", full: "Master of Social Work Services" },
  { code: "APC", label: "APC", full: "Advanced Professional Care" },
  { code: "CBSA", label: "CBSA", full: "Community-Based Supported Activities" },
  { code: "PTA", label: "PTA", full: "Physical Therapy Assistant" },
  { code: "HMK", label: "HMK", full: "Homemake Services" },
  { code: "CHORE", label: "CHORE", full: "Chore Services" },
  { code: "ILST", label: "ILST", full: "Independent Living Skills Training" },
  { code: "SPC", label: "SPC", full: "Specialist / Professional Consultant" },
  { code: "TRAN", label: "TRAN", full: "Non-Emergency (Transportation)" },
  { code: "BSP", label: "BSP", full: "Behavioral Support" },

  { code: "ST", label: "ST", full: "Speech Therapy" },
  { code: "SCI", label: "SCI", full: "Specialized Community Integration" },
  { code: "PC", label: "PC", full: "Personal Care" },
  { code: "HHA", label: "HHA", full: "Home Health Aide" },
  {
    code: "RT",
    label: "RT",
    full: "Respiratory Therapy / Rehabilitation Therapy",
  },
  { code: "CH", label: "CH", full: "Companion / Habilitation" },
  { code: "RN", label: "RN", full: "Registered Nurse" },
  { code: "PA", label: "PA", full: "Physician Assistant / Personal Assistant" },
  { code: "ESC", label: "ESC", full: "Enhanced Support Companion" },
  {
    code: "NINS",
    label: "NINS",
    full: "Non-Insurance / Non-traditional Service",
  },
];

type LevelType = "RATIO" | "ZONE" | "";
type RatioChoice = "1:1" | "1:2" | "1:3" | "OTHER" | "";
type FormatChoice =
  | "UNIT_15MIN"
  | "HOUR"
  | "DAY"
  | "WEEK"
  | "MONTH"
  | "OTHER"
  | "";

type Service = {
  id: string;
  serviceCode: string;
  serviceName: string;
  billingCode: string | null;
  category: string;
  description: string | null;
  status: string;
  billable: boolean;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type FormValues = {
  // locked identifiers (from DB)
  serviceCodeLocked: string;
  serviceNameLocked: string;

  // derived from CONFIG (locked for safety)
  serviceTypeAbbrev: string; // e.g., LPN/HCSS/COMP (from [CONFIG].serviceType)

  // shared editable fields (existing schema)
  billingCode: string;
  category: string;
  status: ServiceStatus;
  billable: boolean;
  description: string;

  // free notes (notes WITHOUT [CONFIG] block)
  notesFree: string;

  // Level
  levelType: LevelType;

  // Ratio mode
  ratio: RatioChoice;
  ratioOther: string;
  format: FormatChoice;
  formatOther: string;
  rate: string; // numeric as string

  // Zone mode (single record edit)
  zoneName: string; // e.g., Zone 1
  ratePerMile: string; // numeric as string
};

const defaultValues: FormValues = {
  serviceCodeLocked: "",
  serviceNameLocked: "",
  serviceTypeAbbrev: "",

  billingCode: "",
  category: "",
  status: "Active",
  billable: true,
  description: "",
  notesFree: "",

  levelType: "",

  ratio: "",
  ratioOther: "",
  format: "",
  formatOther: "",
  rate: "",

  zoneName: "",
  ratePerMile: "",
};

function toUpperTrim(s: string): string {
  return (s || "").trim().toUpperCase();
}

function isPositiveNumberString(s: string): boolean {
  const n = Number(s);
  return Number.isFinite(n) && n > 0;
}

function normalizeStatus(s: string): ServiceStatus {
  if (s === "Active" || s === "Inactive" || s === "Pending") return s;
  // fallback
  return "Active";
}

/**
 * Extract [CONFIG] JSON block from notes.
 * Returns { configObj, notesFree }
 */
function parseNotesConfig(notesRaw: string | null): {
  configObj: any | null;
  notesFree: string;
} {
  const notes = (notesRaw || "").replace(/\r\n/g, "\n");
  const lines = notes.split("\n");

  const cfgLineIdx = lines.findIndex((l) => l.trim().startsWith("[CONFIG]"));
  if (cfgLineIdx < 0) {
    return { configObj: null, notesFree: notes.trim() };
  }

  const cfgLine = lines[cfgLineIdx].trim();
  const jsonPart = cfgLine.replace(/^\[CONFIG\]\s*/, "").trim();

  let configObj: any | null = null;
  try {
    configObj = JSON.parse(jsonPart);
  } catch {
    configObj = null;
  }

  // Remove ONLY the [CONFIG] line; keep everything else
  const free = lines
    .filter((_, idx) => idx !== cfgLineIdx)
    .join("\n")
    .trim();

  return { configObj, notesFree: free };
}

function buildConfigLine(obj: any): string {
  return `[CONFIG] ${JSON.stringify(obj)}`;
}

function mergeNotesWithConfig(notesFree: string, configObj: any): string {
  const clean = (notesFree || "").replace(/\r\n/g, "\n").trim();
  const cfgLine = buildConfigLine(configObj);

  if (!clean) return cfgLine;
  return `${clean}\n\n${cfgLine}`;
}

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const [svc, setSvc] = useState<Service | null>(null);
  const [values, setValues] = useState<FormValues>(defaultValues);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const serviceMap = useMemo(() => {
    const m = new Map<string, string>();
    SERVICE_OPTIONS.forEach((s) => m.set(s.code, s.full));
    return m;
  }, []);

  const selectedServiceFullName =
    serviceMap.get(values.serviceTypeAbbrev) ?? "";

  const rateSuffix = useMemo(() => {
    if (values.levelType === "ZONE") return "/ mile";
    switch (values.format) {
      case "UNIT_15MIN":
        return "/ unit (15 min)";
      case "HOUR":
        return "/ hour";
      case "DAY":
        return "/ day";
      case "WEEK":
        return "/ week";
      case "MONTH":
        return "/ month";
      case "OTHER":
        return values.formatOther ? `/ ${values.formatOther.trim()}` : "";
      default:
        return "";
    }
  }, [values.levelType, values.format, values.formatOther]);

  const handleChange =
    (field: keyof FormValues) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const v =
        field === "billable" && e.target instanceof HTMLInputElement
          ? e.target.checked
          : e.target.value;

      setValues((prev) => ({ ...prev, [field]: v as any }));
    };

  const handleCancel = () => router.push("/services/search");

  // Load service
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setMessage(null);

      try {
        const res = await fetch(`/api/services/${id}`, { cache: "no-store" });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.message || "Failed to load service");
        }
        const data = await res.json();
        const service: Service = data?.service ?? data;

        const { configObj, notesFree } = parseNotesConfig(service.notes);

        const serviceType = (configObj?.serviceType || "").toString().trim();
        const levelType = (configObj?.levelType || "").toString().trim();

        // Ratio config
        const ratioFromCfg = (configObj?.level || "").toString().trim();
        const formatFromCfg = (configObj?.format || "").toString().trim();
        const rateFromCfg = configObj?.rate;
        const ratePerMileFromCfg = configObj?.ratePerMile;

        // Try to map ratio to predefined choices
        const ratioChoice: RatioChoice =
          ratioFromCfg === "1:1" ||
          ratioFromCfg === "1:2" ||
          ratioFromCfg === "1:3"
            ? (ratioFromCfg as RatioChoice)
            : ratioFromCfg
              ? "OTHER"
              : "";

        // Try to map format to enum; if not match -> OTHER
        const formatChoice: FormatChoice =
          formatFromCfg === "UNIT_15MIN" ||
          formatFromCfg === "HOUR" ||
          formatFromCfg === "DAY" ||
          formatFromCfg === "WEEK" ||
          formatFromCfg === "MONTH"
            ? (formatFromCfg as FormatChoice)
            : formatFromCfg
              ? "OTHER"
              : "";

        setSvc(service);
        setValues((prev) => ({
          ...prev,
          serviceCodeLocked: service.serviceCode,
          serviceNameLocked: service.serviceName,

          serviceTypeAbbrev: serviceType, // locked for safety

          billingCode: service.billingCode ?? "",
          category: service.category ?? "",
          status: normalizeStatus(service.status ?? "Active"),
          billable: !!service.billable,
          description: service.description ?? "",
          notesFree,

          levelType:
            levelType === "RATIO" || levelType === "ZONE"
              ? (levelType as LevelType)
              : "",

          // ratio fields
          ratio: ratioChoice,
          ratioOther: ratioChoice === "OTHER" ? ratioFromCfg : "",
          format: formatChoice,
          formatOther: formatChoice === "OTHER" ? formatFromCfg : "",
          rate:
            typeof rateFromCfg === "number"
              ? String(rateFromCfg)
              : ((rateFromCfg ?? "")?.toString?.() ?? ""),

          // zone fields (single row edit)
          zoneName: levelType === "ZONE" ? ratioFromCfg : "", // we store zoneName in `level`
          ratePerMile:
            typeof ratePerMileFromCfg === "number"
              ? String(ratePerMileFromCfg)
              : ((ratePerMileFromCfg ?? "")?.toString?.() ?? ""),
        }));
      } catch (e: any) {
        setError(e?.message || "Failed to load service");
      } finally {
        setLoading(false);
      }
    };

    if (id) load();
  }, [id]);

  // Validation
  const validateCommon = () => {
    const missing: string[] = [];
    if (!values.category) missing.push("Category");
    if (!values.levelType) missing.push("Level type");
    return missing;
  };

  const validateRatio = () => {
    const missing: string[] = [];
    const ratioLabel =
      values.ratio === "OTHER" ? values.ratioOther.trim() : values.ratio;

    if (!ratioLabel) missing.push("Level (Ratio)");
    if (!values.format) missing.push("Format");
    if (values.format === "OTHER" && !values.formatOther.trim())
      missing.push("Format (Other)");
    if (!isPositiveNumberString(values.rate)) missing.push("Rate");
    return { missing, ratioLabel };
  };

  const validateZone = () => {
    const missing: string[] = [];
    const zn = values.zoneName.trim();
    if (!zn) missing.push("Zone name");
    if (!isPositiveNumberString(values.ratePerMile))
      missing.push("Rate ($/mile)");
    return { missing, zoneName: zn };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!svc) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const miss = validateCommon();
      if (miss.length > 0) {
        throw new Error("Missing required fields: " + miss.join(", "));
      }

      // Build CONFIG (stored into notes)
      if (!values.serviceTypeAbbrev) {
        // We keep this locked; but if old data does not have it, we still allow save.
        // In that case, we set it to empty and keep serviceName locked as DB.
      }

      let cfg: any = null;

      if (values.levelType === "RATIO") {
        const { missing, ratioLabel } = validateRatio();
        if (missing.length > 0) {
          throw new Error("Missing/invalid fields: " + missing.join(", "));
        }

        const formatLabel =
          values.format === "OTHER" ? values.formatOther.trim() : values.format;

        cfg = {
          serviceType: values.serviceTypeAbbrev || "",
          levelType: "RATIO",
          level: ratioLabel,
          format: formatLabel,
          rate: Number(values.rate),
        };
      } else if (values.levelType === "ZONE") {
        const { missing, zoneName } = validateZone();
        if (missing.length > 0) {
          throw new Error("Missing/invalid fields: " + missing.join(", "));
        }

        cfg = {
          serviceType: values.serviceTypeAbbrev || "",
          levelType: "ZONE",
          level: zoneName,
          format: "MILEAGE",
          ratePerMile: Number(values.ratePerMile),
        };
      } else {
        throw new Error("Invalid level type.");
      }

      const payload = {
        // ✅ SAFETY: Do NOT update serviceCode/serviceName
        billingCode: values.billingCode.trim() || null,
        category: values.category,
        status: values.status,
        billable: values.billable,
        description: values.description.trim() || null,
        notes: mergeNotesWithConfig(values.notesFree, cfg),
      };

      const res = await fetch(`/api/services/${svc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // fallback PUT
        const res2 = await fetch(`/api/services/${svc.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res2.ok) {
          const err = await res2.json().catch(() => null);
          throw new Error(err?.message || "Failed to update service");
        }
      }

      setMessage("Service updated successfully.");
    } catch (e: any) {
      setError(e?.message || "Failed to update service");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bac-bg text-bac-text">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Edit Service
            </h1>
            <p className="mt-1 text-sm text-bac-muted">
              Edit full service settings (Ratio/Zone/Rate/Format) safely.
              Service Code and Service Name remain locked.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-bac-border px-4 py-2 text-sm font-semibold text-bac-text hover:bg-bac-bg/60"
            >
              Back to Search
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
          </div>
        )}

        {loading ? (
          <section className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <p className="text-sm text-bac-muted">Loading...</p>
          </section>
        ) : !svc ? (
          <section className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <p className="text-sm text-red-300">Service not found.</p>
          </section>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Basic Information */}
            <section className="rounded-2xl border border-bac-border bg-bac-panel p-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide">
                  Basic Information
                </h2>
                <p className="mt-1 text-xs text-bac-muted">
                  Locked identifiers + editable billing/classification fields.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Locked: Service Code */}
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Service Code (locked)
                  </label>
                  <input
                    value={values.serviceCodeLocked}
                    readOnly
                    className="w-full rounded-xl border border-bac-border bg-bac-bg/60 px-3 py-2 text-sm outline-none"
                  />
                  <p className="text-xs text-bac-muted">
                    Detailed code per level (used across
                    Schedule/Billing/Payroll).
                  </p>
                </div>

                {/* Locked: Service Name */}
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Service Name (locked)
                  </label>
                  <input
                    value={values.serviceNameLocked}
                    readOnly
                    className="w-full rounded-xl border border-bac-border bg-bac-bg/60 px-3 py-2 text-sm outline-none"
                  />
                </div>

                {/* Locked: Service Type Abbrev (from CONFIG) */}
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Service Type (Abbrev) (locked)
                  </label>
                  <input
                    value={values.serviceTypeAbbrev || ""}
                    readOnly
                    placeholder="(from CONFIG)"
                    className="w-full rounded-xl border border-bac-border bg-bac-bg/60 px-3 py-2 text-sm outline-none"
                  />
                  <p className="text-xs text-bac-muted">
                    This is stored inside notes [CONFIG] as serviceType (not
                    used as the serviceCode).
                  </p>
                </div>

                {/* Display: Full name from abbrev (if available) */}
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Service Type Full Name
                  </label>
                  <input
                    value={selectedServiceFullName}
                    readOnly
                    placeholder="(auto from abbrev)"
                    className="w-full rounded-xl border border-bac-border bg-bac-bg/60 px-3 py-2 text-sm outline-none"
                  />
                </div>

                {/* Billing Code */}
                <div className="space-y-1">
                  <label
                    htmlFor="billingCode"
                    className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                  >
                    Billing Code (optional)
                  </label>
                  <input
                    id="billingCode"
                    type="text"
                    value={values.billingCode}
                    onChange={handleChange("billingCode")}
                    placeholder="e.g. T1019, W7061..."
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label
                    htmlFor="category"
                    className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                  >
                    Category
                  </label>
                  <select
                    id="category"
                    value={values.category}
                    onChange={handleChange("category")}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  >
                    <option value="">Select category</option>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label
                    htmlFor="status"
                    className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                  >
                    Status
                  </label>
                  <select
                    id="status"
                    value={values.status}
                    onChange={handleChange("status")}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Billable */}
                <div className="flex items-center gap-2 md:pt-6">
                  <input
                    id="billable"
                    type="checkbox"
                    checked={values.billable}
                    onChange={handleChange("billable")}
                    className="h-4 w-4 rounded border-bac-border bg-bac-bg text-bac-primary focus:ring-bac-primary/60"
                  />
                  <label htmlFor="billable" className="text-xs text-bac-muted">
                    Service is billable
                  </label>
                </div>
              </div>
            </section>

            {/* Level Setup */}
            <section className="rounded-2xl border border-bac-border bg-bac-panel p-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide">
                  Level Setup
                </h2>
                <p className="mt-1 text-xs text-bac-muted">
                  Edit Ratio/Zone configuration. Zone always uses Mileage.
                </p>
              </div>

              {/* Level Type */}
              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="levelType"
                    value="RATIO"
                    checked={values.levelType === "RATIO"}
                    onChange={handleChange("levelType")}
                  />
                  <span className="font-semibold">Ratio</span>
                  <span className="text-xs text-bac-muted">
                    (1:1, 1:2, 1:3...)
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="levelType"
                    value="ZONE"
                    checked={values.levelType === "ZONE"}
                    onChange={handleChange("levelType")}
                  />
                  <span className="font-semibold">Zone</span>
                  <span className="text-xs text-bac-muted">
                    (Zone → Mileage)
                  </span>
                </label>
              </div>

              {/* Ratio Mode */}
              {values.levelType === "RATIO" && (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Ratio */}
                  <div className="space-y-1">
                    <label
                      htmlFor="ratio"
                      className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                    >
                      Level (Ratio)
                    </label>
                    <select
                      id="ratio"
                      value={values.ratio}
                      onChange={handleChange("ratio")}
                      className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    >
                      <option value="">Select ratio</option>
                      <option value="1:1">1:1</option>
                      <option value="1:2">1:2</option>
                      <option value="1:3">1:3</option>
                      <option value="OTHER">Other...</option>
                    </select>

                    {values.ratio === "OTHER" && (
                      <input
                        type="text"
                        placeholder="e.g. 1:4"
                        value={values.ratioOther}
                        onChange={handleChange("ratioOther")}
                        className="mt-2 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                      />
                    )}
                  </div>

                  {/* Format */}
                  <div className="space-y-1">
                    <label
                      htmlFor="format"
                      className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                    >
                      Format
                    </label>
                    <select
                      id="format"
                      value={values.format}
                      onChange={handleChange("format")}
                      className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    >
                      <option value="">Select format</option>
                      <option value="UNIT_15MIN">Unit (15 min)</option>
                      <option value="HOUR">Hour</option>
                      <option value="DAY">Day</option>
                      <option value="WEEK">Week</option>
                      <option value="MONTH">Month</option>
                      <option value="OTHER">Other...</option>
                    </select>

                    {values.format === "OTHER" && (
                      <input
                        type="text"
                        placeholder="e.g. visit, shift..."
                        value={values.formatOther}
                        onChange={handleChange("formatOther")}
                        className="mt-2 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                      />
                    )}
                  </div>

                  {/* Rate */}
                  <div className="space-y-1 md:col-span-2">
                    <label
                      htmlFor="rate"
                      className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                    >
                      Rate
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-bac-muted">$</span>
                      <input
                        id="rate"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={values.rate}
                        onChange={handleChange("rate")}
                        className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                      />
                      <span className="text-xs text-bac-muted whitespace-nowrap">
                        {rateSuffix}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Zone Mode (single record edit) */}
              {values.levelType === "ZONE" && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                        Format
                      </label>
                      <input
                        type="text"
                        readOnly
                        value="Mileage (fixed for Zone)"
                        className="w-full rounded-xl border border-bac-border bg-bac-bg/60 px-3 py-2 text-sm outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                        Rate Unit
                      </label>
                      <input
                        type="text"
                        readOnly
                        value="$ / mile"
                        className="w-full rounded-xl border border-bac-border bg-bac-bg/60 px-3 py-2 text-sm outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="zoneName"
                        className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                      >
                        Zone Name
                      </label>
                      <input
                        id="zoneName"
                        type="text"
                        value={values.zoneName}
                        onChange={handleChange("zoneName")}
                        placeholder="e.g. Zone 1"
                        className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                      />
                      <p className="text-xs text-bac-muted">
                        This record represents one Zone (one code). Use New
                        Service (Zone mode) to create additional zones.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="ratePerMile"
                        className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                      >
                        Rate ($/mile)
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-bac-muted">$</span>
                        <input
                          id="ratePerMile"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={values.ratePerMile}
                          onChange={handleChange("ratePerMile")}
                          className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                        />
                        <span className="text-xs text-bac-muted whitespace-nowrap">
                          {rateSuffix}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Details */}
            <section className="rounded-2xl border border-bac-border bg-bac-panel p-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide">
                  Details
                </h2>
                <p className="mt-1 text-xs text-bac-muted">
                  Free notes are stored normally. Configuration is stored in
                  notes as [CONFIG] (auto-managed).
                </p>
              </div>

              <div className="space-y-4">
                {/* Description */}
                <div className="space-y-1">
                  <label
                    htmlFor="description"
                    className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    value={values.description}
                    onChange={handleChange("description")}
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  />
                </div>

                {/* Notes free */}
                <div className="space-y-1">
                  <label
                    htmlFor="notesFree"
                    className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                  >
                    Notes
                  </label>
                  <textarea
                    id="notesFree"
                    rows={6}
                    value={values.notesFree}
                    onChange={handleChange("notesFree")}
                    placeholder="Optional notes for schedulers/billing... (CONFIG is added automatically on save)"
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  />
                </div>
              </div>
            </section>

            {/* Footer buttons */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl border border-bac-border px-4 py-2 text-sm font-semibold text-bac-text hover:bg-bac-bg/60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-bac-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

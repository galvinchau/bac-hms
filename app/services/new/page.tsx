"use client";

import React, { useMemo, useState } from "react";

type ServiceStatus = "Active" | "Inactive" | "Pending";

const CATEGORY_OPTIONS = [
  { value: "None-Residential", label: "None-Residential" },
  { value: "Residential service", label: "Residential service" },
];

// Service Type (abbreviation) + Full name
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

type ZoneRow = {
  zoneName: string; // Zone 1, Zone 2...
  serviceCode: string; // detailed code per zone (e.g., W101)
  ratePerMile: string; // numeric as string
};

type ServiceFormValues = {
  // Service Type (abbrev) -> only for choosing full name (NOT stored in DB fields directly)
  serviceTypeAbbrev: string; // COMP, HCSS,...

  // Shared fields (existing schema fields)
  billingCode: string; // optional (claims/billing)
  category: string;
  status: ServiceStatus;
  description: string;
  billable: boolean;
  notes: string;

  // Level
  levelType: LevelType;

  // Ratio mode
  ratio: RatioChoice;
  ratioOther: string;
  ratioServiceCode: string; // detailed code per ratio (e.g., W123)
  format: FormatChoice;
  formatOther: string;
  rate: string; // numeric

  // Zone mode
  zones: ZoneRow[];
};

const defaultValues: ServiceFormValues = {
  serviceTypeAbbrev: "",

  billingCode: "",
  category: "",
  status: "Active",
  description: "",
  billable: true,
  notes: "",

  levelType: "",

  ratio: "",
  ratioOther: "",
  ratioServiceCode: "",
  format: "",
  formatOther: "",
  rate: "",

  zones: [{ zoneName: "Zone 1", serviceCode: "", ratePerMile: "" }],
};

function toUpperTrim(s: string): string {
  return (s || "").trim().toUpperCase();
}

function isPositiveNumberString(s: string): boolean {
  const n = Number(s);
  return Number.isFinite(n) && n > 0;
}

export default function NewServicePage() {
  const [values, setValues] = useState<ServiceFormValues>(defaultValues);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const serviceMap = useMemo(() => {
    const m = new Map<string, string>();
    SERVICE_OPTIONS.forEach((s) => m.set(s.code, s.full));
    return m;
  }, []);

  const selectedServiceFullName =
    serviceMap.get(values.serviceTypeAbbrev) ?? "";

  const handleChange =
    (field: keyof ServiceFormValues) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const v =
        field === "billable" && e.target instanceof HTMLInputElement
          ? e.target.checked
          : e.target.value;

      setValues((prev) => {
        const next = { ...prev, [field]: v } as ServiceFormValues;

        // If level type changes, keep data but clear validation-related fields lightly
        if (field === "levelType") {
          if (v === "RATIO") {
            // keep ratio fields, nothing else
          } else if (v === "ZONE") {
            // Zone always Mileage format (stored in config only)
            // keep zones
          } else {
            // cleared
          }
        }

        return next;
      });
    };

  const handleReset = () => {
    setValues(defaultValues);
    setMessage(null);
    setError(null);
  };

  // ----- Zone helpers -----
  const updateZone = (idx: number, patch: Partial<ZoneRow>) => {
    setValues((prev) => {
      const zones = prev.zones.map((z, i) =>
        i === idx ? { ...z, ...patch } : z,
      );
      return { ...prev, zones };
    });
  };

  const addZone = () => {
    setValues((prev) => {
      const nextIdx = prev.zones.length + 1;
      return {
        ...prev,
        zones: [
          ...prev.zones,
          { zoneName: `Zone ${nextIdx}`, serviceCode: "", ratePerMile: "" },
        ],
      };
    });
  };

  const removeZone = (idx: number) => {
    setValues((prev) => {
      if (prev.zones.length <= 1) return prev;
      const zones = prev.zones.filter((_, i) => i !== idx);
      return { ...prev, zones };
    });
  };

  const buildConfig = (base: any) => {
    // Safe embed config into notes without breaking schema
    return `[CONFIG] ${JSON.stringify(base)}`;
  };

  const mergeNotesWithConfig = (freeNotes: string, configObj: any) => {
    const clean = (freeNotes || "").trim();
    const cfg = buildConfig(configObj);
    if (!clean) return cfg;
    return `${clean}\n\n${cfg}`;
  };

  const validateCommon = () => {
    const missing: string[] = [];
    if (!values.serviceTypeAbbrev) missing.push("Service type");
    if (!values.category) missing.push("Category");
    if (!values.levelType) missing.push("Level type");
    return missing;
  };

  const validateRatio = () => {
    const missing: string[] = [];
    const ratioLabel =
      values.ratio === "OTHER" ? values.ratioOther.trim() : values.ratio;

    if (!ratioLabel) missing.push("Level (Ratio)");
    if (!values.ratioServiceCode.trim())
      missing.push("Service code (per level)");
    if (!values.format) missing.push("Format");
    if (values.format === "OTHER" && !values.formatOther.trim())
      missing.push("Format (Other)");
    if (!isPositiveNumberString(values.rate)) missing.push("Rate");
    return { missing, ratioLabel };
  };

  const validateZones = () => {
    const missing: string[] = [];
    if (!values.zones || values.zones.length === 0) {
      missing.push("Zones");
      return { missing, zoneCodes: new Set<string>() };
    }

    const zoneCodes = new Set<string>();
    for (let i = 0; i < values.zones.length; i++) {
      const z = values.zones[i];
      const zn = (z.zoneName || "").trim();
      const code = toUpperTrim(z.serviceCode);
      const rate = (z.ratePerMile || "").trim();

      if (!zn) missing.push(`Zone ${i + 1} name`);
      if (!code) missing.push(`Zone ${i + 1} service code`);
      if (code) {
        if (zoneCodes.has(code))
          missing.push(`Duplicate service code: ${code}`);
        zoneCodes.add(code);
      }
      if (!isPositiveNumberString(rate))
        missing.push(`Zone ${i + 1} rate ($/mile)`);
    }
    return { missing, zoneCodes };
  };

  const postCreateService = async (payload: any) => {
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || "Failed to create service");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      // ----- Common validation -----
      const missingCommon = validateCommon();
      if (missingCommon.length > 0) {
        setError("Missing required fields: " + missingCommon.join(", "));
        setSubmitting(false);
        return;
      }

      const serviceName = selectedServiceFullName || values.serviceTypeAbbrev;

      // ----- Ratio mode -----
      if (values.levelType === "RATIO") {
        const { missing, ratioLabel } = validateRatio();
        if (missing.length > 0) {
          setError("Missing/invalid fields: " + missing.join(", "));
          setSubmitting(false);
          return;
        }

        const serviceCodeDetailed = toUpperTrim(values.ratioServiceCode);

        const formatLabel =
          values.format === "OTHER" ? values.formatOther.trim() : values.format;

        const cfg = {
          serviceType: values.serviceTypeAbbrev,
          levelType: "RATIO",
          level: ratioLabel,
          format: formatLabel,
          rate: Number(values.rate),
        };

        const payload = {
          // IMPORTANT: serviceCode is now the detailed code per level
          serviceCode: serviceCodeDetailed,
          serviceName,

          // Keep existing optional billingCode as-is (do NOT repurpose)
          billingCode: values.billingCode.trim() || null,

          category: values.category,
          description: values.description.trim() || null,
          status: values.status,
          billable: values.billable,

          // Store config safely in notes
          notes: mergeNotesWithConfig(values.notes, cfg),
        };

        await postCreateService(payload);

        setMessage("Service created successfully (Ratio).");
        setValues(defaultValues);
        return;
      }

      // ----- Zone mode -----
      if (values.levelType === "ZONE") {
        const { missing } = validateZones();
        if (missing.length > 0) {
          setError("Missing/invalid fields: " + missing.join(", "));
          setSubmitting(false);
          return;
        }

        // Zone always Mileage + rate per mile
        // Create one service row per zone (safe, no schema change)
        let created = 0;

        for (const z of values.zones) {
          const zoneName = (z.zoneName || "").trim();
          const codeDetailed = toUpperTrim(z.serviceCode);
          const ratePerMile = Number(z.ratePerMile);

          const cfg = {
            serviceType: values.serviceTypeAbbrev,
            levelType: "ZONE",
            level: zoneName,
            format: "MILEAGE",
            ratePerMile,
          };

          const payload = {
            serviceCode: codeDetailed, // detailed code per zone
            serviceName, // keep same for grouping + existing usages

            billingCode: values.billingCode.trim() || null,
            category: values.category,
            description: values.description.trim() || null,
            status: values.status,
            billable: values.billable,
            notes: mergeNotesWithConfig(values.notes, cfg),
          };

          await postCreateService(payload);
          created++;
        }

        setMessage(`Services created successfully (Zone). Created: ${created}`);
        setValues(defaultValues);
        return;
      }

      setError("Invalid level type.");
    } catch (err: any) {
      console.error("Error saving service:", err);
      setError(err?.message || "Failed to save service");
    } finally {
      setSubmitting(false);
    }
  };

  const rateSuffix = useMemo(() => {
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
  }, [values.format, values.formatOther]);

  return (
    <div className="min-h-screen bg-bac-bg text-bac-text">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              New Service
            </h1>
            <p className="mt-1 text-sm text-bac-muted">
              Create a new service that can be scheduled and billed for
              individuals.
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href="/services/search"
              className="rounded-xl border border-bac-border px-4 py-2 text-sm font-semibold text-bac-text hover:bg-bac-bg/60"
            >
              Back to Search
            </a>

            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-bac-border px-4 py-2 text-sm font-semibold text-bac-text hover:bg-bac-bg/60"
            >
              Reset
            </button>

            <button
              type="submit"
              form="new-service-form"
              disabled={submitting}
              className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-bac-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Service"}
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

        <form
          id="new-service-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Basic Information */}
          <section className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide">
                Basic Information
              </h2>
              <p className="mt-1 text-xs text-bac-muted">
                Choose service type, then define billing + classification.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Service Type (abbrev) */}
              <div className="space-y-1">
                <label
                  htmlFor="serviceTypeAbbrev"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Service Type (Abbrev)
                </label>
                <select
                  id="serviceTypeAbbrev"
                  value={values.serviceTypeAbbrev}
                  onChange={handleChange("serviceTypeAbbrev")}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                >
                  <option value="">Select service type</option>
                  {SERVICE_OPTIONS.map((svc) => (
                    <option key={svc.code} value={svc.code} title={svc.full}>
                      {svc.label} — {svc.full}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Name (readonly display) */}
              <div className="space-y-1">
                <label
                  htmlFor="serviceFullName"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Service Name
                </label>
                <input
                  id="serviceFullName"
                  type="text"
                  value={selectedServiceFullName}
                  readOnly
                  placeholder="(auto from service type)"
                  className="w-full rounded-xl border border-bac-border bg-bac-bg/60 px-3 py-2 text-sm outline-none"
                />
              </div>

              {/* Billing Code (optional) */}
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
                  placeholder="e.g. T1019, W7061..."
                  value={values.billingCode}
                  onChange={handleChange("billingCode")}
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
              <div className="flex items-center gap-2 md:col-span-2">
                <input
                  id="billable"
                  type="checkbox"
                  checked={values.billable}
                  onChange={handleChange("billable")}
                  className="h-4 w-4 rounded border-bac-border bg-bac-bg text-bac-primary focus:ring-bac-primary/60"
                />
                <label htmlFor="billable" className="text-xs text-bac-muted">
                  Service is billable (used for claims/invoices)
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
                Choose Ratio or Zone. Zone always uses Mileage.
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
                  (Zone 1/2/3... → Mileage)
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

                {/* Detailed Service Code (per level) */}
                <div className="space-y-1">
                  <label
                    htmlFor="ratioServiceCode"
                    className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                  >
                    Service Code (per level)
                  </label>
                  <input
                    id="ratioServiceCode"
                    type="text"
                    placeholder="e.g. W123"
                    value={values.ratioServiceCode}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        ratioServiceCode: toUpperTrim(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  />
                  <p className="text-xs text-bac-muted">
                    This is the detailed code for scheduling/billing at this
                    level.
                  </p>
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
                      placeholder="e.g. visit, shift, etc."
                      value={values.formatOther}
                      onChange={handleChange("formatOther")}
                      className="mt-2 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                    />
                  )}
                </div>

                {/* Rate */}
                <div className="space-y-1">
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

            {/* Zone Mode */}
            {values.levelType === "ZONE" && (
              <div className="space-y-4">
                {/* Fixed Format */}
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
                </div>

                {/* Zone Table */}
                <div className="overflow-x-auto rounded-xl border border-bac-border">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-bac-border/60 bg-bac-bg/30 text-xs uppercase tracking-wide text-bac-muted">
                        <th className="px-3 py-2">Zone Name</th>
                        <th className="px-3 py-2">Service Code</th>
                        <th className="px-3 py-2">Rate ($/mile)</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {values.zones.map((z, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-bac-border/40 hover:bg-bac-bg/20"
                        >
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={z.zoneName}
                              onChange={(e) =>
                                updateZone(idx, { zoneName: e.target.value })
                              }
                              className="w-full rounded-lg border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={z.serviceCode}
                              onChange={(e) =>
                                updateZone(idx, {
                                  serviceCode: toUpperTrim(e.target.value),
                                })
                              }
                              placeholder="e.g. W101"
                              className="w-full rounded-lg border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={z.ratePerMile}
                              onChange={(e) =>
                                updateZone(idx, { ratePerMile: e.target.value })
                              }
                              placeholder="0.00"
                              className="w-full rounded-lg border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeZone(idx)}
                                disabled={values.zones.length <= 1}
                                className="rounded-lg border border-bac-border bg-bac-bg px-3 py-1.5 text-xs font-semibold text-bac-red hover:bg-bac-bg/60 disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-bac-muted">
                    Zone mode will create one service row per zone (safe, no
                    schema change).
                  </p>

                  <button
                    type="button"
                    onClick={addZone}
                    className="rounded-xl border border-bac-border bg-bac-bg px-4 py-2 text-sm font-semibold hover:bg-bac-bg/60"
                  >
                    + Add Zone
                  </button>
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
                Description and internal notes. Level config is stored safely in
                notes as [CONFIG].
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
                  placeholder="Short description of what this service includes."
                  value={values.description}
                  onChange={handleChange("description")}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                />
              </div>

              {/* Internal Notes */}
              <div className="space-y-1">
                <label
                  htmlFor="notes"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Internal Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  placeholder="Optional notes for schedulers, billing, etc."
                  value={values.notes}
                  onChange={handleChange("notes")}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                />
              </div>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}

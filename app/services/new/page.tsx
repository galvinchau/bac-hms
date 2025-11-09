"use client";

import React, { useMemo, useState } from "react";

type ServiceStatus = "Active" | "Inactive";

const CATEGORY_OPTIONS = [
  { value: "None-Residential", label: "None-Residential" },
  { value: "Residential service", label: "Residential service" },
];

// Danh sách code + tên đầy đủ – dùng giống bên Individual / Accepted Services
const SERVICE_OPTIONS: { code: string; label: string; full: string }[] = [
  { code: "PCA", label: "PCA", full: "Personal Care Assistant" },
  { code: "NT", label: "NT", full: "Nursing / Nurse Triage" },
  { code: "PBIS", label: "PBIS", full: "Positive Behavior Interventions and Supports" },
  { code: "SHHA", label: "SHHA", full: "Skilled Home Health Aide" },
  { code: "PT", label: "PT", full: "Physical Therapy" },
  { code: "CNA", label: "CNA", full: "Certified Nursing Assistant" },
  { code: "RESP", label: "RESP", full: "Respite Services" },
  { code: "SHC", label: "SHC", full: "Shared Home Care / Shared Habilitation" },
  { code: "OT", label: "OT", full: "Occupational Therapy" },
  { code: "SCM", label: "SCM", full: "Service Coordination / Case Management" },
  { code: "COMP", label: "COMP", full: "Companion Services" },

  { code: "LPN", label: "LPN", full: "Licensed Practical Nurse" },
  { code: "HCSS", label: "HCSS", full: "Home & Community Support Services" },
  { code: "SDP", label: "SDP", full: "Structured Day Program" },
  { code: "OTA", label: "OTA", full: "Occupational Therapy Assistant" },
  { code: "MSW", label: "MSW", full: "Master of Social Work Services" },
  { code: "APC", label: "APC", full: "Advanced Professional Care" },
  { code: "CBSA", label: "CBSA", full: "Community-Based Supported Activities" },
  { code: "PTA", label: "PTA", full: "Physical Therapy Assistant" },
  { code: "HSK", label: "HSK", full: "Homemaker / Housekeeping" },
  { code: "ILST", label: "ILST", full: "Independent Living Skills Training" },
  { code: "SPC", label: "SPC", full: "Specialist / Professional Consultant" },

  { code: "ST", label: "ST", full: "Speech Therapy" },
  { code: "SCI", label: "SCI", full: "Specialized Community Integration" },
  { code: "PC", label: "PC", full: "Personal Care" },
  { code: "HHA", label: "HHA", full: "Home Health Aide" },
  { code: "RT", label: "RT", full: "Respiratory Therapy / Rehabilitation Therapy" },
  { code: "HMK", label: "HMK", full: "Homemaker Services" },
  { code: "CH", label: "CH", full: "Companion / Habilitation" },
  { code: "RN", label: "RN", full: "Registered Nurse" },
  { code: "PA", label: "PA", full: "Physician Assistant / Personal Assistant" },
  { code: "ESC", label: "ESC", full: "Enhanced Support Companion" },
  { code: "NINS", label: "NINS", full: "Non-Insurance / Non-traditional Service" },
];

type ServiceFormValues = {
  serviceCode: string; // PCA, NT,...
  billingCode: string;
  category: string;
  status: ServiceStatus;
  description: string;
  billable: boolean;
  notes: string;
};

const defaultValues: ServiceFormValues = {
  serviceCode: "",
  billingCode: "",
  category: "",
  status: "Active",
  description: "",
  billable: true,
  notes: "",
};

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

  const handleChange =
    (field: keyof ServiceFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value =
        field === "billable" && e.target instanceof HTMLInputElement
          ? e.target.checked
          : e.target.value;
      setValues((prev) => ({ ...prev, [field]: value }));
    };

  const handleReset = () => {
    setValues(defaultValues);
    setMessage(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const missing: string[] = [];
      if (!values.serviceCode) missing.push("Service name");
      if (!values.category) missing.push("Category");

      if (missing.length > 0) {
        setError("Missing required fields: " + missing.join(", "));
        setSubmitting(false);
        return;
      }

      const serviceName =
        serviceMap.get(values.serviceCode) ?? values.serviceCode;

      const payload = {
        serviceCode: values.serviceCode,
        serviceName,
        billingCode: values.billingCode.trim() || null,
        category: values.category,
        description: values.description.trim() || null,
        status: values.status,
        billable: values.billable,
        notes: values.notes.trim() || null,
      };

      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to create service");
      }

      setMessage("Service created successfully.");
      setValues(defaultValues);
    } catch (err: any) {
      console.error("Error saving service:", err);
      setError(err?.message || "Failed to save service");
    } finally {
      setSubmitting(false);
    }
  };

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
              Create a new service that can be scheduled and billed for individuals.
            </p>
          </div>

          <div className="flex gap-3">
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
                Name, code, and classification of this service.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* SERVICE NAME (dropdown) */}
              <div className="space-y-1">
                <label
                  htmlFor="serviceCode"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Service Name
                </label>
                <select
                  id="serviceCode"
                  value={values.serviceCode}
                  onChange={handleChange("serviceCode")}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                >
                  <option value="">Select service</option>
                  {SERVICE_OPTIONS.map((svc) => (
                    <option
                      key={svc.code}
                      value={svc.code}
                      title={svc.full}
                    >
                      {svc.label} — {svc.full}
                    </option>
                  ))}
                </select>
              </div>

              {/* SERVICE CODE (billing code) */}
              <div className="space-y-1">
                <label
                  htmlFor="billingCode"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Service Code
                </label>
                <input
                  id="billingCode"
                  type="text"
                  placeholder="e.g. SVC-001, T1019..."
                  value={values.billingCode}
                  onChange={handleChange("billingCode")}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                />
              </div>

              {/* CATEGORY */}
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

              {/* STATUS */}
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
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </section>

          {/* Details & Billing */}
          <section className="rounded-2xl border border-bac-border bg-bac-panel p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide">
                Details &amp; Billing
              </h2>
              <p className="mt-1 text-xs text-bac-muted">
                Description and billing-related configuration.
              </p>
            </div>

            <div className="space-y-4">
              {/* DESCRIPTION */}
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

              {/* Billable checkbox */}
              <div className="flex items-center gap-2">
                <input
                  id="billable"
                  type="checkbox"
                  checked={values.billable}
                  onChange={handleChange("billable")}
                  className="h-4 w-4 rounded border-bac-border bg-bac-bg text-bac-primary focus:ring-bac-primary/60"
                />
                <label
                  htmlFor="billable"
                  className="text-xs text-bac-muted"
                >
                  Service is billable (used for claims/invoices)
                </label>
              </div>

              {/* INTERNAL NOTES */}
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

"use client";

import React, { useEffect, useMemo, useState, ChangeEvent } from "react";

type ServiceStatus = "Active" | "Inactive" | "";

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

interface Service {
  id: string;
  serviceCode: string;
  serviceName: string;
  billingCode: string | null;
  category: string;
  description: string | null;
  status: "Active" | "Inactive" | string;
  billable: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SearchServicePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [serviceFilter, setServiceFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<ServiceStatus>("");

  const serviceMap = useMemo(() => {
    const map = new Map<string, string>();
    SERVICE_OPTIONS.forEach((s) => map.set(s.code, s.full));
    return map;
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/services");
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.message || "Failed to load services");
        }
        const data = await res.json();
        setServices(data.services ?? []);
      } catch (err: any) {
        console.error("Error loading services:", err);
        setError(err?.message || "Failed to load services");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filtered = useMemo(() => {
    return services.filter((svc) => {
      const matchesService =
        !serviceFilter || svc.serviceCode === serviceFilter;

      const matchesCategory =
        !categoryFilter || svc.category === categoryFilter;

      const matchesStatus =
        !statusFilter || svc.status === statusFilter;

      return matchesService && matchesCategory && matchesStatus;
    });
  }, [services, serviceFilter, categoryFilter, statusFilter]);

  const handleServiceChange = (e: ChangeEvent<HTMLSelectElement>) =>
    setServiceFilter(e.target.value);

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) =>
    setCategoryFilter(e.target.value);

  const handleStatusChange = (e: ChangeEvent<HTMLSelectElement>) =>
    setStatusFilter(e.target.value as ServiceStatus);

  return (
    <div className="min-h-screen bg-bac-bg text-bac-text">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Search Services
            </h1>
            <p className="mt-1 text-sm text-bac-muted">
              Find and manage services that can be scheduled and billed.
            </p>
          </div>

          <a
            href="/services/new"
            className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-bac-primary/90"
          >
            + New Service
          </a>
        </div>

        {/* Filters */}
        <section className="mb-4 rounded-2xl border border-bac-border bg-bac-panel p-4">
          <div className="grid gap-3 md:grid-cols-3">
            {/* Service Name */}
            <div className="space-y-1">
              <label
                htmlFor="serviceFilter"
                className="text-xs font-medium uppercase tracking-wide text-bac-muted"
              >
                Service Name
              </label>
              <select
                id="serviceFilter"
                value={serviceFilter}
                onChange={handleServiceChange}
                className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
              >
                <option value="">All services</option>
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

            {/* Category */}
            <div className="space-y-1">
              <label
                htmlFor="categoryFilter"
                className="text-xs font-medium uppercase tracking-wide text-bac-muted"
              >
                Category
              </label>
              <select
                id="categoryFilter"
                value={categoryFilter}
                onChange={handleCategoryChange}
                className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
              >
                <option value="">All categories</option>
                <option value="None-Residential">None-Residential</option>
                <option value="Residential service">Residential service</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label
                htmlFor="statusFilter"
                className="text-xs font-medium uppercase tracking-wide text-bac-muted"
              >
                Status
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={handleStatusChange}
                className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
              >
                <option value="">All statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="rounded-2xl border border-bac-border bg-bac-panel p-4">
          {loading ? (
            <p className="text-sm text-bac-muted">Loading services...</p>
          ) : error ? (
            <p className="text-sm text-red-300">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-bac-muted">
              No services found with current filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-bac-border/60 text-xs uppercase tracking-wide text-bac-muted">
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Service Name</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Billable</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((svc) => (
                    <tr
                      key={svc.id}
                      className="border-b border-bac-border/40 hover:bg-bac-bg/40"
                    >
                      <td className="px-3 py-2 align-middle font-mono text-xs text-bac-muted">
                        {svc.serviceCode}
                      </td>
                      <td
                        className="px-3 py-2 align-middle text-sm font-medium"
                        title={
                          serviceMap.get(svc.serviceCode) ??
                          svc.serviceName
                        }
                      >
                        {svc.serviceName}
                      </td>
                      <td className="px-3 py-2 align-middle text-xs">
                        {svc.category}
                      </td>
                      <td className="px-3 py-2 align-middle text-xs">
                        {svc.status}
                      </td>
                      <td className="px-3 py-2 align-middle text-xs">
                        {svc.billable ? "Yes" : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

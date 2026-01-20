// Web\app\programs\page.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";

type ProgramItem = {
  id: string;
  code: string;
  name: string;
  description: string;
};

type ServiceRow = {
  id: string;
  serviceCode: string;
  serviceName: string;
  category: string;
  status: string;
  description: string | null;
  notes: string | null;
};

const residentialPrograms: ProgramItem[] = [
  {
    id: "res-1",
    code: "RES-GH",
    name: "Group Homes / Community Living Arrangements",
    description:
      "Licensed homes in the community with 24/7 staff support where individuals live with roommates and receive assistance with daily living, health, and safety.",
  },
  {
    id: "res-2",
    code: "RES-SHARED",
    name: "Shared Living / Family Living",
    description:
      "The individual lives in the home of a host family or caregiver, becoming part of the household with ongoing support and supervision in a family-like setting.",
  },
  {
    id: "res-3",
    code: "RES-SIL",
    name: "Supported Independent Living & Supports",
    description:
      "Individuals live in their own apartment or home and receive flexible staff support (e.g., medication reminders, budgeting, transportation) to stay safe and independent.",
  },
  {
    id: "res-4",
    code: "RES-ICF",
    name: "Intermediate Care Facilities (ICF / ICF-IID)",
    description:
      "Licensed facility-based care with intensive supports, nursing, and habilitation services for individuals who have very high medical or behavioral needs.",
  },
];

function pickBestDesc(svc: ServiceRow): string {
  const d = (svc.description || "").trim();
  if (d) return d;

  // If description empty, try first line of notes (ignore CONFIG block)
  const n = (svc.notes || "").trim();
  if (!n) return "—";

  const lines = n
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  const firstNonConfig = lines.find((x) => !x.startsWith("[CONFIG]"));
  return firstNonConfig || "—";
}

export default function ProgramsPage() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/services", { cache: "no-store" });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.message || "Failed to load services");
        }
        const data = await res.json();
        setServices(data?.services ?? []);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load services");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ✅ Non-Residential column = live from DB
  const nonResidentialPrograms: ProgramItem[] = useMemo(() => {
    const rows = (services || [])
      .filter((s) => (s.category || "").toLowerCase() === "none-residential")
      .filter((s) => (s.status || "").toLowerCase() !== "inactive")
      .map((s) => ({
        id: s.id,
        code: s.serviceCode,
        name: s.serviceName,
        description: pickBestDesc(s),
      }));

    // Sort A–Z by Program name (case-insensitive)
    rows.sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", undefined, {
        sensitivity: "base",
      }),
    );
    return rows;
  }, [services]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-bac-text">Programs</h1>
          <p className="mt-1 text-sm text-bac-muted">
            Overview of BAC service programs, grouped into{" "}
            <span className="text-yellow-200 font-semibold">
              Non-Residential
            </span>{" "}
            and{" "}
            <span className="text-yellow-200 font-semibold">Residential</span>{" "}
            options for individuals with intellectual and developmental
            disabilities.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl border border-bac-border bg-bac-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-bac-primary/90"
        >
          + New Program (coming soon)
        </button>
      </div>

      {/* Info note */}
      <div className="rounded-2xl border border-bac-border bg-bac-panel px-4 py-3 text-sm text-bac-muted">
        <span className="font-semibold text-yellow-200">Note:</span>{" "}
        Non-Residential is currently loaded from live Services. Residential is
        sample configuration for now.
      </div>

      {/* Two-column layout */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Non-Residential */}
        <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow-sm space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-bac-text">
              1. Non-Residential Programs
            </h2>
            <p className="mt-1 text-sm text-bac-muted">
              Services where the individual{" "}
              <span className="font-semibold text-yellow-200">
                does not live
              </span>{" "}
              in a BAC-operated residence. Supports are provided at home and in
              the community with flexible hours (day, evening, weekend) based on
              the person&apos;s needs.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-bac-border bg-bac-bg/40">
            {loading ? (
              <div className="px-4 py-3 text-sm text-bac-muted">
                Loading services...
              </div>
            ) : error ? (
              <div className="px-4 py-3 text-sm text-red-300">{error}</div>
            ) : nonResidentialPrograms.length === 0 ? (
              <div className="px-4 py-3 text-sm text-bac-muted">
                No active None-Residential services found.
              </div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-bac-bg/60 text-bac-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Program</th>
                  </tr>
                </thead>
                <tbody>
                  {nonResidentialPrograms.map((p) => (
                    <tr key={p.id} className="border-t border-bac-border">
                      <td className="px-3 py-2 align-top text-yellow-200 font-semibold text-xs sm:text-sm whitespace-nowrap">
                        {p.code}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium text-bac-text">
                          {p.name}
                        </div>
                        <div className="mt-0.5 text-xs text-bac-muted">
                          {p.description}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Residential */}
        <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow-sm space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-bac-text">
              2. Residential Programs
            </h2>
            <p className="mt-1 text-sm text-bac-muted">
              Services where the individual{" "}
              <span className="font-semibold text-yellow-200">
                lives full-time
              </span>{" "}
              in a licensed or approved setting with 24/7 support. BAC provides
              daily care, health, safety, and community integration from the
              home base.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-bac-border bg-bac-bg/40">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-bac-bg/60 text-bac-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Program</th>
                </tr>
              </thead>
              <tbody>
                {residentialPrograms.map((p) => (
                  <tr key={p.id} className="border-t border-bac-border">
                    <td className="px-3 py-2 align-top text-yellow-200 font-semibold text-xs sm:text-sm whitespace-nowrap">
                      {p.code}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium text-bac-text">{p.name}</div>
                      <div className="mt-0.5 text-xs text-bac-muted">
                        {p.description}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

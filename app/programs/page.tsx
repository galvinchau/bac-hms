// app/programs/page.tsx
// or app/(dashboard)/programs/page.tsx depending on your folder structure

import React from "react";

type ProgramItem = {
  id: string;
  code: string;
  name: string;
  description: string;
};

const nonResidentialPrograms: ProgramItem[] = [
  {
    id: "nr-1",
    code: "NR-HAB",
    name: "Home & Community Habilitation",
    description:
      "Skill-building and support in the person’s home and community: daily living, communication, social skills, and helping the individual participate safely in community life.",
  },
  {
    id: "nr-2",
    code: "NR-COMP",
    name: "Companion Services",
    description:
      "Staff stay with the individual during the day, evening, or weekend to provide supervision, basic support, and social interaction in the home or community.",
  },
  {
    id: "nr-3",
    code: "NR-EMP",
    name: "Employment / Supported Employment",
    description:
      "Job development, job coaching, and ongoing support so individuals with disabilities can obtain and maintain meaningful employment in the community.",
  },
  {
    id: "nr-4",
    code: "NR-THER",
    name: "Therapy Services",
    description:
      "Professional therapy such as PT/OT/speech and related rehabilitation services to maintain or improve functional skills and health.",
  },
  {
    id: "nr-5",
    code: "NR-BEH",
    name: "Behavior Support",
    description:
      "Clinical assessment and behavior support plans to help manage challenging behaviors and teach safer, more appropriate skills.",
  },
  {
    id: "nr-6",
    code: "NR-TRANS",
    name: "Transportation",
    description:
      "Transportation to work, day programs, medical appointments, and community activities when the person cannot safely use other options.",
  },
  {
    id: "nr-7",
    code: "NR-RESP",
    name: "Respite Services",
    description:
      "Short-term relief for families and caregivers, either during the day or overnight, so they can rest while the individual continues to receive care.",
  },
  {
    id: "nr-8",
    code: "NR-TECH",
    name: "Assistive Technology / Environmental Modifications",
    description:
      "Equipment and home/vehicle modifications that support mobility, communication, safety, and independence (e.g., ramps, grab bars, adaptive devices).",
  },
];

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

export default function ProgramsPage() {
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
            <span className="text-yellow-200 font-semibold">
              Residential
            </span>{" "}
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
        This is sample configuration for BAC programs —{" "}
        <span className="font-semibold text-bac-text">
          Galvin will update this page with live database data soon.
        </span>
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
          </div>
        </div>
      </div>
    </div>
  );
}

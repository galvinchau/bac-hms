// web/app/individual/detail/page.tsx
"use client";

import React, { useMemo, useState } from "react";

type LeftNavItem = {
  key: string;
  label: string;
};

const LEFT_NAV: LeftNavItem[] = [
    { key: "profile", label: "Profile" },
  { key: "contracts", label: "Contracts" },
  { key: "referral", label: "Referral Patient Info" },
  { key: "eligibility", label: "Eligibility Check" },
  { key: "authorders", label: "Auth/Orders" },
  { key: "special", label: "Special Requests" },
  { key: "masterweek", label: "Master Week" },
  { key: "calendar", label: "Calendar" },
  { key: "visits", label: "Visits" },
  { key: "poc", label: "POC" },
  { key: "caregiverhistory", label: "Caregiver History" },
  { key: "others", label: "Others" },
  { key: "financial", label: "Financial" },
  { key: "vacation", label: "Vacation" },
  { key: "familyportal", label: "Family Portal" },
  { key: "docmgmt", label: "Doc Management" },
  { key: "clinical", label: "Clinical Info" },
  { key: "cert", label: "Certification" },
  { key: "medprofile", label: "Med Profile" },
  { key: "mdorders", label: "MD Orders" },
  { key: "interim", label: "Interim Orders" },
];

function Pill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "active";
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "active"
          ? "bg-bac-panel text-yellow-200"
          : "bg-bac-panel/40 text-bac-muted",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function POCPlaceholder() {
  const rows = useMemo(
    () => [
      {
        pocNumber: "7045075",
        startDate: "02/17/2026",
        stopDate: "02/19/2026",
        createdBy: "duongcKSMX",
        createdDate: "02/16/2026",
        shift: "All",
        note: "",
      },
      {
        pocNumber: "6541017",
        startDate: "05/18/2025",
        stopDate: "",
        createdBy: "Bronwenc",
        createdDate: "07/03/2025",
        shift: "All",
        note:
          "Outcome: TAKING CARE OF BUSINESS ... TRISTAN CLEANS HIS APARTMENT, DOES HIS LAUNDRY, BUYS AND MAKES FOOD, AND ATTENDS HIS SCHEDULED APPOINTMENTS ...",
      },
    ],
    [],
  );

  return (
    <div className="w-full max-w-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-bac-text">
            Plan of Care (POC)
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Pill tone="active">POCs</Pill>
          </div>
        </div>

        <button
          type="button"
          className="rounded-lg bg-bac-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
          onClick={() => alert("Add POC (placeholder)")}
        >
          Add POC
        </button>
      </div>

      <div className="mt-4 w-full max-w-none rounded-2xl border border-bac-border bg-bac-panel/40 p-4">
        <div className="text-sm font-semibold text-bac-text">POC</div>

        {/* Make table take full width of container */}
        <div className="mt-3 w-full overflow-x-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-0">
            <thead>
              <tr className="bg-bac-panel">
                {[
                  "POC Number",
                  "Start Date",
                  "Stop Date",
                  "POC Note",
                  "Shift",
                  "Created By",
                  "Created Date",
                  "Print",
                  "Actions",
                  "Delete",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-bac-muted whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.pocNumber}
                  className="border-b border-bac-border last:border-b-0"
                >
                  <td className="px-3 py-3 text-sm text-bac-text whitespace-nowrap">
                    <button
                      type="button"
                      className="text-bac-primary hover:underline"
                      onClick={() =>
                        alert(`Open POC ${r.pocNumber} (placeholder)`)
                      }
                    >
                      {r.pocNumber}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-sm text-bac-text whitespace-nowrap">
                    {r.startDate || "--"}
                  </td>
                  <td className="px-3 py-3 text-sm text-bac-text whitespace-nowrap">
                    {r.stopDate || "--"}
                  </td>
                  <td className="px-3 py-3 text-sm text-bac-text">
                    {r.note ? (
                      <div className="max-w-[720px]">
                        <div className="line-clamp-5 whitespace-pre-line">
                          {r.note}
                        </div>
                        <button
                          type="button"
                          className="mt-1 text-xs text-bac-primary hover:underline"
                          onClick={() => alert("Show more (placeholder)")}
                        >
                          Show More
                        </button>
                      </div>
                    ) : (
                      <span className="text-bac-muted">--</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm text-bac-text whitespace-nowrap">
                    {r.shift || "--"}
                  </td>
                  <td className="px-3 py-3 text-sm text-bac-text whitespace-nowrap">
                    {r.createdBy || "--"}
                  </td>
                  <td className="px-3 py-3 text-sm text-bac-text whitespace-nowrap">
                    {r.createdDate || "--"}
                  </td>
                  <td className="px-3 py-3 text-sm text-bac-text whitespace-nowrap">
                    <button
                      type="button"
                      className="rounded-md border border-bac-border px-2 py-1 text-xs text-bac-text hover:bg-bac-panel"
                      onClick={() => alert("Print (placeholder)")}
                    >
                      Print
                    </button>
                  </td>
                  <td className="px-3 py-3 text-sm text-bac-text whitespace-nowrap">
                    <button
                      type="button"
                      className="rounded-md border border-bac-border px-2 py-1 text-xs text-bac-text hover:bg-bac-panel"
                      onClick={() => alert("Actions (placeholder)")}
                    >
                      ⋯
                    </button>
                  </td>
                  <td className="px-3 py-3 text-sm text-bac-text whitespace-nowrap">
                    <button
                      type="button"
                      className="rounded-md border border-bac-border px-2 py-1 text-xs text-bac-red hover:bg-bac-panel"
                      onClick={() => alert("Delete (placeholder)")}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-bac-muted">
          * This is a layout placeholder (no real data yet).
        </div>
      </div>
    </div>
  );
}

export default function IndividualDetailPage() {
  const [activeKey, setActiveKey] = useState<string>("poc");

  const activeLabel = useMemo(() => {
    return LEFT_NAV.find((x) => x.key === activeKey)?.label ?? "POC";
  }, [activeKey]);

  return (
    // ✅ IMPORTANT: remove any implicit centering / max-width by forcing max-w-none
    <div className="w-full max-w-none">
      {/* ✅ Use full available height */}
      <div className="h-[calc(100vh-56px)] w-full max-w-none">
        {/* ✅ Container stretches fully; padding stays */}
        <div className="flex h-full w-full max-w-none gap-4 p-4">
          {/* LEFT NAV */}
          <aside className="shrink-0 w-[240px] xl:w-[280px] 2xl:w-[320px]">
            <div className="rounded-2xl border border-bac-border bg-bac-panel/30 h-full">
              <div className="px-4 py-3 border-b border-bac-border">
                <div className="text-sm font-semibold text-bac-text">
                  Individual Detail
                </div>
                <div className="text-xs text-bac-muted">
                  Left menu (placeholder)
                </div>
              </div>

              {/* ✅ Make left nav scroll inside its own panel */}
              <div className="h-[calc(100%-56px)] overflow-y-auto p-2">
                {LEFT_NAV.map((item) => {
                  const isActive = item.key === activeKey;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveKey(item.key)}
                      className={[
                        "w-full text-left rounded-xl px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-bac-panel text-yellow-200"
                          : "text-yellow-300 hover:bg-bac-panel/60 hover:text-yellow-200",
                      ].join(" ")}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main className="min-w-0 flex-1 w-full max-w-none">
            {/* ✅ This panel now stretches full width */}
            <div className="h-full w-full max-w-none rounded-2xl border border-bac-border bg-bac-panel/20 p-4 overflow-y-auto">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm text-bac-muted">
                  Individual Detail /{" "}
                  <span className="text-bac-text font-semibold">
                    {activeLabel}
                  </span>
                </div>
              </div>

              {activeKey === "poc" ? (
                <POCPlaceholder />
              ) : (
                <div className="w-full max-w-none rounded-2xl border border-bac-border bg-bac-panel/30 p-6">
                  <div className="text-lg font-semibold text-bac-text">
                    {activeLabel}
                  </div>
                  <div className="mt-2 text-sm text-bac-muted">
                    This is a placeholder layout. We will implement this module
                    later.
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

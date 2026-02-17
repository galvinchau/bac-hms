// web/app/individual/detail/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import POCModule from "./_components/modules/POCModule";
import MasterWeekModule from "./_components/modules/MasterWeekModule";
import ProfileModule from "./_components/modules/ProfileModule";

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

type IndividualOption = {
  id: string;

  // For dropdown display (staff friendly): can show Medicaid ID first
  label: string;

  // For POCModule (must be "Name (CODE)")
  pocLabel: string;

  // Useful fields
  name: string;
  code: string;
  medicaidId?: string | null;
};

type IndividualsSimpleResponse =
  | Array<any>
  | {
      items?: any[];
    };

function safeString(v: any): string {
  return String(v ?? "").trim();
}

// Build staff-friendly dropdown label + POC label
function safeLabelFromApiRow(row: any): IndividualOption | null {
  if (!row) return null;

  const id = safeString(row.id ?? row.individualId);
  if (!id) return null;

  const firstName = safeString(row.firstName);
  const lastName = safeString(row.lastName);
  const code = safeString(row.code ?? row.individualCode);

  const medicaidId = safeString(
    row.medicaidId ??
      row.medicaidID ??
      row.medicaid ??
      row.altId ??
      row.altID
  );

  // Display name preference: "LAST FIRST" like your current UI
  const name =
    (firstName || lastName)
      ? `${lastName} ${firstName}`.trim()
      : (safeString(row.name) || code || id);

  // Dropdown label: show Medicaid ID if available, else show code
  const dropdownExtra = medicaidId
    ? ` (${medicaidId})`
    : code
      ? ` (${code})`
      : "";

  // POCModule label MUST be "Name (CODE)" to auto-fill Admission ID correctly
  const pocExtra = code ? ` (${code})` : "";

  return {
    id,
    label: `${name}${dropdownExtra}`.trim(),
    pocLabel: `${name}${pocExtra}`.trim(),
    name,
    code,
    medicaidId: medicaidId || null,
  };
}

export default function IndividualDetailPage() {
  const [activeKey, setActiveKey] = useState<string>("poc");

  // Search box text
  const [searchText, setSearchText] = useState<string>("");

  // Individuals list (loaded from API)
  const [allIndividuals, setAllIndividuals] = useState<IndividualOption[]>([]);
  const [loadingIndividuals, setLoadingIndividuals] = useState<boolean>(false);
  const [individualsError, setIndividualsError] = useState<string | null>(null);

  // Selected Individual ID
  const [selectedIndividualId, setSelectedIndividualId] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoadingIndividuals(true);
        setIndividualsError(null);

        const res = await fetch("/api/individuals?simple=true", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = (await res.json()) as IndividualsSimpleResponse;
        const rawItems = Array.isArray(data) ? data : data?.items ?? [];

        const mapped = rawItems
          .map(safeLabelFromApiRow)
          .filter(Boolean) as IndividualOption[];

        if (cancelled) return;

        setAllIndividuals(mapped);

        // Auto select first
        if (!selectedIndividualId && mapped.length > 0) {
          setSelectedIndividualId(mapped[0].id);
        }
      } catch (e: any) {
        if (cancelled) return;
        console.error("Load individuals failed:", e);
        setIndividualsError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoadingIndividuals(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredIndividuals = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return allIndividuals;
    return allIndividuals.filter((x) => x.label.toLowerCase().includes(q));
  }, [allIndividuals, searchText]);

  const selectedIndividual = useMemo(() => {
    return allIndividuals.find((x) => x.id === selectedIndividualId) || null;
  }, [allIndividuals, selectedIndividualId]);

  const selectedIndividualLabelForHeader = useMemo(() => {
    // keep header showing dropdown label (may include Medicaid)
    return selectedIndividual?.label ?? "No Individual selected";
  }, [selectedIndividual]);

  const selectedIndividualLabelForPOC = useMemo(() => {
    // IMPORTANT: pass the POC label with CODE in parentheses
    return selectedIndividual?.pocLabel ?? "No Individual selected";
  }, [selectedIndividual]);

  // Prev/Next based on FILTERED list
  const selectedIndexInFiltered = useMemo(() => {
    return filteredIndividuals.findIndex((x) => x.id === selectedIndividualId);
  }, [filteredIndividuals, selectedIndividualId]);

  const canPrev = selectedIndexInFiltered > 0;
  const canNext =
    selectedIndexInFiltered >= 0 &&
    selectedIndexInFiltered < filteredIndividuals.length - 1;

  const goPrev = () => {
    if (!canPrev) return;
    const prev = filteredIndividuals[selectedIndexInFiltered - 1];
    if (prev) setSelectedIndividualId(prev.id);
  };

  const goNext = () => {
    if (!canNext) return;
    const next = filteredIndividuals[selectedIndexInFiltered + 1];
    if (next) setSelectedIndividualId(next.id);
  };

  // If search reduces list and selected is not in filtered list, auto-select first match
  useEffect(() => {
    if (!filteredIndividuals.length) return;
    const exists = filteredIndividuals.some((x) => x.id === selectedIndividualId);
    if (!exists) setSelectedIndividualId(filteredIndividuals[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, allIndividuals]);

  const activeLabel = useMemo(() => {
    return LEFT_NAV.find((x) => x.key === activeKey)?.label ?? "POC";
  }, [activeKey]);

  return (
    <div className="w-full max-w-none">
      <div className="h-[calc(100vh-56px)] w-full max-w-none">
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
            <div className="h-full w-full max-w-none rounded-2xl border border-bac-border bg-bac-panel/20 p-4 overflow-y-auto">
              {/* HEADER ROW */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-bac-muted">
                  Individual Detail /{" "}
                  <span className="text-bac-text font-semibold">
                    {activeLabel}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Search Individual */}
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-bac-muted whitespace-nowrap">
                      Search Individual
                    </div>
                    <input
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Type name or Medicaid ID..."
                      className="w-[220px] rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary"
                    />
                  </div>

                  {/* Dropdown */}
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-bac-muted whitespace-nowrap">
                      Individual
                    </div>
                    <select
                      value={selectedIndividualId}
                      onChange={(e) => setSelectedIndividualId(e.target.value)}
                      disabled={loadingIndividuals || allIndividuals.length === 0}
                      className="min-w-[360px] rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary disabled:opacity-60"
                    >
                      {loadingIndividuals ? (
                        <option value="">Loading...</option>
                      ) : individualsError ? (
                        <option value="">Failed to load: {individualsError}</option>
                      ) : filteredIndividuals.length === 0 ? (
                        <option value="">No match</option>
                      ) : (
                        filteredIndividuals.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Previous / Next */}
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={!canPrev || loadingIndividuals}
                    className="rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text hover:bg-bac-panel/80 disabled:opacity-50 disabled:hover:bg-bac-panel"
                    title="Previous Individual"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canNext || loadingIndividuals}
                    className="rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text hover:bg-bac-panel/80 disabled:opacity-50 disabled:hover:bg-bac-panel"
                    title="Next Individual"
                  >
                    Next
                  </button>
                </div>
              </div>

              {/* Optional small status line */}
              <div className="mb-3 text-xs text-bac-muted">
                {loadingIndividuals
                  ? "Loading individuals..."
                  : individualsError
                    ? `Individuals load error: ${individualsError}`
                    : `Individuals: ${allIndividuals.length}`}
              </div>

              {/* CONTENT */}
              {activeKey === "profile" ? (
                <ProfileModule
                  individualId={selectedIndividualId}
                  individualLabel={selectedIndividualLabelForHeader}
                />
              ) : activeKey === "poc" ? (
                <POCModule
                  individualId={selectedIndividualId}
                  individualLabel={selectedIndividualLabelForPOC}
                />
              ) : activeKey === "masterweek" ? (
                <MasterWeekModule
                  individualId={selectedIndividualId}
                  individualLabel={selectedIndividualLabelForHeader}
                />
              ) : (
                <div className="w-full max-w-none rounded-2xl border border-bac-border bg-bac-panel/30 p-6">
                  <div className="text-lg font-semibold text-bac-text">
                    {activeLabel}
                  </div>
                  <div className="mt-2 text-sm text-bac-muted">
                    This is a placeholder layout. We will implement this module later.
                  </div>
                  <div className="mt-3 text-sm text-bac-text">
                    <span className="text-bac-muted">Selected Individual: </span>
                    {selectedIndividualLabelForHeader}
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

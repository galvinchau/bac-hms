"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  label: string;
};

type IndividualsSimpleResponse =
  | Array<any>
  | {
      items?: any[];
    };

type ModuleProps = {
  individualId: string;
  individualLabel: string;
};

function safeOptionFromApiRow(row: any): IndividualOption | null {
  if (!row) return null;
  const id = String(row.id ?? row.individualId ?? "").trim();
  if (!id) return null;

  const code = String(row.code ?? row.individualCode ?? "").trim();
  const name =
    String(row.name ?? "").trim() ||
    `${String(row.lastName ?? "").trim()} ${String(row.firstName ?? "").trim()}`.trim();

  const nice = code ? `${name} (${code})` : name || id;
  return { id, label: nice };
}

function PlaceholderModule({ title, individualLabel }: { title: string; individualLabel: string }) {
  return (
    <div className="w-full max-w-none rounded-2xl border border-bac-border bg-bac-panel/30 p-6">
      <div className="text-lg font-semibold text-bac-text">{title}</div>
      <div className="mt-2 text-sm text-bac-muted">
        This module will be implemented later.
      </div>
      <div className="mt-3 text-sm text-bac-text">
        <span className="text-bac-muted">Selected Individual: </span>
        {individualLabel || "—"}
      </div>
    </div>
  );
}

function makePlaceholder(title: string) {
  return function PlaceholderWrapper({ individualLabel }: ModuleProps) {
    return <PlaceholderModule title={title} individualLabel={individualLabel} />;
  };
}

/**
 * ✅ ALL LEFT MENU MODULES ARE WIRED HERE
 * - Profile uses real module (ProfileModule)
 * - Others: placeholder now; later replace each one with its own file module.
 */
const MODULES: Record<string, React.ComponentType<ModuleProps>> = {
  profile: function ProfileWrapper({ individualId }: ModuleProps) {
    return <ProfileModule individualId={individualId} />;
  },

  contracts: makePlaceholder("Contracts"),
  referral: makePlaceholder("Referral Patient Info"),
  eligibility: makePlaceholder("Eligibility Check"),
  authorders: makePlaceholder("Auth/Orders"),
  special: makePlaceholder("Special Requests"),
  masterweek: makePlaceholder("Master Week"),
  calendar: makePlaceholder("Calendar"),
  visits: makePlaceholder("Visits"),
  poc: makePlaceholder("Plan of Care (POC)"),
  caregiverhistory: makePlaceholder("Caregiver History"),
  others: makePlaceholder("Others"),
  financial: makePlaceholder("Financial"),
  vacation: makePlaceholder("Vacation"),
  familyportal: makePlaceholder("Family Portal"),
  docmgmt: makePlaceholder("Doc Management"),
  clinical: makePlaceholder("Clinical Info"),
  cert: makePlaceholder("Certification"),
  medprofile: makePlaceholder("Med Profile"),
  mdorders: makePlaceholder("MD Orders"),
  interim: makePlaceholder("Interim Orders"),
};

export default function IndividualDetailPage() {
  const [activeKey, setActiveKey] = useState<string>("profile");

  // Search + list
  const [searchText, setSearchText] = useState<string>("");
  const [allIndividuals, setAllIndividuals] = useState<IndividualOption[]>([]);
  const [loadingIndividuals, setLoadingIndividuals] = useState<boolean>(false);
  const [individualsError, setIndividualsError] = useState<string | null>(null);

  const [selectedIndividualId, setSelectedIndividualId] = useState<string>("");

  // Load Individuals list
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoadingIndividuals(true);
        setIndividualsError(null);

        const res = await fetch("/api/individuals?simple=true", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = (await res.json()) as IndividualsSimpleResponse;
        const rawItems = Array.isArray(data) ? data : data?.items ?? [];
        const mapped = rawItems.map(safeOptionFromApiRow).filter(Boolean) as IndividualOption[];

        if (cancelled) return;

        setAllIndividuals(mapped);
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

  const selectedIndividualLabel = useMemo(() => {
    const found = allIndividuals.find((x) => x.id === selectedIndividualId);
    return found?.label ?? "No Individual selected";
  }, [allIndividuals, selectedIndividualId]);

  const selectedIndexInFiltered = useMemo(() => {
    return filteredIndividuals.findIndex((x) => x.id === selectedIndividualId);
  }, [filteredIndividuals, selectedIndividualId]);

  const canPrev = selectedIndexInFiltered > 0;
  const canNext =
    selectedIndexInFiltered >= 0 && selectedIndexInFiltered < filteredIndividuals.length - 1;

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

  // If search reduces list and selected is not in filtered, auto-select first
  useEffect(() => {
    if (!filteredIndividuals.length) return;
    const exists = filteredIndividuals.some((x) => x.id === selectedIndividualId);
    if (!exists) setSelectedIndividualId(filteredIndividuals[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, allIndividuals]);

  const activeLabel = useMemo(() => {
    return LEFT_NAV.find((x) => x.key === activeKey)?.label ?? "Profile";
  }, [activeKey]);

  const ActiveModule = MODULES[activeKey] ?? makePlaceholder(activeLabel);

  return (
    <div className="w-full max-w-none">
      <div className="h-[calc(100vh-56px)] w-full max-w-none">
        <div className="flex h-full w-full max-w-none gap-4 p-4">
          {/* LEFT NAV */}
          <aside className="shrink-0 w-[240px] xl:w-[280px] 2xl:w-[320px]">
            <div className="rounded-2xl border border-bac-border bg-bac-panel/30 h-full">
              <div className="px-4 py-3 border-b border-bac-border">
                <div className="text-sm font-semibold text-bac-text">Individual Detail</div>
                <div className="text-xs text-bac-muted">Left menu</div>
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

          {/* MAIN */}
          <main className="min-w-0 flex-1 w-full max-w-none">
            <div className="h-full w-full max-w-none rounded-2xl border border-bac-border bg-bac-panel/20 p-4 overflow-y-auto">
              {/* HEADER ROW */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-bac-muted">
                  Individual Detail /{" "}
                  <span className="text-bac-text font-semibold">{activeLabel}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Search */}
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-bac-muted whitespace-nowrap">Search Individual</div>
                    <input
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Type name or Medicaid ID..."
                      className="w-[220px] rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary"
                    />
                  </div>

                  {/* Dropdown */}
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-bac-muted whitespace-nowrap">Individual</div>
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

                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={!canPrev || loadingIndividuals}
                    className="rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text hover:bg-bac-panel/80 disabled:opacity-50 disabled:hover:bg-bac-panel"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canNext || loadingIndividuals}
                    className="rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text hover:bg-bac-panel/80 disabled:opacity-50 disabled:hover:bg-bac-panel"
                  >
                    Next
                  </button>
                </div>
              </div>

              {/* CONTENT */}
              <ActiveModule
                individualId={selectedIndividualId}
                individualLabel={selectedIndividualLabel}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

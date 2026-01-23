"use client";

import React, { useEffect, useMemo, useState } from "react";

type IndividualOption = {
  id: string;
  name: string;
  code?: string;

  // Optional extra fields (if API returns)
  medicaidNumber?: string | null;
  medicareNumber?: string | null;
  roomNo?: string | null;
  birthday?: string | null; // can be yyyy-mm-dd or ISO or already formatted
  physician?: string | null;
  diagnosis?: string | null;
  allergies?: string | null;
};

type TreatmentGridRow = {
  id: string;
  label: string;
  subRows: number; // usually 4
};

type NursingSummaryChecks = {
  behavior: boolean;
  personalHygiene: boolean;
  oralHygiene: boolean;
  mobilityAmbulation: boolean;
  appliancesSupportiveDevices: boolean;
  dressingsSkinCare: boolean;
  seeSkinGrid: boolean;

  medsReferToMar: boolean;

  usedAsPerPlanOfCare: boolean;
  poPrnUsed: boolean;
  injectionsPrnUsed: boolean;

  continenceMaintained: "YES" | "NO" | "";
};

type NursingSummaryRight = {
  prnEnemas: boolean;
  prnDigitalStimulation: boolean;
  prnSuctioning: boolean;
  prnOxygen: boolean;
  prnTrachCare: boolean;
  prnAerosolTherapy: boolean;
  prnImpactionRemoval: boolean;
  prnSitzbaths: boolean;
  prnDouches: boolean;

  rehabHabilitationSeePlan: boolean;

  nursingComment: string;
  residentPlanUpdated: string;

  signatures: {
    init1: string;
    sig1: string;
    init2: string;
    sig2: string;
    init3: string;
    sig3: string;
    init4: string;
    sig4: string;
  };

  dateSigned?: string; // keep as yyyy-mm-dd from <input type="date">
};

type GridState = {
  [k: string]: boolean;
};

function daysInMonth(monthValue: string) {
  if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) return 31;
  const [y, m] = monthValue.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function monthLabel(monthValue: string) {
  if (!monthValue) return "";
  const [y, m] = monthValue.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function formatDateMMDDYYYY(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function formatToMMDDYYYY(input: any): string {
  const raw = safeStr(input);
  if (!raw) return "";

  // already MM/DD/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;

  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    if (isNaN(dt.getTime())) return "";
    return formatDateMMDDYYYY(dt);
  }

  // ISO or other parsable date
  const dt = new Date(raw);
  if (!isNaN(dt.getTime())) return formatDateMMDDYYYY(dt);

  return raw; // fallback: show what we got
}

export default function TreatmentRecordClient() {
  const [selectedIndividual, setSelectedIndividual] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
  });

  const todayLabel = useMemo(() => formatDateMMDDYYYY(new Date()), []);

  const [individualOptions, setIndividualOptions] = useState<
    IndividualOption[]
  >([]);
  const [loadingIndividuals, setLoadingIndividuals] = useState(false);
  const [individualError, setIndividualError] = useState<string | null>(null);

  // Header auto-fill fields (editable snapshot)
  const [residentName, setResidentName] = useState("");
  const [medicalNo, setMedicalNo] = useState("");
  const [birthday, setBirthday] = useState(""); // MM/DD/YYYY
  const [roomNo, setRoomNo] = useState("");
  const [medicaidNo, setMedicaidNo] = useState("");
  const [medicareNo, setMedicareNo] = useState("");
  const [physician, setPhysician] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [allergies, setAllergies] = useState("");

  const GRID_ROWS: TreatmentGridRow[] = useMemo(
    () => [
      { id: "row-behavior", label: "Behavior", subRows: 4 },
      { id: "row-personal", label: "Personal Hygiene", subRows: 4 },
      { id: "row-oral", label: "Oral Hygiene", subRows: 4 },
      { id: "row-mobility", label: "Mobility/Ambulation", subRows: 4 },
      {
        id: "row-appliances",
        label: "Appliances/Supportive Devices",
        subRows: 4,
      },
      { id: "row-dressings", label: "Dressings/Skin Care", subRows: 4 },
    ],
    [],
  );

  const [grid, setGrid] = useState<GridState>({});

  const [summaryChecks, setSummaryChecks] = useState<NursingSummaryChecks>({
    behavior: false,
    personalHygiene: false,
    oralHygiene: false,
    mobilityAmbulation: false,
    appliancesSupportiveDevices: false,
    dressingsSkinCare: false,
    seeSkinGrid: false,

    medsReferToMar: true,

    usedAsPerPlanOfCare: false,
    poPrnUsed: false,
    injectionsPrnUsed: false,

    continenceMaintained: "",
  });

  const [summaryRight, setSummaryRight] = useState<NursingSummaryRight>({
    prnEnemas: false,
    prnDigitalStimulation: false,
    prnSuctioning: false,
    prnOxygen: false,
    prnTrachCare: false,
    prnAerosolTherapy: false,
    prnImpactionRemoval: false,
    prnSitzbaths: false,
    prnDouches: false,

    rehabHabilitationSeePlan: false,

    nursingComment: "",
    residentPlanUpdated: "",

    signatures: {
      init1: "",
      sig1: "",
      init2: "",
      sig2: "",
      init3: "",
      sig3: "",
      init4: "",
      sig4: "",
    },
    dateSigned: "",
  });

  const dim = useMemo(() => daysInMonth(selectedMonth), [selectedMonth]);

  const selectedIndividualObj = useMemo(
    () => individualOptions.find((i) => i.id === selectedIndividual) || null,
    [individualOptions, selectedIndividual],
  );

  // Load Individuals
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoadingIndividuals(true);
      setIndividualError(null);
      try {
        const res = await fetch("/api/medication/individuals", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(
            `Failed to load individuals: ${res.status} ${res.statusText}`,
          );
        }
        const data = await res.json().catch(() => null);

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];

        const mapped: IndividualOption[] = list.map((p: any) => {
          const fullName = [p.firstName, p.middleName, p.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();

          // ✅ more robust key mapping (DOB + Medicaid)
          const rawDob =
            p.birthday ??
            p.dob ??
            p.dateOfBirth ??
            p.birthDate ??
            p.date_of_birth ??
            null;

          const rawMedicaid =
            p.medicaidNumber ??
            p.medicaidId ??
            p.medicaidID ??
            p.medicaidIdNumber ??
            p.medicaid_id ??
            p.medicaid ??
            null;

          return {
            id: p.id,
            name: fullName || p.code || "Individual",
            code: p.code ?? undefined,

            medicaidNumber: rawMedicaid,
            medicareNumber: p.medicareNumber ?? p.medicare ?? null,
            roomNo: p.roomNo ?? p.room ?? p.roomNumber ?? null,
            birthday: rawDob,
            physician: p.physician ?? p.primaryPhysician ?? null,
            diagnosis: p.diagnosis ?? null,
            allergies: p.allergies ?? null,
          };
        });

        setIndividualOptions(mapped);

        if (!selectedIndividual && mapped.length) {
          setSelectedIndividual(mapped[0].id);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("[TreatmentRecord] loadIndividuals failed:", err);
        setIndividualError(err?.message ?? "Failed to load individuals.");
      } finally {
        setLoadingIndividuals(false);
      }
    };

    load();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fill header snapshot when Individual changes
  useEffect(() => {
    if (!selectedIndividualObj) return;

    setResidentName(selectedIndividualObj.name || "");
    setMedicalNo(selectedIndividualObj.code || "");

    // ✅ Birthday always show MM/DD/YYYY
    setBirthday(formatToMMDDYYYY(selectedIndividualObj.birthday));

    setRoomNo(safeStr(selectedIndividualObj.roomNo));

    // ✅ Medicaid ID should show if API returns it
    setMedicaidNo(safeStr(selectedIndividualObj.medicaidNumber));

    setMedicareNo(safeStr(selectedIndividualObj.medicareNumber));
    setPhysician(safeStr(selectedIndividualObj.physician));
    setDiagnosis(safeStr(selectedIndividualObj.diagnosis));
    setAllergies(safeStr(selectedIndividualObj.allergies));
  }, [selectedIndividualObj]);

  const toggleCell = (rowId: string, subIdx: number, day: number) => {
    const key = `${rowId}:${subIdx}:${day}`;
    setGrid((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const buildPayload = () => {
    return {
      month: selectedMonth,
      year: selectedMonth.slice(0, 4),
      individualId: selectedIndividual,
      header: {
        residentName,
        medicalNo,
        birthday, // MM/DD/YYYY
        roomNo,
        medicaidNo,
        medicareNo,
        physician,
        diagnosis,
        allergies,
        todayLabel, // MM/DD/YYYY
      },
      grid,
      summaryChecks,
      summaryRight,
    };
  };

  const exportFile = async (format: "pdf" | "excel") => {
    try {
      const res = await fetch(
        `/api/medication/treatment/export?format=${format}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Export failed: HTTP ${res.status}`);
      }

      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const data = await res.json();
        if (data?.url) {
          window.open(data.url, "_blank", "noopener,noreferrer");
          return;
        }
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      console.error("[TreatmentRecord] export failed:", e);
      alert(
        `Export ${format.toUpperCase()} failed: ${String(e?.message || e)}\n\n` +
          `If you haven't implemented /api/medication/treatment/export yet, that's expected.`,
      );
    }
  };

  const gridTemplateColumns = useMemo(() => {
    return `220px 50px repeat(${dim}, minmax(22px, 1fr))`;
  }, [dim]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-bac-text">
            Treatment Record
          </h1>
          <p className="mt-1 text-sm text-bac-muted">
            Monthly Treatment Record (Page 1) + Nursing Monthly Summary (Page
            2). Export to PDF + Excel for PA audit.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportFile("pdf")}
            className="rounded-2xl bg-bac-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
          >
            Export PDF
          </button>
          <button
            onClick={() => exportFile("excel")}
            className="rounded-2xl border border-bac-border bg-bac-panel px-4 py-2 text-sm font-medium text-bac-text hover:bg-bac-bg"
          >
            Export Excel
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-bac-border bg-bac-panel p-4 text-sm shadow-sm">
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-bac-muted">
            Individual
          </span>
          <select
            className="mt-1 min-w-[260px] rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
            value={selectedIndividual}
            onChange={(e) => setSelectedIndividual(e.target.value)}
          >
            {individualOptions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
                {i.code ? ` (${i.code})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-bac-muted">
            Month / Year
          </span>
          <input
            type="month"
            className="mt-1 min-w-[180px] rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>

        <div className="flex flex-1 flex-col justify-end gap-1 text-xs">
          {loadingIndividuals && (
            <span className="text-bac-muted">Loading individuals...</span>
          )}
          {individualError && !loadingIndividuals && (
            <span className="text-bac-red">{individualError}</span>
          )}
          {!selectedIndividual && !loadingIndividuals && (
            <span className="text-yellow-400">
              Please select an individual.
            </span>
          )}
        </div>
      </div>

      <div className="grid flex-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex h-full flex-col gap-4 overflow-auto rounded-2xl border border-bac-border bg-bac-panel p-4 shadow-sm">
          {/* PAGE 1 */}
          <div className="w-full rounded-2xl border border-bac-border bg-white p-3 text-black shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-black/20 pb-2">
              <div className="text-sm font-bold">TREATMENT RECORD</div>
              <div className="text-sm font-bold">BLUE ANGELS CARE</div>
              <div className="text-xs">
                DATE:{" "}
                <span className="inline-block min-w-[120px] border-b border-black/60 align-bottom">
                  {todayLabel}
                </span>
              </div>
            </div>

            <div className="mt-2 w-full overflow-x-auto">
              <div className="grid w-full" style={{ gridTemplateColumns }}>
                <div className="border border-black/40 bg-sky-200 px-2 py-1 text-xs font-bold"></div>
                <div className="border border-black/40 bg-sky-200 px-2 py-1 text-center text-xs font-bold">
                  HOUR
                </div>
                {Array.from({ length: dim }, (_, i) => i + 1).map((d) => (
                  <div
                    key={`dayhdr-${d}`}
                    className="border border-black/40 bg-sky-200 px-1 py-1 text-center text-[10px] font-bold"
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="mt-1 space-y-1">
                {GRID_ROWS.map((r) => (
                  <div key={r.id} className="border border-black/30">
                    {Array.from({ length: r.subRows }, (_, subIdx) => {
                      const isBlue = subIdx % 2 === 0;
                      const rowBg = isBlue ? "bg-sky-100" : "bg-yellow-50";
                      const hourLabel = subIdx + 1;

                      return (
                        <div
                          key={`${r.id}-${subIdx}`}
                          className="grid w-full"
                          style={{ gridTemplateColumns }}
                        >
                          <div
                            className={`border border-black/30 px-2 py-1 text-[11px] font-semibold ${rowBg}`}
                          >
                            {subIdx === 0 ? r.label : ""}
                          </div>
                          <div
                            className={`border border-black/30 px-2 py-1 text-center text-[11px] ${rowBg}`}
                          >
                            {hourLabel}
                          </div>

                          {Array.from({ length: dim }, (_, i) => i + 1).map(
                            (day) => {
                              const key = `${r.id}:${subIdx}:${day}`;
                              const checked = !!grid[key];
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => toggleCell(r.id, subIdx, day)}
                                  className={`border border-black/30 px-0 py-0 text-center text-[11px] ${rowBg} hover:opacity-80`}
                                  title={`${r.label} • Hour ${hourLabel} • Day ${day}`}
                                >
                                  {checked ? "✓" : ""}
                                </button>
                              );
                            },
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="font-bold">DIAGNOSIS</div>
                  <div className="min-h-[28px] border border-black/40 p-1">
                    {diagnosis || ""}
                  </div>
                </div>
                <div>
                  <div className="font-bold">ALLERGIES</div>
                  <div className="min-h-[28px] border border-black/40 p-1">
                    {allergies || ""}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-1 text-[11px]">
                <div className="col-span-2 border border-black/40 p-1">
                  <div className="font-bold">RESIDENT</div>
                  <div>{residentName}</div>
                </div>
                <div className="border border-black/40 p-1">
                  <div className="font-bold">BIRTHDAY</div>
                  <div>{birthday}</div>
                </div>
                <div className="border border-black/40 p-1">
                  <div className="font-bold">ROOM NO</div>
                  <div>{roomNo}</div>
                </div>
                <div className="border border-black/40 p-1">
                  <div className="font-bold">MEDICAID ID NUMBER</div>
                  <div>{medicaidNo}</div>
                </div>
                <div className="border border-black/40 p-1">
                  <div className="font-bold">MEDICARE NUMBER</div>
                  <div>{medicareNo}</div>
                </div>
                <div className="col-span-6 border border-black/40 p-1">
                  <div className="font-bold">PHYSICIAN</div>
                  <div>{physician}</div>
                </div>
              </div>
            </div>
          </div>

          {/* PAGE 2 */}
          <div className="w-full rounded-2xl border border-bac-border bg-white p-3 text-black shadow-sm">
            <div className="border border-black/40 bg-sky-400 px-3 py-2 text-center text-lg font-bold text-white">
              Nursing Monthly Summary
            </div>

            <div className="mt-2 grid gap-2 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="border border-black/40 p-2">
                  <div className="font-bold">Name of Resident:</div>
                  <div className="mt-1 border-b border-black/50 pb-0.5">
                    {residentName}
                  </div>
                </div>
                <div className="border border-black/40 p-2">
                  <div className="font-bold">Monthly Summary for:</div>
                  <div className="mt-1 border-b border-black/50 pb-0.5">
                    {monthLabel(selectedMonth)}
                  </div>
                </div>
                <div className="border border-black/40 p-2">
                  <div className="font-bold">Year:</div>
                  <div className="mt-1 border-b border-black/50 pb-0.5">
                    {selectedMonth.slice(0, 4)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="border border-black/40 p-2">
                  <div className="font-bold">Medical No.</div>
                  <div className="mt-1 border-b border-black/50 pb-0.5">
                    {medicalNo}
                  </div>
                </div>
                <div className="border border-black/40 p-2">
                  <div className="font-bold">Name of Physician</div>
                  <div className="mt-1 border-b border-black/50 pb-0.5">
                    {physician}
                  </div>
                </div>
              </div>

              <div className="grid gap-2 lg:grid-cols-2">
                <div className="border border-black/40 p-2">
                  <div className="text-[11px]">
                    Services were rendered in accordance with Plan of Care and
                    Physician orders all of the following standards:
                  </div>

                  <div className="mt-2 grid gap-1">
                    {[
                      { k: "behavior", label: "Behavior" },
                      { k: "personalHygiene", label: "Personal Hygiene" },
                      { k: "oralHygiene", label: "Oral Hygiene" },
                      { k: "mobilityAmbulation", label: "Mobility/Ambulation" },
                      {
                        k: "appliancesSupportiveDevices",
                        label: "Appliances/Supportive Devices",
                      },
                      { k: "dressingsSkinCare", label: "Dressings/Skin Care" },
                    ].map((x) => (
                      <label
                        key={x.k}
                        className="flex items-center gap-2 border-b border-black/10 py-1"
                      >
                        <input
                          type="checkbox"
                          checked={(summaryChecks as any)[x.k]}
                          onChange={(e) =>
                            setSummaryChecks((p) => ({
                              ...p,
                              [x.k]: e.target.checked,
                            }))
                          }
                        />
                        <span className="font-semibold">{x.label}</span>
                      </label>
                    ))}

                    <label className="mt-1 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={summaryChecks.seeSkinGrid}
                        onChange={(e) =>
                          setSummaryChecks((p) => ({
                            ...p,
                            seeSkinGrid: e.target.checked,
                          }))
                        }
                      />
                      <span className="font-semibold">See Skin Grid</span>
                    </label>
                  </div>

                  <div className="mt-3">
                    <div className="font-bold">
                      Medications/Prescribed Drainage
                    </div>
                    <div className="mt-1 text-[11px]">
                      Please refer to MAR for complete documentation. Resident
                      received medications according to current physicians
                      orders and was observed for adverse side effects and
                      appropriate response.
                    </div>
                    <label className="mt-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={summaryChecks.medsReferToMar}
                        onChange={(e) =>
                          setSummaryChecks((p) => ({
                            ...p,
                            medsReferToMar: e.target.checked,
                          }))
                        }
                      />
                      <span className="font-semibold">Refer to MAR</span>
                    </label>
                  </div>

                  <div className="mt-3">
                    <div className="font-bold">
                      Medications requiring skilled nursing judgement
                    </div>
                    <div className="mt-2 grid gap-1">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={summaryChecks.usedAsPerPlanOfCare}
                          onChange={(e) =>
                            setSummaryChecks((p) => ({
                              ...p,
                              usedAsPerPlanOfCare: e.target.checked,
                            }))
                          }
                        />
                        <span>Used as per plan of care</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={summaryChecks.poPrnUsed}
                          onChange={(e) =>
                            setSummaryChecks((p) => ({
                              ...p,
                              poPrnUsed: e.target.checked,
                            }))
                          }
                        />
                        <span>P.O. PRN used</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={summaryChecks.injectionsPrnUsed}
                          onChange={(e) =>
                            setSummaryChecks((p) => ({
                              ...p,
                              injectionsPrnUsed: e.target.checked,
                            }))
                          }
                        />
                        <span>Injections PRN used</span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="font-bold">Bowel/Bladder Status</div>
                    <div className="mt-1 text-[11px]">
                      Continence maintained by T.L.A.N. Program the majority of
                      the month
                    </div>
                    <div className="mt-2 flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="continence"
                          checked={summaryChecks.continenceMaintained === "YES"}
                          onChange={() =>
                            setSummaryChecks((p) => ({
                              ...p,
                              continenceMaintained: "YES",
                            }))
                          }
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="continence"
                          checked={summaryChecks.continenceMaintained === "NO"}
                          onChange={() =>
                            setSummaryChecks((p) => ({
                              ...p,
                              continenceMaintained: "NO",
                            }))
                          }
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="border border-black/40 p-2">
                  <div className="font-bold">
                    PRN services were provided in the following areas
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
                    {[
                      { k: "prnEnemas", label: "Enemas" },
                      { k: "prnImpactionRemoval", label: "Impaction Removal" },
                      {
                        k: "prnDigitalStimulation",
                        label: "Digital Stimulation",
                      },
                      { k: "prnSitzbaths", label: "Sitzbaths" },
                      { k: "prnSuctioning", label: "Suctioning" },
                      { k: "prnDouches", label: "Douches" },
                      { k: "prnOxygen", label: "Oxygen" },
                      { k: "prnTrachCare", label: "Trach care" },
                      { k: "prnAerosolTherapy", label: "Aerosol Therapy" },
                    ].map((x) => (
                      <label key={x.k} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={(summaryRight as any)[x.k]}
                          onChange={(e) =>
                            setSummaryRight((p) => ({
                              ...p,
                              [x.k]: e.target.checked,
                            }))
                          }
                        />
                        <span>{x.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-3 border border-black/30 p-2 text-[11px]">
                    <span className="font-bold">
                      For details and supportive statements
                    </span>{" "}
                    please refer to the MAR, PHYSICIANS ORDERS, SERVICE DELIVERY
                    RECORDS, and RESIDENT PLAN OF CARE.
                  </div>

                  <div className="mt-3">
                    <div className="font-bold">REHABILITATION/HABILITATION</div>
                    <label className="mt-1 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={summaryRight.rehabHabilitationSeePlan}
                        onChange={(e) =>
                          setSummaryRight((p) => ({
                            ...p,
                            rehabHabilitationSeePlan: e.target.checked,
                          }))
                        }
                      />
                      <span>See Individual Habilitation Plan</span>
                    </label>
                  </div>

                  <div className="mt-3">
                    <div className="font-bold">
                      Nursing comment regarding general condition of resident
                      which includes changes and/or new problems that have
                      occurred this month:
                    </div>
                    <textarea
                      value={summaryRight.nursingComment}
                      onChange={(e) =>
                        setSummaryRight((p) => ({
                          ...p,
                          nursingComment: e.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-md border border-black/40 p-2 text-xs"
                      rows={5}
                    />
                  </div>

                  <div className="mt-3">
                    <div className="font-bold">
                      Resident Plan of Care has been updated and reviewed to
                      reflect any
                    </div>
                    <textarea
                      value={summaryRight.residentPlanUpdated}
                      onChange={(e) =>
                        setSummaryRight((p) => ({
                          ...p,
                          residentPlanUpdated: e.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-md border border-black/40 p-2 text-xs"
                      rows={3}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <div className="font-bold">Signature and Title</div>
                      <input
                        value={summaryRight.signatures.sig1}
                        onChange={(e) =>
                          setSummaryRight((p) => ({
                            ...p,
                            signatures: {
                              ...p.signatures,
                              sig1: e.target.value,
                            },
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-black/40 p-1 text-xs"
                        placeholder="Signature & Title"
                      />
                    </div>
                    <div>
                      <div className="font-bold">Date</div>
                      <input
                        type="date"
                        value={summaryRight.dateSigned || ""}
                        onChange={(e) =>
                          setSummaryRight((p) => ({
                            ...p,
                            dateSigned: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-black/40 p-1 text-xs"
                      />
                      <div className="mt-1 text-[10px] text-black/60">
                        Display:{" "}
                        <span className="font-semibold">
                          {summaryRight.dateSigned
                            ? formatToMMDDYYYY(summaryRight.dateSigned)
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border border-black/40">
                    <div className="grid grid-cols-[70px,1fr] border-b border-black/30 bg-sky-300 text-[11px] font-bold">
                      <div className="border-r border-black/30 p-1 text-center">
                        INIT.
                      </div>
                      <div className="p-1 text-center">SIGNATURE & TITLE</div>
                    </div>

                    {[
                      { initK: "init1", sigK: "sig1" },
                      { initK: "init2", sigK: "sig2" },
                      { initK: "init3", sigK: "sig3" },
                      { initK: "init4", sigK: "sig4" },
                    ].map((x, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-[70px,1fr] border-t border-black/20"
                      >
                        <input
                          value={(summaryRight.signatures as any)[x.initK]}
                          onChange={(e) =>
                            setSummaryRight((p) => ({
                              ...p,
                              signatures: {
                                ...p.signatures,
                                [x.initK]: e.target.value,
                              },
                            }))
                          }
                          className="border-r border-black/20 p-1 text-center text-xs"
                          placeholder="Init"
                        />
                        <input
                          value={(summaryRight.signatures as any)[x.sigK]}
                          onChange={(e) =>
                            setSummaryRight((p) => ({
                              ...p,
                              signatures: {
                                ...p.signatures,
                                [x.sigK]: e.target.value,
                              },
                            }))
                          }
                          className="p-1 text-xs"
                          placeholder="Signature & Title"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 text-[10px] text-black/60">
                    Month / Day / Year
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="justify-self-end flex h-full w-full max-w-[300px] flex-col overflow-auto rounded-2xl border border-bac-border bg-bac-panel p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-bac-text">
            Auto-fill & edits (snapshot for export)
          </h2>
          <p className="mt-1 text-xs text-bac-muted">
            These fields auto-fill from Individual when available. You can edit
            them for this month before exporting.
          </p>

          <div className="mt-4 grid gap-3">
            <Field
              label="Resident"
              value={residentName}
              onChange={setResidentName}
            />
            <Field
              label="Medical No."
              value={medicalNo}
              onChange={setMedicalNo}
            />
            <Field
              label="Birthday (MM/DD/YYYY)"
              value={birthday}
              onChange={setBirthday}
            />
            <Field label="Room No" value={roomNo} onChange={setRoomNo} />
            <Field
              label="Medicaid ID Number"
              value={medicaidNo}
              onChange={setMedicaidNo}
            />
            <Field
              label="Medicare Number"
              value={medicareNo}
              onChange={setMedicareNo}
            />
            <Field
              label="Physician"
              value={physician}
              onChange={setPhysician}
            />
            <FieldArea
              label="Diagnosis"
              value={diagnosis}
              onChange={setDiagnosis}
            />
            <FieldArea
              label="Allergies"
              value={allergies}
              onChange={setAllergies}
            />

            <div className="rounded-xl border border-bac-border bg-bac-bg p-3 text-xs text-bac-muted">
              <div className="font-semibold text-bac-text">
                Next step (backend)
              </div>
              <div className="mt-1">
                Implement{" "}
                <span className="font-mono">
                  POST /api/medication/treatment/export
                </span>{" "}
                to fill the Excel template and produce:
                <ul className="ml-5 mt-1 list-disc">
                  <li>PDF (2 pages, fixed layout)</li>
                  <li>Excel (same workbook layout)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
        {props.label}
      </label>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
      />
    </div>
  );
}

function FieldArea(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
        {props.label}
      </label>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        rows={3}
        className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
      />
    </div>
  );
}

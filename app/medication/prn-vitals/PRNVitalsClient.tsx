"use client";

import React, { useEffect, useMemo, useState } from "react";

type IndividualOption = {
  id: string;
  name: string;
  code?: string;
};

type VitalsRow = {
  id: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  tempF?: string;
  pulse?: string;
  resp?: string;
  bp?: string;
  o2?: string;
  pain?: string;
  notes?: string;
};

type PRNRow = {
  id: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  medication: string;
  dose?: string;
  route?: string;
  reason?: string;
  result?: string;
  notes?: string;
};

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function monthDefault() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function nowHHmm() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function PRNVitalsClient() {
  const [selectedIndividual, setSelectedIndividual] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    monthDefault(),
  );

  const [individualOptions, setIndividualOptions] = useState<
    IndividualOption[]
  >([]);
  const [loadingIndividuals, setLoadingIndividuals] = useState(false);
  const [individualError, setIndividualError] = useState<string | null>(null);

  // UI tabs
  const [tab, setTab] = useState<"PRN" | "VITALS">("PRN");

  // Local-only demo data (until backend is wired)
  const [prnRows, setPrnRows] = useState<PRNRow[]>([]);
  const [vitalsRows, setVitalsRows] = useState<VitalsRow[]>([]);

  // Create row forms
  const [prnForm, setPrnForm] = useState<Omit<PRNRow, "id">>({
    date: todayISO(),
    time: nowHHmm(),
    medication: "",
    dose: "",
    route: "",
    reason: "",
    result: "",
    notes: "",
  });

  const [vitalsForm, setVitalsForm] = useState<Omit<VitalsRow, "id">>({
    date: todayISO(),
    time: nowHHmm(),
    tempF: "",
    pulse: "",
    resp: "",
    bp: "",
    o2: "",
    pain: "",
    notes: "",
  });

  // Load Individuals (same API used in Treatment Record)
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
          return {
            id: p.id,
            name: fullName || p.code || "Individual",
            code: p.code ?? undefined,
          };
        });

        setIndividualOptions(mapped);
        if (!selectedIndividual && mapped.length)
          setSelectedIndividual(mapped[0].id);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("[PRN-Vitals] loadIndividuals failed:", err);
        setIndividualError(err?.message ?? "Failed to load individuals.");
      } finally {
        setLoadingIndividuals(false);
      }
    };

    load();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedIndividualObj = useMemo(
    () => individualOptions.find((i) => i.id === selectedIndividual) || null,
    [individualOptions, selectedIndividual],
  );

  const addPRN = () => {
    const med = safeStr(prnForm.medication);
    if (!selectedIndividual) {
      alert("Please select an individual.");
      return;
    }
    if (!med) {
      alert("Medication is required.");
      return;
    }
    const row: PRNRow = {
      id: crypto.randomUUID(),
      ...prnForm,
      medication: med,
    };
    setPrnRows((p) => [row, ...p]);
    setPrnForm((p) => ({
      ...p,
      medication: "",
      dose: "",
      route: "",
      reason: "",
      result: "",
      notes: "",
    }));
  };

  const addVitals = () => {
    if (!selectedIndividual) {
      alert("Please select an individual.");
      return;
    }
    const row: VitalsRow = {
      id: crypto.randomUUID(),
      ...vitalsForm,
    };
    setVitalsRows((p) => [row, ...p]);
    setVitalsForm((p) => ({
      ...p,
      tempF: "",
      pulse: "",
      resp: "",
      bp: "",
      o2: "",
      pain: "",
      notes: "",
    }));
  };

  const deletePRN = (id: string) =>
    setPrnRows((p) => p.filter((x) => x.id !== id));
  const deleteVitals = (id: string) =>
    setVitalsRows((p) => p.filter((x) => x.id !== id));

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-bac-text">PRN & Vitals</h1>
          <p className="mt-1 text-sm text-bac-muted">
            Track PRN administrations and record vital signs. (UI shell now —
            backend will be wired later.)
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => alert("Export PDF: backend pending")}
            className="rounded-2xl bg-bac-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
          >
            Export PDF
          </button>
          <button
            onClick={() => alert("Export Excel: backend pending")}
            className="rounded-2xl border border-bac-border bg-bac-panel px-4 py-2 text-sm font-medium text-bac-text hover:bg-bac-bg"
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* Global selection */}
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

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab("PRN")}
          className={`rounded-2xl px-4 py-2 text-sm font-medium shadow-sm ${
            tab === "PRN"
              ? "bg-bac-primary text-white"
              : "border border-bac-border bg-bac-panel text-bac-text hover:bg-bac-bg"
          }`}
        >
          PRN
        </button>
        <button
          onClick={() => setTab("VITALS")}
          className={`rounded-2xl px-4 py-2 text-sm font-medium shadow-sm ${
            tab === "VITALS"
              ? "bg-bac-primary text-white"
              : "border border-bac-border bg-bac-panel text-bac-text hover:bg-bac-bg"
          }`}
        >
          Vitals
        </button>
      </div>

      {/* Content */}
      {tab === "PRN" ? (
        <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          {/* Form */}
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-bac-text">
              Add PRN Administration
            </h2>
            <p className="mt-1 text-xs text-bac-muted">
              Individual:{" "}
              <span className="font-semibold text-bac-text">
                {selectedIndividualObj?.name || "-"}
              </span>
            </p>

            <div className="mt-4 grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Date"
                  value={prnForm.date}
                  onChange={(v) => setPrnForm((p) => ({ ...p, date: v }))}
                  type="date"
                />
                <Field
                  label="Time"
                  value={prnForm.time}
                  onChange={(v) => setPrnForm((p) => ({ ...p, time: v }))}
                  type="time"
                />
              </div>

              <Field
                label="Medication (required)"
                value={prnForm.medication}
                onChange={(v) => setPrnForm((p) => ({ ...p, medication: v }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Dose"
                  value={safeStr(prnForm.dose)}
                  onChange={(v) => setPrnForm((p) => ({ ...p, dose: v }))}
                />
                <Field
                  label="Route"
                  value={safeStr(prnForm.route)}
                  onChange={(v) => setPrnForm((p) => ({ ...p, route: v }))}
                />
              </div>
              <Field
                label="Reason"
                value={safeStr(prnForm.reason)}
                onChange={(v) => setPrnForm((p) => ({ ...p, reason: v }))}
              />
              <Field
                label="Result/Response"
                value={safeStr(prnForm.result)}
                onChange={(v) => setPrnForm((p) => ({ ...p, result: v }))}
              />
              <FieldArea
                label="Notes"
                value={safeStr(prnForm.notes)}
                onChange={(v) => setPrnForm((p) => ({ ...p, notes: v }))}
                rows={3}
              />

              <button
                onClick={addPRN}
                className="rounded-2xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Add PRN
              </button>

              <div className="rounded-xl border border-bac-border bg-bac-bg p-3 text-xs text-bac-muted">
                Backend next: create endpoints to persist PRN and export to
                PDF/Excel.
              </div>
            </div>
          </div>

          {/* List */}
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-bac-text">PRN Log</h2>
            <p className="mt-1 text-xs text-bac-muted">
              Showing local entries for now (not saved).
            </p>

            <div className="mt-4 overflow-auto rounded-2xl border border-bac-border">
              <table className="w-full text-sm text-bac-text">
                <thead className="sticky top-0 bg-bac-bg text-xs text-bac-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-left">Medication</th>
                    <th className="px-3 py-2 text-left">Dose</th>
                    <th className="px-3 py-2 text-left">Route</th>
                    <th className="px-3 py-2 text-left">Reason</th>
                    <th className="px-3 py-2 text-left">Result</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prnRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-4 text-center text-bac-muted"
                      >
                        No PRN entries yet.
                      </td>
                    </tr>
                  ) : (
                    prnRows.map((r) => (
                      <tr key={r.id} className="border-t border-bac-border">
                        <td className="px-3 py-2">{r.date}</td>
                        <td className="px-3 py-2">{r.time}</td>
                        <td className="px-3 py-2 font-medium">
                          {r.medication}
                        </td>
                        <td className="px-3 py-2">{safeStr(r.dose)}</td>
                        <td className="px-3 py-2">{safeStr(r.route)}</td>
                        <td className="px-3 py-2">{safeStr(r.reason)}</td>
                        <td className="px-3 py-2">{safeStr(r.result)}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => deletePRN(r.id)}
                            className="rounded-xl border border-bac-border bg-bac-bg px-3 py-1 text-xs hover:opacity-90"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {prnRows.some((x) => safeStr(x.notes)) && (
              <div className="mt-3 rounded-2xl border border-bac-border bg-bac-bg p-3 text-xs text-bac-muted">
                Tip: notes are stored per entry but not displayed in the table
                yet.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          {/* Form */}
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-bac-text">Add Vitals</h2>
            <p className="mt-1 text-xs text-bac-muted">
              Individual:{" "}
              <span className="font-semibold text-bac-text">
                {selectedIndividualObj?.name || "-"}
              </span>
            </p>

            <div className="mt-4 grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Date"
                  value={vitalsForm.date}
                  onChange={(v) => setVitalsForm((p) => ({ ...p, date: v }))}
                  type="date"
                />
                <Field
                  label="Time"
                  value={vitalsForm.time}
                  onChange={(v) => setVitalsForm((p) => ({ ...p, time: v }))}
                  type="time"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Temp (°F)"
                  value={safeStr(vitalsForm.tempF)}
                  onChange={(v) => setVitalsForm((p) => ({ ...p, tempF: v }))}
                />
                <Field
                  label="Pulse"
                  value={safeStr(vitalsForm.pulse)}
                  onChange={(v) => setVitalsForm((p) => ({ ...p, pulse: v }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Resp"
                  value={safeStr(vitalsForm.resp)}
                  onChange={(v) => setVitalsForm((p) => ({ ...p, resp: v }))}
                />
                <Field
                  label="BP"
                  value={safeStr(vitalsForm.bp)}
                  onChange={(v) => setVitalsForm((p) => ({ ...p, bp: v }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="O2 Sat (%)"
                  value={safeStr(vitalsForm.o2)}
                  onChange={(v) => setVitalsForm((p) => ({ ...p, o2: v }))}
                />
                <Field
                  label="Pain (0-10)"
                  value={safeStr(vitalsForm.pain)}
                  onChange={(v) => setVitalsForm((p) => ({ ...p, pain: v }))}
                />
              </div>

              <FieldArea
                label="Notes"
                value={safeStr(vitalsForm.notes)}
                onChange={(v) => setVitalsForm((p) => ({ ...p, notes: v }))}
                rows={3}
              />

              <button
                onClick={addVitals}
                className="rounded-2xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Add Vitals
              </button>

              <div className="rounded-xl border border-bac-border bg-bac-bg p-3 text-xs text-bac-muted">
                Backend next: persist vitals per day/time and include in export.
              </div>
            </div>
          </div>

          {/* List */}
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-bac-text">Vitals Log</h2>
            <p className="mt-1 text-xs text-bac-muted">
              Showing local entries for now (not saved).
            </p>

            <div className="mt-4 overflow-auto rounded-2xl border border-bac-border">
              <table className="w-full text-sm text-bac-text">
                <thead className="sticky top-0 bg-bac-bg text-xs text-bac-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-left">Temp</th>
                    <th className="px-3 py-2 text-left">Pulse</th>
                    <th className="px-3 py-2 text-left">Resp</th>
                    <th className="px-3 py-2 text-left">BP</th>
                    <th className="px-3 py-2 text-left">O2</th>
                    <th className="px-3 py-2 text-left">Pain</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vitalsRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-3 py-4 text-center text-bac-muted"
                      >
                        No vitals entries yet.
                      </td>
                    </tr>
                  ) : (
                    vitalsRows.map((r) => (
                      <tr key={r.id} className="border-t border-bac-border">
                        <td className="px-3 py-2">{r.date}</td>
                        <td className="px-3 py-2">{r.time}</td>
                        <td className="px-3 py-2">{safeStr(r.tempF)}</td>
                        <td className="px-3 py-2">{safeStr(r.pulse)}</td>
                        <td className="px-3 py-2">{safeStr(r.resp)}</td>
                        <td className="px-3 py-2">{safeStr(r.bp)}</td>
                        <td className="px-3 py-2">{safeStr(r.o2)}</td>
                        <td className="px-3 py-2">{safeStr(r.pain)}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => deleteVitals(r.id)}
                            className="rounded-xl border border-bac-border bg-bac-bg px-3 py-1 text-xs hover:opacity-90"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {vitalsRows.some((x) => safeStr(x.notes)) && (
              <div className="mt-3 rounded-2xl border border-bac-border bg-bac-bg p-3 text-xs text-bac-muted">
                Tip: notes are stored per entry but not displayed in the table
                yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "date" | "time";
}) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
        {props.label}
      </label>
      <input
        type={props.type || "text"}
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
  rows?: number;
}) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
        {props.label}
      </label>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        rows={props.rows ?? 3}
        className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
      />
    </div>
  );
}

// web/app/medication/incidents/IncidentsClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type IndividualOption = {
  id: string;
  name: string;
  code?: string;
};

type IncidentType =
  | "MED_ERROR"
  | "ADVERSE_REACTION"
  | "REFUSAL"
  | "FALL"
  | "INJURY"
  | "BEHAVIOR"
  | "OTHER";

type Severity = "LOW" | "MEDIUM" | "HIGH";

type IncidentRow = {
  id: string;

  individualId: string;
  individualName: string;

  date: string; // yyyy-mm-dd
  time: string; // HH:mm (24h)
  type: IncidentType;
  severity: Severity;

  medicationName?: string; // optional (for med-related)
  description: string;
  actionTaken: string;

  reportedBy: string;
  notified: string; // e.g. Nurse/Physician/Family/Program Specialist
  followUpNeeded: boolean;

  createdAt: string; // ISO
};

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYYYYMMDD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toHHMM(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatDateMMDDYYYYFromYYYYMMDD(yyyyMMdd: string) {
  const raw = safeStr(yyyyMMdd);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const [y, m, d] = raw.split("-").map(Number);
  return `${pad2(m)}\/${pad2(d)}\/${y}`;
}

function monthLabel(monthValue: string) {
  if (!monthValue) return "";
  const [y, m] = monthValue.split("-");
  const dt = new Date(Number(y), Number(m) - 1, 1);
  return dt.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function uuid() {
  // good enough for local-only UI rows
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function IncidentsClient() {
  const [selectedIndividual, setSelectedIndividual] = useState<string>("");

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  });

  const [individualOptions, setIndividualOptions] = useState<
    IndividualOption[]
  >([]);
  const [loadingIndividuals, setLoadingIndividuals] = useState(false);
  const [individualError, setIndividualError] = useState<string | null>(null);

  // Tabs
  const [tab, setTab] = useState<"incidents" | "reports">("incidents");

  // Local rows (UI shell only)
  const [rows, setRows] = useState<IncidentRow[]>([]);

  // Form state (new incident)
  const now = useMemo(() => new Date(), []);
  const [date, setDate] = useState<string>(toYYYYMMDD(now));
  const [time, setTime] = useState<string>(toHHMM(now));
  const [type, setType] = useState<IncidentType>("MED_ERROR");
  const [severity, setSeverity] = useState<Severity>("LOW");

  const [medicationName, setMedicationName] = useState("");
  const [description, setDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [reportedBy, setReportedBy] = useState("");
  const [notified, setNotified] = useState("");
  const [followUpNeeded, setFollowUpNeeded] = useState(false);

  const selectedIndividualObj = useMemo(
    () => individualOptions.find((i) => i.id === selectedIndividual) || null,
    [individualOptions, selectedIndividual],
  );

  // Load Individuals (same endpoint pattern as other medication pages)
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

        if (!selectedIndividual && mapped.length) {
          setSelectedIndividual(mapped[0].id);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("[Incidents] loadIndividuals failed:", err);
        setIndividualError(err?.message ?? "Failed to load individuals.");
      } finally {
        setLoadingIndividuals(false);
      }
    };

    load();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived filtered rows by month + selected individual
  const filteredRows = useMemo(() => {
    const [yy, mm] = selectedMonth.split("-");
    const prefix = `${yy}-${mm}-`;
    return rows.filter((r) => {
      const okInd = selectedIndividual
        ? r.individualId === selectedIndividual
        : true;
      const okMonth = r.date.startsWith(prefix);
      return okInd && okMonth;
    });
  }, [rows, selectedMonth, selectedIndividual]);

  const resetForm = () => {
    const d = new Date();
    setDate(toYYYYMMDD(d));
    setTime(toHHMM(d));
    setType("MED_ERROR");
    setSeverity("LOW");
    setMedicationName("");
    setDescription("");
    setActionTaken("");
    setReportedBy("");
    setNotified("");
    setFollowUpNeeded(false);
  };

  const addIncident = () => {
    if (!selectedIndividualObj) {
      alert("Please select an individual.");
      return;
    }
    if (!date || !time) {
      alert("Date and time are required.");
      return;
    }
    if (!description.trim()) {
      alert("Description is required.");
      return;
    }
    if (!actionTaken.trim()) {
      alert("Action taken is required.");
      return;
    }

    const row: IncidentRow = {
      id: uuid(),
      individualId: selectedIndividualObj.id,
      individualName: selectedIndividualObj.name,

      date,
      time,
      type,
      severity,

      medicationName: medicationName.trim() || undefined,
      description: description.trim(),
      actionTaken: actionTaken.trim(),

      reportedBy: reportedBy.trim(),
      notified: notified.trim(),
      followUpNeeded,

      createdAt: new Date().toISOString(),
    };

    setRows((prev) => [row, ...prev]);
    resetForm();
  };

  const removeIncident = (id: string) => {
    setRows((prev) => prev.filter((x) => x.id !== id));
  };

  const exportFile = async (format: "pdf" | "excel") => {
    try {
      // backend will be implemented later; keep same pattern as other pages
      const payload = {
        month: selectedMonth,
        individualId: selectedIndividual,
        tab,
        items: filteredRows,
      };

      const res = await fetch(
        `/api/medication/incidents/export?format=${format}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
      console.error("[Incidents] export failed:", e);
      alert(
        `Export ${format.toUpperCase()} failed: ${String(e?.message || e)}\n\n` +
          `If you haven't implemented /api/medication/incidents/export yet, that's expected.`,
      );
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-bac-text">
            Incidents & Reports
          </h1>
          <p className="mt-1 text-sm text-bac-muted">
            Track medication-related incidents and general events. (UI shell now
            — backend will be wired later.)
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

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-bac-border bg-bac-panel p-4 text-sm shadow-sm">
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

        <div className="flex flex-1 flex-col gap-1 text-xs">
          {loadingIndividuals && (
            <span className="text-bac-muted">Loading individuals...</span>
          )}
          {individualError && !loadingIndividuals && (
            <span className="text-bac-red">{individualError}</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("incidents")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === "incidents"
              ? "bg-bac-primary text-white"
              : "border border-bac-border bg-bac-panel text-bac-text hover:bg-bac-bg"
          }`}
        >
          Incidents
        </button>
        <button
          type="button"
          onClick={() => setTab("reports")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === "reports"
              ? "bg-bac-primary text-white"
              : "border border-bac-border bg-bac-panel text-bac-text hover:bg-bac-bg"
          }`}
        >
          Reports
        </button>
      </div>

      <div className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-[420px_minmax(0,1fr)]">
        {/* Left: Add incident / report */}
        <div className="h-full overflow-auto rounded-2xl border border-bac-border bg-bac-panel p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-bac-text">
            {tab === "incidents" ? "Add Incident" : "Add Report Entry"}
          </h2>
          <p className="mt-1 text-xs text-bac-muted">
            Individual:{" "}
            <span className="font-semibold text-bac-text">
              {selectedIndividualObj?.name || "—"}
            </span>{" "}
            • Month:{" "}
            <span className="font-semibold text-bac-text">
              {monthLabel(selectedMonth)}
            </span>
          </p>

          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
                />
                <div className="mt-1 text-[11px] text-bac-muted">
                  Display:{" "}
                  <span className="font-semibold text-bac-text">
                    {date ? formatDateMMDDYYYYFromYYYYMMDD(date) : ""}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as IncidentType)}
                  className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
                >
                  <option value="MED_ERROR">Medication Error</option>
                  <option value="ADVERSE_REACTION">Adverse Reaction</option>
                  <option value="REFUSAL">Refusal</option>
                  <option value="FALL">Fall</option>
                  <option value="INJURY">Injury</option>
                  <option value="BEHAVIOR">Behavior</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                  Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as Severity)}
                  className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>

            <Field
              label="Medication (optional)"
              value={medicationName}
              onChange={setMedicationName}
              placeholder="Medication name if applicable"
            />

            <FieldArea
              label="Description (required)"
              value={description}
              onChange={setDescription}
              rows={4}
              placeholder="What happened?"
            />

            <FieldArea
              label="Action taken (required)"
              value={actionTaken}
              onChange={setActionTaken}
              rows={3}
              placeholder="What was done immediately?"
            />

            <div className="grid grid-cols-2 gap-2">
              <Field
                label="Reported by"
                value={reportedBy}
                onChange={setReportedBy}
                placeholder="DSP / Nurse / Office staff"
              />
              <Field
                label="Notified"
                value={notified}
                onChange={setNotified}
                placeholder="Physician / Family / Supervisor"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-bac-text">
              <input
                type="checkbox"
                checked={followUpNeeded}
                onChange={(e) => setFollowUpNeeded(e.target.checked)}
              />
              Follow-up needed
            </label>

            <button
              type="button"
              onClick={addIncident}
              className="mt-2 rounded-2xl bg-bac-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
            >
              Add {tab === "incidents" ? "Incident" : "Report Entry"}
            </button>

            <div className="rounded-xl border border-bac-border bg-bac-bg p-3 text-xs text-bac-muted">
              <div className="font-semibold text-bac-text">
                Next step (backend)
              </div>
              <div className="mt-1">
                Implement{" "}
                <span className="font-mono">
                  POST /api/medication/incidents
                </span>{" "}
                and{" "}
                <span className="font-mono">
                  POST /api/medication/incidents/export
                </span>{" "}
                to persist + export monthly incident logs for audit.
              </div>
            </div>
          </div>
        </div>

        {/* Right: Log */}
        <div className="h-full overflow-auto rounded-2xl border border-bac-border bg-bac-panel p-4 shadow-sm">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-bac-text">
                {tab === "incidents" ? "Incident Log" : "Reports Log"}
              </h2>
              <p className="mt-1 text-xs text-bac-muted">
                Showing local entries for now (not saved).
              </p>
            </div>
            <div className="text-xs text-bac-muted">
              Rows:{" "}
              <span className="font-semibold text-bac-text">
                {filteredRows.length}
              </span>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-bac-border bg-bac-bg">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="border-b border-bac-border text-bac-muted">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">
                    Time
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">
                    Type
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">
                    Severity
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">
                    Medication
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">
                    Description
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">
                    Action
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">
                    Follow-up
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-3 py-6 text-center text-sm text-bac-muted"
                    >
                      No entries yet for this month.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => (
                    <tr key={r.id} className="border-t border-bac-border">
                      <td className="px-3 py-2 text-bac-text">
                        {formatDateMMDDYYYYFromYYYYMMDD(r.date)}
                      </td>
                      <td className="px-3 py-2 text-bac-text">{r.time}</td>
                      <td className="px-3 py-2 text-bac-text">{r.type}</td>
                      <td className="px-3 py-2 text-bac-text">{r.severity}</td>
                      <td className="px-3 py-2 text-bac-text">
                        {r.medicationName || "—"}
                      </td>
                      <td className="px-3 py-2 text-bac-text">
                        <div className="max-w-[260px] whitespace-pre-wrap">
                          {r.description}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-bac-text">
                        <div className="max-w-[240px] whitespace-pre-wrap">
                          {r.actionTaken}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-bac-text">
                        {r.followUpNeeded ? "Yes" : "No"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeIncident(r.id)}
                          className="rounded-xl border border-bac-border bg-bac-panel px-3 py-1.5 text-xs font-medium text-bac-text hover:bg-bac-bg"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-bac-muted">
            Tip: Later we can add filters (Type/Severity) and “print-ready”
            export layout for PA audit.
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
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
        {props.label}
      </label>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
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
  placeholder?: string;
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
        placeholder={props.placeholder}
        className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
      />
    </div>
  );
}

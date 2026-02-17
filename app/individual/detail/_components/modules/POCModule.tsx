"use client";

import React, { useEffect, useMemo, useState } from "react";

type PocDutyRow = {
  category: string;
  taskNo: number;
  duty: string;
  minutes: string; // input text
  asNeeded: boolean;
  timesWeekMin: string;
  timesWeekMax: string;
  days: {
    sun: boolean;
    mon: boolean;
    tue: boolean;
    wed: boolean;
    thu: boolean;
    fri: boolean;
    sat: boolean;
  };
  instruction: string;
};

type POCItem = {
  id: string;
  pocNumber: string;
  startDate: string;
  stopDate?: string | null;
  shift: string;
  note?: string | null;
  createdBy?: string | null;
  createdAt: string;
  duties?: any[];
};

const SHIFT_OPTIONS = ["All", "Day", "Evening", "Night"];

// Default duty catalog (from your screenshots; includes the “extra 3” near bottom as well)
const DUTY_CATALOG: Array<{ category: string; taskNo: number; duty: string }> = [
  { category: "Precautions", taskNo: 0, duty: "In Home / Community Support" },
  { category: "Activities", taskNo: 1, duty: "Community Participation" },
  { category: "General Duties", taskNo: 2, duty: "Budgeting" },
  { category: "General Duties", taskNo: 3, duty: "Assist with Cooking" },
  {
    category: "Med Related HC",
    taskNo: 4,
    duty: "Medication reminder / refilling / assist with medication admin.",
  },
  {
    category: "Patient Support Activities",
    taskNo: 5,
    duty: "Exercise (did the individual participating in exercising)",
  },
  { category: "Special Needs", taskNo: 6, duty: "Safety" },

  // Personal Care 100-115
  { category: "Personal Care", taskNo: 100, duty: "Bath-Tub" },
  { category: "Personal Care", taskNo: 101, duty: "Bath-Shower" },
  { category: "Personal Care", taskNo: 102, duty: "Bath-Bed" },
  { category: "Personal Care", taskNo: 103, duty: "Patient Requires Total Care" },
  { category: "Personal Care", taskNo: 104, duty: "Mouth Care / Denture Care" },
  { category: "Personal Care", taskNo: 105, duty: "Hair Care - Comb" },
  { category: "Personal Care", taskNo: 106, duty: "Hair Care - Shampoo" },
  { category: "Personal Care", taskNo: 107, duty: "Grooming - Shave" },
  { category: "Personal Care", taskNo: 108, duty: "Grooming - Nails" },
  { category: "Personal Care", taskNo: 109, duty: "Dressing" },
  { category: "Personal Care", taskNo: 110, duty: "Skin Care" },
  { category: "Personal Care", taskNo: 111, duty: "Foot Care" },
  { category: "Personal Care", taskNo: 112, duty: "Toileting - Diaper" },
  { category: "Personal Care", taskNo: 113, duty: "Toileting - Commode" },
  { category: "Personal Care", taskNo: 114, duty: "Toileting - Bedpan/Urinal" },
  { category: "Personal Care", taskNo: 115, duty: "Toileting - Toilet" },

  // Nutrition 200+
  { category: "Nutrition", taskNo: 200, duty: "Patient is on a prescribed diet" },
  { category: "Nutrition", taskNo: 201, duty: "Prepare - Breakfast" },
  { category: "Nutrition", taskNo: 202, duty: "Prepare - Lunch" },
  { category: "Nutrition", taskNo: 203, duty: "Prepare - Dinner" },
  { category: "Nutrition", taskNo: 204, duty: "Prepare - Snack" },
  { category: "Nutrition", taskNo: 205, duty: "Assist with feeding" },
  { category: "Nutrition", taskNo: 206, duty: "Record intake - Food" },
  { category: "Nutrition", taskNo: 207, duty: "Record intake - Fluid" },

  // Activity 300+
  { category: "Activity", taskNo: 300, duty: "Transferring" },
  { category: "Activity", taskNo: 301, duty: "Assist with walking" },
  { category: "Activity", taskNo: 302, duty: "Patient walks with assistive devices" },
  { category: "Activity", taskNo: 303, duty: "Assist with home exercise program" },
  { category: "Activity", taskNo: 304, duty: "Range of Motion Exercises" },
  { category: "Activity", taskNo: 305, duty: "Turning and positioning (At least Q2)" },

  // Treatment/Special Needs 400+
  { category: "Treatment / Special Needs", taskNo: 400, duty: "Take Temperature" },
  { category: "Treatment / Special Needs", taskNo: 401, duty: "Take Pulse" },
  { category: "Treatment / Special Needs", taskNo: 402, duty: "Take Blood Pressure" },
  { category: "Treatment / Special Needs", taskNo: 403, duty: "Weigh Patient" },
  { category: "Treatment / Special Needs", taskNo: 404, duty: "Take respirations" },
  { category: "Treatment / Special Needs", taskNo: 405, duty: "Record Output (Urine/BM)" },
  { category: "Treatment / Special Needs", taskNo: 406, duty: "Assist with catheter care" },
  { category: "Treatment / Special Needs", taskNo: 407, duty: "Empty foley bag" },
  { category: "Treatment / Special Needs", taskNo: 408, duty: "Assist with ostomy care" },
  { category: "Treatment / Special Needs", taskNo: 409, duty: "Remind to take medication" },
  { category: "Treatment / Special Needs", taskNo: 410, duty: "Assist with Treatment" },

  // Patient Support Activities 500+
  { category: "Patient Support Activities", taskNo: 500, duty: "Change bed linen" },
  { category: "Patient Support Activities", taskNo: 501, duty: "Patient Laundry" },
  { category: "Patient Support Activities", taskNo: 502, duty: "Light Housekeeping" },
  { category: "Patient Support Activities", taskNo: 503, duty: "Clean Patient Care Equipment" },
  { category: "Patient Support Activities", taskNo: 504, duty: "Do Patient shopping and errands" },
  { category: "Patient Support Activities", taskNo: 505, duty: "Accompany Patient to medical appointment" },
  { category: "Patient Support Activities", taskNo: 506, duty: "Diversional Activities - Speak/Read" },

  // ✅ extra bottom rows
  { category: "Patient Support Activities", taskNo: 507, duty: "Monitor Patient Safety" },
  { category: "Precautions", taskNo: 999, duty: "Companion Support" },
];

function yyyyMmDd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatMmDdYyyy(isoOrDate: string): string {
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear());
  return `${mm}/${dd}/${yy}`;
}

function emptyDays() {
  return {
    sun: false,
    mon: false,
    tue: false,
    wed: false,
    thu: false,
    fri: false,
    sat: false,
  };
}

function parseIndividualLabel(label: string): { patientName: string; admissionId: string } {
  const raw = String(label || "").trim();
  if (!raw || raw === "—" || raw.toLowerCase().includes("no individual")) {
    return { patientName: "—", admissionId: "—" };
  }

  // Expected: "NAME (CODE)"
  const m = raw.match(/^(.*)\s+\(([^)]+)\)\s*$/);
  if (m) {
    const name = (m[1] || "").trim() || raw;
    const code = (m[2] || "").trim() || "—";
    return { patientName: name, admissionId: code };
  }

  return { patientName: raw, admissionId: "—" };
}

function random3Digits(): string {
  return String(Math.floor(Math.random() * 1000)).padStart(3, "0");
}

function generatePocNumber(): string {
  const yyyy = String(new Date().getFullYear());
  return `${yyyy}${random3Digits()}`; // 7 digits: yyyy + 3 digits
}

export default function POCModule({
  individualId,
  individualLabel,
}: {
  individualId: string;
  individualLabel: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<POCItem[]>([]);

  // Modal state
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [maximized, setMaximized] = useState(false);

  const [pocNumber, setPocNumber] = useState("");
  const [startDate, setStartDate] = useState(yyyyMmDd(new Date()));
  const [stopDate, setStopDate] = useState<string>("");
  const [shift, setShift] = useState("All");
  const [note, setNote] = useState("");

  const { patientName, admissionId } = useMemo(() => parseIndividualLabel(individualLabel), [individualLabel]);

  const [rows, setRows] = useState<PocDutyRow[]>(() =>
    DUTY_CATALOG.map((x) => ({
      category: x.category,
      taskNo: x.taskNo,
      duty: x.duty,
      minutes: "",
      asNeeded: false,
      timesWeekMin: "",
      timesWeekMax: "",
      days: emptyDays(),
      instruction: "",
    }))
  );

  const load = async () => {
    if (!individualId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/poc?individualId=${encodeURIComponent(individualId)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e: any) {
      console.error("Load POC failed:", e);
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [individualId]);

  const createdAtLabel = (x: POCItem) => formatMmDdYyyy(x.createdAt);
  const startLabel = (x: POCItem) => formatMmDdYyyy(x.startDate);
  const stopLabel = (x: POCItem) => (x.stopDate ? formatMmDdYyyy(x.stopDate) : "");

  const resetModal = () => {
    setPocNumber(generatePocNumber());
    setStartDate(yyyyMmDd(new Date()));
    setStopDate("");
    setShift("All");
    setNote("");
    setRows(
      DUTY_CATALOG.map((x) => ({
        category: x.category,
        taskNo: x.taskNo,
        duty: x.duty,
        minutes: "",
        asNeeded: false,
        timesWeekMin: "",
        timesWeekMax: "",
        days: emptyDays(),
        instruction: "",
      }))
    );
  };

  const openAdd = () => {
    resetModal();
    setMaximized(false);
    setOpen(true);
  };

  const close = () => setOpen(false);

  const updateRow = (idx: number, patch: Partial<PocDutyRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const toggleDay = (idx: number, key: keyof PocDutyRow["days"]) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        return { ...r, days: { ...r.days, [key]: !r.days[key] } };
      })
    );
  };

  const postCreate = async (payload: any) => {
    const res = await fetch("/api/poc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
    return data;
  };

  const onSave = async () => {
    if (!individualId) return;

    if (!startDate) {
      alert("Start Date is required.");
      return;
    }
    if (note.length > 8000) {
      alert("Notes must be <= 8000 characters.");
      return;
    }

    try {
      setSaving(true);

      const dutiesPayload = rows.map((r, idx) => ({
        category: r.category,
        taskNo: r.taskNo,
        duty: r.duty,
        minutes: r.minutes ? Number(r.minutes) : null,
        asNeeded: r.asNeeded,
        timesWeekMin: r.timesWeekMin ? Number(r.timesWeekMin) : null,
        timesWeekMax: r.timesWeekMax ? Number(r.timesWeekMax) : null,
        daysOfWeek: r.days,
        instruction: r.instruction ? r.instruction : null,
        sortOrder: idx,
      }));

      // Try up to 8 times in case of duplicate pocNumber (DB unique constraint recommended)
      let lastErr: any = null;
      for (let attempt = 0; attempt < 8; attempt++) {
        const nextNumber = attempt === 0 ? pocNumber : generatePocNumber();
        try {
          await postCreate({
            individualId,
            pocNumber: nextNumber,
            startDate,
            stopDate: stopDate ? stopDate : null,
            shift,
            note: note ? note : null,
            createdBy: "office", // later can be replaced by your auth user
            duties: dutiesPayload,
          });
          setPocNumber(nextNumber);
          lastErr = null;
          break;
        } catch (e: any) {
          lastErr = e;
          // If duplicate, regenerate and retry. Otherwise stop.
          const msg = String(e?.message || "");
          if (msg.includes("duplicate") || msg.includes("Unique") || msg.includes("P2002") || msg.includes("409")) {
            continue;
          }
          throw e;
        }
      }
      if (lastErr) throw lastErr;

      setOpen(false);
      await load();
    } catch (e: any) {
      console.error("Create POC failed:", e);
      alert(`Save failed: ${String(e?.message || e)}`);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this POC?")) return;
    try {
      const res = await fetch(`/api/poc/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      await load();
    } catch (e: any) {
      console.error("Delete POC failed:", e);
      alert(`Delete failed: ${String(e?.message || e)}`);
    }
  };

  const notesCount = useMemo(() => note.length, [note]);

  return (
    <div className="w-full max-w-none rounded-2xl border border-bac-border bg-bac-panel/30 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-semibold text-bac-text">Plan of Care (POC)</div>
          <div className="mt-1 text-sm text-bac-muted">
            Selected Individual: <span className="text-bac-text">{individualLabel || "—"}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Add POC
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-bac-border bg-bac-panel/40">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-bac-panel">
              <tr className="text-left text-yellow-200">
                <th className="px-3 py-2">POC Number</th>
                <th className="px-3 py-2">Start Date</th>
                <th className="px-3 py-2">Stop Date</th>
                <th className="px-3 py-2">POC Note</th>
                <th className="px-3 py-2">Shift</th>
                <th className="px-3 py-2">Created By</th>
                <th className="px-3 py-2">Created Date</th>
                <th className="px-3 py-2">Print</th>
                <th className="px-3 py-2">Actions</th>
                <th className="px-3 py-2">Delete</th>
              </tr>
            </thead>
            <tbody className="text-bac-text">
              {loading ? (
                <tr>
                  <td className="px-3 py-3 text-bac-muted" colSpan={10}>
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-3 py-3 text-red-300" colSpan={10}>
                    Failed to load: {error}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-bac-muted" colSpan={10}>
                    No POC records.
                  </td>
                </tr>
              ) : (
                items.map((x) => (
                  <tr key={x.id} className="border-t border-bac-border/60">
                    <td className="px-3 py-2 font-semibold">{x.pocNumber}</td>
                    <td className="px-3 py-2">{startLabel(x)}</td>
                    <td className="px-3 py-2">{stopLabel(x)}</td>
                    <td className="px-3 py-2">{x.note || ""}</td>
                    <td className="px-3 py-2">{x.shift}</td>
                    <td className="px-3 py-2">{x.createdBy || ""}</td>
                    <td className="px-3 py-2">{createdAtLabel(x)}</td>
                    <td className="px-3 py-2 text-bac-muted">—</td>
                    <td className="px-3 py-2 text-bac-muted">—</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => onDelete(x.id)}
                        className="rounded-lg border border-bac-border bg-bac-panel px-2 py-1 text-xs text-red-300 hover:bg-bac-panel/70"
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
      </div>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2">
          <div
            className={[
              "rounded-2xl border border-bac-border bg-bac-panel text-bac-text shadow-xl",
              maximized ? "fixed inset-2 w-auto max-w-none" : "w-full max-w-[1200px]",
            ].join(" ")}
          >
            <div className="flex items-center justify-between border-b border-bac-border px-5 py-4">
              <div className="text-lg font-semibold">New POC</div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMaximized((v) => !v)}
                  className="rounded-lg border border-bac-border bg-bac-panel px-3 py-1 text-sm hover:bg-bac-panel/70"
                >
                  {maximized ? "Restore" : "Maximize"}
                </button>

                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg border border-bac-border bg-bac-panel px-3 py-1 text-sm hover:bg-bac-panel/70"
                >
                  X
                </button>
              </div>
            </div>

            {/* ✅ scroll Y + scroll X for whole modal */}
            <div className={maximized ? "h-[calc(100vh-110px)]" : "max-h-[75vh]"}>
              <div className="h-full overflow-y-auto overflow-x-auto px-5 py-4">
                {/* Header fields */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 min-w-[1100px]">
                  <div className="rounded-xl border border-bac-border bg-bac-panel/40 p-3">
                    <div className="text-xs text-bac-muted">Patient Name:</div>
                    <div className="mt-1 text-sm font-semibold">{patientName}</div>
                  </div>

                  <div className="rounded-xl border border-bac-border bg-bac-panel/40 p-3">
                    <div className="text-xs text-bac-muted">Admission ID:</div>
                    <div className="mt-1 text-sm font-semibold">{admissionId}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-bac-muted">
                        Start Date <span className="text-red-300">*</span>
                      </div>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-bac-muted">Stop Date</div>
                      <input
                        type="date"
                        value={stopDate}
                        onChange={(e) => setStopDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3 min-w-[1100px]">
                  <div>
                    <div className="text-xs text-bac-muted">POC Number</div>
                    <input
                      value={pocNumber}
                      readOnly
                      className="mt-1 w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm outline-none opacity-90"
                    />
                    <div className="mt-1 text-[11px] text-bac-muted">
                      Auto-generated (yyyy + 3 random digits). Unique enforced by DB.
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-bac-muted">Shift</div>
                    <select
                      value={shift}
                      onChange={(e) => setShift(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                    >
                      {SHIFT_OPTIONS.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-xs text-bac-muted lg:text-right">Notes limit: 8000 characters</div>
                </div>

                <div className="mt-3 min-w-[1100px]">
                  <div className="text-xs text-bac-muted">Notes</div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                  />
                  <div className="mt-1 text-xs text-bac-muted">{notesCount}/8000</div>
                </div>

                {/* Duties table */}
                <div className="mt-4 min-w-[1100px]">
                  <div className="text-sm font-semibold text-bac-text">Duties</div>

                  <div className="mt-2 overflow-x-auto rounded-xl border border-bac-border">
                    {/* ✅ give the table enough width so horizontal scroll appears */}
                    <table className="w-full min-w-[1600px] text-xs">
                      <thead className="bg-bac-panel">
                        <tr className="text-left text-yellow-200">
                          <th className="px-2 py-2 w-[160px]">Category</th>
                          <th className="px-2 py-2 w-[70px]">Task #</th>
                          <th className="px-2 py-2 w-[430px]">Duty</th>
                          <th className="px-2 py-2 w-[110px]">Minutes</th>
                          <th className="px-2 py-2 w-[110px]">As Needed</th>
                          <th className="px-2 py-2 w-[220px]">Times a Week (Min)-(Max)</th>
                          {/* ✅ wider Days column */}
                          <th className="px-2 py-2 w-[260px]">Days Of Week</th>
                          <th className="px-2 py-2 w-[380px]">Instruction</th>
                        </tr>
                      </thead>

                      <tbody className="text-bac-text">
                        {rows.map((r, idx) => (
                          <tr key={`${r.taskNo}-${idx}`} className="border-t border-bac-border/60">
                            <td className="px-2 py-2 align-top">{r.category}</td>
                            <td className="px-2 py-2 align-top">{r.taskNo}</td>
                            <td className="px-2 py-2 align-top">{r.duty}</td>

                            <td className="px-2 py-2 align-top">
                              <input
                                value={r.minutes}
                                onChange={(e) => updateRow(idx, { minutes: e.target.value })}
                                className="w-[90px] rounded-lg border border-bac-border bg-bac-panel px-2 py-1 outline-none"
                              />
                            </td>

                            <td className="px-2 py-2 align-top">
                              <input
                                type="checkbox"
                                checked={r.asNeeded}
                                onChange={() => updateRow(idx, { asNeeded: !r.asNeeded })}
                              />
                            </td>

                            <td className="px-2 py-2 align-top">
                              <div className="flex items-center gap-2">
                                <input
                                  value={r.timesWeekMin}
                                  onChange={(e) => updateRow(idx, { timesWeekMin: e.target.value })}
                                  className="w-[70px] rounded-lg border border-bac-border bg-bac-panel px-2 py-1 outline-none"
                                />
                                <span className="text-bac-muted">-</span>
                                <input
                                  value={r.timesWeekMax}
                                  onChange={(e) => updateRow(idx, { timesWeekMax: e.target.value })}
                                  className="w-[70px] rounded-lg border border-bac-border bg-bac-panel px-2 py-1 outline-none"
                                />
                              </div>
                            </td>

                            <td className="px-2 py-2 align-top">
                              {/* ✅ no wrap, single row */}
                              <div className="flex items-center gap-3 whitespace-nowrap">
                                {(
                                  [
                                    ["sun", "S"],
                                    ["mon", "M"],
                                    ["tue", "T"],
                                    ["wed", "W"],
                                    ["thu", "T"],
                                    ["fri", "F"],
                                    ["sat", "S"],
                                  ] as const
                                ).map(([k, label]) => (
                                  <label key={k} className="inline-flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={r.days[k]}
                                      onChange={() => toggleDay(idx, k)}
                                    />
                                    <span className="text-bac-muted">{label}</span>
                                  </label>
                                ))}
                              </div>
                            </td>

                            <td className="px-2 py-2 align-top">
                              <textarea
                                value={r.instruction}
                                onChange={(e) => updateRow(idx, { instruction: e.target.value })}
                                rows={2}
                                className="w-[360px] rounded-lg border border-bac-border bg-bac-panel px-2 py-1 outline-none"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={close}
                      className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-bac-panel/70"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={onSave}
                      disabled={saving}
                      className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>

                {/* ✅ gives a clear bottom space so the horizontal scrollbar is easy to grab */}
                <div className="h-3" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

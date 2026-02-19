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
  id: string; // normalized id (id/pocId/pocid)
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

  { category: "Nutrition", taskNo: 200, duty: "Patient is on a prescribed diet" },
  { category: "Nutrition", taskNo: 201, duty: "Prepare - Breakfast" },
  { category: "Nutrition", taskNo: 202, duty: "Prepare - Lunch" },
  { category: "Nutrition", taskNo: 203, duty: "Prepare - Dinner" },
  { category: "Nutrition", taskNo: 204, duty: "Prepare - Snack" },
  { category: "Nutrition", taskNo: 205, duty: "Assist with feeding" },
  { category: "Nutrition", taskNo: 206, duty: "Record intake - Food" },
  { category: "Nutrition", taskNo: 207, duty: "Record intake - Fluid" },

  { category: "Activity", taskNo: 300, duty: "Transferring" },
  { category: "Activity", taskNo: 301, duty: "Assist with walking" },
  { category: "Activity", taskNo: 302, duty: "Patient walks with assistive devices" },
  { category: "Activity", taskNo: 303, duty: "Assist with home exercise program" },
  { category: "Activity", taskNo: 304, duty: "Range of Motion Exercises" },
  { category: "Activity", taskNo: 305, duty: "Turning and positioning (At least Q2)" },

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

  { category: "Patient Support Activities", taskNo: 500, duty: "Change bed linen" },
  { category: "Patient Support Activities", taskNo: 501, duty: "Patient Laundry" },
  { category: "Patient Support Activities", taskNo: 502, duty: "Light Housekeeping" },
  { category: "Patient Support Activities", taskNo: 503, duty: "Clean Patient Care Equipment" },
  { category: "Patient Support Activities", taskNo: 504, duty: "Do Patient shopping and errands" },
  { category: "Patient Support Activities", taskNo: 505, duty: "Accompany Patient to medical appointment" },
  { category: "Patient Support Activities", taskNo: 506, duty: "Diversional Activities - Speak/Read" },
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

function toInputDate(iso: any): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return yyyyMmDd(d);
}

function emptyDays() {
  return { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false };
}

// Extract name + code from "NAME (CODE)"
function parseIndividualLabel(label: string): { name: string; code: string } {
  const raw = (label || "").trim();
  const m = raw.match(/^(.*)\s*\(([^)]+)\)\s*$/);
  if (!m) return { name: raw || "—", code: "" };
  return { name: (m[1] || "").trim() || "—", code: (m[2] || "").trim() };
}

function rand3(): string {
  const n = Math.floor(Math.random() * 1000);
  return String(n).padStart(3, "0");
}

function makePocNumber(): string {
  const year = String(new Date().getFullYear());
  return `${year}${rand3()}`; // 7 digits
}

function normalizeDays(d: any) {
  const base = emptyDays();
  if (!d || typeof d !== "object") return base;
  return {
    sun: Boolean(d.sun),
    mon: Boolean(d.mon),
    tue: Boolean(d.tue),
    wed: Boolean(d.wed),
    thu: Boolean(d.thu),
    fri: Boolean(d.fri),
    sat: Boolean(d.sat),
  };
}

function buildEmptyRows(): PocDutyRow[] {
  return DUTY_CATALOG.map((x) => ({
    category: x.category,
    taskNo: x.taskNo,
    duty: x.duty,
    minutes: "",
    asNeeded: false,
    timesWeekMin: "",
    timesWeekMax: "",
    days: emptyDays(),
    instruction: "",
  }));
}

/** Normalize API item -> always has .id */
function normalizePocItem(x: any): POCItem {
  const rawId = x?.id ?? x?.pocId ?? x?.pocid ?? x?.POCID ?? x?.pocID ?? "";
  const id = String(rawId ?? "").trim();

  const duties = x?.duties ?? x?.pocDuties ?? x?.pocDuty ?? x?.PocDuty ?? [];

  return {
    id,
    pocNumber: String(x?.pocNumber ?? x?.pocnumber ?? x?.poc_no ?? x?.pocNo ?? ""),
    startDate: String(x?.startDate ?? x?.startdate ?? ""),
    stopDate: x?.stopDate ?? x?.stopdate ?? null,
    shift: String(x?.shift ?? "All"),
    note: x?.note ?? null,
    createdBy: x?.createdBy ?? x?.createdby ?? null,
    createdAt: String(x?.createdAt ?? x?.createdat ?? x?.createdDate ?? x?.createddate ?? x?.created_on ?? ""),
    duties: Array.isArray(duties) ? duties : [],
  };
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

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [maximized, setMaximized] = useState(false);

  // Edit mode
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string>("");

  // Patient Name + Admission ID
  const parsed = useMemo(() => parseIndividualLabel(individualLabel || ""), [individualLabel]);
  const patientName = parsed.name || "—";
  const admissionId = parsed.code || "—";

  // POC auto number
  const [pocNumber, setPocNumber] = useState("");

  const [startDate, setStartDate] = useState(yyyyMmDd(new Date()));
  const [stopDate, setStopDate] = useState<string>("");
  const [shift, setShift] = useState("All");
  const [note, setNote] = useState("");

  const [scrollKey, setScrollKey] = useState(0);
  const tableScrollId = useMemo(() => `poc-table-scroll-${scrollKey}`, [scrollKey]);
  const bottomScrollId = useMemo(() => `poc-bottom-scroll-${scrollKey}`, [scrollKey]);

  const [rows, setRows] = useState<PocDutyRow[]>(() => buildEmptyRows());

  const load = async () => {
    if (!individualId) return;
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/poc?individualId=${encodeURIComponent(individualId)}`, {
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      const rawItems = Array.isArray(data?.items) ? data.items : [];
      const normalized = rawItems.map(normalizePocItem);

      const missing = normalized.find((x) => !x.id);
      if (missing) {
        console.warn("POC item missing id. Raw item:", missing);
        throw new Error("POC records returned without id/pocId. Please check API/Prisma mapping.");
      }

      setItems(normalized);
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

  const createdAtLabel = (x: POCItem) => (x.createdAt ? formatMmDdYyyy(x.createdAt) : "");
  const startLabel = (x: POCItem) => (x.startDate ? formatMmDdYyyy(x.startDate) : "");
  const stopLabel = (x: POCItem) => (x.stopDate ? formatMmDdYyyy(String(x.stopDate)) : "");

  const resetModal = () => {
    setMode("create");
    setEditingId("");

    setStartDate(yyyyMmDd(new Date()));
    setStopDate("");
    setShift("All");
    setNote("");
    setRows(buildEmptyRows());

    setPocNumber(makePocNumber());

    setMaximized(false);
    setScrollKey((n) => n + 1);
  };

  const openAdd = () => {
    resetModal();
    setOpen(true);
  };

  const openEdit = (poc: POCItem) => {
    const id = String(poc?.id || "").trim();
    if (!id) {
      alert("Cannot edit: missing POC id (id/pocId). Please check API response.");
      return;
    }

    const base = buildEmptyRows();
    const byTask = new Map<number, any>();
    (poc?.duties || []).forEach((d: any) => {
      const t = Number(d?.taskNo ?? d?.taskno);
      if (!Number.isNaN(t)) byTask.set(t, d);
    });

    const merged = base.map((r) => {
      const d = byTask.get(r.taskNo);
      if (!d) return r;
      return {
        ...r,
        minutes: d.minutes === null || d.minutes === undefined ? "" : String(d.minutes),
        asNeeded: Boolean(d.asNeeded ?? d.asneeded),
        timesWeekMin: d.timesWeekMin === null || d.timesWeekMin === undefined ? "" : String(d.timesWeekMin),
        timesWeekMax: d.timesWeekMax === null || d.timesWeekMax === undefined ? "" : String(d.timesWeekMax),
        days: normalizeDays(d.daysOfWeek ?? d.daysofweek),
        instruction: d.instruction ? String(d.instruction) : "",
      };
    });

    setMode("edit");
    setEditingId(id);

    setPocNumber(String(poc.pocNumber || ""));
    setStartDate(toInputDate(poc.startDate));
    setStopDate(toInputDate(poc.stopDate));
    setShift(String(poc.shift || "All"));
    setNote(String(poc.note || ""));
    setRows(merged);

    setOpen(true);
    setMaximized(false);
    setScrollKey((n) => n + 1);
  };

  const close = () => {
    setOpen(false);
    setMaximized(false);
    setScrollKey((n) => n + 1);
  };

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

  function isDuplicatePocNumberError(e: any): boolean {
    const msg = String(e?.message || e || "").toLowerCase();
    return msg.includes("unique") || msg.includes("duplicate") || msg.includes("pocnumber");
  }

  const dutiesPayload = useMemo(() => {
    return rows.map((r, idx) => ({
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
  }, [rows]);

  const postCreate = async (pocNo: string) => {
    const res = await fetch("/api/poc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        individualId,
        pocNumber: pocNo,
        startDate,
        stopDate: stopDate ? stopDate : null,
        shift,
        note: note ? note : null,
        createdBy: "office",
        duties: dutiesPayload,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  };

  const patchUpdate = async (id: string) => {
    const safeId = String(id || "").trim();
    if (!safeId) throw new Error("Missing id");

    const res = await fetch(`/api/poc/${encodeURIComponent(safeId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate,
        stopDate: stopDate ? stopDate : null,
        shift,
        note: note ? note : null,
        duties: dutiesPayload,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
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

      if (mode === "edit") {
        const id = String(editingId || "").trim();
        if (!id) throw new Error("Missing id");
        await patchUpdate(id);
        setOpen(false);
        setMaximized(false);
        await load();
        return;
      }

      let pocNo = (pocNumber || "").trim();
      if (!pocNo) pocNo = makePocNumber();

      const tried = new Set<string>();
      for (let attempt = 1; attempt <= 7; attempt++) {
        tried.add(pocNo);
        try {
          await postCreate(pocNo);
          setOpen(false);
          setMaximized(false);
          await load();
          return;
        } catch (err: any) {
          if (isDuplicatePocNumberError(err)) {
            let next = makePocNumber();
            let guard = 0;
            while (tried.has(next) && guard < 30) {
              next = makePocNumber();
              guard++;
            }
            pocNo = next;
            setPocNumber(pocNo);
            continue;
          }
          throw err;
        }
      }

      alert("Save failed: Could not generate a unique POC Number. Please try again.");
    } catch (e: any) {
      console.error("Save POC failed:", e);
      alert(`Save failed: ${String(e?.message || e)}`);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    const safeId = String(id || "").trim();
    if (!safeId) {
      alert("Delete failed: Missing id");
      return;
    }
    if (!confirm("Delete this POC?")) return;
    try {
      const res = await fetch(`/api/poc/${encodeURIComponent(safeId)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      await load();
    } catch (e: any) {
      console.error("Delete POC failed:", e);
      alert(`Delete failed: ${String(e?.message || e)}`);
    }
  };

  // Print action: open print-friendly page (then Ctrl+P -> Save as PDF)
  const onPrint = (id: string) => {
    const safeId = String(id || "").trim();
    if (!safeId) {
      alert("Print failed: Missing id");
      return;
    }
    window.open(`/api/poc/${encodeURIComponent(safeId)}/print`, "_blank", "noopener,noreferrer");
  };

  // ✅ NEW: Daily Logs action (open list page pre-filtered by POC + Individual)
  const onDailyLogs = (poc: POCItem) => {
    const pocId = String(poc?.id || "").trim();
    if (!pocId) {
      alert("Daily Logs failed: Missing POC id");
      return;
    }
    const q = new URLSearchParams();
    q.set("individualId", individualId);
    q.set("pocId", pocId);
    if (poc.pocNumber) q.set("pocNumber", String(poc.pocNumber));
    if (poc.startDate) q.set("pocStart", String(poc.startDate));
    if (poc.stopDate) q.set("pocStop", String(poc.stopDate || ""));
    window.open(`/poc/daily-logs?${q.toString()}`, "_blank", "noopener,noreferrer");
  };

  const [openMenuId, setOpenMenuId] = useState<string>("");

  const onUploadDocument = (id: string) => {
    alert(`Upload Document (coming soon). POC ID: ${id}`);
    setOpenMenuId("");
  };

  const onViewHistory = (id: string) => {
    alert(`View History (coming soon). POC ID: ${id}`);
    setOpenMenuId("");
  };

  useEffect(() => {
    if (!open) return;

    const tableEl = document.getElementById(tableScrollId);
    const bottomEl = document.getElementById(bottomScrollId);
    if (!tableEl || !bottomEl) return;

    let syncing = false;

    const syncBottomSize = () => {
      const contentWidth = tableEl.scrollWidth;
      const spacer = bottomEl.querySelector<HTMLDivElement>("[data-spacer='1']");
      if (spacer) spacer.style.width = `${contentWidth}px`;
    };

    const onTableScroll = () => {
      if (syncing) return;
      syncing = true;
      bottomEl.scrollLeft = tableEl.scrollLeft;
      syncing = false;
    };

    const onBottomScroll = () => {
      if (syncing) return;
      syncing = true;
      tableEl.scrollLeft = bottomEl.scrollLeft;
      syncing = false;
    };

    syncBottomSize();

    tableEl.addEventListener("scroll", onTableScroll, { passive: true });
    bottomEl.addEventListener("scroll", onBottomScroll, { passive: true });

    const ro = new ResizeObserver(() => syncBottomSize());
    ro.observe(tableEl);

    return () => {
      tableEl.removeEventListener("scroll", onTableScroll as any);
      bottomEl.removeEventListener("scroll", onBottomScroll as any);
      ro.disconnect();
    };
  }, [open, maximized, tableScrollId, bottomScrollId]);

  const notesCount = useMemo(() => note.length, [note]);

  return (
    <div
      className="w-full max-w-none rounded-2xl border border-bac-border bg-bac-panel/30 p-6"
      onMouseDown={() => {
        if (openMenuId) setOpenMenuId("");
      }}
    >
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
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="bg-bac-panel">
              <tr className="text-left text-yellow-200">
                <th className="px-3 py-2">POC Number</th>
                <th className="px-3 py-2">Start Date</th>
                <th className="px-3 py-2">Stop Date</th>
                <th className="px-3 py-2">POC Note</th>
                <th className="px-3 py-2">Shift</th>
                <th className="px-3 py-2">Created By</th>
                <th className="px-3 py-2">Created Date</th>

                {/* ✅ NEW */}
                <th className="px-3 py-2">Daily Logs</th>

                <th className="px-3 py-2">Print</th>
                <th className="px-3 py-2">Actions</th>
                <th className="px-3 py-2">Delete</th>
              </tr>
            </thead>

            <tbody className="text-bac-text">
              {loading ? (
                <tr>
                  <td className="px-3 py-3 text-bac-muted" colSpan={11}>
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-3 py-3 text-red-300" colSpan={11}>
                    Failed to load: {error}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-bac-muted" colSpan={11}>
                    No POC records.
                  </td>
                </tr>
              ) : (
                items.map((x) => (
                  <tr key={x.id} className="border-t border-bac-border/60">
                    <td className="px-3 py-2 font-semibold">
                      <button
                        type="button"
                        className="text-bac-primary hover:underline"
                        onClick={() => openEdit(x)}
                        title="Edit POC"
                      >
                        {x.pocNumber}
                      </button>
                    </td>

                    <td className="px-3 py-2">{startLabel(x)}</td>
                    <td className="px-3 py-2">{stopLabel(x)}</td>
                    <td className="px-3 py-2">{x.note || ""}</td>
                    <td className="px-3 py-2">{x.shift}</td>
                    <td className="px-3 py-2">{x.createdBy || ""}</td>
                    <td className="px-3 py-2">{createdAtLabel(x)}</td>

                    {/* ✅ NEW: icon button */}
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => onDailyLogs(x)}
                        className="rounded-lg border border-bac-border bg-bac-panel px-2 py-1 text-xs text-bac-text hover:bg-bac-panel/70"
                        title="Open Daily Logs for this POC"
                      >
                        <span className="inline-flex items-center gap-1">
                          <span aria-hidden>📖✍️</span>
                          <span className="hidden xl:inline">Open</span>
                        </span>
                      </button>
                    </td>

                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => onPrint(x.id)}
                        className="rounded-lg border border-bac-border bg-bac-panel px-2 py-1 text-xs text-bac-text hover:bg-bac-panel/70"
                        title="Print / Save as PDF"
                      >
                        Print
                      </button>
                    </td>

                    <td className="px-3 py-2 relative">
                      <button
                        type="button"
                        onClick={() => setOpenMenuId((cur) => (cur === x.id ? "" : x.id))}
                        className="rounded-lg border border-bac-border bg-bac-panel px-2 py-1 text-xs text-bac-text hover:bg-bac-panel/70"
                        title="Actions"
                      >
                        ⋯
                      </button>

                      {openMenuId === x.id && (
                        <div className="absolute right-0 mt-2 w-[180px] rounded-xl border border-bac-border bg-bac-panel shadow-xl z-20">
                          <button
                            type="button"
                            onClick={() => onUploadDocument(x.id)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-bac-panel/70"
                          >
                            Upload Document
                          </button>
                          <button
                            type="button"
                            onClick={() => onViewHistory(x.id)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-bac-panel/70"
                          >
                            View History
                          </button>
                        </div>
                      )}
                    </td>

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

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2">
          <div
            className={[
              "rounded-2xl border border-bac-border bg-bac-panel text-bac-text shadow-xl",
              maximized ? "fixed inset-3 w-auto max-w-none" : "w-full max-w-[1200px]",
            ].join(" ")}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-bac-border px-5 py-4">
              <div className="text-lg font-semibold">{mode === "edit" ? "Edit POC" : "New POC"}</div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMaximized((v) => !v)}
                  className="rounded-lg border border-bac-border bg-bac-panel px-3 py-1 text-sm hover:bg-bac-panel/70"
                  title={maximized ? "Restore" : "Maximize"}
                >
                  {maximized ? "Restore" : "Max"}
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

            <div className={maximized ? "flex h-[calc(100vh-90px)] flex-col" : "flex max-h-[75vh] flex-col"}>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div>
                    <div className="text-xs text-bac-muted">POC Number *</div>
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

                <div className="mt-3">
                  <div className="text-xs text-bac-muted">Notes</div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                  />
                  <div className="mt-1 text-xs text-bac-muted">{notesCount}/8000</div>
                </div>

                <div className="mt-4">
                  <div className="text-sm font-semibold text-bac-text">Duties</div>

                  <div id={tableScrollId} className="mt-2 overflow-x-auto rounded-xl border border-bac-border">
                    <table className="w-full min-w-[1650px] text-xs table-fixed">
                      <thead className="bg-bac-panel">
                        <tr className="text-left text-yellow-200">
                          <th className="px-2 py-2 w-[180px]">Category</th>
                          <th className="px-2 py-2 w-[70px]">Task #</th>
                          <th className="px-2 py-2 w-[360px]">Duty</th>
                          <th className="px-2 py-2 w-[110px]">Minutes</th>
                          <th className="px-2 py-2 w-[95px]">As Needed</th>
                          <th className="px-2 py-2 w-[220px]">Times a Week (Min)-(Max)</th>
                          <th className="px-2 py-2 w-[320px]">Days Of Week</th>
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
                                className="w-full rounded-lg border border-bac-border bg-bac-panel px-2 py-1 outline-none"
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
                                  className="w-[90px] rounded-lg border border-bac-border bg-bac-panel px-2 py-1 outline-none"
                                />
                                <span className="text-bac-muted">-</span>
                                <input
                                  value={r.timesWeekMax}
                                  onChange={(e) => updateRow(idx, { timesWeekMax: e.target.value })}
                                  className="w-[90px] rounded-lg border border-bac-border bg-bac-panel px-2 py-1 outline-none"
                                />
                              </div>
                            </td>

                            <td className="px-2 py-2 align-top">
                              <div className="flex items-center gap-4 whitespace-nowrap">
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
                                    <input type="checkbox" checked={r.days[k]} onChange={() => toggleDay(idx, k)} />
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
                                className="w-full rounded-lg border border-bac-border bg-bac-panel px-2 py-1 outline-none"
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
                      {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Save"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-bac-border bg-bac-panel/60 px-5 py-2">
                <div className="text-[11px] text-bac-muted mb-1">Horizontal scroll</div>
                <div
                  id={bottomScrollId}
                  className="h-[14px] overflow-x-auto overflow-y-hidden rounded bg-bac-panel/40"
                  aria-label="Horizontal scroll bar"
                >
                  <div data-spacer="1" className="h-[1px]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

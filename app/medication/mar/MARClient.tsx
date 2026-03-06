// web/app/medication/mar/MARClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

/* ================================
   Common Types
================================ */

type MedicationStatus = "ACTIVE" | "ON_HOLD" | "DISCONTINUED";
type MedicationType = "SCHEDULED" | "PRN";

type AdminStatus =
  | "SCHEDULED"
  | "GIVEN"
  | "REFUSED"
  | "MISSED"
  | "HELD"
  | "LATE"
  | "ERROR";

interface MedicationOrder {
  id: string;
  individualId: string;
  individualName: string;
  medicationName: string;
  doseValue: number;
  doseUnit: string;
  route: string;
  type: MedicationType;
  frequencyText?: string;
  timesOfDay?: string[];
  startDate: string;
  endDate?: string;
  status: MedicationStatus;
  prescriber?: string;
  pharmacy?: string;
  indications?: string;
  allergiesFlag?: boolean;
}

interface MedicationAdmin {
  id: string;
  orderId: string;
  individualId: string;
  individualName: string;
  medicationName: string;
  doseValue: number;
  doseUnit: string;
  route: string;
  scheduledDateTime: string; // ISO
  actualDateTime?: string;
  status?: AdminStatus | null;
  reason?: string;
  vitalsSummary?: string;
  staffName?: string;
  notes?: string;
}

interface IndividualOption {
  id: string;
  name: string;
  code?: string;
}

/* ================================
   Mock fallback
================================ */

const mockOrders: MedicationOrder[] = [
  {
    id: "order-1",
    individualId: "IND-001",
    individualName: "John Smith",
    medicationName: "Metformin",
    doseValue: 500,
    doseUnit: "mg",
    route: "PO",
    type: "SCHEDULED",
    frequencyText: "BID",
    timesOfDay: ["08:00", "20:00"],
    startDate: "2026-01-01",
    status: "ACTIVE",
    prescriber: "Dr. Brown",
    pharmacy: "CVS Pharmacy",
    indications: "Type 2 Diabetes",
    allergiesFlag: false,
  },
];

const mockAdmins: MedicationAdmin[] = [
  {
    id: "admin-1",
    orderId: "order-1",
    individualId: "IND-001",
    individualName: "John Smith",
    medicationName: "Metformin",
    doseValue: 500,
    doseUnit: "mg",
    route: "PO",
    scheduledDateTime: "2026-11-01T08:00:00Z",
    actualDateTime: "2026-11-01T08:05:00Z",
    status: "GIVEN",
    vitalsSummary: "BG 145",
    staffName: "DSP A",
  },
];

/* ================================
   Helpers
================================ */

const TZ = "America/New_York";

const marStatusClass = (status?: AdminStatus | null) => {
  switch (status) {
    case "GIVEN":
      return "border border-bac-green/50 bg-bac-green/15 text-bac-green";
    case "REFUSED":
      return "border border-bac-red/50 bg-bac-red/15 text-bac-red";
    case "MISSED":
      return "border border-bac-red/50 bg-bac-red/8 text-bac-red";
    case "HELD":
      return "border border-yellow-500/50 bg-yellow-500/15 text-yellow-500";
    case "LATE":
      return "border border-bac-primary/50 bg-bac-primary/15 text-bac-primary";
    case "ERROR":
      return "border border-red-500/60 bg-red-500/15 text-red-500";
    case "SCHEDULED":
      return "border border-bac-border bg-bac-bg/40 text-bac-muted";
    default:
      return "border border-bac-border text-bac-muted hover:bg-bac-bg";
  }
};

const statusLabel = (status?: AdminStatus | null) => {
  switch (status) {
    case "GIVEN":
      return "Given";
    case "REFUSED":
      return "Refused";
    case "MISSED":
      return "Missed";
    case "HELD":
      return "Held";
    case "LATE":
      return "Late";
    case "ERROR":
      return "Error";
    case "SCHEDULED":
      return "Scheduled";
    default:
      return "";
  }
};

function monthToStartDate(monthValue: string): string {
  if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) return "";
  return `${monthValue}-01`;
}

function parseMonth(month: string): { year: number; monthIndex0: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const year = Number(m[1]);
  const mon = Number(m[2]);
  if (!year || mon < 1 || mon > 12) return null;
  return { year, monthIndex0: mon - 1 };
}

function parseTimeOfDay(t: string): { hour: number; minute: number } | null {
  const m = /^(\d{2}):(\d{2})$/.exec((t || "").trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function zonedWallClockToUtcDate(
  year: number,
  monthIndex0: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const utcGuess = new Date(Date.UTC(year, monthIndex0, day, hour, minute, 0));

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = dtf.formatToParts(utcGuess);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;

  const y = Number(get("year"));
  const mo = Number(get("month")) - 1;
  const d = Number(get("day"));
  const h = Number(get("hour"));
  const mi = Number(get("minute"));
  const s = Number(get("second"));

  const tzWallClockAsUTC = Date.UTC(y, mo, d, h, mi, s);
  const guessUTC = Date.UTC(year, monthIndex0, day, hour, minute, 0);

  const offsetMs = tzWallClockAsUTC - guessUTC;
  return new Date(utcGuess.getTime() - offsetMs);
}

function getNYDayAndTime(
  iso: string,
): { day: number; timeHHMM: string } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour12: false,
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const parts = dtf.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;

  const dayStr = get("day");
  const hourStr = get("hour");
  const minuteStr = get("minute");

  if (!dayStr || !hourStr || !minuteStr) return null;

  return { day: Number(dayStr), timeHHMM: `${hourStr}:${minuteStr}` };
}

function getDaysInMonth(monthValue: string) {
  const [yearStr, monthStr] = monthValue.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return 30;
  return new Date(year, month, 0).getDate();
}

function formatNYTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
}

/**
 * Fix GIVEN display when API returns SCHEDULED/null but record has evidence.
 */
function normalizeDisplayStatus(a?: MedicationAdmin | null): AdminStatus | null {
  if (!a) return null;

  const raw = (a.status ?? null) as AdminStatus | null;

  const hasEvidence =
    !!a.actualDateTime ||
    !!(a.vitalsSummary && a.vitalsSummary.trim()) ||
    !!(a.reason && a.reason.trim()) ||
    !!(a.notes && a.notes.trim()) ||
    !!(a.staffName && a.staffName.trim());

  if ((!raw || raw === "SCHEDULED") && hasEvidence) {
    return "GIVEN";
  }

  return raw;
}

const isSavedRecord = (a?: MedicationAdmin | null) => {
  const st = normalizeDisplayStatus(a);
  return !!st && st !== "SCHEDULED";
};

function buildTooltipLines(a?: MedicationAdmin | null) {
  if (!a) {
    return {
      status: "—",
      actual: "—",
      dsp: "—",
      note: "",
      vitals: "",
    };
  }
  const st = statusLabel(normalizeDisplayStatus(a) ?? null) || "—";
  const actual = a.actualDateTime ? formatNYTime(a.actualDateTime) : "—";
  const dsp = a.staffName ? a.staffName : "—";
  const note = a.reason ? a.reason : a.notes ? a.notes : "";
  const vitals = a.vitalsSummary ? a.vitalsSummary : "";
  return { status: st, actual, dsp, note, vitals };
}

/* ================================
   Portal Tooltip (NOT clipped by overflow)
================================ */

type TooltipPayload = {
  open: boolean;
  x: number;
  y: number;
  preferred: "top" | "bottom";
  order?: MedicationOrder;
  day?: number;
  timeOfDay?: string;
  admin?: MedicationAdmin | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function PortalTooltip({
  data,
  onClose,
}: {
  data: TooltipPayload;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const width = 360;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!data.open) return;

    const compute = () => {
      const pad = 10;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // default: place above the anchor (y is top of anchor)
      let left = data.x - width / 2;
      left = clamp(left, pad, vw - width - pad);

      // try to place above: y - tooltipHeight approx 220
      const approxH = 240;
      let top =
        data.preferred === "top"
          ? data.y - approxH
          : data.y + 12;

      // if above goes offscreen -> place below
      if (top < pad) top = data.y + 12;
      // if below goes offscreen -> place above
      if (top + approxH > vh - pad) top = Math.max(pad, data.y - approxH);

      setPos({ left, top });
    };

    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [data.open, data.x, data.y, data.preferred]);

  if (!mounted || !data.open) return null;

  const order = data.order;
  const day = data.day;
  const timeOfDay = data.timeOfDay;
  const a = data.admin ?? null;

  const lines = buildTooltipLines(a);

  const body = (
    <div
      className="fixed z-[9999]"
      style={{ left: pos.left, top: pos.top, width }}
      onMouseLeave={onClose}
    >
      <div className="rounded-xl border border-bac-border bg-bac-bg p-3 text-left text-[11px] text-bac-text shadow-2xl">
        <div className="font-medium">
          {order
            ? `${order.medicationName} ${order.doseValue}${order.doseUnit} (${order.route})`
            : "Medication"}
        </div>
        <div className="mt-1 text-bac-muted">
          Day {day ?? "—"} • Time {timeOfDay ?? "—"}
        </div>

        {/* Schedule */}
        <div className="mt-3 rounded-lg border border-bac-border bg-bac-panel/40 p-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-bac-muted">
            Schedule
          </div>
          <div className="mt-1 text-bac-text">Status: Scheduled</div>
          <div className="text-bac-muted">
            Scheduled time: {timeOfDay ?? "—"}
          </div>
        </div>

        {/* Saved Record */}
        <div className="mt-2 rounded-lg border border-bac-border bg-bac-panel/40 p-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-bac-muted">
            Saved record
          </div>

          {a && isSavedRecord(a) ? (
            <>
              <div className="mt-1 text-bac-text">Status: {lines.status}</div>
              <div className="text-bac-muted">Actual: {lines.actual}</div>
              <div className="text-bac-muted">DSP: {lines.dsp}</div>
              {lines.note ? <div className="text-bac-muted">Note: {lines.note}</div> : null}
              {lines.vitals ? <div className="text-bac-muted">Vitals: {lines.vitals}</div> : null}
            </>
          ) : (
            <>
              <div className="mt-1 text-bac-text">Recorded: — (not saved yet)</div>
              <div className="mt-1 text-bac-muted">Click the slot to enter.</div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}

/* ================================
   MAR Client
================================ */

export default function MARClient() {
  const [selectedIndividual, setSelectedIndividual] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-01");

  const [individualOptions, setIndividualOptions] = useState<IndividualOption[]>([]);
  const [individualLoading, setIndividualLoading] = useState(false);
  const [individualError, setIndividualError] = useState<string | null>(null);

  const [orders, setOrders] = useState<MedicationOrder[]>(mockOrders);
  const [admins, setAdmins] = useState<MedicationAdmin[]>(mockAdmins);
  const [marLoading, setMarLoading] = useState(false);
  const [marError, setMarError] = useState<string | null>(null);
  const [marWarning, setMarWarning] = useState<string | null>(null);

  const [selectedOrderForMar, setSelectedOrderForMar] = useState<string>("ALL");

  const [marModalState, setMarModalState] = useState<{
    open: boolean;
    admin?: MedicationAdmin;
    order?: MedicationOrder;
    date?: number;
    timeOfDay?: string;
  }>({ open: false });

  // ✅ Tooltip state (portal)
  const [tooltip, setTooltip] = useState<TooltipPayload>({
    open: false,
    x: 0,
    y: 0,
    preferred: "top",
  });

  const closeTooltip = () =>
    setTooltip((t) => ({ ...t, open: false }));

  // ======================================
  // Load Individuals
  // ======================================
  useEffect(() => {
    const controller = new AbortController();

    const loadIndividuals = async () => {
      setIndividualLoading(true);
      setIndividualError(null);

      try {
        const res = await fetch("/api/medication/individuals", {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(
            `Failed to load individuals: ${res.status} ${res.statusText}`,
          );
        }

        const data = await res.json();

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

        if (mapped.length === 0) {
          const map = new Map<string, string>();
          mockOrders.forEach((o) => map.set(o.individualId, o.individualName));
          const fallback = Array.from(map.entries()).map(([id, name]) => ({
            id,
            name,
          }));
          setIndividualOptions(fallback);
        } else {
          setIndividualOptions(mapped);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("[MARClient] Load individuals failed:", err);
        setIndividualError(err?.message ?? "Failed to load individuals.");

        const map = new Map<string, string>();
        mockOrders.forEach((o) => map.set(o.individualId, o.individualName));
        const fallback = Array.from(map.entries()).map(([id, name]) => ({
          id,
          name,
        }));
        setIndividualOptions(fallback);
      } finally {
        setIndividualLoading(false);
      }
    };

    loadIndividuals();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!individualOptions.length) return;
    const exists = individualOptions.some((i) => i.id === selectedIndividual);
    if (!selectedIndividual || !exists) {
      setSelectedIndividual(individualOptions[0].id);
    }
  }, [individualOptions, selectedIndividual]);

  const selectedIndividualName =
    individualOptions.find((i) => i.id === selectedIndividual)?.name ??
    individualOptions[0]?.name ??
    "";

  // ======================================
  // Load MAR
  // ======================================
  useEffect(() => {
    if (!selectedIndividual) return;
    const controller = new AbortController();

    const loadMar = async () => {
      setMarLoading(true);
      setMarError(null);
      setMarWarning(null);

      try {
        const params = new URLSearchParams({
          individualId: selectedIndividual,
          month: selectedMonth,
        });

        const res = await fetch(`/api/medication/mar?${params.toString()}`, {
          signal: controller.signal,
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.errorDetail || data?.error || res.statusText);
        }

        if (!data?.individualId) {
          setMarWarning(
            data?.warning ??
              "Medication MAR tables not created yet. Showing sample data only.",
          );

          const mockOrdersForInd = mockOrders.filter(
            (o) => o.individualId === selectedIndividual,
          );
          const mockAdminsForInd = mockAdmins.filter(
            (a) => a.individualId === selectedIndividual,
          );

          setOrders(mockOrdersForInd);
          setAdmins(mockAdminsForInd);
          return;
        }

        const apiOrders = Array.isArray(data.orders) ? data.orders : [];
        const apiAdmins = Array.isArray(data.administrations)
          ? data.administrations
          : [];

        const mappedOrders: MedicationOrder[] = apiOrders.map((o: any) => ({
          id: o.id,
          individualId: o.individualId,
          individualName:
            selectedIndividualName || o.individualName || "Individual",
          medicationName: o.medicationName,
          doseValue: o.doseValue ?? 0,
          doseUnit: o.doseUnit ?? "",
          route: o.route ?? "",
          type: (o.type as MedicationType) ?? "SCHEDULED",
          frequencyText: o.frequencyText ?? undefined,
          timesOfDay: (o.timesOfDay as string[] | null) ?? [],
          startDate: o.startDate,
          endDate: o.endDate ?? undefined,
          status: (o.status as MedicationStatus) ?? "ACTIVE",
          prescriber: o.prescriberName ?? undefined,
          pharmacy: o.pharmacyName ?? undefined,
          indications: o.indications ?? undefined,
          allergiesFlag: o.allergyFlag ?? false,
        }));

        const mappedAdmins: MedicationAdmin[] = apiAdmins.map((a: any) => {
          const order = mappedOrders.find((o) => o.id === a.orderId);
          return {
            id: a.id,
            orderId: a.orderId,
            individualId: a.individualId,
            individualName:
              selectedIndividualName || order?.individualName || "Individual",
            medicationName:
              order?.medicationName ?? a.medicationName ?? "Medication",
            doseValue: order?.doseValue ?? a.doseValue ?? 0,
            doseUnit: order?.doseUnit ?? a.doseUnit ?? "",
            route: order?.route ?? a.route ?? "",
            scheduledDateTime: a.scheduledDateTime,
            actualDateTime: a.actualDateTime ?? undefined,
            status: (a.status as AdminStatus) ?? null,
            reason: a.reason ?? undefined,
            vitalsSummary: a.vitalsSummary ?? undefined,
            staffName: a.staffName ?? undefined,
            notes: a.notes ?? undefined,
          };
        });

        setOrders(mappedOrders);
        setAdmins(mappedAdmins);
        setSelectedOrderForMar((prev) => (prev ? prev : "ALL"));
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("[MARClient] Load MAR failed:", err);
        setMarError(err?.message ?? "Failed to load MAR data.");

        const mockOrdersForInd = mockOrders.filter(
          (o) => o.individualId === selectedIndividual,
        );
        const mockAdminsForInd = mockAdmins.filter(
          (a) => a.individualId === selectedIndividual,
        );
        setOrders(mockOrdersForInd);
        setAdmins(mockAdminsForInd);
      } finally {
        setMarLoading(false);
      }
    };

    loadMar();
    return () => controller.abort();
  }, [selectedIndividual, selectedMonth, selectedIndividualName]);

  /* ---------- computed ---------- */

  const daysInMonth = useMemo(() => getDaysInMonth(selectedMonth), [selectedMonth]);

  const activeOrdersForInd = useMemo(() => {
    return orders.filter(
      (o) => o.individualId === selectedIndividual && o.status === "ACTIVE",
    );
  }, [orders, selectedIndividual]);

  const marOrders = useMemo(() => {
    const base = activeOrdersForInd;
    if (selectedOrderForMar === "ALL") return base;
    return base.filter((o) => o.id === selectedOrderForMar);
  }, [activeOrdersForInd, selectedOrderForMar]);

  const getAdminsForCell = (orderId: string, day: number, timeOfDay?: string) => {
    return admins.filter((a) => {
      if (a.orderId !== orderId) return false;

      const ny = getNYDayAndTime(a.scheduledDateTime);
      if (!ny) return false;
      if (ny.day !== day) return false;

      if (timeOfDay) return ny.timeHHMM === timeOfDay;
      return true;
    });
  };

  const openSlot = (order: MedicationOrder, day: number, timeOfDay?: string) => {
    const existingAdmins = timeOfDay
      ? getAdminsForCell(order.id, day, timeOfDay)
      : getAdminsForCell(order.id, day);

    setMarModalState({
      open: true,
      admin: existingAdmins[0],
      order,
      date: day,
      timeOfDay,
    });
  };

  const closeMarModal = () => setMarModalState({ open: false });

  const upsertLocalAdmin = (item: any, order: MedicationOrder) => {
    const mapped: MedicationAdmin = {
      id: item.id,
      orderId: item.orderId,
      individualId: item.individualId,
      individualName: order.individualName,
      medicationName: order.medicationName,
      doseValue: order.doseValue,
      doseUnit: order.doseUnit,
      route: order.route,
      scheduledDateTime: new Date(item.scheduledDateTime).toISOString(),
      actualDateTime: item.actualDateTime ? new Date(item.actualDateTime).toISOString() : undefined,
      status: (item.status as AdminStatus) ?? null,
      reason: item.reason ?? undefined,
      vitalsSummary: item.vitalsSummary ?? undefined,
      staffName: item.staffName ?? undefined,
      notes: item.notes ?? undefined,
    };

    setAdmins((prev) => {
      const idx = prev.findIndex(
        (x) =>
          x.orderId === mapped.orderId &&
          new Date(x.scheduledDateTime).toISOString() ===
            new Date(mapped.scheduledDateTime).toISOString(),
      );
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = { ...clone[idx], ...mapped };
        return clone;
      }
      return [...prev, mapped];
    });
  };

  const showTooltipForButton = (
    e: React.MouseEvent,
    payload: Omit<TooltipPayload, "open" | "x" | "y" | "preferred">,
  ) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top; // anchor top
    setTooltip({
      open: true,
      x,
      y,
      preferred: "top",
      ...payload,
    });
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-bac-text">Medication</h1>
        <p className="mt-1 text-sm text-bac-muted">
          Medication Administration Record (MAR) — primary audit trail in PA.
        </p>
      </div>

      {/* Global selection bar */}
      <div className="flex flex-wrap gap-3 rounded-2xl border border-bac-border bg-bac-panel p-4 text-sm shadow-sm">
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-bac-muted">
            Individual
          </span>
          <select
            className="mt-1 min-w-[220px] rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
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
            Month (MAR / Reports)
          </span>
          <input
            type="month"
            className="mt-1 min-w-[180px] rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>

        <div className="flex flex-1 flex-col justify-end gap-1 text-xs">
          {individualLoading && (
            <span className="text-bac-muted">Loading individuals...</span>
          )}
          {individualError && !individualLoading && (
            <span className="text-bac-red">{individualError}</span>
          )}
          {marLoading && (
            <span className="text-bac-muted">Loading MAR data...</span>
          )}
          {marWarning && !marLoading && (
            <span className="text-yellow-400">{marWarning}</span>
          )}
          {marError && !marLoading && (
            <span className="text-bac-red">{marError}</span>
          )}
        </div>
      </div>

      {/* MAR Header + legend */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-bac-text">
            Monthly MAR – {selectedIndividualName || "—"}
          </h2>
          <p className="text-xs text-bac-muted">
            eMAR with per-dose documentation for{" "}
            {selectedMonth ? monthToStartDate(selectedMonth).slice(0, 7) : "selected"}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1 rounded-full border border-bac-border px-2 py-1">
            <span className="inline-block h-2 w-2 rounded-full bg-bac-green" />{" "}
            Given
          </div>
          <div className="flex items-center gap-1 rounded-full border border-bac-border px-2 py-1">
            <span className="inline-block h-2 w-2 rounded-full bg-bac-red" />{" "}
            Missed / Refused
          </div>
          <div className="flex items-center gap-1 rounded-full border border-bac-border px-2 py-1">
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />{" "}
            Held
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-bac-border bg-bac-panel p-3 text-sm shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
              Medication filter
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              value={selectedOrderForMar}
              onChange={(e) => setSelectedOrderForMar(e.target.value)}
            >
              <option value="ALL">All active medications</option>
              {activeOrdersForInd.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.medicationName} {o.doseValue}
                  {o.doseUnit} ({o.route})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
              View mode
            </label>
            <div className="mt-1 text-xs text-bac-muted">
              Monthly grid (hover a slot to see summary).
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-bac-border bg-bac-panel shadow-sm">
        {marOrders.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-bac-muted">
            No active medications for this individual in the selected month.
          </div>
        ) : (
          <div className="max-h-full overflow-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-bac-panel/95 backdrop-blur">
                <tr className="border-b border-bac-border text-[10px] uppercase tracking-wide text-bac-muted">
                  <th className="sticky left-0 z-10 bg-bac-panel px-3 py-2 text-left">
                    Medication
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                    (day) => (
                      <th key={day} className="px-2 py-2 text-center">
                        {day}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {marOrders.map((order) => (
                  <tr key={order.id} className="border-t border-bac-border">
                    <td className="sticky left-0 z-10 max-w-[220px] bg-bac-panel px-3 py-2 text-left align-top">
                      <div className="font-medium text-bac-text">
                        {order.medicationName} {order.doseValue}
                        {order.doseUnit}
                      </div>
                      <div className="text-[11px] text-bac-muted">
                        {order.route} •{" "}
                        {order.type === "SCHEDULED" ? order.frequencyText : "PRN"}
                      </div>
                    </td>

                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                      (day) => {
                        const times =
                          order.type === "SCHEDULED"
                            ? [...(order.timesOfDay ?? [])].sort()
                            : [];

                        const cellAdmins = getAdminsForCell(order.id, day);

                        return (
                          <td key={day} className="px-1 py-1 align-top text-center">
                            <div className="flex flex-col items-center gap-1">
                              {order.type === "SCHEDULED" ? (
                                times.length ? (
                                  times.map((t) => {
                                    const slotAdmins = getAdminsForCell(order.id, day, t);
                                    const saved = slotAdmins.find((x) => isSavedRecord(x)) ?? null;
                                    const a = saved ?? slotAdmins[0] ?? null;

                                    const displayStatus = normalizeDisplayStatus(a) ?? "SCHEDULED";
                                    const label =
                                      displayStatus === "SCHEDULED"
                                        ? "Scheduled"
                                        : statusLabel(displayStatus);

                                    return (
                                      <button
                                        key={t}
                                        onClick={() => openSlot(order, day, t)}
                                        onMouseEnter={(e) =>
                                          showTooltipForButton(e, {
                                            order,
                                            day,
                                            timeOfDay: t,
                                            admin: a,
                                          })
                                        }
                                        onMouseLeave={closeTooltip}
                                        className={`min-w-[72px] rounded-full px-2 py-0.5 text-[10px] ${marStatusClass(
                                          displayStatus,
                                        )}`}
                                      >
                                        {label}
                                      </button>
                                    );
                                  })
                                ) : (
                                  <button
                                    onClick={() => openSlot(order, day, undefined)}
                                    className="min-w-[40px] rounded-full border border-bac-border px-2 py-0.5 text-[10px] text-bac-muted hover:bg-bac-bg"
                                  >
                                    +
                                  </button>
                                )
                              ) : (
                                <button
                                  onClick={() => openSlot(order, day, undefined)}
                                  onMouseEnter={(e) =>
                                    showTooltipForButton(e, {
                                      order,
                                      day,
                                      timeOfDay: "PRN",
                                      admin: cellAdmins[0] ?? null,
                                    })
                                  }
                                  onMouseLeave={closeTooltip}
                                  className="min-w-[58px] rounded-full border border-bac-border px-2 py-0.5 text-[10px] text-bac-muted hover:bg-bac-bg"
                                >
                                  PRN {cellAdmins.length > 0 ? `x${cellAdmins.length}` : ""}
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      },
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ✅ Portal Tooltip */}
      <PortalTooltip data={tooltip} onClose={closeTooltip} />

      {/* Modal */}
      {marModalState.open && marModalState.order && (
        <MarEntryModal
          state={marModalState}
          selectedMonth={selectedMonth}
          selectedIndividualId={selectedIndividual}
          onClose={closeMarModal}
          onSaved={(savedItem) => {
            upsertLocalAdmin(savedItem, marModalState.order!);
          }}
        />
      )}
    </div>
  );
}

/* ================================
   Modal (SAVE = real API)
================================ */

const MarEntryModal: React.FC<{
  state: {
    open: boolean;
    admin?: MedicationAdmin;
    order?: MedicationOrder;
    date?: number;
    timeOfDay?: string;
  };
  selectedMonth: string;
  selectedIndividualId: string;
  onClose: () => void;
  onSaved: (savedItem: any) => void;
}> = ({ state, selectedMonth, selectedIndividualId, onClose, onSaved }) => {
  const order = state.order;
  if (!order) return null;

  const { admin, date, timeOfDay } = state;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<AdminStatus>(
    ((admin?.status ?? "GIVEN") as AdminStatus) || "GIVEN",
  );

  const [actualTime, setActualTime] = useState<string>(
    admin?.actualDateTime ? formatNYTime(admin.actualDateTime) : "",
  );

  const [reason, setReason] = useState<string>(admin?.reason ?? "");
  const [vitalsSummary, setVitalsSummary] = useState<string>(
    admin?.vitalsSummary ?? "",
  );

  const computedScheduledDateTimeIso = useMemo(() => {
    if (admin?.scheduledDateTime)
      return new Date(admin.scheduledDateTime).toISOString();

    const pm = parseMonth(selectedMonth);
    if (!pm || !date || !timeOfDay) return "";

    const tm = parseTimeOfDay(timeOfDay);
    if (!tm) return "";

    const dt = zonedWallClockToUtcDate(
      pm.year,
      pm.monthIndex0,
      date,
      tm.hour,
      tm.minute,
      TZ,
    );
    return dt.toISOString();
  }, [admin?.scheduledDateTime, selectedMonth, date, timeOfDay]);

  const computedActualDateTimeIso = useMemo(() => {
    if (!actualTime) return "";
    const pm = parseMonth(selectedMonth);
    if (!pm || !date) return "";

    const tm = parseTimeOfDay(actualTime);
    if (!tm) return "";

    const dt = zonedWallClockToUtcDate(
      pm.year,
      pm.monthIndex0,
      date,
      tm.hour,
      tm.minute,
      TZ,
    );
    return dt.toISOString();
  }, [actualTime, selectedMonth, date]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      if (!computedScheduledDateTimeIso) {
        throw new Error("Missing scheduledDateTime (cannot save).");
      }

      const payload = {
        orderId: order.id,
        individualId: selectedIndividualId,
        scheduledDateTime: computedScheduledDateTimeIso,
        status,
        actualDateTime: computedActualDateTimeIso || null,
        reason: reason || null,
        vitalsSummary: vitalsSummary || null,
      };

      const res = await fetch("/api/medication/mar/administrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || data?.details || res.statusText);
      }

      if (!data?.item) {
        throw new Error("Save succeeded but returned empty item.");
      }

      onSaved(data.item);
      onClose();
    } catch (e: any) {
      console.error("[MARClient] Save admin failed:", e);
      setError(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="h-full w-full max-w-md border-l border-bac-border bg-bac-panel p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-bac-text">
              Record administration
            </h2>
            <p className="mt-1 text-xs text-bac-muted">
              {order.individualName} – {order.medicationName} {order.doseValue}
              {order.doseUnit} ({order.route})
            </p>
            <p className="mt-1 text-xs text-bac-muted">
              Date: {date ?? "—"} • Scheduled time: {timeOfDay ?? "N/A"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-bac-border px-3 py-1 text-xs text-bac-muted hover:bg-bac-bg"
          >
            Close
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-bac-red/40 bg-bac-red/10 px-3 py-2 text-sm text-bac-red">
            {error}
          </div>
        ) : null}

        <div className="mt-6 space-y-4 text-sm text-bac-text">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
              Status
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              value={status}
              onChange={(e) => setStatus(e.target.value as AdminStatus)}
            >
              <option value="GIVEN">Given</option>
              <option value="REFUSED">Refused</option>
              <option value="MISSED">Missed</option>
              <option value="HELD">Held</option>
              <option value="LATE">Late</option>
              <option value="ERROR">Error</option>
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Scheduled time
              </label>
              <input
                type="time"
                value={timeOfDay ?? ""}
                readOnly
                className="mt-1 w-full cursor-not-allowed rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text opacity-80"
              />
              <div className="mt-1 text-[11px] text-bac-muted">
                (Locked: generated slot)
              </div>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Actual time
              </label>
              <input
                type="time"
                value={actualTime}
                onChange={(e) => setActualTime(e.target.value)}
                className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
              Reason / comments
            </label>
            <textarea
              className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
              Vitals (optional)
            </label>
            <input
              type="text"
              value={vitalsSummary}
              onChange={(e) => setVitalsSummary(e.target.value)}
              placeholder="e.g. BP 120/70, HR 76, BG 145"
              className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-bac-border px-4 py-2 text-xs font-medium text-bac-muted hover:bg-bac-bg disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-bac-primary px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save record"}
          </button>
        </div>
      </div>
    </div>
  );
};
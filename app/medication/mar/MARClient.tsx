// web/app/medication/mar/MARClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

/* ================================
   Common Types (kept from legacy)
================================ */

type MedicationStatus = "ACTIVE" | "ON_HOLD" | "DISCONTINUED";
type MedicationType = "SCHEDULED" | "PRN";

// allow null/undefined for auto-generated rows (no outcome yet)
type AdminStatus = "GIVEN" | "REFUSED" | "MISSED" | "HELD" | "LATE" | "ERROR";

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
  scheduledDateTime: string;
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
   Mock fallback (same spirit as legacy)
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
  {
    id: "order-2",
    individualId: "IND-001",
    individualName: "John Smith",
    medicationName: "Atorvastatin",
    doseValue: 20,
    doseUnit: "mg",
    route: "PO",
    type: "SCHEDULED",
    frequencyText: "QHS",
    timesOfDay: ["21:00"],
    startDate: "2026-02-15",
    status: "ACTIVE",
    prescriber: "Dr. Lee",
    pharmacy: "Walmart Pharmacy",
    indications: "Hyperlipidemia",
    allergiesFlag: false,
  },
  {
    id: "order-3",
    individualId: "IND-001",
    individualName: "John Smith",
    medicationName: "Lorazepam",
    doseValue: 1,
    doseUnit: "mg",
    route: "PO",
    type: "PRN",
    frequencyText: "PRN",
    startDate: "2026-03-10",
    status: "ACTIVE",
    prescriber: "Dr. Brown",
    indications: "Anxiety",
    allergiesFlag: true,
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
  {
    id: "admin-2",
    orderId: "order-1",
    individualId: "IND-001",
    individualName: "John Smith",
    medicationName: "Metformin",
    doseValue: 500,
    doseUnit: "mg",
    route: "PO",
    scheduledDateTime: "2026-11-01T20:00:00Z",
    status: "MISSED",
    reason: "Individual refused medication",
    staffName: "DSP A",
  },
  {
    id: "admin-3",
    orderId: "order-3",
    individualId: "IND-001",
    individualName: "John Smith",
    medicationName: "Lorazepam",
    doseValue: 1,
    doseUnit: "mg",
    route: "PO",
    scheduledDateTime: "2026-11-03T14:00:00Z",
    actualDateTime: "2026-11-03T14:02:00Z",
    status: "GIVEN",
    reason: "PRN anxiety escalated",
    vitalsSummary: "BP 130/78, HR 82",
    staffName: "DSP B",
  },
];

/* ================================
   Helpers (kept from legacy)
================================ */

const TZ = "America/New_York";

const formatDate = (iso: string | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

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
    default:
      return "border border-bac-border text-bac-muted";
  }
};

function monthToStartDate(monthValue: string): string {
  if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) return "";
  return `${monthValue}-01`;
}

// Get local (NY) day + time "HH:MM" from an ISO date string
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

/* ================================
   MAR Client
================================ */

export default function MARClient() {
  // Global filters
  const [selectedIndividual, setSelectedIndividual] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-01");

  // Individuals (real data)
  const [individualOptions, setIndividualOptions] = useState<
    IndividualOption[]
  >([]);
  const [individualLoading, setIndividualLoading] = useState(false);
  const [individualError, setIndividualError] = useState<string | null>(null);

  // MAR data
  const [orders, setOrders] = useState<MedicationOrder[]>(mockOrders);
  const [admins, setAdmins] = useState<MedicationAdmin[]>(mockAdmins);
  const [marLoading, setMarLoading] = useState(false);
  const [marError, setMarError] = useState<string | null>(null);
  const [marWarning, setMarWarning] = useState<string | null>(null);

  // MAR filter
  const [selectedOrderForMar, setSelectedOrderForMar] = useState<string>("ALL");

  // Modal
  const [marModalState, setMarModalState] = useState<{
    open: boolean;
    admin?: MedicationAdmin;
    order?: MedicationOrder;
    date?: number;
    timeOfDay?: string;
  }>({ open: false });

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

  // auto select first individual
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
  // Load MAR (orders + administrations) from API
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

        // If backend returns "warning/no tables"
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

        // keep filter stable
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

  /* ---------- MAR computed ---------- */

  const daysInMonth = useMemo(
    () => getDaysInMonth(selectedMonth),
    [selectedMonth],
  );

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

  const getAdminsForCell = (
    orderId: string,
    day: number,
    timeOfDay?: string,
  ) => {
    return admins.filter((a) => {
      if (a.orderId !== orderId) return false;

      const ny = getNYDayAndTime(a.scheduledDateTime);
      if (!ny) return false;

      if (ny.day !== day) return false;

      if (timeOfDay) return ny.timeHHMM === timeOfDay;
      return true;
    });
  };

  const openSlot = (
    order: MedicationOrder,
    day: number,
    timeOfDay?: string,
  ) => {
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

  /* ================================
     Render
  ================================= */

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-bac-text">Medication</h1>
        <p className="mt-1 text-sm text-bac-muted">
          Medication Administration Record (MAR) — primary audit trail in PA.
        </p>
      </div>

      {/* Global selection bar (Individual + Month) */}
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

        {/* Status lines */}
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
            {selectedMonth
              ? monthToStartDate(selectedMonth).slice(0, 7)
              : "selected"}
            .
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
              Monthly grid (we can add daily strip view for mobile later).
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
                        {order.type === "SCHEDULED"
                          ? order.frequencyText
                          : "PRN"}
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
                          <td
                            key={day}
                            className="px-1 py-1 align-top text-center"
                          >
                            <div className="flex flex-col items-center gap-1">
                              {order.type === "SCHEDULED" ? (
                                times.length ? (
                                  times.map((t) => {
                                    const slotAdmins = getAdminsForCell(
                                      order.id,
                                      day,
                                      t,
                                    );
                                    const status =
                                      slotAdmins[0]?.status ?? null;
                                    return (
                                      <button
                                        key={t}
                                        onClick={() => openSlot(order, day, t)}
                                        className={`min-w-[40px] rounded-full px-2 py-0.5 text-[10px] ${
                                          status
                                            ? marStatusClass(status)
                                            : "border border-bac-border text-bac-muted hover:bg-bac-bg"
                                        }`}
                                      >
                                        {t}
                                      </button>
                                    );
                                  })
                                ) : (
                                  <button
                                    onClick={() =>
                                      openSlot(order, day, undefined)
                                    }
                                    className="min-w-[40px] rounded-full border border-bac-border px-2 py-0.5 text-[10px] text-bac-muted hover:bg-bac-bg"
                                  >
                                    +
                                  </button>
                                )
                              ) : (
                                <button
                                  onClick={() =>
                                    openSlot(order, day, undefined)
                                  }
                                  className="min-w-[40px] rounded-full border border-bac-border px-2 py-0.5 text-[10px] text-bac-muted hover:bg-bac-bg"
                                >
                                  PRN{" "}
                                  {cellAdmins.length > 0
                                    ? `x${cellAdmins.length}`
                                    : ""}
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

      {/* Modal */}
      {marModalState.open && marModalState.order && (
        <MarEntryModal state={marModalState} onClose={closeMarModal} />
      )}
    </div>
  );
}

/* ================================
   Modal (ported from legacy)
   Note: Save action is still placeholder (same as legacy)
================================ */

const MarEntryModal: React.FC<{
  state: {
    open: boolean;
    admin?: MedicationAdmin;
    order?: MedicationOrder;
    date?: number;
    timeOfDay?: string;
  };
  onClose: () => void;
}> = ({ state, onClose }) => {
  const order = state.order;
  if (!order) return null;

  const { admin, date, timeOfDay } = state;

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

        <div className="mt-6 space-y-4 text-sm text-bac-text">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
              Status
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              defaultValue={(admin?.status ?? "GIVEN") as any}
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
                defaultValue={timeOfDay ?? ""}
                className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Actual time
              </label>
              <input
                type="time"
                defaultValue={
                  admin?.actualDateTime
                    ? new Date(admin.actualDateTime).toLocaleTimeString(
                        undefined,
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                          timeZone: TZ,
                        },
                      )
                    : ""
                }
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
              defaultValue={admin?.reason ?? ""}
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
              Vitals (optional)
            </label>
            <input
              type="text"
              defaultValue={admin?.vitalsSummary ?? ""}
              placeholder="e.g. BP 120/70, HR 76, BG 145"
              className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-bac-border px-4 py-2 text-xs font-medium text-bac-muted hover:bg-bac-bg"
          >
            Cancel
          </button>
          <button className="rounded-xl bg-bac-primary px-4 py-2 text-xs font-medium text-white hover:opacity-90">
            Save record
          </button>
        </div>
      </div>
    </div>
  );
};

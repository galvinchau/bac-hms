"use client";

import React, { useEffect, useMemo, useState } from "react";

/* ================================
   Common Types
================================ */

type MedicationStatus = "ACTIVE" | "ON_HOLD" | "DISCONTINUED";
type MedicationType = "SCHEDULED" | "PRN";

// ✅ allow null/undefined for auto-generated rows (no outcome yet)
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
  allergiesFlag?: boolean; // true = has allergy note
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
  // ✅ allow null/undefined
  status?: AdminStatus | null;
  reason?: string;
  vitalsSummary?: string; // e.g. "BP 120/70, HR 76"
  staffName?: string;
  notes?: string;
}

interface InventoryItem {
  id: string;
  individualId: string;
  individualName: string;
  medicationName: string;
  isControlled: boolean;
  currentQuantity: number;
  unit: string;
  minThreshold: number;
  daysRemaining?: number;
  lastCountDate: string;
}

interface IncidentRecord {
  id: string;
  date: string;
  individualName: string;
  medicationName: string;
  type: string; // e.g. "Missed Dose", "Medication Error"
  severity: "Low" | "Moderate" | "High";
  status: "Open" | "In Review" | "Closed";
}

interface IndividualOption {
  id: string;
  name: string;
  code?: string;
}

/* ================================
   Mock Data (fallback)
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

const mockInventory: InventoryItem[] = [
  {
    id: "inv-1",
    individualId: "IND-001",
    individualName: "John Smith",
    medicationName: "Metformin 500 mg PO",
    isControlled: false,
    currentQuantity: 45,
    unit: "tablet",
    minThreshold: 20,
    daysRemaining: 15,
    lastCountDate: "2026-10-30",
  },
  {
    id: "inv-2",
    individualId: "IND-001",
    individualName: "John Smith",
    medicationName: "Lorazepam 1 mg PO",
    isControlled: true,
    currentQuantity: 10,
    unit: "tablet",
    minThreshold: 10,
    daysRemaining: 5,
    lastCountDate: "2026-10-28",
  },
];

const mockIncidents: IncidentRecord[] = [
  {
    id: "inc-1",
    date: "2026-10-15",
    individualName: "John Smith",
    medicationName: "Metformin 500 mg",
    type: "Missed Dose",
    severity: "Low",
    status: "Closed",
  },
  {
    id: "inc-2",
    date: "2026-11-02",
    individualName: "John Smith",
    medicationName: "Lorazepam 1 mg",
    type: "Medication Error",
    severity: "Moderate",
    status: "In Review",
  },
];

/* ================================
   Helpers
================================ */

type MainTab =
  | "OVERVIEW"
  | "ORDERS"
  | "MAR"
  | "PRN"
  | "INVENTORY"
  | "INCIDENTS";

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

function toTimesArray(input: string): string[] {
  const s = (input || "").trim();
  if (!s) return [];
  return s
    .split(/[\n,]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function monthToStartDate(monthValue: string): string {
  if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) return "";
  return `${monthValue}-01`;
}

// ✅ Get local (NY) day + time "HH:MM" from an ISO date string
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

  return {
    day: Number(dayStr),
    timeHHMM: `${hourStr}:${minuteStr}`,
  };
}

/* ================================
   Root Page Component
================================ */

const MedicationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MainTab>("OVERVIEW");

  // Global filters
  const [selectedIndividual, setSelectedIndividual] =
    useState<string>("IND-001");
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-01");

  // Individuals (real data)
  const [individualOptions, setIndividualOptions] = useState<
    IndividualOption[]
  >([]);
  const [individualLoading, setIndividualLoading] = useState(false);
  const [individualError, setIndividualError] = useState<string | null>(null);

  // Data từ API MAR (fallback mock nếu lỗi / chưa có bảng)
  const [orders, setOrders] = useState<MedicationOrder[]>(mockOrders);
  const [admins, setAdmins] = useState<MedicationAdmin[]>(mockAdmins);
  const [marLoading, setMarLoading] = useState(false);
  const [marError, setMarError] = useState<string | null>(null);
  const [marWarning, setMarWarning] = useState<string | null>(null);

  // Orders tab filters
  const [searchOrders, setSearchOrders] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // MAR tab
  const [selectedOrderForMar, setSelectedOrderForMar] = useState<string>("ALL");
  const [marModalState, setMarModalState] = useState<{
    open: boolean;
    admin?: MedicationAdmin;
    order?: MedicationOrder;
    date?: number;
    timeOfDay?: string;
  }>({ open: false });

  // ✅ Add Order modal
  const [addOrderOpen, setAddOrderOpen] = useState(false);
  const [addOrderSaving, setAddOrderSaving] = useState(false);
  const [addOrderError, setAddOrderError] = useState<string | null>(null);

  // ======================================
  // Load Individuals từ API (dùng data thật)
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
        console.error("[MedicationPage] Load individuals failed:", err);
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

  // Khi đã có danh sách individuals, nếu selectedIndividual không nằm trong list thì auto chọn cái đầu
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
  // Load Orders ONLY (for Add Order refresh)
  // ======================================
  const reloadOrdersOnly = async () => {
    if (!selectedIndividual) return;

    try {
      const params = new URLSearchParams({ individualId: selectedIndividual });
      const res = await fetch(`/api/medication/orders?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || res.statusText);
      }

      const list = Array.isArray(data?.orders) ? data.orders : [];
      const mapped: MedicationOrder[] = list.map((o: any) => ({
        id: o.id,
        individualId: o.individualId,
        individualName: selectedIndividualName || "Individual",
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

      setOrders(mapped);
    } catch (e: any) {
      console.error("[MedicationPage] reloadOrdersOnly failed:", e);
    }
  };

  // ======================================
  // Load MAR data từ API
  // ======================================
  useEffect(() => {
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

        const data = await res.json();

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
            // ✅ status can be null
            status: (a.status as AdminStatus) ?? null,
            reason: a.reason ?? undefined,
            vitalsSummary: a.vitalsSummary ?? undefined,
            staffName: a.staffName ?? undefined,
            notes: a.notes ?? undefined,
          };
        });

        setOrders(mappedOrders);
        setAdmins(mappedAdmins);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("[MedicationPage] Load MAR failed:", err);
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

    if (selectedIndividual) {
      loadMar();
    }

    return () => controller.abort();
  }, [selectedIndividual, selectedMonth, selectedIndividualName]);

  /* ---------- Overview Metrics ---------- */

  const totalActiveOrders = orders.filter((o) => o.status === "ACTIVE").length;
  const totalControlled = mockInventory.filter((i) => i.isControlled).length;
  const openIncidents = mockIncidents.filter(
    (i) => i.status !== "Closed",
  ).length;

  const recentPrn = admins.filter(
    (a) =>
      a.status === "GIVEN" &&
      orders.some((o) => o.id === a.orderId && o.type === "PRN"),
  ).length;

  /* ---------- Orders Tab Data ---------- */

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (selectedIndividual && o.individualId !== selectedIndividual)
        return false;
      if (selectedStatus !== "ALL" && o.status !== selectedStatus) return false;
      if (selectedType !== "ALL" && o.type !== selectedType) return false;
      if (searchOrders.trim()) {
        const term = searchOrders.toLowerCase();
        const blob = `${o.individualName} ${o.medicationName} ${o.route} ${
          o.frequencyText ?? ""
        } ${o.prescriber ?? ""}`.toLowerCase();
        if (!blob.includes(term)) return false;
      }
      return true;
    });
  }, [orders, selectedIndividual, selectedStatus, selectedType, searchOrders]);

  /* ---------- MAR helpers ---------- */

  const getDaysInMonth = (monthValue: string) => {
    const [yearStr, monthStr] = monthValue.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!year || !month) return 30;
    return new Date(year, month, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedMonth);

  const marOrders = useMemo(() => {
    const base = orders.filter(
      (o) => o.individualId === selectedIndividual && o.status === "ACTIVE",
    );
    if (selectedOrderForMar === "ALL") return base;
    return base.filter((o) => o.id === selectedOrderForMar);
  }, [orders, selectedIndividual, selectedOrderForMar]);

  const getAdminsForCell = (
    orderId: string,
    day: number,
    timeOfDay?: string,
  ): MedicationAdmin[] => {
    return admins.filter((a) => {
      if (a.orderId !== orderId) return false;

      const ny = getNYDayAndTime(a.scheduledDateTime);
      if (!ny) return false;

      // ✅ compare by NY local day in month
      if (ny.day !== day) return false;

      if (timeOfDay) {
        return ny.timeHHMM === timeOfDay;
      }
      return true;
    });
  };

  const openMarModalForSlot = (
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

  const closeMarModal = () => {
    setMarModalState({ open: false });
  };

  /* ---------- PRN & Vitals Tab Data ---------- */

  const prnAdmins = useMemo(
    () =>
      admins.filter((a) =>
        orders.some((o) => o.id === a.orderId && o.type === "PRN"),
      ),
    [admins, orders],
  );

  /* ---------- Inventory Tab Data ---------- */

  const inventoryForIndividual = mockInventory.filter(
    (i) => i.individualId === selectedIndividual,
  );

  /* ---------- Incidents Tab Data ---------- */

  const incidentsForIndividual = mockIncidents.filter(
    (i) => i.individualName === selectedIndividualName,
  );

  /* ---------- Add Order handlers ---------- */

  const openAddOrder = () => {
    setAddOrderError(null);
    setAddOrderOpen(true);
  };

  const closeAddOrder = () => {
    if (addOrderSaving) return;
    setAddOrderOpen(false);
  };

  const handleCreateOrder = async (payload: {
    medicationName: string;
    form?: string | null;
    doseValue: number;
    doseUnit: string;
    route?: string | null;
    type: MedicationType;
    frequencyText?: string | null;
    timesOfDay?: string[];
    startDate: string; // yyyy-mm-dd
    endDate?: string | null; // yyyy-mm-dd
    prescriberName?: string | null;
    pharmacyName?: string | null;
    indications?: string | null;
    allergyFlag?: boolean;
    status?: MedicationStatus;
  }) => {
    setAddOrderError(null);

    if (!selectedIndividual) {
      setAddOrderError("Missing individual selection.");
      return;
    }

    try {
      setAddOrderSaving(true);

      const res = await fetch("/api/medication/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          individualId: selectedIndividual,
          ...payload,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || res.statusText);
      }

      setAddOrderOpen(false);

      await reloadOrdersOnly();

      setActiveTab("ORDERS");
    } catch (err: any) {
      console.error("[MedicationPage] Create order failed:", err);
      setAddOrderError(err?.message ?? "Create order failed.");
    } finally {
      setAddOrderSaving(false);
    }
  };

  /* ================================
     Render
  ================================= */

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-bac-text">Medication</h1>
          <p className="mt-1 text-sm text-bac-muted">
            End-to-end medication management: orders, MAR, PRN, inventory,
            incidents and reports.
          </p>
        </div>
        <button
          onClick={openAddOrder}
          className="rounded-2xl bg-bac-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
        >
          Add order
        </button>
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

      {/* Main Tabs */}
      <div className="flex gap-2 rounded-2xl border border-bac-border bg-bac-panel p-1 text-sm">
        {renderMainTabButton(
          "OVERVIEW",
          "Overview",
          "High level dashboard",
          activeTab,
          setActiveTab,
        )}
        {renderMainTabButton(
          "ORDERS",
          "Orders",
          "Master data & orders",
          activeTab,
          setActiveTab,
        )}
        {renderMainTabButton(
          "MAR",
          "MAR",
          "Monthly eMAR",
          activeTab,
          setActiveTab,
        )}
        {renderMainTabButton(
          "PRN",
          "PRN & Vitals",
          "PRN log with vitals",
          activeTab,
          setActiveTab,
        )}
        {renderMainTabButton(
          "INVENTORY",
          "Inventory & Controlled",
          "Stock, controlled meds",
          activeTab,
          setActiveTab,
        )}
        {renderMainTabButton(
          "INCIDENTS",
          "Incidents & Reports",
          "Errors, refusals, exports",
          activeTab,
          setActiveTab,
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "OVERVIEW" && (
          <OverviewTab
            individualName={selectedIndividualName}
            month={selectedMonth}
            totalActiveOrders={totalActiveOrders}
            totalControlled={totalControlled}
            openIncidents={openIncidents}
            recentPrn={recentPrn}
          />
        )}

        {activeTab === "ORDERS" && (
          <OrdersTab
            orders={filteredOrders}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            searchOrders={searchOrders}
            setSearchOrders={setSearchOrders}
          />
        )}

        {activeTab === "MAR" && (
          <MarTab
            month={selectedMonth}
            selectedIndividualName={selectedIndividualName}
            marOrders={marOrders}
            daysInMonth={daysInMonth}
            selectedOrderForMar={selectedOrderForMar}
            setSelectedOrderForMar={setSelectedOrderForMar}
            openSlot={openMarModalForSlot}
            getAdminsForCell={getAdminsForCell}
          />
        )}

        {activeTab === "PRN" && (
          <PrnTab prnAdmins={prnAdmins} month={selectedMonth} />
        )}

        {activeTab === "INVENTORY" && (
          <InventoryTab inventoryItems={inventoryForIndividual} />
        )}

        {activeTab === "INCIDENTS" && (
          <IncidentsTab
            incidents={incidentsForIndividual}
            month={selectedMonth}
            individualName={selectedIndividualName}
          />
        )}
      </div>

      {/* MAR entry modal */}
      {marModalState.open && marModalState.order && (
        <MarEntryModal state={marModalState} onClose={closeMarModal} />
      )}

      {/* ✅ Add Order modal */}
      {addOrderOpen && (
        <AddOrderModal
          individualName={selectedIndividualName}
          defaultStartDate={monthToStartDate(selectedMonth)}
          saving={addOrderSaving}
          error={addOrderError}
          onClose={closeAddOrder}
          onCreate={handleCreateOrder}
        />
      )}
    </div>
  );
};

/* ================================
   Sub Components
================================ */

const renderMainTabButton = (
  id: MainTab,
  label: string,
  desc: string,
  activeTab: MainTab,
  setActiveTab: (t: MainTab) => void,
) => (
  <button
    key={id}
    onClick={() => setActiveTab(id)}
    className={`flex flex-1 flex-col rounded-2xl px-3 py-2 text-left transition ${
      activeTab === id
        ? "bg-bac-bg text-bac-text"
        : "text-bac-muted hover:bg-bac-bg/60"
    }`}
  >
    <span className="text-xs font-semibold">{label}</span>
    <span className="mt-0.5 text-[10px]">{desc}</span>
  </button>
);

/* ---------- Overview Tab ---------- */

const OverviewTab: React.FC<{
  individualName: string;
  month: string;
  totalActiveOrders: number;
  totalControlled: number;
  openIncidents: number;
  recentPrn: number;
}> = ({
  individualName,
  month,
  totalActiveOrders,
  totalControlled,
  openIncidents,
  recentPrn,
}) => {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          label="Active orders"
          value={totalActiveOrders.toString()}
        />
        <MetricCard
          label="Active PRN administrations (recent)"
          value={recentPrn.toString()}
        />
        <MetricCard
          label="Controlled medications"
          value={totalControlled.toString()}
        />
        <MetricCard label="Open incidents" value={openIncidents.toString()} />
      </div>

      <div className="grid h-full gap-4 md:grid-cols-[2fr,1.2fr]">
        <div className="flex h-full flex-col rounded-2xl border border-bac-border bg-bac-panel p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-bac-text">
                Today&apos;s medication schedule
              </h2>
              <p className="text-xs text-bac-muted">
                Upcoming doses for {individualName} in{" "}
                {month || "selected month"}.
              </p>
            </div>
          </div>
          <div className="mt-4 flex-1 space-y-2 overflow-auto text-sm">
            <div className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2">
              <div className="flex justify-between">
                <span className="font-medium text-bac-text">
                  08:00 – Metformin 500 mg PO
                </span>
                <span className="text-xs text-bac-muted">Scheduled</span>
              </div>
              <div className="mt-1 text-xs text-bac-muted">
                Take with breakfast. DSP to verify BG.
              </div>
            </div>
            <div className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2">
              <div className="flex justify-between">
                <span className="font-medium text-bac-text">
                  20:00 – Metformin 500 mg PO
                </span>
                <span className="text-xs text-bac-muted">Scheduled</span>
              </div>
              <div className="mt-1 text-xs text-bac-muted">
                Evening dose with meal.
              </div>
            </div>
            <div className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2">
              <div className="flex justify-between">
                <span className="font-medium text-bac-text">
                  21:00 – Atorvastatin 20 mg PO
                </span>
                <span className="text-xs text-bac-muted">Scheduled</span>
              </div>
              <div className="mt-1 text-xs text-bac-muted">
                Bedtime dose. Double-check allergies.
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-bac-border bg-bac-bg/40 px-3 py-2 text-xs text-bac-muted">
              PRN medications will appear here when ordered.
            </div>
          </div>
        </div>

        <div className="flex h-full flex-col rounded-2xl border border-bac-border bg-bac-panel p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-bac-text">
            Alerts & tasks
          </h2>
          <p className="text-xs text-bac-muted">
            Key items requiring follow-up for medication, inventory and
            incidents.
          </p>
          <div className="mt-4 flex-1 space-y-3 overflow-auto text-xs">
            <AlertItem
              label="Lorazepam 1 mg is a controlled medication – ensure double-sign on dispense/waste."
              type="warning"
            />
            <AlertItem
              label="Metformin 500 mg stock below 14 days – request refill from pharmacy."
              type="info"
            />
            <AlertItem
              label='Incident "Medication Error" from 11/02 still in review – complete incident form.'
              type="danger"
            />
            <AlertItem
              label="Run monthly MAR export for audit and share with RN/med-tech supervisor."
              type="info"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow-sm">
    <div className="text-xs font-medium uppercase tracking-wide text-bac-muted">
      {label}
    </div>
    <div className="mt-2 text-2xl font-semibold text-bac-text">{value}</div>
  </div>
);

const AlertItem: React.FC<{
  label: string;
  type: "info" | "warning" | "danger";
}> = ({ label, type }) => {
  const colors =
    type === "info"
      ? "border-bac-primary/40 bg-bac-primary/10 text-bac-primary"
      : type === "warning"
        ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-400"
        : "border-bac-red/40 bg-bac-red/10 text-bac-red";

  return (
    <div className={`rounded-xl border px-3 py-2 ${colors}`}>
      <span className="leading-snug">{label}</span>
    </div>
  );
};

/* ---------- Orders Tab ---------- */

const OrdersTab: React.FC<{
  orders: MedicationOrder[];
  selectedStatus: string;
  setSelectedStatus: (v: string) => void;
  selectedType: string;
  setSelectedType: (v: string) => void;
  searchOrders: string;
  setSearchOrders: (v: string) => void;
}> = ({
  orders,
  selectedStatus,
  setSelectedStatus,
  selectedType,
  setSelectedType,
  searchOrders,
  setSearchOrders,
}) => {
  const selectedOrder = orders[0];

  return (
    <div className="grid h-full gap-4 md:grid-cols-[2.2fr,1.2fr]">
      <div className="flex h-full flex-col gap-3">
        <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Status
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On hold</option>
                <option value="DISCONTINUED">Discontinued</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Type
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="PRN">PRN</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Search
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  className="flex-1 rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
                  placeholder="Search by medication, prescriber..."
                  value={searchOrders}
                  onChange={(e) => setSearchOrders(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchOrders("");
                    setSelectedStatus("ALL");
                    setSelectedType("ALL");
                  }}
                  className="rounded-xl border border-bac-border px-3 py-2 text-xs font-medium text-bac-muted hover:bg-bac-bg"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden rounded-2xl border border-bac-border bg-bac-panel shadow-sm">
          <div className="max-h-full overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-bac-panel/95 backdrop-blur">
                <tr className="border-b border-bac-border text-xs uppercase tracking-wide text-bac-muted">
                  <th className="px-4 py-3">Medication</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Start / End</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-sm text-bac-muted"
                    >
                      No medication orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr
                      key={o.id}
                      className="border-t border-bac-border hover:bg-bac-bg/40"
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-bac-text">
                          {o.medicationName} {o.doseValue}
                          {o.doseUnit}
                        </div>
                        <div className="text-xs text-bac-muted">
                          Prescriber: {o.prescriber ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-bac-text">
                        {o.route}
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-bac-text">
                        {o.type === "SCHEDULED" ? "Scheduled" : "PRN"}
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-bac-text">
                        {o.type === "SCHEDULED"
                          ? `${o.frequencyText ?? ""} ${
                              o.timesOfDay?.length
                                ? "– " + [...o.timesOfDay].sort().join(", ")
                                : ""
                            }`
                          : "PRN"}
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-bac-text">
                        {formatDate(o.startDate)}{" "}
                        <span className="text-bac-muted">
                          – {o.endDate ? formatDate(o.endDate) : "Ongoing"}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <OrderStatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="hidden flex-col gap-3 md:flex">
        <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-bac-text">
            Master data snapshot
          </h2>
          <p className="mt-1 text-xs text-bac-muted">
            Medication profile, indications, prescriber and pharmacy info.
          </p>
          {selectedOrder ? (
            <div className="mt-4 space-y-2 text-sm">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                  Medication
                </div>
                <div className="mt-1 font-medium text-bac-text">
                  {selectedOrder.medicationName} {selectedOrder.doseValue}
                  {selectedOrder.doseUnit} ({selectedOrder.route})
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Prescriber
                  </div>
                  <div className="mt-1 text-sm text-bac-text">
                    {selectedOrder.prescriber ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Pharmacy
                  </div>
                  <div className="mt-1 text-sm text-bac-text">
                    {selectedOrder.pharmacy ?? "—"}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                  Indications
                </div>
                <div className="mt-1 text-sm text-bac-text">
                  {selectedOrder.indications ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                  Allergy / contraindication
                </div>
                <div className="mt-1 text-sm text-bac-text">
                  {selectedOrder.allergiesFlag
                    ? "⚠ Allergy note present – check allergy profile before administering."
                    : "No allergy flags recorded for this medication."}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-xs text-bac-muted">
              Select a medication order on the left to view master data summary.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const OrderStatusBadge: React.FC<{ status: MedicationStatus }> = ({
  status,
}) => {
  let label = "";
  let className = "";
  switch (status) {
    case "ACTIVE":
      label = "Active";
      className = "bg-bac-green/15 text-bac-green border-bac-green/40";
      break;
    case "ON_HOLD":
      label = "On hold";
      className = "bg-yellow-500/15 text-yellow-500 border-yellow-500/40";
      break;
    case "DISCONTINUED":
      label = "Discontinued";
      className = "bg-bac-red/15 text-bac-red border-bac-red/40";
      break;
  }
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
};

/* ---------- MAR Tab ---------- */

const MarTab: React.FC<{
  month: string;
  selectedIndividualName: string;
  marOrders: MedicationOrder[];
  daysInMonth: number;
  selectedOrderForMar: string;
  setSelectedOrderForMar: (v: string) => void;
  openSlot: (order: MedicationOrder, day: number, timeOfDay?: string) => void;
  getAdminsForCell: (
    orderId: string,
    day: number,
    timeOfDay?: string,
  ) => MedicationAdmin[];
}> = ({
  month,
  selectedIndividualName,
  marOrders,
  daysInMonth,
  selectedOrderForMar,
  setSelectedOrderForMar,
  openSlot,
  getAdminsForCell,
}) => {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-bac-text">
            Monthly MAR – {selectedIndividualName}
          </h2>
          <p className="text-xs text-bac-muted">
            eMAR with per-dose documentation for {month || "selected"}.
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
              {marOrders.map((o) => (
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
    </div>
  );
};

/* ---------- PRN & Vitals Tab ---------- */

const PrnTab: React.FC<{ prnAdmins: MedicationAdmin[]; month: string }> = ({
  prnAdmins,
  month,
}) => {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-bac-text">
            PRN log & vitals
          </h2>
          <p className="text-xs text-bac-muted">
            PRN administrations with reason and vitals. Month: {month || "—"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl border border-bac-border bg-bac-panel shadow-sm">
        <div className="max-h-full overflow-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-bac-panel/95 backdrop-blur">
              <tr className="border-b border-bac-border text-[11px] uppercase tracking-wide text-bac-muted">
                <th className="px-4 py-3">Date/Time</th>
                <th className="px-4 py-3">Individual</th>
                <th className="px-4 py-3">Medication</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reason / Effectiveness</th>
                <th className="px-4 py-3">Vitals</th>
                <th className="px-4 py-3">Staff</th>
              </tr>
            </thead>
            <tbody>
              {prnAdmins.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm text-bac-muted"
                  >
                    No PRN administrations recorded.
                  </td>
                </tr>
              ) : (
                prnAdmins.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t border-bac-border hover:bg-bac-bg/40"
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="text-xs text-bac-text">
                        {formatDate(a.scheduledDateTime)}
                      </div>
                      <div className="text-[11px] text-bac-muted">
                        Scheduled:{" "}
                        {new Date(a.scheduledDateTime).toLocaleTimeString(
                          undefined,
                          { hour: "2-digit", minute: "2-digit", timeZone: TZ },
                        )}
                        {a.actualDateTime && (
                          <>
                            {" "}
                            • Actual:{" "}
                            {new Date(a.actualDateTime).toLocaleTimeString(
                              undefined,
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: TZ,
                              },
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-bac-text">
                      {a.individualName}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-bac-text">
                      {a.medicationName} {a.doseValue}
                      {a.doseUnit} ({a.route})
                    </td>
                    <td className="px-4 py-3 align-top text-xs">
                      <span
                        className={`rounded-full px-2 py-0.5 ${marStatusClass(
                          a.status,
                        )}`}
                      >
                        {(a.status ?? "—").toString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-bac-text">
                      {a.reason ?? "—"}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-bac-text">
                      {a.vitalsSummary ?? "—"}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-bac-text">
                      {a.staffName ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ---------- Inventory & Controlled Tab ---------- */

const InventoryTab: React.FC<{ inventoryItems: InventoryItem[] }> = ({
  inventoryItems,
}) => {
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-bac-text">
          Inventory & controlled meds – per individual
        </h2>
        <p className="text-xs text-bac-muted">
          Track balance, low stock alerts and controlled medication counts.
        </p>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl border border-bac-border bg-bac-panel shadow-sm">
        <div className="max-h-full overflow-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-bac-panel/95 backdrop-blur">
              <tr className="border-b border-bac-border text-[11px] uppercase tracking-wide text-bac-muted">
                <th className="px-4 py-3">Medication</th>
                <th className="px-4 py-3">Controlled</th>
                <th className="px-4 py-3">Current stock</th>
                <th className="px-4 py-3">Min threshold</th>
                <th className="px-4 py-3">Est. days remaining</th>
                <th className="px-4 py-3">Last count</th>
              </tr>
            </thead>
            <tbody>
              {inventoryItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-sm text-bac-muted"
                  >
                    No inventory records for this individual.
                  </td>
                </tr>
              ) : (
                inventoryItems.map((i) => {
                  const low = i.currentQuantity <= i.minThreshold;
                  return (
                    <tr
                      key={i.id}
                      className="border-t border-bac-border hover:bg-bac-bg/40"
                    >
                      <td className="px-4 py-3 align-top text-xs text-bac-text">
                        {i.medicationName}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-bac-text">
                        {i.isControlled ? "Yes – Controlled" : "No"}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-bac-text">
                        {i.currentQuantity} {i.unit}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-bac-text">
                        {i.minThreshold} {i.unit}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-bac-text">
                        {i.daysRemaining ?? "—"}{" "}
                        {low && (
                          <span className="ml-1 rounded-full bg-bac-red/15 px-2 py-0.5 text-[10px] text-bac-red">
                            Low stock
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-bac-text">
                        {formatDate(i.lastCountDate)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ---------- Incidents & Reports Tab ---------- */

const IncidentsTab: React.FC<{
  incidents: IncidentRecord[];
  month: string;
  individualName: string;
}> = ({ incidents, month, individualName }) => {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-bac-text">
            Incidents & compliance
          </h2>
          <p className="text-xs text-bac-muted">
            Medication errors, refusals and audit trail for {individualName} –{" "}
            {month || "—"}.
          </p>
        </div>
        <button className="rounded-xl border border-bac-border px-3 py-2 text-xs font-medium text-bac-text hover:bg-bac-bg">
          Export monthly MAR & incident report
        </button>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl border border-bac-border bg-bac-panel shadow-sm">
        <div className="max-h-full overflow-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-bac-panel/95 backdrop-blur">
              <tr className="border-b border-bac-border text-[11px] uppercase tracking-wide text-bac-muted">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Medication</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-bac-muted"
                  >
                    No incidents recorded for this individual.
                  </td>
                </tr>
              ) : (
                incidents.map((i) => (
                  <tr
                    key={i.id}
                    className="border-t border-bac-border hover:bg-bac-bg/40"
                  >
                    <td className="px-4 py-3 align-top text-xs text-bac-text">
                      {formatDate(i.date)}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-bac-text">
                      {i.medicationName}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-bac-text">
                      {i.type}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-bac-text">
                      {i.severity}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-bac-text">
                      {i.status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ---------- MAR Entry Modal ---------- */

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

/* ---------- ✅ Add Order Modal ---------- */
/* (kept identical to your original; no changes needed) */

const AddOrderModal: React.FC<{
  individualName: string;
  defaultStartDate: string; // yyyy-mm-dd
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (payload: {
    medicationName: string;
    form?: string | null;
    doseValue: number;
    doseUnit: string;
    route?: string | null;
    type: MedicationType;
    frequencyText?: string | null;
    timesOfDay?: string[];
    startDate: string;
    endDate?: string | null;
    prescriberName?: string | null;
    pharmacyName?: string | null;
    indications?: string | null;
    allergyFlag?: boolean;
    status?: MedicationStatus;
  }) => void;
}> = ({
  individualName,
  defaultStartDate,
  saving,
  error,
  onClose,
  onCreate,
}) => {
  const [medicationName, setMedicationName] = useState("");
  const [form, setForm] = useState("");
  const [doseValue, setDoseValue] = useState<string>("");
  const [doseUnit, setDoseUnit] = useState("mg");
  const [route, setRoute] = useState("PO");

  const [type, setType] = useState<MedicationType>("SCHEDULED");
  const [frequencyText, setFrequencyText] = useState("");
  const [timesText, setTimesText] = useState("08:00, 20:00");

  const [startDate, setStartDate] = useState<string>(defaultStartDate || "");
  const [endDate, setEndDate] = useState<string>("");

  const [status, setStatus] = useState<MedicationStatus>("ACTIVE");

  const [prescriberName, setPrescriberName] = useState("");
  const [pharmacyName, setPharmacyName] = useState("");
  const [indications, setIndications] = useState("");
  const [allergyFlag, setAllergyFlag] = useState(false);

  const canSubmit = useMemo(() => {
    if (!medicationName.trim()) return false;
    const dv = Number(doseValue);
    if (!Number.isFinite(dv) || dv <= 0) return false;
    if (!doseUnit.trim()) return false;
    if (!startDate) return false;
    return true;
  }, [medicationName, doseValue, doseUnit, startDate]);

  const submit = () => {
    const dv = Number(doseValue);
    const times = type === "SCHEDULED" ? toTimesArray(timesText) : [];

    onCreate({
      medicationName: medicationName.trim(),
      form: form.trim() ? form.trim() : null,
      doseValue: Number.isFinite(dv) ? dv : 0,
      doseUnit: doseUnit.trim(),
      route: route.trim() ? route.trim() : null,
      type,
      frequencyText: frequencyText.trim() ? frequencyText.trim() : null,
      timesOfDay: times,
      startDate,
      endDate: endDate ? endDate : null,
      prescriberName: prescriberName.trim() ? prescriberName.trim() : null,
      pharmacyName: pharmacyName.trim() ? pharmacyName.trim() : null,
      indications: indications.trim() ? indications.trim() : null,
      allergyFlag,
      status,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-black/40"
        onClick={() => !saving && onClose()}
      />
      <div className="h-full w-full max-w-lg border-l border-bac-border bg-bac-panel p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-bac-text">Add order</h2>
            <p className="mt-1 text-xs text-bac-muted">
              Create a medication order for{" "}
              <span className="text-bac-text">{individualName}</span>.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-bac-border px-3 py-1 text-xs text-bac-muted hover:bg-bac-bg disabled:opacity-50"
          >
            Close
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-bac-red/40 bg-bac-red/10 px-3 py-2 text-sm text-bac-red">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-4 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Medication name <span className="text-bac-red">*</span>
              </label>
              <input
                value={medicationName}
                onChange={(e) => setMedicationName(e.target.value)}
                placeholder="e.g. Metformin"
                className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Form
              </label>
              <input
                value={form}
                onChange={(e) => setForm(e.target.value)}
                placeholder="e.g. tablet"
                className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Dose value <span className="text-bac-red">*</span>
              </label>
              <input
                value={doseValue}
                onChange={(e) => setDoseValue(e.target.value)}
                placeholder="e.g. 500"
                inputMode="decimal"
                className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Dose unit <span className="text-bac-red">*</span>
              </label>
              <input
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value)}
                placeholder="mg"
                className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Route
              </label>
              <input
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                placeholder="PO"
                className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MedicationType)}
                className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              >
                <option value="SCHEDULED">Scheduled</option>
                <option value="PRN">PRN</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MedicationStatus)}
                className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              >
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On hold</option>
                <option value="DISCONTINUED">Discontinued</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-xs text-bac-text">
                <input
                  type="checkbox"
                  checked={allergyFlag}
                  onChange={(e) => setAllergyFlag(e.target.checked)}
                />
                Allergy flag
              </label>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Start date <span className="text-bac-red">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Frequency
              </label>
              <input
                value={frequencyText}
                onChange={(e) => setFrequencyText(e.target.value)}
                placeholder="e.g. BID, TID, QHS, PRN"
                className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Times of day (Scheduled)
              </label>
              <input
                value={timesText}
                onChange={(e) => setTimesText(e.target.value)}
                disabled={type !== "SCHEDULED"}
                placeholder="08:00, 20:00"
                className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text disabled:opacity-50"
              />
              <div className="mt-1 text-[11px] text-bac-muted">
                Use comma or new lines. Example: 08:00, 20:00
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Prescriber
              </label>
              <input
                value={prescriberName}
                onChange={(e) => setPrescriberName(e.target.value)}
                placeholder="e.g. Dr. Smith"
                className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Pharmacy
              </label>
              <input
                value={pharmacyName}
                onChange={(e) => setPharmacyName(e.target.value)}
                placeholder="e.g. CVS"
                className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
              Indications / Notes
            </label>
            <textarea
              value={indications}
              onChange={(e) => setIndications(e.target.value)}
              rows={3}
              placeholder="Reason for medication, special notes..."
              className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-bac-border px-4 py-2 text-xs font-medium text-bac-muted hover:bg-bac-bg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit || saving}
            className="rounded-xl bg-bac-primary px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create order"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicationPage;

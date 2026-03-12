"use client";

import React, { useEffect, useMemo, useState } from "react";

/* ================================
   Types (kept consistent with legacy)
================================ */

type MedicationStatus = "ACTIVE" | "ON_HOLD" | "DISCONTINUED";
type MedicationType = "SCHEDULED" | "PRN";

interface MedicationOrder {
  id: string;
  orderNumber?: string;
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

  // Option B additions (optional, backward-safe)
  form?: string;
  strengthText?: string;
  doseAmount?: number;
  daysSupply?: number;
  refills?: number;
  directionsSig?: string;
  prnReason?: string;
  specialInstructions?: string;
}

interface IndividualOption {
  id: string;
  name: string;
  code?: string;
}

interface OrderFormPayload {
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

  strengthText?: string | null;
  doseAmount?: number | null;
  daysSupply?: number | null;
  refills?: number | null;
  directionsSig?: string | null;
  prnReason?: string | null;
  specialInstructions?: string | null;
}

/* ================================
   Mock fallback (same idea as legacy)
================================ */

const mockOrders: MedicationOrder[] = [
  {
    id: "order-1",
    orderNumber: "MO-2026-000001",
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
    form: "tablet",
    strengthText: "500 mg",
    doseAmount: 1,
    daysSupply: 90,
    refills: 3,
    directionsSig: "Take 1 tablet orally twice daily.",
    specialInstructions: "",
  },
  {
    id: "order-2",
    orderNumber: "MO-2026-000002",
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
    form: "tablet",
    strengthText: "20 mg",
    doseAmount: 1,
    daysSupply: 90,
    refills: 1,
    directionsSig: "Take 1 tablet orally at bedtime.",
    specialInstructions: "Give at night.",
  },
  {
    id: "order-3",
    orderNumber: "MO-2026-000003",
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
    form: "tablet",
    strengthText: "1 mg",
    doseAmount: 1,
    daysSupply: 30,
    refills: 0,
    directionsSig: "Take 1 tablet orally as needed.",
    prnReason: "Anxiety / agitation",
    specialInstructions: "Monitor response after administration.",
  },
];

/* ================================
   Constants
================================ */

const FORM_OPTIONS = [
  "tablet",
  "capsule",
  "softgel",
  "liquid",
  "solution",
  "suspension",
  "syrup",
  "cream",
  "ointment",
  "lotion",
  "gel",
  "spray",
  "inhalation solution",
  "nebulizer solution",
  "patch",
  "shampoo",
  "powder",
  "other",
] as const;

const ROUTE_OPTIONS = [
  "PO",
  "Oral",
  "Topical",
  "External",
  "Nasal",
  "Inhalation",
  "Nebulizer",
  "Ophthalmic",
  "Otic",
  "Rectal",
  "Sublingual",
  "Injection",
  "Transdermal",
  "G-tube",
  "other",
] as const;

const DOSE_UNIT_OPTIONS = [
  "mg",
  "mcg",
  "units",
  "drops",
  "sprays",
  "ml",
  "tsp",
  "Tbsp",
  "gm",
  "mea",
  "other",
] as const;

const FREQUENCY_OPTIONS = [
  "Daily",
  "BID",
  "TID",
  "QID",
  "QHS",
  "PRN",
  "Weekly",
  "Twice weekly",
  "As directed",
  "other",
] as const;

/* ================================
   Helpers
================================ */

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

function openOrderPrintPage(orderId: string) {
  if (!orderId) return;
  window.open(`/medication/orders/print/${orderId}`, "_blank", "noopener,noreferrer");
}

/* ================================
   Orders Client
================================ */

export default function OrdersClient() {
  // Global filters (kept same UX concept)
  const [selectedIndividual, setSelectedIndividual] =
    useState<string>("IND-001");
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-01");

  // Individuals
  const [individualOptions, setIndividualOptions] = useState<
    IndividualOption[]
  >([]);
  const [individualLoading, setIndividualLoading] = useState(false);
  const [individualError, setIndividualError] = useState<string | null>(null);

  // Orders
  const [orders, setOrders] = useState<MedicationOrder[]>(mockOrders);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  // Orders tab filters
  const [searchOrders, setSearchOrders] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // Selected order (row click)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Add Order modal
  const [addOrderOpen, setAddOrderOpen] = useState(false);
  const [addOrderSaving, setAddOrderSaving] = useState(false);
  const [addOrderError, setAddOrderError] = useState<string | null>(null);

  // Edit Order modal
  const [editOrderOpen, setEditOrderOpen] = useState(false);
  const [editOrderSaving, setEditOrderSaving] = useState(false);
  const [editOrderError, setEditOrderError] = useState<string | null>(null);

  // Delete Order
  const [deleteOrderSaving, setDeleteOrderSaving] = useState(false);
  const [deleteOrderError, setDeleteOrderError] = useState<string | null>(null);

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
        console.error("[OrdersClient] Load individuals failed:", err);
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

  // Ensure selectedIndividual exists
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
  // Load Orders for selected individual
  // ======================================
  const reloadOrdersOnly = async () => {
    if (!selectedIndividual) return;

    setOrdersLoading(true);
    setOrdersError(null);

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
        orderNumber: o.orderNumber ?? undefined,
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

        // New optional fields - read only if backend already returns them
        form: o.form ?? undefined,
        strengthText: o.strengthText ?? undefined,
        doseAmount: o.doseAmount ?? undefined,
        daysSupply: o.daysSupply ?? undefined,
        refills: o.refills ?? undefined,
        directionsSig: o.directionsSig ?? undefined,
        prnReason: o.prnReason ?? undefined,
        specialInstructions: o.specialInstructions ?? undefined,
      }));

      const nextOrders = mapped.length ? mapped : mockOrders;
      setOrders(nextOrders);
    } catch (e: any) {
      console.error("[OrdersClient] reloadOrdersOnly failed:", e);
      setOrdersError(e?.message ?? "Failed to load orders.");
      const fallback = mockOrders.filter(
        (o) => o.individualId === selectedIndividual,
      );
      setOrders(fallback.length ? fallback : mockOrders);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedIndividual) return;
    void reloadOrdersOnly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndividual, selectedIndividualName]);

  /* ---------- Orders filtering ---------- */

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (selectedIndividual && o.individualId !== selectedIndividual)
        return false;
      if (selectedStatus !== "ALL" && o.status !== selectedStatus) return false;
      if (selectedType !== "ALL" && o.type !== selectedType) return false;
      if (searchOrders.trim()) {
        const term = searchOrders.toLowerCase();
        const blob = `${o.orderNumber ?? ""} ${o.individualName} ${o.medicationName} ${o.route} ${
          o.frequencyText ?? ""
        } ${o.prescriber ?? ""} ${o.form ?? ""} ${o.strengthText ?? ""} ${
          o.specialInstructions ?? ""
        }`.toLowerCase();
        if (!blob.includes(term)) return false;
      }
      return true;
    });
  }, [orders, selectedIndividual, selectedStatus, selectedType, searchOrders]);

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedOrderId(null);
      return;
    }

    const exists = filteredOrders.some((o) => o.id === selectedOrderId);
    if (!selectedOrderId || !exists) {
      setSelectedOrderId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedOrderId]);

  const selectedOrder =
    filteredOrders.find((o) => o.id === selectedOrderId) ?? filteredOrders[0];

  /* ---------- Add Order handlers ---------- */

  const openAddOrder = () => {
    setAddOrderError(null);
    setAddOrderOpen(true);
  };

  const closeAddOrder = () => {
    if (addOrderSaving) return;
    setAddOrderOpen(false);
  };

  const handleCreateOrder = async (payload: OrderFormPayload) => {
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

      const createdId = data?.order?.id ? String(data.order.id) : null;

      setAddOrderOpen(false);
      await reloadOrdersOnly();

      if (createdId) {
        setSelectedOrderId(createdId);
      }
    } catch (err: any) {
      console.error("[OrdersClient] Create order failed:", err);
      setAddOrderError(err?.message ?? "Create order failed.");
    } finally {
      setAddOrderSaving(false);
    }
  };

  /* ---------- Edit Order handlers ---------- */

  const openEditOrder = () => {
    if (!selectedOrder) return;
    setEditOrderError(null);
    setEditOrderOpen(true);
  };

  const closeEditOrder = () => {
    if (editOrderSaving) return;
    setEditOrderOpen(false);
  };

  const handleUpdateOrder = async (payload: OrderFormPayload) => {
    setEditOrderError(null);

    if (!selectedOrder) {
      setEditOrderError("No selected order.");
      return;
    }

    try {
      setEditOrderSaving(true);

      const res = await fetch("/api/medication/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedOrder.id,
          ...payload,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || res.statusText);
      }

      setEditOrderOpen(false);
      await reloadOrdersOnly();
      setSelectedOrderId(selectedOrder.id);
    } catch (err: any) {
      console.error("[OrdersClient] Update order failed:", err);
      setEditOrderError(err?.message ?? "Update order failed.");
    } finally {
      setEditOrderSaving(false);
    }
  };

  /* ---------- Delete Order handlers ---------- */

  const handleDeleteOrder = async () => {
    setDeleteOrderError(null);

    if (!selectedOrder) {
      setDeleteOrderError("No selected order.");
      return;
    }

    const ok = window.confirm(
      `Are you sure you want to delete this order?\n\n${selectedOrder.medicationName}`,
    );
    if (!ok) return;

    try {
      setDeleteOrderSaving(true);

      const res = await fetch(
        `/api/medication/orders?id=${encodeURIComponent(selectedOrder.id)}`,
        {
          method: "DELETE",
        },
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || res.statusText);
      }

      const deletedId = selectedOrder.id;
      await reloadOrdersOnly();

      const remaining = filteredOrders.filter((o) => o.id !== deletedId);
      setSelectedOrderId(remaining[0]?.id ?? null);
    } catch (err: any) {
      console.error("[OrdersClient] Delete order failed:", err);
      setDeleteOrderError(err?.message ?? "Delete order failed.");
    } finally {
      setDeleteOrderSaving(false);
    }
  };

  /* ================================
     Render
  ================================= */

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-bac-text">Medication</h1>
          <p className="mt-1 text-sm text-bac-muted">
            Physician orders (Scheduled + PRN) — master medication profile,
            start/end, dose, route, prescriber and pharmacy.
          </p>
        </div>
        <button
          onClick={openAddOrder}
          className="rounded-2xl bg-bac-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
        >
          Add order
        </button>
      </div>

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
          <div className="mt-1 text-[11px] text-bac-muted">
            (Used by MAR/Reports later — kept here to preserve global UX.)
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-end gap-1 text-xs">
          {individualLoading && (
            <span className="text-bac-muted">Loading individuals...</span>
          )}
          {individualError && !individualLoading && (
            <span className="text-bac-red">{individualError}</span>
          )}
          {ordersLoading && (
            <span className="text-bac-muted">Loading orders...</span>
          )}
          {ordersError && !ordersLoading && (
            <span className="text-bac-red">{ordersError}</span>
          )}
        </div>
      </div>

      <div className="grid h-full gap-4 md:grid-cols-[2.6fr,1.15fr]">
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
                    placeholder="Search by order #, medication, prescriber..."
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
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Medication</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Schedule</th>
                    <th className="px-4 py-3">Instruction</th>
                    <th className="px-4 py-3">Start / End</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Print</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-6 text-center text-sm text-bac-muted"
                      >
                        No medication orders found.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => {
                      const isSelected = o.id === selectedOrder?.id;

                      return (
                        <tr
                          key={o.id}
                          onClick={() => setSelectedOrderId(o.id)}
                          onDoubleClick={() => {
                            setSelectedOrderId(o.id);
                            setEditOrderError(null);
                            setEditOrderOpen(true);
                          }}
                          className={`cursor-pointer border-t border-bac-border ${
                            isSelected
                              ? "bg-bac-bg/70 ring-1 ring-inset ring-bac-primary/50"
                              : "hover:bg-bac-bg/40"
                          }`}
                        >
                          <td className="px-4 py-3 align-top text-sm text-bac-text">
                            <div className="font-medium text-bac-text">
                              {o.orderNumber || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="font-medium text-bac-text">
                              {o.medicationName}{" "}
                              {o.strengthText
                                ? o.strengthText
                                : `${o.doseValue}${o.doseUnit}`}
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
                            <div
                              title={o.specialInstructions?.trim() || ""}
                              className="max-w-[220px] whitespace-pre-wrap break-words text-sm text-bac-text"
                            >
                              {o.specialInstructions?.trim() || "—"}
                            </div>
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
                          <td className="px-4 py-3 align-top">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openOrderPrintPage(o.id);
                              }}
                              className="rounded-xl border border-bac-border px-3 py-1.5 text-xs font-medium text-bac-text hover:bg-bac-bg"
                            >
                              Print
                            </button>
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

        <div className="hidden flex-col gap-3 md:flex">
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-bac-text">
                  Master data snapshot
                </h2>
                <p className="mt-1 text-xs text-bac-muted">
                  Medication profile, indications, prescriber and pharmacy info.
                </p>
              </div>
              {selectedOrder && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openOrderPrintPage(selectedOrder.id)}
                    className="rounded-xl border border-bac-border px-3 py-2 text-xs font-medium text-bac-text hover:bg-bac-bg"
                  >
                    Print order
                  </button>
                  <button
                    type="button"
                    onClick={openEditOrder}
                    className="rounded-xl border border-bac-border px-3 py-2 text-xs font-medium text-bac-text hover:bg-bac-bg"
                  >
                    Edit order
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteOrder}
                    disabled={deleteOrderSaving}
                    className="rounded-xl border border-bac-red/40 px-3 py-2 text-xs font-medium text-bac-red hover:bg-bac-red/10 disabled:opacity-50"
                  >
                    {deleteOrderSaving ? "Deleting..." : "Delete order"}
                  </button>
                </div>
              )}
            </div>

            {deleteOrderError && (
              <div className="mt-3 rounded-xl border border-bac-red/40 bg-bac-red/10 px-3 py-2 text-xs text-bac-red">
                {deleteOrderError}
              </div>
            )}

            {selectedOrder ? (
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Order number
                  </div>
                  <div className="mt-1 font-medium text-bac-text">
                    {selectedOrder.orderNumber || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Medication
                  </div>
                  <div className="mt-1 font-medium text-bac-text">
                    {selectedOrder.medicationName}{" "}
                    {selectedOrder.strengthText
                      ? selectedOrder.strengthText
                      : `${selectedOrder.doseValue}${selectedOrder.doseUnit}`}{" "}
                    ({selectedOrder.route})
                  </div>
                  {selectedOrder.form && (
                    <div className="mt-1 text-xs text-bac-muted">
                      Form: {selectedOrder.form}
                    </div>
                  )}
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

                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                      Dose amount
                    </div>
                    <div className="mt-1 text-sm text-bac-text">
                      {selectedOrder.doseAmount ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                      Refills / Days supply
                    </div>
                    <div className="mt-1 text-sm text-bac-text">
                      {selectedOrder.refills ?? "—"} /{" "}
                      {selectedOrder.daysSupply ?? "—"}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Directions / SIG
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-bac-text">
                    {selectedOrder.directionsSig ?? "—"}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Instruction
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-bac-text">
                    {selectedOrder.specialInstructions?.trim() || "—"}
                  </div>
                </div>

                {selectedOrder.prnReason && (
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                      PRN reason
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-bac-text">
                      {selectedOrder.prnReason}
                    </div>
                  </div>
                )}

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
                No orders to display.
              </div>
            )}
          </div>
        </div>
      </div>

      {addOrderOpen && (
        <OrderModal
          mode="create"
          title="Add order"
          subtitle={`Create a medication order for ${selectedIndividualName}.`}
          saving={addOrderSaving}
          error={addOrderError}
          onClose={closeAddOrder}
          onSubmit={handleCreateOrder}
          defaultStartDate={monthToStartDate(selectedMonth)}
        />
      )}

      {editOrderOpen && selectedOrder && (
        <OrderModal
          mode="edit"
          title="Edit order"
          subtitle={`Update medication order for ${selectedIndividualName}.`}
          saving={editOrderSaving}
          error={editOrderError}
          onClose={closeEditOrder}
          onSubmit={handleUpdateOrder}
          defaultStartDate={monthToStartDate(selectedMonth)}
          initialOrder={selectedOrder}
        />
      )}
    </div>
  );
}

/* ================================
   UI: Status Badge
================================ */

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

/* ================================
   Shared Order Modal (Create + Edit)
================================ */

const OrderModal: React.FC<{
  mode: "create" | "edit";
  title: string;
  subtitle: string;
  defaultStartDate: string;
  initialOrder?: MedicationOrder;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: OrderFormPayload) => void;
}> = ({
  mode,
  title,
  subtitle,
  defaultStartDate,
  initialOrder,
  saving,
  error,
  onClose,
  onSubmit,
}) => {
  const [medicationName, setMedicationName] = useState(
    initialOrder?.medicationName ?? "",
  );
  const [form, setForm] = useState(initialOrder?.form ?? "tablet");
  const [strengthText, setStrengthText] = useState(
    initialOrder?.strengthText ?? "",
  );
  const [doseValue, setDoseValue] = useState<string>(
    initialOrder?.doseValue != null ? String(initialOrder.doseValue) : "",
  );
  const [doseAmount, setDoseAmount] = useState<string>(
    initialOrder?.doseAmount != null ? String(initialOrder.doseAmount) : "1",
  );
  const [doseUnit, setDoseUnit] = useState(initialOrder?.doseUnit ?? "mg");
  const [route, setRoute] = useState(initialOrder?.route ?? "PO");

  const [type, setType] = useState<MedicationType>(
    initialOrder?.type ?? "SCHEDULED",
  );
  const [frequencyText, setFrequencyText] = useState(
    initialOrder?.frequencyText ?? "Daily",
  );
  const [timesText, setTimesText] = useState(
    initialOrder?.timesOfDay?.length
      ? initialOrder.timesOfDay.join(", ")
      : "08:00, 20:00",
  );

  const [startDate, setStartDate] = useState<string>(
    initialOrder?.startDate
      ? String(initialOrder.startDate).slice(0, 10)
      : defaultStartDate || "",
  );
  const [endDate, setEndDate] = useState<string>(
    initialOrder?.endDate ? String(initialOrder.endDate).slice(0, 10) : "",
  );

  const [daysSupply, setDaysSupply] = useState<string>(
    initialOrder?.daysSupply != null ? String(initialOrder.daysSupply) : "",
  );
  const [refills, setRefills] = useState<string>(
    initialOrder?.refills != null ? String(initialOrder.refills) : "",
  );

  const [status, setStatus] = useState<MedicationStatus>(
    initialOrder?.status ?? "ACTIVE",
  );

  const [prescriberName, setPrescriberName] = useState(
    initialOrder?.prescriber ?? "",
  );
  const [pharmacyName, setPharmacyName] = useState(
    initialOrder?.pharmacy ?? "",
  );
  const [directionsSig, setDirectionsSig] = useState(
    initialOrder?.directionsSig ?? "",
  );
  const [prnReason, setPrnReason] = useState(initialOrder?.prnReason ?? "");
  const [specialInstructions, setSpecialInstructions] = useState(
    initialOrder?.specialInstructions ?? "",
  );
  const [indications, setIndications] = useState(
    initialOrder?.indications ?? "",
  );
  const [allergyFlag, setAllergyFlag] = useState(
    initialOrder?.allergiesFlag ?? false,
  );

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
    const da = Number(doseAmount);
    const ds = Number(daysSupply);
    const rf = Number(refills);
    const times = type === "SCHEDULED" ? toTimesArray(timesText) : [];

    onSubmit({
      medicationName: medicationName.trim(),
      form: form.trim() ? form.trim() : null,
      strengthText: strengthText.trim() ? strengthText.trim() : null,
      doseValue: Number.isFinite(dv) ? dv : 0,
      doseAmount: Number.isFinite(da) ? da : null,
      doseUnit: doseUnit.trim(),
      route: route.trim() ? route.trim() : null,
      type,
      frequencyText: frequencyText.trim() ? frequencyText.trim() : null,
      timesOfDay: times,
      startDate,
      endDate: endDate ? endDate : null,
      daysSupply: Number.isFinite(ds) ? ds : null,
      refills: Number.isFinite(rf) ? rf : null,
      prescriberName: prescriberName.trim() ? prescriberName.trim() : null,
      pharmacyName: pharmacyName.trim() ? pharmacyName.trim() : null,
      directionsSig: directionsSig.trim() ? directionsSig.trim() : null,
      prnReason:
        type === "PRN" && prnReason.trim() ? prnReason.trim() : null,
      specialInstructions: specialInstructions.trim()
        ? specialInstructions.trim()
        : null,
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
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-bac-border bg-bac-panel p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-bac-text">{title}</h2>
            <p className="mt-1 text-xs text-bac-muted">{subtitle}</p>
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

        <div className="mt-5 space-y-5 text-sm">
          {/* Section A */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-bac-muted">
              Medication identity
            </div>

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
                <select
                  value={form}
                  onChange={(e) => setForm(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
                >
                  {FORM_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                  Strength / concentration
                </label>
                <input
                  value={strengthText}
                  onChange={(e) => setStrengthText(e.target.value)}
                  placeholder="e.g. 400 mg or 40 MEQ/15ML"
                  className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                  Route
                </label>
                <select
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
                >
                  {ROUTE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
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
          </div>

          {/* Section B */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-bac-muted">
              Administration
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
                  Dose amount
                </label>
                <input
                  value={doseAmount}
                  onChange={(e) => setDoseAmount(e.target.value)}
                  placeholder="e.g. 1"
                  inputMode="decimal"
                  className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                  Dose unit <span className="text-bac-red">*</span>
                </label>
                <select
                  value={doseUnit}
                  onChange={(e) => setDoseUnit(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
                >
                  {DOSE_UNIT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
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
                  Frequency
                </label>
                <select
                  value={frequencyText}
                  onChange={(e) => setFrequencyText(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
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
            </div>

            <div className="grid gap-3 md:grid-cols-2">
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
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                  PRN reason
                </label>
                <textarea
                  value={prnReason}
                  onChange={(e) => setPrnReason(e.target.value)}
                  rows={3}
                  disabled={type !== "PRN"}
                  placeholder={
                    type === "PRN"
                      ? "Reason for PRN use..."
                      : "Available when type = PRN"
                  }
                  className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Directions / SIG
              </label>
              <textarea
                value={directionsSig}
                onChange={(e) => setDirectionsSig(e.target.value)}
                rows={3}
                placeholder="e.g. Take 1 tablet orally once daily."
                className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              />
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                Special instructions
              </label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={2}
                placeholder="e.g. Give at night, rinse after 5-10 minutes..."
                className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
              />
            </div>
          </div>

          {/* Section C */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-bac-muted">
              Prescription info
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
                  Days supply
                </label>
                <input
                  value={daysSupply}
                  onChange={(e) => setDaysSupply(e.target.value)}
                  placeholder="e.g. 30"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                  Refills
                </label>
                <input
                  value={refills}
                  onChange={(e) => setRefills(e.target.value)}
                  placeholder="e.g. 1"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
                />
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
          </div>

          {/* Section D */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-bac-muted">
              Clinical notes
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
            {saving
              ? mode === "edit"
                ? "Saving..."
                : "Creating..."
              : mode === "edit"
                ? "Save changes"
                : "Create order"}
          </button>
        </div>
      </div>
    </div>
  );
};
"use client";

import React, { useEffect, useMemo, useState } from "react";

/* ================================
   Types (kept consistent with legacy)
================================ */

type MedicationStatus = "ACTIVE" | "ON_HOLD" | "DISCONTINUED";
type MedicationType = "SCHEDULED" | "PRN";

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

interface IndividualOption {
  id: string;
  name: string;
  code?: string;
}

/* ================================
   Mock fallback (same idea as legacy)
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

  // Add Order modal
  const [addOrderOpen, setAddOrderOpen] = useState(false);
  const [addOrderSaving, setAddOrderSaving] = useState(false);
  const [addOrderError, setAddOrderError] = useState<string | null>(null);

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

      setOrders(mapped.length ? mapped : mockOrders);
    } catch (e: any) {
      console.error("[OrdersClient] reloadOrdersOnly failed:", e);
      setOrdersError(e?.message ?? "Failed to load orders.");
      // fallback mock by selected individual
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
        const blob = `${o.individualName} ${o.medicationName} ${o.route} ${
          o.frequencyText ?? ""
        } ${o.prescriber ?? ""}`.toLowerCase();
        if (!blob.includes(term)) return false;
      }
      return true;
    });
  }, [orders, selectedIndividual, selectedStatus, selectedType, searchOrders]);

  const selectedOrder = filteredOrders[0];

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
    } catch (err: any) {
      console.error("[OrdersClient] Create order failed:", err);
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

      {/* Global selection bar (Individual + Month placeholder for later) */}
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

        {/* Status lines */}
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

      {/* Orders content */}
      <div className="grid h-full gap-4 md:grid-cols-[2.2fr,1.2fr]">
        <div className="flex h-full flex-col gap-3">
          {/* Filters */}
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

          {/* Table */}
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
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-sm text-bac-muted"
                      >
                        No medication orders found.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => (
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

        {/* Snapshot */}
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
                No orders to display.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Order modal */}
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
   UI: Add Order Modal (kept same fields/logic)
================================ */

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

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface MedicationOrder {
  id: string;
  individualId: string;
  medicationName: string;
  form: string | null;
  doseValue: number;
  doseUnit: string;
  route: string | null;
  type: string;
  frequencyText: string | null;
  timesOfDay: string[];
  startDate: string;
  endDate: string | null;
  prescriberName: string | null;
  pharmacyName: string | null;
  indications: string | null;
  allergyFlag: boolean;
  status: string;
}

interface IndividualOption {
  id: string;
  name: string;
  code?: string;
}

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function buildDisplayName(p: any): IndividualOption {
  const fullName = [p.firstName, p.middleName, p.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    id: p.id,
    name: fullName || p.code || "Individual",
    code: p.code ?? undefined,
  };
}

export default function OrdersClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [individuals, setIndividuals] = useState<IndividualOption[]>([]);
  const [individualId, setIndividualId] = useState<string>("");

  const [orders, setOrders] = useState<MedicationOrder[]>([]);
  const [loadingIndividuals, setLoadingIndividuals] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState<string>("");

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // 1) Decide initial individualId from query param first, then localStorage fallback
  useEffect(() => {
    const fromQuery = (sp.get("individualId") || "").trim();
    if (fromQuery) {
      setIndividualId(fromQuery);
      return;
    }
    try {
      const fromLS = (
        localStorage.getItem("selectedIndividualId") || ""
      ).trim();
      if (fromLS) setIndividualId(fromLS);
    } catch {
      // ignore
    }
  }, [sp]);

  // 2) Load individuals list (API first, fallback to minimal)
  useEffect(() => {
    const controller = new AbortController();

    async function loadIndividuals() {
      setLoadingIndividuals(true);
      setError("");

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

        const mapped: IndividualOption[] = list.map(buildDisplayName);

        // If API returns empty, keep minimal fallback so page still works
        if (mapped.length === 0) {
          setIndividuals([{ id: "IND-001", name: "John Smith" }]);
          if (!individualId) setIndividualId("IND-001");
        } else {
          setIndividuals(mapped);

          // If current individualId missing, pick first
          if (!individualId || !mapped.some((x) => x.id === individualId)) {
            setIndividualId(mapped[0].id);
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;

        console.error("[MedicationOrdersPage] loadIndividuals error:", err);
        setError(err?.message || "Failed to load individuals.");

        // fallback
        setIndividuals([{ id: "IND-001", name: "John Smith" }]);
        if (!individualId) setIndividualId("IND-001");
      } finally {
        setLoadingIndividuals(false);
      }
    }

    loadIndividuals();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3) When individualId changes, sync URL + localStorage (optional) and reload orders
  useEffect(() => {
    if (!individualId) return;

    // keep URL in sync for stability
    router.replace(
      `/medication/orders?individualId=${encodeURIComponent(individualId)}`,
    );

    // keep legacy flow working (optional)
    try {
      localStorage.setItem("selectedIndividualId", individualId);
    } catch {
      // ignore
    }
  }, [individualId, router]);

  // 4) Load orders for selected individual
  useEffect(() => {
    const controller = new AbortController();

    async function loadOrders() {
      if (!individualId) return;

      setLoadingOrders(true);
      setError("");

      try {
        const res = await fetch(
          `/api/medication/orders?individualId=${encodeURIComponent(individualId)}`,
          { signal: controller.signal },
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load orders");
        }

        setOrders(Array.isArray(data?.orders) ? data.orders : []);
      } catch (err: any) {
        if (err?.name === "AbortError") return;

        console.error("[MedicationOrdersPage] loadOrders error:", err);
        setError(err?.message || "Failed to load orders.");
        setOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    }

    loadOrders();
    return () => controller.abort();
  }, [individualId]);

  const selectedIndividualName =
    individuals.find((x) => x.id === individualId)?.name || "";

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    return orders.filter((o) => {
      if (
        statusFilter !== "ALL" &&
        (o.status || "").toUpperCase() !== statusFilter
      )
        return false;

      if (typeFilter !== "ALL" && (o.type || "").toUpperCase() !== typeFilter)
        return false;

      if (term) {
        const blob =
          `${o.medicationName} ${o.route ?? ""} ${o.frequencyText ?? ""} ${o.prescriberName ?? ""} ${o.pharmacyName ?? ""}`.toLowerCase();
        if (!blob.includes(term)) return false;
      }

      return true;
    });
  }, [orders, q, statusFilter, typeFilter]);

  const isBusy = loadingIndividuals || loadingOrders;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-bac-text">
            Medication Orders
          </h1>
          <p className="mt-1 text-sm text-bac-muted">
            View and filter medication orders by Individual. (Data depends on
            API / DB readiness.)
          </p>
        </div>
        <button className="rounded-2xl bg-bac-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90">
          Add order
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 rounded-2xl border border-bac-border bg-bac-panel p-4 text-sm shadow-sm">
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-bac-muted">
            Individual
          </span>
          <select
            className="mt-1 min-w-[260px] rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
            value={individualId}
            onChange={(e) => setIndividualId(e.target.value)}
            disabled={loadingIndividuals}
          >
            {individuals.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
                {i.code ? ` (${i.code})` : ""}
              </option>
            ))}
          </select>
          <div className="mt-1 text-[11px] text-bac-muted">
            {loadingIndividuals
              ? "Loading individuals..."
              : selectedIndividualName}
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-bac-muted">
            Search
          </span>
          <input
            className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
            placeholder="Search by medication, prescriber, pharmacy..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={isBusy}
          />
        </div>

        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-bac-muted">
            Status
          </span>
          <select
            className="mt-1 min-w-[160px] rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            disabled={isBusy}
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ON_HOLD">ON_HOLD</option>
            <option value="DISCONTINUED">DISCONTINUED</option>
          </select>
        </div>

        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-bac-muted">
            Type
          </span>
          <select
            className="mt-1 min-w-[160px] rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            disabled={isBusy}
          >
            <option value="ALL">All</option>
            <option value="SCHEDULED">SCHEDULED</option>
            <option value="PRN">PRN</option>
          </select>
        </div>

        <div className="flex flex-col justify-end">
          <button
            type="button"
            onClick={() => {
              setQ("");
              setStatusFilter("ALL");
              setTypeFilter("ALL");
            }}
            className="mt-5 rounded-xl border border-bac-border px-3 py-2 text-xs font-medium text-bac-muted hover:bg-bac-bg"
            disabled={isBusy}
          >
            Clear
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-end gap-1 text-xs">
          {isBusy && <span className="text-bac-muted">Loading...</span>}
          {!!error && !isBusy && <span className="text-bac-red">{error}</span>}
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
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-bac-muted"
                  >
                    {isBusy
                      ? "Loading orders..."
                      : "No medication orders found for this Individual."}
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border-bac-border hover:bg-bac-bg/40"
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-bac-text">
                        {o.medicationName}
                        {o.doseValue ? ` ${o.doseValue}` : ""}
                        {o.doseUnit ? o.doseUnit : ""}
                      </div>
                      <div className="text-xs text-bac-muted">
                        Prescriber: {o.prescriberName ?? "—"} • Pharmacy:{" "}
                        {o.pharmacyName ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-bac-text">
                      {o.route ?? "—"}
                    </td>
                    <td className="px-4 py-3 align-top text-bac-text">
                      {o.type}
                    </td>
                    <td className="px-4 py-3 align-top text-bac-text">
                      {o.type?.toUpperCase() === "SCHEDULED"
                        ? `${o.frequencyText ?? "—"}${
                            o.timesOfDay?.length
                              ? ` • ${o.timesOfDay.join(", ")}`
                              : ""
                          }`
                        : "PRN"}
                    </td>
                    <td className="px-4 py-3 align-top text-bac-text">
                      {formatDateShort(o.startDate)}{" "}
                      <span className="text-bac-muted">
                        → {o.endDate ? formatDateShort(o.endDate) : "Ongoing"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-bac-text">
                      {o.status ?? "ACTIVE"}
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
}

"use client";

import React, { useEffect, useMemo, useState } from "react";

type IndividualOption = {
  id: string;
  name: string;
  code?: string;
};

type InventoryItem = {
  id: string;
  medicationName: string;
  ndc?: string;
  isControlled: boolean;
  onHand: number; // units
  unitLabel: string; // e.g. tabs, ml
  lastUpdated: string; // yyyy-mm-dd
};

type InventoryTxn = {
  id: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  medicationName: string;
  type: "RECEIVE" | "DISPENSE" | "WASTE" | "ADJUST";
  qty: number;
  unitLabel: string;
  reason?: string;
  notes?: string;
};

function safeStr(v: any) {
  return String(v ?? "").trim();
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

export default function InventoryControlledClient() {
  const [selectedIndividual, setSelectedIndividual] = useState<string>("");

  const [individualOptions, setIndividualOptions] = useState<
    IndividualOption[]
  >([]);
  const [loadingIndividuals, setLoadingIndividuals] = useState(false);
  const [individualError, setIndividualError] = useState<string | null>(null);

  // Local-only inventory list (placeholder)
  const [items, setItems] = useState<InventoryItem[]>(() => [
    {
      id: "inv-1",
      medicationName: "Acetaminophen 325mg",
      ndc: "00000-0000-00",
      isControlled: false,
      onHand: 120,
      unitLabel: "tabs",
      lastUpdated: todayISO(),
    },
    {
      id: "inv-2",
      medicationName: "Oxycodone 5mg",
      ndc: "00000-0000-00",
      isControlled: true,
      onHand: 18,
      unitLabel: "tabs",
      lastUpdated: todayISO(),
    },
  ]);

  const [txns, setTxns] = useState<InventoryTxn[]>([]);

  // Create txn form
  const [form, setForm] = useState<Omit<InventoryTxn, "id">>({
    date: todayISO(),
    time: nowHHmm(),
    medicationName: "",
    type: "DISPENSE",
    qty: 1,
    unitLabel: "tabs",
    reason: "",
    notes: "",
  });

  // Filters
  const [q, setQ] = useState("");
  const [showControlledOnly, setShowControlledOnly] = useState(false);

  // Load Individuals (same API used in Medication module)
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
        console.error("[Inventory] loadIndividuals failed:", err);
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

  const filteredItems = useMemo(() => {
    const query = safeStr(q).toLowerCase();
    return items.filter((it) => {
      if (showControlledOnly && !it.isControlled) return false;
      if (!query) return true;
      return (
        it.medicationName.toLowerCase().includes(query) ||
        safeStr(it.ndc).toLowerCase().includes(query)
      );
    });
  }, [items, q, showControlledOnly]);

  const applyTxn = () => {
    if (!selectedIndividual) {
      alert("Please select an individual.");
      return;
    }

    const med = safeStr(form.medicationName);
    if (!med) {
      alert("Medication name is required.");
      return;
    }

    const qty = Number(form.qty);
    if (!Number.isFinite(qty) || qty <= 0) {
      alert("Qty must be a positive number.");
      return;
    }

    const txn: InventoryTxn = {
      id: crypto.randomUUID(),
      ...form,
      medicationName: med,
      qty,
    };

    setTxns((p) => [txn, ...p]);

    // Update onHand (local-only behavior)
    setItems((prev) => {
      const idx = prev.findIndex(
        (x) => x.medicationName.toLowerCase() === med.toLowerCase(),
      );
      const delta =
        txn.type === "RECEIVE"
          ? qty
          : txn.type === "DISPENSE" || txn.type === "WASTE"
            ? -qty
            : 0;

      if (idx === -1) {
        // if new med, create it
        return [
          {
            id: crypto.randomUUID(),
            medicationName: med,
            ndc: "",
            isControlled: false,
            onHand: Math.max(0, delta),
            unitLabel: txn.unitLabel || "tabs",
            lastUpdated: txn.date,
          },
          ...prev,
        ];
      }

      const copy = [...prev];
      const cur = copy[idx];
      copy[idx] = {
        ...cur,
        onHand: Math.max(0, Number(cur.onHand) + delta),
        unitLabel: txn.unitLabel || cur.unitLabel,
        lastUpdated: txn.date,
      };
      return copy;
    });

    // reset form
    setForm((p) => ({
      ...p,
      medicationName: "",
      qty: 1,
      reason: "",
      notes: "",
    }));
  };

  const deleteTxn = (id: string) =>
    setTxns((p) => p.filter((x) => x.id !== id));

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-bac-text">
            Inventory & Controlled
          </h1>
          <p className="mt-1 text-sm text-bac-muted">
            Track medication inventory and controlled substances. (UI shell now
            — backend will be wired later.)
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Inventory list */}
        <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-bac-text">
                On-hand Inventory
              </h2>
              <p className="mt-1 text-xs text-bac-muted">
                Individual:{" "}
                <span className="font-semibold text-bac-text">
                  {selectedIndividualObj?.name || "-"}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search medication or NDC..."
                className="h-10 w-[240px] rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary"
              />
              <label className="flex items-center gap-2 rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-xs text-bac-text">
                <input
                  type="checkbox"
                  checked={showControlledOnly}
                  onChange={(e) => setShowControlledOnly(e.target.checked)}
                />
                Controlled only
              </label>
            </div>
          </div>

          <div className="mt-4 overflow-auto rounded-2xl border border-bac-border">
            <table className="w-full text-sm text-bac-text">
              <thead className="sticky top-0 bg-bac-bg text-xs text-bac-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Medication</th>
                  <th className="px-3 py-2 text-left">NDC</th>
                  <th className="px-3 py-2 text-center">Controlled</th>
                  <th className="px-3 py-2 text-right">On hand</th>
                  <th className="px-3 py-2 text-left">Unit</th>
                  <th className="px-3 py-2 text-left">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-4 text-center text-bac-muted"
                    >
                      No inventory items.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((it) => (
                    <tr key={it.id} className="border-t border-bac-border">
                      <td className="px-3 py-2 font-medium">
                        {it.medicationName}
                      </td>
                      <td className="px-3 py-2">{safeStr(it.ndc)}</td>
                      <td className="px-3 py-2 text-center">
                        {it.isControlled ? "Yes" : "No"}
                      </td>
                      <td className="px-3 py-2 text-right">{it.onHand}</td>
                      <td className="px-3 py-2">{it.unitLabel}</td>
                      <td className="px-3 py-2">{it.lastUpdated}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 rounded-xl border border-bac-border bg-bac-bg p-3 text-xs text-bac-muted">
            Backend next: store inventory per Individual + monthly controlled
            logs for audit.
          </div>
        </div>

        {/* Transaction panel */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-bac-text">
              New Transaction
            </h2>
            <p className="mt-1 text-xs text-bac-muted">
              Receive / Dispense / Waste / Adjust (local-only for now).
            </p>

            <div className="mt-4 grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Date"
                  value={form.date}
                  onChange={(v) => setForm((p) => ({ ...p, date: v }))}
                  type="date"
                />
                <Field
                  label="Time"
                  value={form.time}
                  onChange={(v) => setForm((p) => ({ ...p, time: v }))}
                  type="time"
                />
              </div>

              <Field
                label="Medication (name)"
                value={form.medicationName}
                onChange={(v) => setForm((p) => ({ ...p, medicationName: v }))}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                    Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, type: e.target.value as any }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text"
                  >
                    <option value="RECEIVE">RECEIVE</option>
                    <option value="DISPENSE">DISPENSE</option>
                    <option value="WASTE">WASTE</option>
                    <option value="ADJUST">ADJUST</option>
                  </select>
                </div>

                <Field
                  label="Qty"
                  value={String(form.qty)}
                  onChange={(v) => setForm((p) => ({ ...p, qty: Number(v) }))}
                />
              </div>

              <Field
                label="Unit"
                value={form.unitLabel}
                onChange={(v) => setForm((p) => ({ ...p, unitLabel: v }))}
              />

              <Field
                label="Reason"
                value={safeStr(form.reason)}
                onChange={(v) => setForm((p) => ({ ...p, reason: v }))}
              />

              <FieldArea
                label="Notes"
                value={safeStr(form.notes)}
                onChange={(v) => setForm((p) => ({ ...p, notes: v }))}
                rows={3}
              />

              <button
                onClick={applyTxn}
                className="rounded-2xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Apply Transaction
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-bac-text">
              Recent Transactions
            </h2>
            <div className="mt-4 overflow-auto rounded-2xl border border-bac-border">
              <table className="w-full text-sm text-bac-text">
                <thead className="sticky top-0 bg-bac-bg text-xs text-bac-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-left">Medication</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-left">Unit</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-4 text-center text-bac-muted"
                      >
                        No transactions yet.
                      </td>
                    </tr>
                  ) : (
                    txns.map((t) => (
                      <tr key={t.id} className="border-t border-bac-border">
                        <td className="px-3 py-2">{t.date}</td>
                        <td className="px-3 py-2">{t.time}</td>
                        <td className="px-3 py-2 font-medium">
                          {t.medicationName}
                        </td>
                        <td className="px-3 py-2">{t.type}</td>
                        <td className="px-3 py-2 text-right">{t.qty}</td>
                        <td className="px-3 py-2">{t.unitLabel}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => deleteTxn(t.id)}
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

            <div className="mt-3 text-xs text-bac-muted">
              Note: This does not persist yet; it only updates the local UI.
            </div>
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

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

type BillingRatePayer = "ODP";
type BillingRateStatus = "ACTIVE";

type ServiceOption = {
  id: string;
  serviceCode: string;
  billingCode?: string | null;
  serviceName: string;
  category?: string | null;
  status?: string | null;
  billable?: boolean | null;
};

type BillingRateRow = {
  id: string;
  serviceId: string;
  serviceCode: string;
  billingCode?: string | null;
  serviceName: string;
  payer: BillingRatePayer;
  rate: number;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type RateFormState = {
  id?: string;
  serviceId: string;
  serviceCode: string;
  billingCode: string;
  serviceName: string;
  payer: BillingRatePayer;
  rate: string;
  notes: string;
};

type ServiceRatesResponse = {
  items?: Array<{
    id: string;
    payer: BillingRatePayer;
    serviceId: string;
    serviceCode: string;
    serviceName: string;
    billingCode?: string | null;
    category?: string | null;
    serviceStatus?: string | null;
    billable?: boolean | null;
    rate: number;
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string;
  }>;
};

type ServiceRateLookupsResponse = {
  payerOptions?: BillingRatePayer[];
  services?: ServiceOption[];
};

const ALLOWED_BILLING_CODES = new Set([
  "T2025",
  "W1726",
  "W7060",
  "W7095",
  "W7274",
  "W7275",
  "W7276",
  "W7282",
  "W7283",
  "W8996",
]);

function statusClass(status: BillingRateStatus) {
  switch (status) {
    case "ACTIVE":
    default:
      return "bg-bac-green/15 text-bac-green border-bac-green/30";
  }
}

function Badge({
  children,
  status,
}: {
  children: React.ReactNode;
  status: BillingRateStatus;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(
        status
      )}`}
    >
      {children}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-xs text-bac-muted">{label}</div>
      {children}
    </div>
  );
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-bac-border bg-bac-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-bac-border px-5 py-4">
          <div className="text-base font-semibold text-bac-text">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text hover:bg-white/5"
          >
            Close
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function emptyForm(): RateFormState {
  return {
    serviceId: "",
    serviceCode: "",
    billingCode: "",
    serviceName: "",
    payer: "ODP",
    rate: "",
    notes: "",
  };
}

function displayServiceCode(row: {
  billingCode?: string | null;
  serviceCode: string;
}) {
  return row.billingCode?.trim() || row.serviceCode;
}

function normalizeRateRows(items: ServiceRatesResponse["items"]): BillingRateRow[] {
  return (items || []).map((item) => ({
    id: item.id,
    serviceId: item.serviceId,
    serviceCode: item.serviceCode,
    billingCode: item.billingCode || null,
    serviceName: item.serviceName,
    payer: item.payer,
    rate: Number(item.rate || 0),
    notes: item.notes || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}

export default function BillingRateSetupCard() {
  const backendBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "https://blueangelscareapi.onrender.com";

  const [rows, setRows] = useState<BillingRateRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);

  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);

  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RateFormState>(emptyForm());

  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setRowsLoading(true);
    setRowsError(null);

    try {
      const res = await fetch(`${backendBaseUrl}/service-rates?payer=ODP`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to load service rates.");
      }

      const json: ServiceRatesResponse = await res.json();
      setRows(normalizeRateRows(json.items));
    } catch (err: any) {
      setRowsError(String(err?.message || err || "Failed to load service rates."));
    } finally {
      setRowsLoading(false);
    }
  }, [backendBaseUrl]);

  const loadLookups = useCallback(async () => {
    setServiceLoading(true);
    setServiceError(null);

    try {
      const res = await fetch(`${backendBaseUrl}/service-rates/lookups`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to load services.");
      }

      const json: ServiceRateLookupsResponse = await res.json();
      const rawItems = Array.isArray(json.services) ? json.services : [];

      const filtered = rawItems
        .filter((item) => {
          const code = String(item.billingCode || item.serviceCode || "")
            .trim()
            .toUpperCase();

          return !!item.id && !!item.serviceName && ALLOWED_BILLING_CODES.has(code);
        })
        .sort((a, b) => {
          const aCode = String(a.billingCode || a.serviceCode || "").toUpperCase();
          const bCode = String(b.billingCode || b.serviceCode || "").toUpperCase();
          return aCode.localeCompare(bCode);
        });

      setServiceOptions(filtered);
    } catch (err: any) {
      setServiceError(String(err?.message || err || "Failed to load services."));
    } finally {
      setServiceLoading(false);
    }
  }, [backendBaseUrl]);

  useEffect(() => {
    loadRows();
    loadLookups();
  }, [loadRows, loadLookups]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (serviceFilter !== "ALL" && row.serviceId !== serviceFilter) return false;
      if (statusFilter !== "ALL" && statusFilter !== "ACTIVE") return false;

      if (!q) return true;

      const hay =
        `${displayServiceCode(row)} ${row.serviceName} ${row.notes || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, serviceFilter, statusFilter, search]);

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm());
    setActionMessage(null);
    setOpenModal(true);
  }

  function openEditModal(row: BillingRateRow) {
    setEditingId(row.id);
    setForm({
      id: row.id,
      serviceId: row.serviceId,
      serviceCode: row.serviceCode,
      billingCode: row.billingCode || "",
      serviceName: row.serviceName,
      payer: "ODP",
      rate: String(row.rate),
      notes: row.notes || "",
    });
    setActionMessage(null);
    setOpenModal(true);
  }

  function closeModal() {
    if (saving) return;
    setOpenModal(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  function onChangeService(serviceId: string) {
    const service = serviceOptions.find((x) => x.id === serviceId);

    setForm((prev) => ({
      ...prev,
      serviceId,
      serviceCode: service?.serviceCode || "",
      billingCode: service?.billingCode || "",
      serviceName: service?.serviceName || "",
    }));
  }

  async function saveForm() {
    setActionMessage(null);

    if (!form.serviceId || !form.rate) {
      alert("Please complete Service and Rate.");
      return;
    }

    const rateNumber = Number(form.rate);
    if (!Number.isFinite(rateNumber) || rateNumber <= 0) {
      alert("Rate must be greater than 0.");
      return;
    }

    const payload = {
      payer: "ODP" as BillingRatePayer,
      serviceId: form.serviceId,
      rate: rateNumber,
      notes: form.notes.trim(),
    };

    try {
      setSaving(true);

      const url = editingId
        ? `${backendBaseUrl}/service-rates/${editingId}`
        : `${backendBaseUrl}/service-rates`;

      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          String(json?.message || "Failed to save service rate.")
        );
      }

      await loadRows();
      setActionMessage(editingId ? "Rate updated successfully." : "Rate added successfully.");
      closeModal();
    } catch (err: any) {
      alert(String(err?.message || err || "Failed to save service rate."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow(id: string) {
    const ok = window.confirm(
      "Delete this rate? Billing will treat the service as missing rate until a new rate is added."
    );
    if (!ok) return;

    setActionMessage(null);

    try {
      const res = await fetch(`${backendBaseUrl}/service-rates/${id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          String(json?.message || "Failed to delete service rate.")
        );
      }

      await loadRows();
      setActionMessage("Rate deleted successfully.");
    } catch (err: any) {
      alert(String(err?.message || err || "Failed to delete service rate."));
    }
  }

  async function refreshAll() {
    setActionMessage(null);
    await Promise.all([loadRows(), loadLookups()]);
  }

  return (
    <>
      <div className="rounded-2xl border border-bac-border bg-bac-panel p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-base font-semibold text-bac-text">Rate Setup</div>
            <div className="mt-1 text-sm text-bac-muted">
              Configure ODP billing rates from the real ServiceRate table used by Billing.
            </div>
            {rowsError ? <div className="mt-2 text-xs text-bac-red">{rowsError}</div> : null}
            {serviceError ? (
              <div className="mt-2 text-xs text-bac-red">{serviceError}</div>
            ) : null}
            {actionMessage ? (
              <div className="mt-2 text-xs text-bac-green">{actionMessage}</div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refreshAll}
              className="rounded-xl border border-bac-border bg-bac-bg px-4 py-2 text-sm text-bac-text hover:bg-white/5"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95"
            >
              + Add Rate
            </button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-5">
            <Field label="Service">
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
              >
                <option value="ALL">All</option>
                {serviceOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {displayServiceCode(item)} — {item.serviceName}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Payer">
              <input
                value="ODP"
                readOnly
                className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Status">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
              >
                <option value="ALL">All</option>
                <option value="ACTIVE">Active</option>
              </select>
            </Field>
          </div>

          <div className="md:col-span-3">
            <Field label="Search">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none"
              />
            </Field>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-bac-border bg-bac-bg">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="border-b border-bac-border text-bac-muted">
                <tr>
                  <th className="px-4 py-3">Service Code</th>
                  <th className="px-4 py-3">Service Name</th>
                  <th className="px-4 py-3">Payer</th>
                  <th className="px-4 py-3">Rate</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bac-border">
                {rowsLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-bac-muted">
                      Loading rates...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-bac-muted">
                      No rate records found for the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const status: BillingRateStatus = "ACTIVE";

                    return (
                      <tr key={row.id} className="text-bac-text hover:bg-white/3">
                        <td className="px-4 py-3 font-medium">
                          {displayServiceCode(row)}
                        </td>
                        <td className="px-4 py-3">{row.serviceName}</td>
                        <td className="px-4 py-3">{row.payer}</td>
                        <td className="px-4 py-3">${row.rate.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <Badge status={status}>{status}</Badge>
                        </td>
                        <td className="px-4 py-3">{row.notes || "—"}</td>
                        <td className="px-4 py-3">
                          {row.updatedAt ? String(row.updatedAt).slice(0, 10) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text hover:bg-white/5"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteRow(row.id)}
                              className="rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text hover:bg-white/5"
                            >
                              Delete
                            </button>
                          </div>
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

      <Modal
        open={openModal}
        title={editingId ? "Edit Service Rate" : "Add Service Rate"}
        onClose={closeModal}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Service">
            <select
              value={form.serviceId}
              onChange={(e) => onChangeService(e.target.value)}
              disabled={saving}
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none disabled:opacity-60"
            >
              <option value="">
                {serviceLoading ? "Loading services..." : "Select service"}
              </option>
              {serviceOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {displayServiceCode(item)} — {item.serviceName}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Payer">
            <input
              value="ODP"
              readOnly
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
            />
          </Field>

          <Field label="Service Code">
            <input
              value={displayServiceCode(form)}
              readOnly
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
            />
          </Field>

          <Field label="Service Name">
            <input
              value={form.serviceName}
              readOnly
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
            />
          </Field>

          <Field label="Rate">
            <input
              type="number"
              step="0.01"
              value={form.rate}
              onChange={(e) => setForm((prev) => ({ ...prev, rate: e.target.value }))}
              placeholder="17.50"
              disabled={saving}
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none disabled:opacity-60"
            />
          </Field>

          <Field label="Notes">
            <input
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              disabled={saving}
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none disabled:opacity-60"
            />
          </Field>

          <div className="md:col-span-2 rounded-xl border border-dashed border-bac-border bg-bac-panel px-3 py-3 text-xs text-bac-muted">
            This screen now saves directly into the real ServiceRate table used by Billing.
            Effective From / Effective To / Active are not shown here because the current
            backend schema does not store those fields yet.
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={closeModal}
            disabled={saving}
            className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveForm}
            disabled={saving}
            className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Rate"}
          </button>
        </div>
      </Modal>
    </>
  );
}
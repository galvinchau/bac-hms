"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type MedicationStatus = "ACTIVE" | "ON_HOLD" | "DISCONTINUED";
type MedicationType = "SCHEDULED" | "PRN";

interface PrintableMedicationOrder {
  id: string;
  orderNumber?: string;
  individualId: string;
  individualName?: string;
  individualCode?: string;
  medicationName: string;
  form?: string | null;
  strengthText?: string | null;
  doseAmount?: number | null;
  doseValue: number;
  doseUnit: string;
  route?: string | null;
  type: MedicationType;
  frequencyText?: string | null;
  timesOfDay?: string[];
  startDate: string;
  endDate?: string | null;
  daysSupply?: number | null;
  refills?: number | null;
  directionsSig?: string | null;
  prnReason?: string | null;
  specialInstructions?: string | null;
  status: MedicationStatus;
  prescriberName?: string | null;
  pharmacyName?: string | null;
  indications?: string | null;
  allergyFlag?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderDose(order: PrintableMedicationOrder) {
  if (order.strengthText?.trim()) return order.strengthText.trim();
  return `${order.doseValue}${order.doseUnit}`;
}

function renderSchedule(order: PrintableMedicationOrder) {
  if (order.type === "PRN") return "PRN";

  const frequency = order.frequencyText?.trim() || "—";
  const times = Array.isArray(order.timesOfDay)
    ? order.timesOfDay.filter(Boolean).sort().join(", ")
    : "";

  return times ? `${frequency} — ${times}` : frequency;
}

function renderStatusLabel(status: MedicationStatus) {
  switch (status) {
    case "ACTIVE":
      return "ACTIVE";
    case "ON_HOLD":
      return "ON HOLD";
    case "DISCONTINUED":
      return "DISCONTINUED";
    default:
      return status;
  }
}

function renderBool(value?: boolean | null) {
  return value ? "Yes" : "No";
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[190px,1fr] gap-3 border-b border-slate-200 py-2.5">
      <div className="text-sm font-semibold text-slate-600">{label}</div>
      <div className="text-sm text-slate-900">{value || "—"}</div>
    </div>
  );
}

export default function MedicationOrderPrintPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<PrintableMedicationOrder | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadOrder = async () => {
      if (!id) {
        setError("Missing order id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/medication/orders/${id}`, {
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || res.statusText);
        }

        if (!cancelled) {
          setOrder(data?.order ?? null);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("[MedicationOrderPrintPage] load failed:", err);
          setError(err?.message ?? "Failed to load medication order.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const title = useMemo(() => {
    if (!order) return "Medication Order";
    return order.orderNumber
      ? `${order.orderNumber} - ${order.medicationName}`
      : `Medication Order - ${order.medicationName}`;
  }, [order]);

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <style jsx global>{`
        @media print {
          @page {
            size: Letter portrait;
            margin: 0.5in;
          }

          html,
          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .print-shell {
            padding: 0 !important;
            max-width: none !important;
          }

          .print-card {
            box-shadow: none !important;
            border: 1px solid #d1d5db !important;
            border-radius: 0 !important;
          }

          .print-avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="text-xs text-slate-500">
              Print this page or choose Save as PDF in your browser print dialog.
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl bg-[#4f67e8] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={() => window.close()}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <div className="print-shell mx-auto max-w-6xl p-4 md:p-6">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
            Loading medication order...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        ) : !order ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
            Medication order not found.
          </div>
        ) : (
          <div className="print-card overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
            {/* Hospital-style header */}
            <div className="px-5 py-5">
              <div className="grid items-start gap-4 md:grid-cols-[1.2fr,1fr]">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center">
                    <img
                      src="/Logo.png"
                      alt="Blue Angels Care Logo"
                      className="max-h-16 max-w-16 object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>

                  <div>
                    <div className="text-[15px] font-bold text-black">
                      Blue Angels Care, LLC
                    </div>
                    <div className="text-[15px] text-slate-800">
                      MPI #: 104322079
                    </div>
                    <div className="text-[15px] text-slate-800">
                      3107 Beale Avenue, Altoona, PA 16601
                    </div>
                    <div className="text-[15px] text-slate-800">
                      Phone: (814) 600-2313
                    </div>
                    <div className="text-[15px] text-slate-800">
                      Email: blueangelscarellc@gmail.com
                    </div>
                    <div className="text-[15px] text-slate-800">
                      Website: blueangelscare.org
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[20px] font-extrabold uppercase tracking-tight text-black md:text-[24px]">
                    Medication Order Report
                  </div>
                  <div className="mt-3 text-[15px] text-slate-800">
                    Status:{" "}
                    <span className="font-semibold">
                      {renderStatusLabel(order.status)}
                    </span>
                  </div>
                  <div className="mt-2 text-[15px] text-slate-800">
                    Order Number:{" "}
                    <span className="font-semibold">
                      {order.orderNumber || "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-b border-black" />
            </div>

            {/* Content */}
            <div className="grid gap-6 px-6 py-5 md:grid-cols-2">
              <div className="print-avoid-break rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Individual Information
                </div>

                <FieldRow
                  label="Individual Name"
                  value={order.individualName || "—"}
                />
                <FieldRow
                  label="Individual Code"
                  value={order.individualCode || "—"}
                />
                <FieldRow label="Individual ID" value={order.individualId} />
              </div>

              <div className="print-avoid-break rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Order Summary
                </div>

                <FieldRow
                  label="Status"
                  value={renderStatusLabel(order.status)}
                />
                <FieldRow
                  label="Type"
                  value={order.type === "SCHEDULED" ? "Scheduled" : "PRN"}
                />
                <FieldRow label="Start Date" value={formatDate(order.startDate)} />
                <FieldRow
                  label="End Date"
                  value={order.endDate ? formatDate(order.endDate) : "Ongoing"}
                />
              </div>
            </div>

            <div className="grid gap-6 px-6 pb-6 md:grid-cols-2">
              <div className="print-avoid-break rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Medication Details
                </div>

                <FieldRow label="Medication Name" value={order.medicationName} />
                <FieldRow label="Form" value={order.form || "—"} />
                <FieldRow
                  label="Strength / Concentration"
                  value={order.strengthText || "—"}
                />
                <FieldRow label="Dose" value={renderDose(order)} />
                <FieldRow
                  label="Dose Amount"
                  value={
                    order.doseAmount != null ? String(order.doseAmount) : "—"
                  }
                />
                <FieldRow label="Dose Unit" value={order.doseUnit} />
                <FieldRow label="Route" value={order.route || "—"} />
                <FieldRow label="Schedule" value={renderSchedule(order)} />
                <FieldRow
                  label="PRN Reason"
                  value={order.prnReason?.trim() || "—"}
                />
              </div>

              <div className="print-avoid-break rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Prescription Information
                </div>

                <FieldRow
                  label="Prescriber"
                  value={order.prescriberName?.trim() || "—"}
                />
                <FieldRow
                  label="Pharmacy"
                  value={order.pharmacyName?.trim() || "—"}
                />
                <FieldRow
                  label="Days Supply"
                  value={
                    order.daysSupply != null ? String(order.daysSupply) : "—"
                  }
                />
                <FieldRow
                  label="Refills"
                  value={order.refills != null ? String(order.refills) : "—"}
                />
                <FieldRow
                  label="Allergy Flag"
                  value={renderBool(order.allergyFlag)}
                />
                <FieldRow
                  label="Created At"
                  value={formatDateTime(order.createdAt)}
                />
                <FieldRow
                  label="Last Updated"
                  value={formatDateTime(order.updatedAt)}
                />
              </div>
            </div>

            <div className="grid gap-6 border-t border-slate-200 px-6 py-6 md:grid-cols-1">
              <div className="print-avoid-break rounded-2xl border border-slate-200 p-4">
                <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Directions / SIG
                </div>
                <div className="whitespace-pre-wrap text-sm leading-6 text-slate-900">
                  {order.directionsSig?.trim() || "—"}
                </div>
              </div>

              <div className="print-avoid-break rounded-2xl border border-slate-200 p-4">
                <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Special Instructions
                </div>
                <div className="whitespace-pre-wrap text-sm leading-6 text-slate-900">
                  {order.specialInstructions?.trim() || "—"}
                </div>
              </div>

              <div className="print-avoid-break rounded-2xl border border-slate-200 p-4">
                <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Indications / Notes
                </div>
                <div className="whitespace-pre-wrap text-sm leading-6 text-slate-900">
                  {order.indications?.trim() || "—"}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-6">
              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <div className="mb-10 border-b border-slate-400" />
                  <div className="text-xs text-slate-600">
                    Prescriber / Authorized Signature
                  </div>
                </div>
                <div>
                  <div className="mb-10 border-b border-slate-400" />
                  <div className="text-xs text-slate-600">
                    Nurse / Staff Review Signature
                  </div>
                </div>
              </div>

              <div className="mt-8 text-[11px] text-slate-500">
                Printed from BAC-HMS Medication Orders. Use browser Print →
                Save as PDF for electronic filing.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
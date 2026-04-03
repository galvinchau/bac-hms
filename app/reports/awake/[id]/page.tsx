// web/app/reports/awake/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type AwakeDetail = {
  id: string;
  date: string;
  dateLocal?: string;

  individualId: string;
  individualName: string;

  staffId: string;
  staffName: string | null;

  serviceCode: string;
  serviceName: string;

  scheduleStart: string;
  scheduleEnd: string;
  visitStart: string;
  visitEnd: string;

  reminderCount: number;
  confirmCount: number;

  status: "PASSED" | "FAILED";
  autoCheckoutReason?: string | null;
  autoCheckedOutAt?: string | null;
};

type AwakeTimelineItem = {
  id: string;
  eventType: string;
  eventTime?: string;
  eventTimeLocal?: string;
  note?: string | null;
  meta?: any;
  createdAt?: string;
  createdAtLocal?: string;
};

type TimelineResponse = {
  items: AwakeTimelineItem[];
};

function safeStr(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function prettyEventLabel(eventType: string) {
  switch (eventType) {
    case "CHECK_IN_AWAKE_STARTED":
      return "Awake started";
    case "REMINDER_SENT":
      return "Reminder sent";
    case "CONFIRMED_AWAKE":
      return "Confirmed awake";
    case "AUTO_CHECKOUT_FAIL_CONFIRM":
      return "Auto checkout fail";
    case "MANUAL_CHECKOUT":
      return "Manual checkout";
    case "SHIFT_COMPLETED":
      return "Shift completed";
    default:
      return eventType;
  }
}

function eventBadgeClass(eventType: string) {
  switch (eventType) {
    case "REMINDER_SENT":
      return "bg-amber-500/20 text-amber-300 border border-amber-500/30";
    case "CONFIRMED_AWAKE":
      return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
    case "AUTO_CHECKOUT_FAIL_CONFIRM":
      return "bg-red-500/20 text-red-300 border border-red-500/30";
    case "MANUAL_CHECKOUT":
      return "bg-sky-500/20 text-sky-300 border border-sky-500/30";
    default:
      return "bg-violet-500/20 text-violet-300 border border-violet-500/30";
  }
}

export default function AwakeReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = (params as any)?.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AwakeDetail | null>(null);
  const [timeline, setTimeline] = useState<AwakeTimelineItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const SAMPLE_DETAIL: AwakeDetail = useMemo(
    () => ({
      id: "sample",
      date: new Date().toISOString(),
      dateLocal: new Date().toISOString().slice(0, 10),
      individualId: "sample-individual",
      individualName: "Sample Individual",
      staffId: "sample-staff",
      staffName: "Sample DSP",
      serviceCode: "COMP",
      serviceName: "Companion Services",
      scheduleStart: "22:00",
      scheduleEnd: "06:00",
      visitStart: "22:00",
      visitEnd: "06:00",
      reminderCount: 0,
      confirmCount: 0,
      status: "FAILED",
      autoCheckoutReason: null,
      autoCheckedOutAt: null,
    }),
    []
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        setTimelineError(null);

        if (!id) throw new Error("Missing id in URL");

        const detailRes = await fetch(`/api/reports/awake/${id}`, {
          cache: "no-store",
        });

        if (!detailRes.ok) {
          const txt = await detailRes.text();
          throw new Error(
            `Failed to load detail: ${detailRes.status} ${detailRes.statusText}. ${txt.slice(
              0,
              200
            )}`
          );
        }

        const detailData = (await detailRes.json()) as AwakeDetail;

        let realTimeline: AwakeTimelineItem[] = [];
        try {
          const timelineRes = await fetch(`/api/reports/awake/${id}/timeline`, {
            cache: "no-store",
          });

          if (!timelineRes.ok) {
            const txt = await timelineRes.text();
            throw new Error(
              `Failed to load timeline: ${timelineRes.status} ${timelineRes.statusText}. ${txt.slice(
                0,
                200
              )}`
            );
          }

          const timelineData = (await timelineRes.json()) as TimelineResponse;
          realTimeline = Array.isArray(timelineData.items)
            ? timelineData.items
            : [];
        } catch (e: any) {
          console.error("[AwakeReportDetail][timeline]", e);
          if (mounted) {
            setTimelineError(
              e?.message || "Failed to load real timeline for this visit."
            );
          }
          realTimeline = [];
        }

        if (!mounted) return;

        setDetail(detailData);
        setTimeline(realTimeline);
      } catch (e: any) {
        console.error(e);
        if (!mounted) return;
        setError(e?.message ?? "Failed to load Awake Report detail");
        setDetail(SAMPLE_DETAIL);
        setTimeline([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id, SAMPLE_DETAIL]);

  const data = detail ?? SAMPLE_DETAIL;
  const items = timeline;

  function onBack() {
    router.push("/reports/awake");
  }

  function onPrint() {
    document.body.classList.add("awake-printing");
    window.print();
    setTimeout(() => document.body.classList.remove("awake-printing"), 300);
  }

  function finalStatusBadgeClass(status: "PASSED" | "FAILED") {
    return status === "PASSED"
      ? "bg-emerald-600/90 text-white"
      : "bg-red-600/90 text-white";
  }

  return (
    <div className="px-6 py-6">
      <div className="mb-4 flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-violet-300">
            Awake Report Detail
          </h1>
          <p className="text-sm text-slate-400">
            Review the Awake Monitoring summary and timeline for this visit.
          </p>

          {loading && <p className="mt-2 text-xs text-slate-400">Loading...</p>}

          {error && (
            <div className="mt-3 rounded-lg border border-red-500/60 bg-red-950/60 px-3 py-2 text-xs text-red-200">
              Error loading detail: {error}
            </div>
          )}

          {!error && timelineError && (
            <div className="mt-3 rounded-lg border border-amber-500/50 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
              Timeline warning: {timelineError}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onPrint}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-medium text-white shadow hover:bg-violet-500"
          >
            Print
          </button>

          <button
            onClick={onBack}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-600 bg-slate-900 px-4 text-sm font-medium text-slate-100 hover:bg-slate-800"
          >
            Back
          </button>
        </div>
      </div>

      <div className="awake-print-root">
        <div className="mx-auto max-w-[1100px] space-y-6">
          <div className="awake-page rounded-2xl border border-violet-700/30 bg-slate-950/95 p-6 shadow-xl shadow-black/40 text-slate-100">
            <div className="flex flex-col gap-2 border-b border-violet-700/30 pb-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-xl text-amber-300">
                  🌙
                </div>
                <div>
                  <div className="text-xl font-semibold text-violet-200">
                    Awake Report
                  </div>
                  <div className="text-sm text-slate-400">Visit ID: {data.id}</div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-violet-700/30 bg-slate-900/80 p-4">
                <div className="text-[11px] uppercase tracking-wide text-violet-300">
                  Individual
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {data.individualName || "—"}
                </div>
              </div>

              <div className="rounded-xl border border-violet-700/30 bg-slate-900/80 p-4">
                <div className="text-[11px] uppercase tracking-wide text-violet-300">
                  DSP / Staff
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {data.staffName || "—"}
                </div>
              </div>

              <div className="rounded-xl border border-violet-700/30 bg-slate-900/80 p-4">
                <div className="text-[11px] uppercase tracking-wide text-violet-300">
                  Service
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {data.serviceName || "—"}
                </div>
                <div className="text-xs text-slate-400">{data.serviceCode}</div>
              </div>

              <div className="rounded-xl border border-violet-700/30 bg-slate-900/80 p-4">
                <div className="text-[11px] uppercase tracking-wide text-violet-300">
                  Shift Date
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {safeStr(data.dateLocal || data.date).slice(0, 10) || "—"}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="text-[11px] uppercase tracking-wide text-amber-300">
                  Schedule
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {data.scheduleStart && data.scheduleEnd
                    ? `${data.scheduleStart} – ${data.scheduleEnd}`
                    : "—"}
                </div>
              </div>

              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                <div className="text-[11px] uppercase tracking-wide text-sky-300">
                  Visit
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {data.visitStart
                    ? `${data.visitStart} – ${data.visitEnd || "—"}`
                    : "—"}
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="text-[11px] uppercase tracking-wide text-amber-300">
                  Reminders / Confirms
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {data.reminderCount} / {data.confirmCount}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Real timeline events found: {items.length}
                </div>
              </div>

              <div className="rounded-xl border border-violet-700/30 bg-slate-900/80 p-4">
                <div className="text-[11px] uppercase tracking-wide text-violet-300">
                  Final Status
                </div>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${finalStatusBadgeClass(
                      data.status
                    )}`}
                  >
                    {data.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-violet-700/30 bg-slate-900/80 p-4">
                <div className="text-sm font-semibold text-violet-200">
                  Auto Checkout Reason
                </div>
                <div className="mt-2 text-sm text-slate-200">
                  {data.autoCheckoutReason || "—"}
                </div>
              </div>

              <div className="rounded-xl border border-violet-700/30 bg-slate-900/80 p-4">
                <div className="text-sm font-semibold text-violet-200">
                  Auto Checked Out At
                </div>
                <div className="mt-2 text-sm text-slate-200">
                  {data.autoCheckedOutAt || "—"}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-violet-700/30 bg-slate-900/70 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-lg font-semibold text-violet-200">
                  Timeline
                </div>
                <div className="text-xs text-slate-400">
                  Awake Monitoring event history
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/95 text-[11px] uppercase tracking-wide text-amber-300">
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Event</th>
                      <th className="px-3 py-2 text-left">Time</th>
                      <th className="px-3 py-2 text-left">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-4 text-center text-slate-400"
                        >
                          No real timeline data found for this visit.
                        </td>
                      </tr>
                    )}

                    {items.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="border-t border-slate-800 odd:bg-slate-950 even:bg-slate-900/60"
                      >
                        <td className="px-3 py-2 text-slate-300">{idx + 1}</td>

                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium ${eventBadgeClass(
                              item.eventType
                            )}`}
                          >
                            {prettyEventLabel(item.eventType)}
                          </span>
                        </td>

                        <td className="px-3 py-2 whitespace-nowrap text-slate-100">
                          {item.eventTimeLocal || item.createdAtLocal || "—"}
                        </td>

                        <td className="px-3 py-2 text-slate-200">
                          {item.note || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {items.length > 0 && (
                <div className="mt-3 text-[11px] text-slate-400">
                  Showing real timeline events from database only.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body.awake-printing * {
            visibility: hidden !important;
          }

          body.awake-printing .awake-print-root,
          body.awake-printing .awake-print-root * {
            visibility: visible !important;
          }

          body.awake-printing .awake-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }

          body.awake-printing .awake-page {
            box-shadow: none !important;
            border-radius: 0 !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
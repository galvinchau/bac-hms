// Web\app\reports\daily-notes\[id]\page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type DailyNoteDetail = {
  id: string;
  date: string; // ISO
  individualId: string;
  individualName: string;

  staffId: string;
  staffName: string | null;

  serviceCode: string;
  serviceName: string;

  scheduleStart: string;
  scheduleEnd: string;
  visitStart: string | null;
  visitEnd: string | null;

  mileage: number | null;
  isCanceled: boolean;
  cancelReason?: string | null;

  payload?: any;
};

function safeStr(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function isoDateOnly(iso?: string) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function pick(obj: any, keys: string[], fallback = "") {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return fallback;
}

function sanitizeForDisplay(s: string) {
  return s || "—";
}

export default function DailyNotePreviewPage() {
  const router = useRouter();
  const params = useParams();
  const id = (params as any)?.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [dn, setDn] = useState<DailyNoteDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep last good data to prevent “flash then disappear”
  const lastGoodRef = useRef<DailyNoteDetail | null>(null);

  const DOWNLOAD_BASE =
    process.env.NEXT_PUBLIC_BAC_API_BASE_URL || "http://127.0.0.1:3333";

  function downloadUrl(type: "staff-doc" | "staff-pdf") {
    if (!id) return "#";
    return `${DOWNLOAD_BASE}/reports/daily-notes/${id}/download/${type}`;
  }

  // SAMPLE fallback (layout review only)
  const SAMPLE: DailyNoteDetail = useMemo(
    () => ({
      id: "SAMPLE_ID",
      date: new Date().toISOString(),
      individualId: "sample_individual",
      individualName: "DONALD WILBUR",
      staffId: "sample_staff",
      staffName: "Van Duong Chau",
      serviceCode: "COMP",
      serviceName: "Companion Services",
      scheduleStart: "20:00",
      scheduleEnd: "23:00",
      visitStart: "19:58",
      visitEnd: "19:58",
      mileage: 4,
      isCanceled: false,
      cancelReason: "",
      payload: {
        patientMA: "",
        totalH: "",
        billableUnits: "",
        underHours: "",
        overHours: "",
        lostMinutes: "",
        lostUnits: "",
        overReason: "",
        shortReason: "",
        outcomeText: "",
        patientAddress1: "3107 Beale Avenue, Altoona, PA 16601",
        patientAddress2: "",
        plan: {
          supportsDuringService: "",
          communityInclusion: "",
          prefOpportunities: "",
        },
        meals: {
          breakfastTime: "07:00",
          breakfastHad: "Yes",
          breakfastOffered: "Yes",
          lunchTime: "12:00",
          lunchHad: "Yes",
          lunchOffered: "Yes",
          dinnerTime: "19:00",
          dinnerHad: "Yes",
          dinnerOffered: "Yes",
        },
      },
    }),
    []
  );

  useEffect(() => {
    if (!id) return;

    const ac = new AbortController();
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/reports/daily-notes/${id}`, {
          cache: "no-store",
          signal: ac.signal,
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(
            `Failed to load detail: ${res.status} ${
              res.statusText
            }. ${txt.slice(0, 200)}`
          );
        }

        const data = (await res.json()) as DailyNoteDetail;

        if (!mounted) return;

        // Save last good
        lastGoodRef.current = data;
        setDn(data);
      } catch (e: any) {
        // Ignore abort (happens in dev/strict mode rerenders)
        const msg = e?.message ?? "Failed to load Daily Note detail";
        const isAbort =
          e?.name === "AbortError" ||
          String(msg).toLowerCase().includes("aborted");

        if (!mounted) return;
        if (isAbort) return;

        console.error(e);
        setError(msg);

        // ✅ IMPORTANT:
        // Do NOT overwrite real data with SAMPLE.
        // Only use SAMPLE if we have no last-good data at all.
        if (lastGoodRef.current) {
          setDn(lastGoodRef.current);
        } else {
          setDn(SAMPLE);
        }
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
      ac.abort();
    };
  }, [id, SAMPLE]);

  const model = dn ?? SAMPLE;
  const payload = model.payload ?? {};
  const meals = payload.meals || payload.Meals || {};
  const plan = payload.plan || payload.todayPlan || payload.todaysPlan || {};
  const notes = payload.notes || payload.note || payload.progressNotes || {};

  // Map template fields (best-effort)
  const dateOnly = isoDateOnly(model.date);
  const serviceType = safeStr(model.serviceName || model.serviceCode);
  const patientName = safeStr(model.individualName);
  const patientMA = safeStr(
    pick(payload, ["patientMA", "ma", "PatientMA"], "")
  );
  const staffName = safeStr(model.staffName ?? "");

  const scheduleStart = safeStr(model.scheduleStart);
  const scheduleEnd = safeStr(model.scheduleEnd);
  const visitStart = safeStr(model.visitStart ?? "");
  const visitEnd = safeStr(model.visitEnd ?? "");
  const mileage = safeStr(model.mileage ?? 0);

  const totalH = safeStr(pick(payload, ["totalH", "totalHours", "TotalH"], ""));
  const billableUnits = safeStr(
    pick(payload, ["billableUnits", "units", "BillableUnits"], "")
  );
  const underHours = safeStr(pick(payload, ["underHours", "UnderHours"], ""));
  const overHours = safeStr(pick(payload, ["overHours", "OverHours"], ""));
  const lostMinutes = safeStr(
    pick(payload, ["lostMinutes", "LostMinutes"], "")
  );
  const lostUnits = safeStr(pick(payload, ["lostUnits", "LostUnits"], ""));

  const overReason = safeStr(pick(payload, ["overReason", "OverReason"], ""));
  const cancelReason = safeStr(
    model.cancelReason || payload.cancelReason || ""
  );

  // ✅ Outcome: accept more keys (some payloads might store different field name)
  const outcomeText = safeStr(
    pick(
      payload,
      [
        "outcomeText",
        "OutcomeText",
        "outcome",
        "Outcome",
        "outcomeStatement",
        "OutcomeStatement",
      ],
      ""
    )
  );

  // ✅ Address: accept more keys
  const address1 = safeStr(
    pick(
      payload,
      [
        "patientAddress1",
        "PatientAddress1",
        "individualAddress1",
        "IndividualAddress1",
        "address1",
      ],
      ""
    )
  );
  const address2 = safeStr(
    pick(
      payload,
      [
        "patientAddress2",
        "PatientAddress2",
        "individualAddress2",
        "IndividualAddress2",
        "address2",
      ],
      ""
    )
  );

  const supportsDuringService = safeStr(
    pick(plan, ["supportsDuringService"], "") ||
      pick(notes, ["supportsDuringService"], "")
  );
  const communityInclusion = safeStr(
    pick(plan, ["communityInclusion"], "") ||
      pick(notes, ["communityInclusion"], "")
  );
  const prefOpportunities = safeStr(
    pick(plan, ["prefOpportunities"], "") ||
      pick(notes, ["prefOpportunities"], "")
  );

  const breakfastTime = safeStr(
    pick(meals, ["breakfastTime", "BreakfastTime"], "")
  );
  const breakfastHad = safeStr(
    pick(meals, ["breakfastHad", "BreakfastHad"], "")
  );
  const breakfastOffered = safeStr(
    pick(meals, ["breakfastOffered", "BreakfastOffered"], "")
  );

  const lunchTime = safeStr(pick(meals, ["lunchTime", "LunchTime"], ""));
  const lunchHad = safeStr(pick(meals, ["lunchHad", "LunchHad"], ""));
  const lunchOffered = safeStr(
    pick(meals, ["lunchOffered", "LunchOffered"], "")
  );

  const dinnerTime = safeStr(pick(meals, ["dinnerTime", "DinnerTime"], ""));
  const dinnerHad = safeStr(pick(meals, ["dinnerHad", "DinnerHad"], ""));
  const dinnerOffered = safeStr(
    pick(meals, ["dinnerOffered", "DinnerOffered"], "")
  );

  function onPrint() {
    document.body.classList.add("dn-printing");
    window.print();
    setTimeout(() => document.body.classList.remove("dn-printing"), 300);
  }

  function onClose() {
    router.push("/reports/daily-notes");
  }

  return (
    <div className="px-6 py-6">
      {/* Top actions (not printed) */}
      <div className="mb-4 flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Service Note Preview
          </h1>
          <p className="text-sm text-slate-400">
            Preview layout (match DOC template). Staff report only. 2 pages
            (Letter).
          </p>
          {loading && <p className="mt-2 text-xs text-slate-400">Loading...</p>}
          {error && (
            <div className="mt-3 rounded-lg border border-red-500/60 bg-red-950/60 px-3 py-2 text-xs text-red-200">
              Error: {error}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <a
            href={downloadUrl("staff-doc")}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-bac-primary px-4 text-sm font-medium text-white shadow hover:bg-bac-primary/90"
            title="Save as DOC"
            onClick={(e) => {
              if (!id) e.preventDefault();
            }}
          >
            Save as DOC
          </a>

          <a
            href={downloadUrl("staff-pdf")}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-bac-primary px-4 text-sm font-medium text-white shadow hover:bg-bac-primary/90"
            title="Save as PDF"
            onClick={(e) => {
              if (!id) e.preventDefault();
            }}
          >
            Save as PDF
          </a>

          <button
            onClick={onPrint}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-600 bg-slate-900 px-4 text-sm font-medium text-slate-100 hover:bg-slate-800"
            title="Print (2 pages Letter)"
          >
            Print
          </button>

          <button
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-600 bg-slate-900 px-4 text-sm font-medium text-slate-100 hover:bg-slate-800"
            title="Close"
          >
            Close
          </button>
        </div>
      </div>

      {/* ✅ Print root: ONLY this block will be visible in print */}
      <div className="dn-print-root">
        <div className="mx-auto max-w-[900px] space-y-6">
          {/* PAGE 1 */}
          <div className="dn-page rounded-md bg-white p-6 text-black shadow print:shadow-none">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-black pb-3">
              <div className="flex items-start gap-3">
                <div className="h-16 w-16">
                  <img
                    src="/Logo.png"
                    alt="BAC"
                    className="h-16 w-16 object-contain"
                  />
                </div>

                <div className="text-[12px] leading-4">
                  <div className="font-semibold">Blue Angels Care, LLC</div>
                  <div>MPI #: 104322079</div>
                  <div>3107 Beale Avenue, Altoona, PA 16601</div>
                  <div>Phone: (814) 600-2313</div>
                  <div>Email: blueangelscarellc@gmail.com</div>
                  <div>Website: blueangelscare.org</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[18px] font-bold">SERVICE NOTES</div>
                <div className="mt-1 text-[12px]">
                  Service Type:{" "}
                  <span className="font-semibold">
                    {sanitizeForDisplay(serviceType)}
                  </span>
                </div>
              </div>
            </div>

            {/* Main grid */}
            <div className="mt-4">
              <table className="w-full border-collapse text-[12px]">
                <tbody>
                  <tr>
                    <td className="w-1/2 border border-black p-2 align-top">
                      <div className="font-semibold">
                        Individual Receiving Services
                      </div>
                      <div className="mt-1 text-[13px] font-bold">
                        {sanitizeForDisplay(patientName)}
                      </div>
                    </td>
                    <td className="w-1/2 border border-black p-2 align-top">
                      <div className="font-semibold">MA#</div>
                      <div className="mt-1 text-[13px] font-bold">
                        {patientMA || "—"}
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-black p-2 align-top">
                      <div className="font-semibold">Date</div>
                      <div className="mt-1 text-[13px] font-bold">
                        {sanitizeForDisplay(dateOnly)}
                      </div>
                    </td>
                    <td className="border border-black p-2 align-top">
                      <div className="font-semibold">Staff</div>
                      <div className="mt-1 text-[13px] font-bold">
                        {staffName || "—"}
                      </div>
                    </td>
                  </tr>

                  {/* Schedule | Visited | Mileage */}
                  <tr>
                    <td
                      className="border border-black p-0 align-top"
                      colSpan={2}
                    >
                      <table className="w-full border-collapse text-[12px]">
                        <thead>
                          <tr>
                            <th className="border border-black p-2 text-left font-semibold w-[44%]">
                              Schedule
                            </th>
                            <th className="border border-black p-2 text-left font-semibold w-[38%]">
                              Visited
                            </th>
                            <th className="border border-black p-2 text-left font-semibold w-[18%]">
                              Mileage
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-black p-2">
                              <div className="text-[13px] font-bold">
                                {scheduleStart} – {scheduleEnd}
                              </div>
                            </td>
                            <td className="border border-black p-2">
                              <div className="text-[13px] font-bold">
                                {visitStart && visitEnd
                                  ? `${visitStart} – ${visitEnd}`
                                  : "—"}
                              </div>
                            </td>
                            <td className="border border-black p-2">
                              <div className="text-[13px] font-bold">
                                {mileage}
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  {/* Hours row */}
                  <tr>
                    <td
                      className="border border-black p-0 align-top"
                      colSpan={2}
                    >
                      <table className="w-full border-collapse text-[12px]">
                        <thead>
                          <tr>
                            <th className="border border-black p-2 text-left font-semibold">
                              Total Hours
                            </th>
                            <th className="border border-black p-2 text-left font-semibold">
                              Total Billable Units
                            </th>
                            <th className="border border-black p-2 text-left font-semibold">
                              Total Hours Under
                            </th>
                            <th className="border border-black p-2 text-left font-semibold">
                              Total Hours Over
                            </th>
                            <th className="border border-black p-2 text-left font-semibold">
                              Lost Minutes
                            </th>
                            <th className="border border-black p-2 text-left font-semibold">
                              Lost Units
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-black p-2 font-bold">
                              {totalH || "—"}
                            </td>
                            <td className="border border-black p-2 font-bold">
                              {billableUnits || "—"}
                            </td>
                            <td className="border border-black p-2 font-bold">
                              {underHours || "—"}
                            </td>
                            <td className="border border-black p-2 font-bold">
                              {overHours || "—"}
                            </td>
                            <td className="border border-black p-2 font-bold">
                              {lostMinutes || "—"}
                            </td>
                            <td className="border border-black p-2 font-bold">
                              {lostUnits || "—"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  {/* BIG Cancel block */}
                  <tr>
                    <td
                      className="border border-black p-2 align-top"
                      colSpan={2}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 border border-black" />
                        <div className="font-semibold">CANCEL</div>
                        <div className="text-[11px] text-gray-700">
                          (Please specify reason)
                        </div>
                      </div>

                      <div className="mt-3 flex items-start gap-2">
                        <div className="min-w-[95px] font-semibold">
                          Cancel Reason:
                        </div>
                        <div className="flex-1 border-b border-black pb-[2px] text-[13px] font-bold">
                          {model.isCanceled ? cancelReason || "—" : "—"}
                        </div>
                      </div>

                      <div className="mt-3 flex items-start gap-2">
                        <div className="min-w-[120px] font-semibold">
                          Over Hours Reason:
                        </div>
                        <div className="flex-1 border-b border-black pb-[2px] text-[13px] font-bold">
                          {overReason || "—"}
                        </div>
                      </div>

                      <div className="mt-1 text-[11px] text-gray-700">
                        (Reason for over scheduled hours)
                      </div>
                    </td>
                  </tr>

                  {/* Outcome */}
                  <tr>
                    <td
                      className="border border-black p-2 align-top"
                      colSpan={2}
                    >
                      <div className="font-semibold">Outcome Statement:</div>
                      <div className="mt-2 min-h-[70px] whitespace-pre-wrap border border-black p-2 text-[12px]">
                        {outcomeText || ""}
                      </div>
                    </td>
                  </tr>

                  {/* Address */}
                  <tr>
                    <td
                      className="border border-black p-2 align-top"
                      colSpan={2}
                    >
                      <div className="font-semibold">
                        Specific Location(s) of Service Delivery:
                      </div>
                      <div className="mt-2">
                        <div className="font-bold">{address1 || "—"}</div>
                        {address2 ? (
                          <div className="font-bold">{address2}</div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGE 2 */}
          <div className="dn-page rounded-md bg-white p-6 text-black shadow print:shadow-none">
            <div className="text-[14px] font-bold">Supports & Community</div>

            <div className="mt-3 space-y-3 text-[12px]">
              <div className="border border-black p-2">
                <div className="font-semibold">
                  What supports were necessary for the individual during
                  service?
                </div>
                <div className="mt-2 min-h-[85px] whitespace-pre-wrap border border-black p-2 text-[12px]">
                  {supportsDuringService || ""}
                </div>
              </div>

              <div className="border border-black p-2">
                <div className="font-semibold">
                  Including what support was offered so the individual could
                  participate in integrated community?
                </div>
                <div className="mt-2 min-h-[85px] whitespace-pre-wrap border border-black p-2 text-[12px]">
                  {communityInclusion || ""}
                </div>
              </div>

              <div className="border border-black p-2">
                <div className="font-semibold">
                  What opportunities were offered consistent with preferences,
                  choices, and desires?
                </div>
                <div className="mt-2 min-h-[85px] whitespace-pre-wrap border border-black p-2 text-[12px]">
                  {prefOpportunities || ""}
                </div>
              </div>
            </div>

            {/* Meals */}
            <div className="mt-4">
              <div className="text-[14px] font-bold">Meals</div>
              <div className="mt-1 text-[11px] text-gray-700">
                Food preparation: If service is in the community for two hours
                or more, staff must prepare food and drink for the individual to
                take with them while in the community.
              </div>

              <div className="mt-2">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr>
                      <th className="border border-black p-2 text-left font-semibold">
                        Meal
                      </th>
                      <th className="border border-black p-2 text-left font-semibold">
                        Food Time
                      </th>
                      <th className="border border-black p-2 text-left font-semibold">
                        What did the Individual have?
                      </th>
                      <th className="border border-black p-2 text-left font-semibold">
                        What was offered?
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-2 font-semibold">
                        Breakfast
                      </td>
                      <td className="border border-black p-2 font-bold">
                        {breakfastTime || "—"}
                      </td>
                      <td className="border border-black p-2 font-bold">
                        {breakfastHad || "—"}
                      </td>
                      <td className="border border-black p-2 font-bold">
                        {breakfastOffered || "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-semibold">
                        Lunch
                      </td>
                      <td className="border border-black p-2 font-bold">
                        {lunchTime || "—"}
                      </td>
                      <td className="border border-black p-2 font-bold">
                        {lunchHad || "—"}
                      </td>
                      <td className="border border-black p-2 font-bold">
                        {lunchOffered || "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-semibold">
                        Dinner
                      </td>
                      <td className="border border-black p-2 font-bold">
                        {dinnerTime || "—"}
                      </td>
                      <td className="border border-black p-2 font-bold">
                        {dinnerHad || "—"}
                      </td>
                      <td className="border border-black p-2 font-bold">
                        {dinnerOffered || "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Signatures */}
            <div className="mt-4">
              <table className="w-full border-collapse text-[12px]">
                <tbody>
                  <tr>
                    <td className="w-1/2 border border-black p-2 align-top">
                      <div className="font-semibold">Staff Signature:</div>
                      <div className="mt-8 border-b border-black" />
                    </td>
                    <td className="w-1/2 border border-black p-2 align-top">
                      <div className="font-semibold">Individual Signature:</div>
                      <div className="mt-8 border-b border-black" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Reviewed */}
            <div className="mt-6 text-center text-[12px]">
              <div className="font-semibold">Reviewed & Approved by</div>
              <div className="mx-auto mt-8 w-[280px] border-b border-black" />
              <div className="mt-2 text-gray-700">Date: _____________</div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Print isolation styles */}
      <style jsx global>{`
        @media print {
          body.dn-printing * {
            visibility: hidden !important;
          }

          body.dn-printing .dn-print-root,
          body.dn-printing .dn-print-root * {
            visibility: visible !important;
          }

          body.dn-printing .dn-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }

          body.dn-printing .dn-page {
            page-break-after: always;
            break-after: page;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          body.dn-printing .dn-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          body.dn-printing {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}

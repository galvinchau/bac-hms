"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import HealthIncidentReportHeader from "@/components/reports/HealthIncidentReportHeader";

type Status = "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "ASSIGNED" | "CLOSED";

type MeResponse = {
  user?: {
    id?: string;
    email?: string | null;
    userType?: string | null;
  } | null;
  employee?: {
    staffId: string;
    firstName: string;
    lastName: string;
    position: string;
    email: string;
  } | null;
};

type HealthIncidentDetail = {
  id: string;

  status: Status;

  date?: string | null;
  createdAt?: string | null;

  staffId: string;
  staffName: string | null;
  staffEmail?: string | null;

  individualId: string;
  individualName: string;

  shiftId?: string | null;
  shiftStart?: string | null;
  shiftEnd?: string | null;

  incidentType?: string | null;

  supervisorName?: string | null;
  supervisorDecision?: string | null;
  supervisorActionsTaken?: string | null;
  reviewedAt?: string | null;

  ciName?: string | null;
  ciEmail?: string | null;
  ciPhone?: string | null;
  ciAssignedAt?: string | null;
  ciAssignedByUserId?: string | null;
  ciAssignedByName?: string | null;

  payload?: any;
};

const INCIDENT_TYPES_LEFT = [
  "Physical Abuse",
  "Mental Abuse",
  "Neglect",
  "Self-Neglect",
  "Extortion",
  "Misapplication/Unauthorized Use of Restraint (No Injury)",
  "Passive Neglect",
  "Suicide Attempt",
] as const;

const INCIDENT_TYPES_RIGHT = [
  "Misapplication/Unauthorized Use of Restraint (Injury)",
  "Death",
  "Exploitation",
  "Missing/Theft of Medication",
  "Misuse/Theft of Funds",
  "Unpaid Labor",
  "Right Violation",
  "Sexual Abuse",
] as const;

function safeStr(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function isoDateOnly(iso?: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function sanitizeForDisplay(s: string) {
  return s || "—";
}

function asText(v: any) {
  const s = safeStr(v).trim();
  return s ? s : "";
}

function isSupervisorUserType(userType?: string | null) {
  const t = safeStr(userType).toUpperCase();
  return t === "ADMIN" || t === "HR" || t === "COORDINATOR" || t === "OFFICE";
}

function buildActorName(me: MeResponse | null) {
  const first = safeStr(me?.employee?.firstName).trim();
  const last = safeStr(me?.employee?.lastName).trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;

  const email = safeStr(me?.user?.email).trim();
  if (email) return email;

  return "";
}

function parseAnyDateToYYYYMMDD(value?: string | null) {
  const s = safeStr(value).trim();
  if (!s) return "";

  const m1 = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return "";
}

function joinWitnessesFromPayload(payload: any) {
  const p = payload || {};

  const witnessText = asText(p.witnesses || p.witness || "");
  if (witnessText) return witnessText;

  const rows: string[] = [];

  const w1n = asText(p.witness1Name);
  const w1c = asText(p.witness1Contact);
  if (w1n || w1c) {
    rows.push(
      [w1n || "Witness 1", w1c ? `(${w1c})` : ""].filter(Boolean).join(" ")
    );
  }

  const w2n = asText(p.witness2Name);
  const w2c = asText(p.witness2Contact);
  if (w2n || w2c) {
    rows.push(
      [w2n || "Witness 2", w2c ? `(${w2c})` : ""].filter(Boolean).join(" ")
    );
  }

  return rows.join("\n");
}

function extractIncidentTypeList(detailIncidentType: any, payload: any): string[] {
  const p = payload || {};

  if (Array.isArray(p.incidentTypes)) {
    return p.incidentTypes
      .map((x: any) => safeStr(x).trim())
      .filter(Boolean);
  }

  const combined =
    safeStr(detailIncidentType).trim() ||
    safeStr(p.incidentType).trim() ||
    safeStr(p.typeOfIncident).trim() ||
    safeStr(p.type_of_incident).trim() ||
    safeStr(p.incidentCategory).trim() ||
    safeStr(p.incident_type).trim();

  if (!combined) return [];

  return combined
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function isIncidentTypeChecked(selected: string[], item: string) {
  return selected.some((x) => x.trim().toLowerCase() === item.trim().toLowerCase());
}

function CheckboxLabel({
  checked,
  label,
}: {
  checked: boolean;
  label: string;
}) {
  return (
    <div className="flex items-start gap-2 leading-[1.2]">
      <span className="inline-block min-w-[14px] text-[14px] font-bold">
        {checked ? "☑" : "☐"}
      </span>
      <span>{label}</span>
    </div>
  );
}

export default function HealthIncidentReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = (params as any)?.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [me, setMe] = useState<MeResponse | null>(null);

  const [detail, setDetail] = useState<HealthIncidentDetail | null>(null);

  const [supStatus, setSupStatus] = useState<Status>("IN_REVIEW");
  const [supDecision, setSupDecision] = useState("");
  const [supActions, setSupActions] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [ciName, setCiName] = useState("");
  const [ciEmail, setCiEmail] = useState("");
  const [ciPhone, setCiPhone] = useState("");
  const [assigningCI, setAssigningCI] = useState(false);
  const [assignMsg, setAssignMsg] = useState<string | null>(null);

  const SAMPLE_DETAIL: HealthIncidentDetail = useMemo(
    () => ({
      id: "SAMPLE_ID",
      status: "SUBMITTED",
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),

      staffId: "sample_staff",
      staffName: "Van Duong Chau",
      staffEmail: "sample@blueangelscare.org",

      individualId: "sample_individual",
      individualName: "DONALD WILBUR",

      shiftId: "sample_shift",
      shiftStart: "09:00",
      shiftEnd: "15:00",

      incidentType: "Physical Abuse, Mental Abuse, Neglect, Self-Neglect",

      supervisorName: "",
      supervisorDecision: "",
      supervisorActionsTaken: "",
      reviewedAt: null,

      ciName: "",
      ciEmail: "",
      ciPhone: "",
      ciAssignedAt: null,
      ciAssignedByUserId: "",
      ciAssignedByName: "",

      payload: {
        reportDate: isoDateOnly(new Date().toISOString()),
        incidentDate: isoDateOnly(new Date().toISOString()),
        incidentTime: "10:15",
        location: "Home",
        reportedByName: "Van Duong Chau",
        incidentTypes: [
          "Physical Abuse",
          "Mental Abuse",
          "Neglect",
          "Self-Neglect",
        ],
        description:
          "Individual complained of dizziness. DSP provided water and seated the individual. Vital signs checked.",
        witnesses: "",
        additionalNotes: "",
      },
    }),
    []
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        setSaveMsg(null);
        setAssignMsg(null);

        if (!id) throw new Error("Missing id in URL");

        try {
          const meRes = await fetch("/api/auth/me", { cache: "no-store" });
          if (meRes.ok) {
            const meJson = (await meRes.json()) as MeResponse;
            if (mounted) setMe(meJson);
          }
        } catch {
          // ignore
        }

        const res = await fetch(`/api/reports/health-incident/${id}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(
            `Failed to load detail: ${res.status} ${res.statusText}. ${txt.slice(
              0,
              200
            )}`
          );
        }

        const d = (await res.json()) as HealthIncidentDetail;
        if (!mounted) return;

        setDetail(d);

        const seedStatus =
          d.status === "CLOSED"
            ? "CLOSED"
            : d.status === "ASSIGNED"
            ? "ASSIGNED"
            : "IN_REVIEW";

        setSupStatus(seedStatus as Status);
        setSupDecision(safeStr(d.supervisorDecision));
        setSupActions(safeStr(d.supervisorActionsTaken));

        setCiName(safeStr(d.ciName));
        setCiEmail(safeStr(d.ciEmail));
        setCiPhone(safeStr(d.ciPhone));
      } catch (e: any) {
        console.error(e);
        if (!mounted) return;
        setError(e?.message ?? "Failed to load Health & Incident report");

        setDetail(SAMPLE_DETAIL);

        setSupStatus("IN_REVIEW");
        setSupDecision(safeStr(SAMPLE_DETAIL.supervisorDecision));
        setSupActions(safeStr(SAMPLE_DETAIL.supervisorActionsTaken));

        setCiName(safeStr(SAMPLE_DETAIL.ciName));
        setCiEmail(safeStr(SAMPLE_DETAIL.ciEmail));
        setCiPhone(safeStr(SAMPLE_DETAIL.ciPhone));
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

  const d = detail ?? SAMPLE_DETAIL;

  const canSupervisorReview = isSupervisorUserType(me?.user?.userType);
  const actorName = buildActorName(me);

  const payload = d.payload || {};

  const reportDate =
    asText(payload.reportDate) ||
    isoDateOnly(d.date) ||
    isoDateOnly(d.createdAt) ||
    isoDateOnly(new Date().toISOString());

  const shiftText =
    d.shiftStart && d.shiftEnd ? `${d.shiftStart} – ${d.shiftEnd}` : "—";

  const incidentTypeList = extractIncidentTypeList(d.incidentType, payload);

  const incidentDate =
    asText(payload.incidentDate) ||
    isoDateOnly(d.date) ||
    reportDate;

  const incidentTime = asText(payload.incidentTime);

  const location =
    asText(payload.location) ||
    asText(payload.incidentLocation);

  const description =
    asText(payload.description) ||
    asText(payload.details) ||
    asText(payload.incidentDescription);

  // ✅ NEW: reporter signature block replaces Who Was Notified
  const reporterSignatureName =
    asText(payload.reportedByName) ||
    safeStr(d.staffName).trim() ||
    "—";

  const reporterSignatureDate =
    asText(payload.reportDate) ||
    reportDate ||
    "—";

  const witnesses = joinWitnessesFromPayload(payload);

  const additionalNotes =
    asText(payload.additionalNotes) ||
    asText(payload.attachments);

  const supervisorSignatureName =
    safeStr(d.ciAssignedByName).trim() ||
    safeStr(d.supervisorName).trim() ||
    "—";

  const supervisorSignatureDate =
    parseAnyDateToYYYYMMDD(d.ciAssignedAt) ||
    parseAnyDateToYYYYMMDD(d.reviewedAt) ||
    "_____________";

  function onPrint() {
    document.body.classList.add("hi-printing");
    window.print();
    setTimeout(() => document.body.classList.remove("hi-printing"), 300);
  }

  function onClose() {
    router.push("/reports/health-incident");
  }

  async function saveSupervisorReview(nextStatus?: Status) {
    if (!id) return;

    try {
      setSavingReview(true);
      setSaveMsg(null);

      const body = {
        status: nextStatus ?? supStatus,
        supervisorName: actorName || undefined,
        supervisorDecision: supDecision,
        supervisorActionsTaken: supActions,
      };

      const res = await fetch(`/api/reports/health-incident/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(
          `Failed to save review: ${res.status} ${res.statusText}. ${txt.slice(
            0,
            200
          )}`
        );
      }

      const updated = (await res.json()) as HealthIncidentDetail;
      setDetail(updated);
      setSupStatus(updated.status);
      setSaveMsg("Saved.");
    } catch (e: any) {
      console.error(e);
      setSaveMsg(e?.message ?? "Failed to save supervisor review");
    } finally {
      setSavingReview(false);
      setTimeout(() => setSaveMsg(null), 2500);
    }
  }

  async function assignCI() {
    const effectiveId = (id && String(id).trim() !== "" ? id : d?.id) as
      | string
      | undefined;

    if (!effectiveId || String(effectiveId).trim() === "") {
      setAssignMsg("Missing id");
      return;
    }

    try {
      setAssigningCI(true);
      setAssignMsg(null);

      const body = {
        ciName: ciName.trim() || undefined,
        ciEmail: ciEmail.trim() || undefined,
        ciPhone: ciPhone.trim() || undefined,
        ciAssignedByUserId: safeStr(me?.user?.id).trim() || undefined,
        ciAssignedByName: actorName || undefined,
      };

      const res = await fetch(
        `/api/reports/health-incident/${effectiveId}/assign`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(
          `Failed to assign CI: ${res.status} ${res.statusText}. ${txt.slice(
            0,
            200
          )}`
        );
      }

      const updated = (await res.json()) as HealthIncidentDetail;

      setDetail(updated);

      if (updated.status) setSupStatus(updated.status);

      setCiName(safeStr(updated.ciName));
      setCiEmail(safeStr(updated.ciEmail));
      setCiPhone(safeStr(updated.ciPhone));

      setAssignMsg("CI assigned.");
    } catch (e: any) {
      console.error(e);
      setAssignMsg(e?.message ?? "Failed to assign CI");
    } finally {
      setAssigningCI(false);
      setTimeout(() => setAssignMsg(null), 2500);
    }
  }

  const showCiAssignedAt = d.ciAssignedAt ? safeStr(d.ciAssignedAt) : "";

  return (
    <div className="px-6 py-6">
      <div className="mb-4 flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Health & Incident Report
          </h1>
          <p className="text-sm text-slate-400">
            Preview/Print layout. Supervisor can review and close report.
          </p>
          {loading && <p className="mt-2 text-xs text-slate-400">Loading...</p>}
          {error && (
            <div className="mt-3 rounded-lg border border-red-500/60 bg-red-950/60 px-3 py-2 text-xs text-red-200">
              Error (layout still shown using SAMPLE): {error}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onPrint}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-600 bg-slate-900 px-4 text-sm font-medium text-slate-100 hover:bg-slate-800"
            title="Print (Letter)"
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

      {canSupervisorReview && (
        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-md shadow-black/40 print:hidden">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">Assign CI</div>
              <div className="mt-1 text-xs text-slate-400">
                Assign a CI (Incident Coordinator) for investigation/follow-up.
                {showCiAssignedAt ? (
                  <span className="ml-2 text-slate-300">
                    Current assigned at:{" "}
                    <span className="font-semibold">{showCiAssignedAt}</span>
                    {d.ciAssignedByName ? (
                      <>
                        {" "}
                        by{" "}
                        <span className="font-semibold">
                          {sanitizeForDisplay(d.ciAssignedByName)}
                        </span>
                      </>
                    ) : null}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={assigningCI}
                onClick={assignCI}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-yellow-600 px-6 text-sm font-medium text-white shadow hover:bg-yellow-600/90 disabled:opacity-60"
                title="Assign CI and set status ASSIGNED"
              >
                {assigningCI ? "Assigning..." : "Assign CI"}
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                CI Name
              </label>
              <input
                value={ciName}
                onChange={(e) => setCiName(e.target.value)}
                className="h-10 rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
                placeholder="CI name..."
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                CI Email
              </label>
              <input
                value={ciEmail}
                onChange={(e) => setCiEmail(e.target.value)}
                className="h-10 rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
                placeholder="ci@email.com"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                CI Phone
              </label>
              <input
                value={ciPhone}
                onChange={(e) => setCiPhone(e.target.value)}
                className="h-10 rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
                placeholder="(xxx) xxx-xxxx"
              />
            </div>
          </div>

          {assignMsg && (
            <div className="mt-3 text-xs text-slate-200">{assignMsg}</div>
          )}
        </div>
      )}

      {canSupervisorReview && (
        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-md shadow-black/40 print:hidden">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">
                Supervisor Review
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Set status, add decision & actions taken.
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={supStatus}
                onChange={(e) => setSupStatus(e.target.value as Status)}
                className="h-10 rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
              >
                <option value="IN_REVIEW">IN_REVIEW</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="CLOSED">CLOSED</option>
              </select>

              <button
                disabled={savingReview}
                onClick={() => saveSupervisorReview()}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-bac-primary px-6 text-sm font-medium text-white shadow hover:bg-bac-primary/90 disabled:opacity-60"
              >
                {savingReview ? "Saving..." : "Save"}
              </button>

              <button
                disabled={savingReview}
                onClick={() => saveSupervisorReview("CLOSED")}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-700 px-6 text-sm font-medium text-white shadow hover:bg-emerald-700/90 disabled:opacity-60"
                title="Set CLOSED and save"
              >
                Close Report
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                Supervisor Decision
              </label>
              <textarea
                value={supDecision}
                onChange={(e) => setSupDecision(e.target.value)}
                className="min-h-[90px] rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
                placeholder="Decision / determination..."
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                Actions Taken
              </label>
              <textarea
                value={supActions}
                onChange={(e) => setSupActions(e.target.value)}
                className="min-h-[90px] rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
                placeholder="Actions / follow-up..."
              />
            </div>
          </div>

          {saveMsg && (
            <div className="mt-3 text-xs text-slate-200">{saveMsg}</div>
          )}
        </div>
      )}

      <div className="hi-print-root">
        <div className="mx-auto max-w-[900px] space-y-6">
          {/* PAGE 1 */}
          <div className="hi-page rounded-md bg-white p-6 text-black shadow print:shadow-none">
            <HealthIncidentReportHeader
              subtitleRight={
                <div>
                  Status:{" "}
                  <span className="font-semibold">
                    {sanitizeForDisplay(d.status)}
                  </span>
                </div>
              }
            />

            <div className="mt-4">
              <table className="w-full border-collapse text-[12px]">
                <tbody>
                  <tr>
                    <td className="w-1/2 border border-black p-2 align-top">
                      <div className="font-semibold">Individual</div>
                      <div className="mt-1 text-[13px] font-bold">
                        {sanitizeForDisplay(d.individualName)}
                      </div>
                    </td>
                    <td className="w-1/2 border border-black p-2 align-top">
                      <div className="font-semibold">DSP / Staff</div>
                      <div className="mt-1 text-[13px] font-bold">
                        {sanitizeForDisplay(d.staffName ?? "")}
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-black p-2 align-top">
                      <div className="font-semibold">Report Date</div>
                      <div className="mt-1 text-[13px] font-bold">
                        {sanitizeForDisplay(reportDate)}
                      </div>
                    </td>
                    <td className="border border-black p-2 align-top">
                      <div className="font-semibold">Shift</div>
                      <div className="mt-1 text-[13px] font-bold">
                        {shiftText}
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-black p-2 align-top" colSpan={2}>
                      <div className="font-semibold">Type of Incident</div>

                      <div className="mt-2">
                        <table className="w-full border-collapse text-[12px]">
                          <tbody>
                            {Array.from({
                              length: Math.max(
                                INCIDENT_TYPES_LEFT.length,
                                INCIDENT_TYPES_RIGHT.length
                              ),
                            }).map((_, idx) => {
                              const left = INCIDENT_TYPES_LEFT[idx];
                              const right = INCIDENT_TYPES_RIGHT[idx];

                              return (
                                <tr key={idx}>
                                  <td className="w-1/2 border border-black p-2 align-top">
                                    {left ? (
                                      <CheckboxLabel
                                        checked={isIncidentTypeChecked(
                                          incidentTypeList,
                                          left
                                        )}
                                        label={left}
                                      />
                                    ) : (
                                      <div>&nbsp;</div>
                                    )}
                                  </td>
                                  <td className="w-1/2 border border-black p-2 align-top">
                                    {right ? (
                                      <CheckboxLabel
                                        checked={isIncidentTypeChecked(
                                          incidentTypeList,
                                          right
                                        )}
                                        label={right}
                                      />
                                    ) : (
                                      <div>&nbsp;</div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-black p-2 align-top">
                      <div className="font-semibold">Incident Date</div>
                      <div className="mt-1 text-[13px] font-bold">
                        {sanitizeForDisplay(incidentDate)}
                      </div>
                    </td>
                    <td className="border border-black p-2 align-top">
                      <div className="font-semibold">Incident Time</div>
                      <div className="mt-1 text-[13px] font-bold">
                        {incidentTime ? incidentTime : "—"}
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-black p-2 align-top" colSpan={2}>
                      <div className="font-semibold">Location</div>
                      <div className="mt-2 border border-black p-2 text-[12px] font-bold">
                        {location ? location : "—"}
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-black p-2 align-top" colSpan={2}>
                      <div className="font-semibold">Description of Incident</div>
                      <div className="mt-2 min-h-[110px] whitespace-pre-wrap border border-black p-2 text-[12px]">
                        {description || ""}
                      </div>
                    </td>
                  </tr>

                  {/* ✅ Signature of Reporter replaces Who Was Notified */}
                  <tr>
                    <td className="border border-black p-2 align-top">
                      <div className="font-semibold">Signature of Reporter</div>
                      <div className="mt-2 min-h-[55px] whitespace-pre-wrap border border-black p-2 text-[12px] font-bold">
                        {reporterSignatureName || "—"}
                      </div>
                    </td>
                    <td className="border border-black p-2 align-top">
                      <div className="font-semibold">Date</div>
                      <div className="mt-2 min-h-[55px] whitespace-pre-wrap border border-black p-2 text-[12px] font-bold">
                        {reporterSignatureDate || "—"}
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-black p-2 align-top" colSpan={2}>
                      <div className="font-semibold">Witnesses</div>
                      <div className="mt-2 min-h-[60px] whitespace-pre-wrap border border-black p-2 text-[12px]">
                        {witnesses || ""}
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-black p-2 align-top" colSpan={2}>
                      <div className="font-semibold">Additional Notes</div>
                      <div className="mt-2 min-h-[60px] whitespace-pre-wrap border border-black p-2 text-[12px]">
                        {additionalNotes || ""}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGE 2 */}
          <div className="hi-page rounded-md bg-white p-6 text-black shadow print:shadow-none">
            <div className="text-[14px] font-bold">Supervisor Review</div>

            <div className="mt-3">
              <table className="w-full border-collapse text-[12px]">
                <tbody>
                  <tr>
                    <td className="w-1/3 border border-black p-2 align-top">
                      <div className="font-semibold">Status</div>
                      <div className="mt-1 text-[13px] font-bold">
                        {sanitizeForDisplay(d.status)}
                      </div>
                    </td>
                    <td className="w-2/3 border border-black p-2 align-top">
                      <div className="font-semibold">Reviewed At</div>
                      <div className="mt-1 text-[13px] font-bold">
                        {d.reviewedAt ? d.reviewedAt : "—"}
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-black p-2 align-top" colSpan={2}>
                      <div className="font-semibold">CI Assignment</div>
                      <div className="mt-2 grid grid-cols-1 gap-2 text-[12px]">
                        <div>
                          <span className="font-semibold">CI Name:</span>{" "}
                          {sanitizeForDisplay(safeStr(d.ciName))}
                        </div>
                        <div>
                          <span className="font-semibold">CI Email:</span>{" "}
                          {sanitizeForDisplay(safeStr(d.ciEmail))}
                        </div>
                        <div>
                          <span className="font-semibold">CI Phone:</span>{" "}
                          {sanitizeForDisplay(safeStr(d.ciPhone))}
                        </div>
                        <div>
                          <span className="font-semibold">Assigned At:</span>{" "}
                          {d.ciAssignedAt ? d.ciAssignedAt : "—"}
                          {d.ciAssignedByName ? (
                            <>
                              {" "}
                              <span className="font-semibold">By:</span>{" "}
                              {sanitizeForDisplay(safeStr(d.ciAssignedByName))}
                            </>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-black p-2 align-top" colSpan={2}>
                      <div className="font-semibold">Supervisor Decision</div>
                      <div className="mt-2 min-h-[120px] whitespace-pre-wrap border border-black p-2 text-[12px]">
                        {safeStr(d.supervisorDecision) || ""}
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-black p-2 align-top" colSpan={2}>
                      <div className="font-semibold">Actions Taken</div>
                      <div className="mt-2 min-h-[120px] whitespace-pre-wrap border border-black p-2 text-[12px]">
                        {safeStr(d.supervisorActionsTaken) || ""}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 text-center text-[12px]">
              <div className="font-semibold">Supervisor Signature</div>

              <div className="mt-8 text-[13px] font-semibold">
                {sanitizeForDisplay(supervisorSignatureName)}
              </div>

              <div className="mx-auto mt-2 w-[320px] border-b border-black" />

              <div className="mt-2 text-gray-700">
                Date: {supervisorSignatureDate}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body.hi-printing * {
            visibility: hidden !important;
          }

          body.hi-printing .hi-print-root,
          body.hi-printing .hi-print-root * {
            visibility: visible !important;
          }

          body.hi-printing .hi-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }

          body.hi-printing .hi-page {
            page-break-after: always;
            break-after: page;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          body.hi-printing .hi-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          body.hi-printing {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import HealthIncidentReportHeader from "@/components/reports/HealthIncidentReportHeader";

type Status =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "ASSIGNED"
  | "INVESTIGATED"
  | "CLOSED";

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

type TimelineItem = {
  id: string;
  actionType: string;
  actorUserId?: string | null;
  actorEmployeeId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  note?: string | null;
  meta?: any;
  createdAt?: string | null;
  createdAtLocal?: string | null;
};

type AttachmentItem = {
  id: string;
  category: string;
  fileName: string;
  filePath: string;
  mimeType?: string | null;
  fileSize?: number | null;
  description?: string | null;
  uploadedByUserId?: string | null;
  uploadedByEmployeeId?: string | null;
  uploadedByName?: string | null;
  uploadedByRole?: string | null;
  createdAt?: string | null;
  createdAtLocal?: string | null;
};

type HealthIncidentDetail = {
  id: string;
  caseNumber?: string | null;

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

  investigationFindings?: string | null;
  rootCause?: string | null;
  witnessNotes?: string | null;
  correctiveActions?: string | null;
  recommendation?: string | null;
  investigatedAt?: string | null;
  investigatedByStaffId?: string | null;
  investigatedByName?: string | null;

  allowDspViewOutcome?: boolean | null;
  finalDecision?: string | null;
  finalSummary?: string | null;
  closedAt?: string | null;
  closedByUserId?: string | null;
  closedByName?: string | null;

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

function formatBytes(bytes?: number | null) {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
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

function statusTextClass(status?: string) {
  switch (safeStr(status).toUpperCase()) {
    case "SUBMITTED":
      return "text-bac-primary";
    case "IN_REVIEW":
      return "text-yellow-400";
    case "ASSIGNED":
      return "text-blue-400";
    case "INVESTIGATED":
      return "text-violet-400";
    case "CLOSED":
      return "text-emerald-400";
    default:
      return "text-slate-200";
  }
}

export default function HealthIncidentReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = (params as any)?.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [me, setMe] = useState<MeResponse | null>(null);
  const [detail, setDetail] = useState<HealthIncidentDetail | null>(null);

  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [attachmentItems, setAttachmentItems] = useState<AttachmentItem[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

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

  const [investigationFindings, setInvestigationFindings] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [witnessNotes, setWitnessNotes] = useState("");
  const [correctiveActions, setCorrectiveActions] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [investigatedByName, setInvestigatedByName] = useState("");
  const [savingInvestigation, setSavingInvestigation] = useState(false);
  const [investigationMsg, setInvestigationMsg] = useState<string | null>(null);

  const [finalDecision, setFinalDecision] = useState("");
  const [finalSummary, setFinalSummary] = useState("");
  const [allowDspViewOutcome, setAllowDspViewOutcome] = useState(false);
  const [closingCase, setClosingCase] = useState(false);
  const [closeMsg, setCloseMsg] = useState<string | null>(null);

  const [attachmentCategory, setAttachmentCategory] = useState("CI_EVIDENCE");
  const [attachmentDescription, setAttachmentDescription] = useState("");
  const [selectedAttachmentFile, setSelectedAttachmentFile] = useState<File | null>(null);
  const [savingAttachment, setSavingAttachment] = useState(false);
  const [attachmentMsg, setAttachmentMsg] = useState<string | null>(null);

  const SAMPLE_DETAIL: HealthIncidentDetail = useMemo(
    () => ({
      id: "SAMPLE_ID",
      caseNumber: "HIR-000001",
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

      investigationFindings: "",
      rootCause: "",
      witnessNotes: "",
      correctiveActions: "",
      recommendation: "",
      investigatedAt: null,
      investigatedByStaffId: "",
      investigatedByName: "",

      allowDspViewOutcome: false,
      finalDecision: "",
      finalSummary: "",
      closedAt: null,
      closedByUserId: "",
      closedByName: "",

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

  async function loadTimeline(reportId: string) {
    try {
      setLoadingTimeline(true);
      const res = await fetch(`/api/reports/health-incident/${reportId}/timeline`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(
          `Failed to load timeline: ${res.status} ${res.statusText}. ${txt.slice(0, 200)}`
        );
      }

      const data = await res.json();
      setTimelineItems(data.items ?? []);
    } catch (e) {
      console.error(e);
      setTimelineItems([]);
    } finally {
      setLoadingTimeline(false);
    }
  }

  async function loadAttachments(reportId: string) {
    try {
      setLoadingAttachments(true);
      const res = await fetch(`/api/reports/health-incident/${reportId}/attachments`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(
          `Failed to load attachments: ${res.status} ${res.statusText}. ${txt.slice(0, 200)}`
        );
      }

      const data = await res.json();
      setAttachmentItems(data.items ?? []);
    } catch (e) {
      console.error(e);
      setAttachmentItems([]);
    } finally {
      setLoadingAttachments(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        setSaveMsg(null);
        setAssignMsg(null);
        setInvestigationMsg(null);
        setCloseMsg(null);
        setAttachmentMsg(null);

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
            `Failed to load detail: ${res.status} ${res.statusText}. ${txt.slice(0, 200)}`
          );
        }

        const d = (await res.json()) as HealthIncidentDetail;
        if (!mounted) return;

        setDetail(d);

        const seedStatus =
          d.status === "CLOSED"
            ? "CLOSED"
            : d.status === "INVESTIGATED"
              ? "INVESTIGATED"
              : d.status === "ASSIGNED"
                ? "ASSIGNED"
                : "IN_REVIEW";

        setSupStatus(seedStatus as Status);
        setSupDecision(safeStr(d.supervisorDecision));
        setSupActions(safeStr(d.supervisorActionsTaken));

        setCiName(safeStr(d.ciName));
        setCiEmail(safeStr(d.ciEmail));
        setCiPhone(safeStr(d.ciPhone));

        setInvestigationFindings(safeStr(d.investigationFindings));
        setRootCause(safeStr(d.rootCause));
        setWitnessNotes(safeStr(d.witnessNotes));
        setCorrectiveActions(safeStr(d.correctiveActions));
        setRecommendation(safeStr(d.recommendation));
        setInvestigatedByName(
          safeStr(d.investigatedByName) || buildActorName(me) || ""
        );

        setFinalDecision(safeStr(d.finalDecision));
        setFinalSummary(safeStr(d.finalSummary));
        setAllowDspViewOutcome(Boolean(d.allowDspViewOutcome));

        await Promise.all([loadTimeline(id), loadAttachments(id)]);
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

        setInvestigationFindings(safeStr(SAMPLE_DETAIL.investigationFindings));
        setRootCause(safeStr(SAMPLE_DETAIL.rootCause));
        setWitnessNotes(safeStr(SAMPLE_DETAIL.witnessNotes));
        setCorrectiveActions(safeStr(SAMPLE_DETAIL.correctiveActions));
        setRecommendation(safeStr(SAMPLE_DETAIL.recommendation));
        setInvestigatedByName(safeStr(SAMPLE_DETAIL.investigatedByName));

        setFinalDecision(safeStr(SAMPLE_DETAIL.finalDecision));
        setFinalSummary(safeStr(SAMPLE_DETAIL.finalSummary));
        setAllowDspViewOutcome(Boolean(SAMPLE_DETAIL.allowDspViewOutcome));

        setTimelineItems([]);
        setAttachmentItems([]);
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
        actorUserId: safeStr(me?.user?.id).trim() || undefined,
        actorName: actorName || undefined,
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
          `Failed to save review: ${res.status} ${res.statusText}. ${txt.slice(0, 200)}`
        );
      }

      const updated = (await res.json()) as HealthIncidentDetail;
      setDetail(updated);
      setSupStatus(updated.status);
      setSaveMsg("Saved.");
      await loadTimeline(id);
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
          `Failed to assign CI: ${res.status} ${res.statusText}. ${txt.slice(0, 200)}`
        );
      }

      const updated = (await res.json()) as HealthIncidentDetail;

      setDetail(updated);

      if (updated.status) setSupStatus(updated.status);

      setCiName(safeStr(updated.ciName));
      setCiEmail(safeStr(updated.ciEmail));
      setCiPhone(safeStr(updated.ciPhone));

      setAssignMsg("CI assigned.");
      await loadTimeline(effectiveId);
    } catch (e: any) {
      console.error(e);
      setAssignMsg(e?.message ?? "Failed to assign CI");
    } finally {
      setAssigningCI(false);
      setTimeout(() => setAssignMsg(null), 2500);
    }
  }

  async function submitInvestigation() {
    if (!id) return;

    try {
      setSavingInvestigation(true);
      setInvestigationMsg(null);

      const body = {
        investigationFindings,
        rootCause,
        witnessNotes,
        correctiveActions,
        recommendation,
        investigatedByStaffId: safeStr(me?.employee?.staffId).trim() || undefined,
        investigatedByName: investigatedByName.trim() || actorName || undefined,
        actorUserId: safeStr(me?.user?.id).trim() || undefined,
        actorName: actorName || investigatedByName.trim() || undefined,
      };

      const res = await fetch(`/api/reports/health-incident/${id}/investigation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(
          `Failed to submit investigation: ${res.status} ${res.statusText}. ${txt.slice(0, 200)}`
        );
      }

      const updated = (await res.json()) as HealthIncidentDetail;
      setDetail(updated);
      setSupStatus(updated.status);
      setInvestigationFindings(safeStr(updated.investigationFindings));
      setRootCause(safeStr(updated.rootCause));
      setWitnessNotes(safeStr(updated.witnessNotes));
      setCorrectiveActions(safeStr(updated.correctiveActions));
      setRecommendation(safeStr(updated.recommendation));
      setInvestigatedByName(safeStr(updated.investigatedByName));

      setInvestigationMsg("Investigation submitted.");
      await loadTimeline(id);
    } catch (e: any) {
      console.error(e);
      setInvestigationMsg(e?.message ?? "Failed to submit investigation");
    } finally {
      setSavingInvestigation(false);
      setTimeout(() => setInvestigationMsg(null), 2500);
    }
  }

  async function closeCase() {
    if (!id) return;

    try {
      setClosingCase(true);
      setCloseMsg(null);

      const body = {
        supervisorName: actorName || undefined,
        supervisorDecision: supDecision,
        supervisorActionsTaken: supActions,
        finalDecision: finalDecision || undefined,
        finalSummary: finalSummary || undefined,
        allowDspViewOutcome,
        closedByUserId: safeStr(me?.user?.id).trim() || undefined,
        closedByName: actorName || undefined,
        actorUserId: safeStr(me?.user?.id).trim() || undefined,
        actorName: actorName || undefined,
      };

      const res = await fetch(`/api/reports/health-incident/${id}/close`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(
          `Failed to close case: ${res.status} ${res.statusText}. ${txt.slice(0, 200)}`
        );
      }

      const updated = (await res.json()) as HealthIncidentDetail;
      setDetail(updated);
      setSupStatus(updated.status);
      setFinalDecision(safeStr(updated.finalDecision));
      setFinalSummary(safeStr(updated.finalSummary));
      setAllowDspViewOutcome(Boolean(updated.allowDspViewOutcome));

      setCloseMsg("Case closed.");
      await loadTimeline(id);
    } catch (e: any) {
      console.error(e);
      setCloseMsg(e?.message ?? "Failed to close case");
    } finally {
      setClosingCase(false);
      setTimeout(() => setCloseMsg(null), 2500);
    }
  }

  async function uploadAttachment() {
    if (!id) return;

    try {
      setSavingAttachment(true);
      setAttachmentMsg(null);

      if (!selectedAttachmentFile) {
        throw new Error("Please choose a file");
      }

      const form = new FormData();
      form.append("category", attachmentCategory || "CI_EVIDENCE");
      form.append("description", attachmentDescription.trim() || "");
      form.append("uploadedByUserId", safeStr(me?.user?.id).trim() || "");
      form.append(
        "uploadedByEmployeeId",
        safeStr(me?.employee?.staffId).trim() || ""
      );
      form.append("uploadedByName", actorName || "");
      form.append("uploadedByRole", canSupervisorReview ? "SUPERVISOR" : "CI");
      form.append("file", selectedAttachmentFile, selectedAttachmentFile.name);

      const res = await fetch(
        `/api/reports/health-incident/${id}/attachments?mode=upload`,
        {
          method: "POST",
          cache: "no-store",
          body: form,
        }
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(
          `Failed to upload attachment: ${res.status} ${res.statusText}. ${txt.slice(0, 200)}`
        );
      }

      setSelectedAttachmentFile(null);
      setAttachmentDescription("");

      const fileInput = document.getElementById(
        "health-incident-attachment-file"
      ) as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = "";
      }

      setAttachmentMsg("Attachment uploaded.");
      await Promise.all([loadAttachments(id), loadTimeline(id)]);
    } catch (e: any) {
      console.error(e);
      setAttachmentMsg(e?.message ?? "Failed to upload attachment");
    } finally {
      setSavingAttachment(false);
      setTimeout(() => setAttachmentMsg(null), 3500);
    }
  }

  const showCiAssignedAt = d.ciAssignedAt ? safeStr(d.ciAssignedAt) : "";

  return (
    <div className="px-6 py-6">
      <div className="mb-4 flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Health & Incident Case Detail
          </h1>
          <p className="text-sm text-slate-400">
            Review, assign, investigate, track timeline, and close case.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-200">
              Case #:{" "}
              <span className="font-semibold text-white">
                {sanitizeForDisplay(safeStr(d.caseNumber))}
              </span>
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-200">
              Status:{" "}
              <span className={`font-semibold ${statusTextClass(d.status)}`}>
                {sanitizeForDisplay(safeStr(d.status))}
              </span>
            </span>
          </div>
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
            Back
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
                <option value="INVESTIGATED">INVESTIGATED</option>
                <option value="CLOSED">CLOSED</option>
              </select>

              <button
                disabled={savingReview}
                onClick={() => saveSupervisorReview()}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-bac-primary px-6 text-sm font-medium text-white shadow hover:bg-bac-primary/90 disabled:opacity-60"
              >
                {savingReview ? "Saving..." : "Save"}
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

      <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-md shadow-black/40 print:hidden">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">
              CI Investigation
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Investigation details and findings. Submit when review is complete.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={savingInvestigation}
              onClick={submitInvestigation}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-violet-700 px-6 text-sm font-medium text-white shadow hover:bg-violet-700/90 disabled:opacity-60"
            >
              {savingInvestigation ? "Submitting..." : "Submit Investigation"}
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3">
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-slate-300">
              Investigation Findings
            </label>
            <textarea
              value={investigationFindings}
              onChange={(e) => setInvestigationFindings(e.target.value)}
              className="min-h-[90px] rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
              placeholder="Findings..."
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                Root Cause
              </label>
              <textarea
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                className="min-h-[90px] rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
                placeholder="Root cause..."
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                Witness Notes
              </label>
              <textarea
                value={witnessNotes}
                onChange={(e) => setWitnessNotes(e.target.value)}
                className="min-h-[90px] rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
                placeholder="Witness notes..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                Corrective Actions
              </label>
              <textarea
                value={correctiveActions}
                onChange={(e) => setCorrectiveActions(e.target.value)}
                className="min-h-[90px] rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
                placeholder="Corrective actions..."
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                Recommendation
              </label>
              <textarea
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                className="min-h-[90px] rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
                placeholder="Recommendation..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                Investigated By
              </label>
              <input
                value={investigatedByName}
                onChange={(e) => setInvestigatedByName(e.target.value)}
                className="h-10 rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
                placeholder="Investigator name"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                Investigated At
              </label>
              <div className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-300 flex items-center">
                {sanitizeForDisplay(safeStr(d.investigatedAt))}
              </div>
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                Current Status
              </label>
              <div className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm flex items-center">
                <span className={`font-medium ${statusTextClass(d.status)}`}>
                  {sanitizeForDisplay(safeStr(d.status))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {investigationMsg && (
          <div className="mt-3 text-xs text-slate-200">{investigationMsg}</div>
        )}
      </div>

      {canSupervisorReview && (
        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-md shadow-black/40 print:hidden">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">
                Final Close Decision
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Final supervisor decision and close-case summary.
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={closingCase}
                onClick={closeCase}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-700 px-6 text-sm font-medium text-white shadow hover:bg-emerald-700/90 disabled:opacity-60"
              >
                {closingCase ? "Closing..." : "Close Case"}
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                Final Decision
              </label>
              <textarea
                value={finalDecision}
                onChange={(e) => setFinalDecision(e.target.value)}
                className="min-h-[90px] rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
                placeholder="Final decision..."
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-slate-300">
                Final Summary
              </label>
              <textarea
                value={finalSummary}
                onChange={(e) => setFinalSummary(e.target.value)}
                className="min-h-[90px] rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
                placeholder="Final summary..."
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <input
              id="allowDspViewOutcome"
              type="checkbox"
              checked={allowDspViewOutcome}
              onChange={(e) => setAllowDspViewOutcome(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-bac-primary focus:ring-bac-primary"
            />
            <label
              htmlFor="allowDspViewOutcome"
              className="text-sm text-slate-200"
            >
              Allow DSP to view case outcome
            </label>
          </div>

          {closeMsg && (
            <div className="mt-3 text-xs text-slate-200">{closeMsg}</div>
          )}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-md shadow-black/40 print:hidden">
        <div className="text-sm font-semibold text-white">Attachments</div>
        <div className="mt-1 text-xs text-slate-400">
          Upload file to server and save attachment metadata automatically.
          <span className="ml-2 text-slate-300">
            Allowed: pdf, jpg, jpeg, png, doc, docx • Max 10MB
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-slate-300">
              Category
            </label>
            <select
              value={attachmentCategory}
              onChange={(e) => setAttachmentCategory(e.target.value)}
              className="h-10 rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
            >
              <option value="CI_EVIDENCE">CI_EVIDENCE</option>
              <option value="SUPERVISOR_NOTE">SUPERVISOR_NOTE</option>
              <option value="INITIAL_REPORT">INITIAL_REPORT</option>
              <option value="FINAL_DOCUMENT">FINAL_DOCUMENT</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-slate-300">
              Choose File
            </label>
            <input
              id="health-incident-attachment-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setSelectedAttachmentFile(file);
              }}
              className="block h-10 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-100 hover:file:bg-slate-700"
            />
          </div>

          <div className="flex flex-col md:col-span-2">
            <label className="mb-1 text-xs font-medium text-slate-300">
              Description
            </label>
            <input
              value={attachmentDescription}
              onChange={(e) => setAttachmentDescription(e.target.value)}
              className="h-10 rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-bac-primary focus:ring-1 focus:ring-bac-primary"
              placeholder="Short description..."
            />
          </div>
        </div>

        {selectedAttachmentFile ? (
          <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300">
            Selected file:{" "}
            <span className="font-semibold text-slate-100">
              {selectedAttachmentFile.name}
            </span>
            {" • "}
            {formatBytes(selectedAttachmentFile.size)}
            {" • "}
            {selectedAttachmentFile.type || "unknown"}
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-3">
          <button
            disabled={savingAttachment}
            onClick={uploadAttachment}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-sky-700 px-6 text-sm font-medium text-white shadow hover:bg-sky-700/90 disabled:opacity-60"
          >
            {savingAttachment ? "Uploading..." : "Upload Attachment"}
          </button>
        </div>

        {attachmentMsg && (
          <div className="mt-3 text-xs text-slate-200">{attachmentMsg}</div>
        )}

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-700">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-slate-200">
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">File Name</th>
                <th className="px-3 py-2 text-left">Path</th>
                <th className="px-3 py-2 text-left">Uploaded By</th>
              </tr>
            </thead>
            <tbody>
              {loadingAttachments && (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-center text-slate-300">
                    Loading attachments...
                  </td>
                </tr>
              )}

              {!loadingAttachments && attachmentItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-center text-slate-400">
                    No attachments yet.
                  </td>
                </tr>
              )}

              {!loadingAttachments &&
                attachmentItems.map((it) => (
                  <tr
                    key={it.id}
                    className="border-t border-slate-800 bg-slate-950 text-slate-100"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {sanitizeForDisplay(safeStr(it.createdAtLocal || it.createdAt))}
                    </td>
                    <td className="px-3 py-2">{sanitizeForDisplay(it.category)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`/api/reports/health-incident/${encodeURIComponent(
                            d.id
                          )}/attachments/${encodeURIComponent(it.id)}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-sky-400 underline hover:text-sky-300"
                          title="Open attachment"
                        >
                          {sanitizeForDisplay(it.fileName)}
                        </a>

                        <a
                          href={`/api/reports/health-incident/${encodeURIComponent(
                            d.id
                          )}/attachments/${encodeURIComponent(it.id)}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded border border-slate-600 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-800"
                          title="Open"
                        >
                          Open
                        </a>
                      </div>

                      <div className="mt-1 text-[11px] text-slate-400">
                        {sanitizeForDisplay(safeStr(it.mimeType))} • {formatBytes(it.fileSize)}
                      </div>

                      {it.description ? (
                        <div className="mt-1 text-[11px] text-slate-400">
                          {it.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 break-all">{sanitizeForDisplay(it.filePath)}</td>
                    <td className="px-3 py-2">
                      {sanitizeForDisplay(safeStr(it.uploadedByName))}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-md shadow-black/40 print:hidden">
        <div className="text-sm font-semibold text-white">Timeline / Audit Trail</div>
        <div className="mt-1 text-xs text-slate-400">
          Full activity history for this case.
        </div>

        <div className="mt-4 space-y-3">
          {loadingTimeline && (
            <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-300">
              Loading timeline...
            </div>
          )}

          {!loadingTimeline && timelineItems.length === 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-400">
              No timeline items yet.
            </div>
          )}

          {!loadingTimeline &&
            timelineItems.map((it) => (
              <div
                key={it.id}
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
              >
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm font-semibold text-white">
                    {sanitizeForDisplay(it.actionType)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {sanitizeForDisplay(
                      safeStr(it.createdAtLocal || it.createdAt)
                    )}
                  </div>
                </div>

                <div className="mt-1 text-xs text-slate-300">
                  Actor:{" "}
                  <span className="font-medium text-slate-100">
                    {sanitizeForDisplay(safeStr(it.actorName))}
                  </span>
                  {it.actorRole ? (
                    <>
                      {" "}
                      • Role:{" "}
                      <span className="font-medium text-slate-100">
                        {sanitizeForDisplay(safeStr(it.actorRole))}
                      </span>
                    </>
                  ) : null}
                </div>

                {it.note ? (
                  <div className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
                    {it.note}
                  </div>
                ) : null}
              </div>
            ))}
        </div>
      </div>

      <div className="hi-print-root">
        <div className="mx-auto max-w-[900px] space-y-6">
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

            <div className="mt-2 text-[12px] font-semibold">
              Case Number: {sanitizeForDisplay(safeStr(d.caseNumber))}
            </div>

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

                  <tr>
                    <td className="border border-black p-2 align-top" colSpan={2}>
                      <div className="font-semibold">CI Investigation</div>
                      <div className="mt-2 space-y-3 text-[12px]">
                        <div>
                          <div className="font-semibold">Investigation Findings</div>
                          <div className="mt-1 min-h-[40px] whitespace-pre-wrap border border-black p-2">
                            {safeStr(d.investigationFindings) || ""}
                          </div>
                        </div>

                        <div>
                          <div className="font-semibold">Root Cause</div>
                          <div className="mt-1 min-h-[40px] whitespace-pre-wrap border border-black p-2">
                            {safeStr(d.rootCause) || ""}
                          </div>
                        </div>

                        <div>
                          <div className="font-semibold">Witness Notes</div>
                          <div className="mt-1 min-h-[40px] whitespace-pre-wrap border border-black p-2">
                            {safeStr(d.witnessNotes) || ""}
                          </div>
                        </div>

                        <div>
                          <div className="font-semibold">Corrective Actions</div>
                          <div className="mt-1 min-h-[40px] whitespace-pre-wrap border border-black p-2">
                            {safeStr(d.correctiveActions) || ""}
                          </div>
                        </div>

                        <div>
                          <div className="font-semibold">Recommendation</div>
                          <div className="mt-1 min-h-[40px] whitespace-pre-wrap border border-black p-2">
                            {safeStr(d.recommendation) || ""}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="font-semibold">Investigated By:</span>{" "}
                            {sanitizeForDisplay(safeStr(d.investigatedByName))}
                          </div>
                          <div>
                            <span className="font-semibold">Investigated At:</span>{" "}
                            {sanitizeForDisplay(safeStr(d.investigatedAt))}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-black p-2 align-top" colSpan={2}>
                      <div className="font-semibold">Final Close Decision</div>
                      <div className="mt-2 space-y-3 text-[12px]">
                        <div>
                          <div className="font-semibold">Final Decision</div>
                          <div className="mt-1 min-h-[40px] whitespace-pre-wrap border border-black p-2">
                            {safeStr(d.finalDecision) || ""}
                          </div>
                        </div>

                        <div>
                          <div className="font-semibold">Final Summary</div>
                          <div className="mt-1 min-h-[50px] whitespace-pre-wrap border border-black p-2">
                            {safeStr(d.finalSummary) || ""}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="font-semibold">Closed By:</span>{" "}
                            {sanitizeForDisplay(safeStr(d.closedByName))}
                          </div>
                          <div>
                            <span className="font-semibold">Closed At:</span>{" "}
                            {sanitizeForDisplay(safeStr(d.closedAt))}
                          </div>
                        </div>

                        <div>
                          <span className="font-semibold">DSP Can View Outcome:</span>{" "}
                          {d.allowDspViewOutcome ? "Yes" : "No"}
                        </div>
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
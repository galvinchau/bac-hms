"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BillingAuthStatus,
  BillingPayer,
  BillingReadiness,
  BillingVisitQuality,
  BillingWorkspaceRow,
} from "./BillingTypes";

type VisitApiRow = {
  id: string;
  date: string;
  individualName: string;
  dspName: string;
  serviceId?: string | null;
  serviceCode: string;
  serviceName?: string | null;
  payer?: BillingPayer;
  plannedStart: string;
  plannedEnd: string;
  checkIn: string | null;
  checkOut: string | null;
  unitsPlanned: number;
  unitsActual: number;
  rate?: number;
  amount?: number;
  rateStatus?: "FOUND" | "MISSING";
  status: "OPEN" | "COMPLETED" | "CANCELED";
  cancelReason: string | null;
  source: "SCHEDULE" | "MOBILE" | "MANUAL";
  noteLinked: boolean;
  reviewed: boolean;
};

type AuthorizationApiRow = {
  id: string;
  authorizationNumber: string;
  payer: BillingPayer;
  program?: string | null;
  startDate: string;
  endDate: string;
  maximum: number;
  manualUsed?: number | null;
  manualMissed?: number | null;
  totalUsed?: number | null;
  totalMissed?: number | null;
  remaining?: number | null;
  serviceCode?: string | null;
  serviceName?: string | null;
  individual?: {
    id: string;
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    medicaidId?: string | null;
  } | null;
};

type ServicesResponse = {
  services?: Array<{
    id: string;
    serviceCode: string;
    serviceName?: string | null;
    billingCode?: string | null;
    category?: string | null;
    status?: string | null;
    billable?: boolean | null;
  }>;
  items?: Array<{
    id: string;
    serviceCode: string;
    serviceName?: string | null;
    billingCode?: string | null;
    category?: string | null;
    status?: string | null;
    billable?: boolean | null;
  }>;
};

type VisitsResponse = VisitApiRow[];
type AuthorizationsResponse = {
  items?: AuthorizationApiRow[];
};

type WorkspaceVisitGroupMap = Record<string, VisitApiRow[]>;

function badgeClass(kind: string) {
  switch (kind) {
    case "READY":
      return "bg-bac-green/15 text-bac-green border-bac-green/30";
    case "REVIEW":
      return "bg-yellow-500/15 text-yellow-200 border-yellow-500/30";
    case "HOLD":
      return "bg-orange-500/15 text-orange-200 border-orange-500/30";
    case "ERROR":
      return "bg-bac-red/15 text-bac-red border-bac-red/30";
    case "ALREADY_BILLED":
      return "bg-sky-500/15 text-sky-200 border-sky-500/30";
    case "PARTIAL":
      return "bg-violet-500/15 text-violet-200 border-violet-500/30";
    case "VALID":
      return "bg-bac-green/15 text-bac-green border-bac-green/30";
    case "MISSING":
    case "EXPIRED":
    case "OVER":
    case "NO_RATE":
      return "bg-bac-red/15 text-bac-red border-bac-red/30";
    case "CLEAN":
      return "bg-bac-green/15 text-bac-green border-bac-green/30";
    case "MISSING_CLOCK":
    case "NO_EVV":
      return "bg-yellow-500/15 text-yellow-200 border-yellow-500/30";
    case "CANCELED":
      return "bg-white/10 text-bac-text border-bac-border";
    case "MANUAL":
      return "bg-sky-500/15 text-sky-200 border-sky-500/30";
    case "COMPLETED":
      return "bg-bac-green/15 text-bac-green border-bac-green/30";
    case "OPEN":
      return "bg-yellow-500/15 text-yellow-200 border-yellow-500/30";
    case "SCHEDULE":
      return "bg-white/10 text-bac-text border-bac-border";
    case "MOBILE":
      return "bg-bac-green/15 text-bac-green border-bac-green/30";
    default:
      return "bg-white/10 text-bac-text border-bac-border";
  }
}

function Badge({ children, kind }: { children: React.ReactNode; kind: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass(
        kind
      )}`}
    >
      {children}
    </span>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
      <div className="text-xs text-bac-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold text-bac-text">{value}</div>
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
      <div className="max-h-[90vh] w-full max-w-7xl overflow-hidden rounded-2xl border border-bac-border bg-bac-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-bac-border px-5 py-4">
          <div>
            <div className="text-base font-semibold text-bac-text">{title}</div>
            <div className="mt-1 text-xs text-bac-muted">
              Review source visits connected to the selected workspace row.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text hover:bg-white/5"
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(90vh-80px)] overflow-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getMondayAndSundayOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    from: monday.toISOString().slice(0, 10),
    to: sunday.toISOString().slice(0, 10),
  };
}

function getLastWeekRange() {
  const current = getMondayAndSundayOfCurrentWeek();
  const monday = new Date(current.from);
  const sunday = new Date(current.to);

  monday.setDate(monday.getDate() - 7);
  sunday.setDate(sunday.getDate() - 7);

  return {
    from: monday.toISOString().slice(0, 10),
    to: sunday.toISOString().slice(0, 10),
  };
}

function getCurrentMonthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: first.toISOString().slice(0, 10),
    to: last.toISOString().slice(0, 10),
  };
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function buildAuthIndividualName(auth: AuthorizationApiRow) {
  const parts = [
    auth.individual?.firstName,
    auth.individual?.middleName,
    auth.individual?.lastName,
  ].filter(Boolean);
  return parts.join(" ").trim();
}

function isDateWithinRange(date: string, from?: string | null, to?: string | null) {
  if (!date) return false;
  if (from && date < from.slice(0, 10)) return false;
  if (to && date > to.slice(0, 10)) return false;
  return true;
}

function getVisitQuality(visits: VisitApiRow[]): BillingVisitQuality {
  const hasCanceled = visits.some((v) => v.status === "CANCELED");
  if (hasCanceled) return "CANCELED";

  const hasManual = visits.some((v) => v.source === "MANUAL");
  if (hasManual) return "MANUAL";

  const hasMissingClock = visits.some(
    (v) => v.status === "COMPLETED" && (!v.checkIn || !v.checkOut)
  );
  if (hasMissingClock) return "MISSING_CLOCK";

  const hasNoEvv = visits.some(
    (v) => v.status === "COMPLETED" && v.source === "SCHEDULE" && !v.noteLinked
  );
  if (hasNoEvv) return "NO_EVV";

  return "CLEAN";
}

function getAuthStatus(
  auth: AuthorizationApiRow | null,
  periodFrom: string,
  periodTo: string
): BillingAuthStatus {
  if (!auth) return "MISSING";

  const start = auth.startDate?.slice(0, 10) || "";
  const end = auth.endDate?.slice(0, 10) || "";

  if (start && periodTo < start) return "EXPIRED";
  if (end && periodFrom > end) return "EXPIRED";

  if ((auth.remaining ?? 0) < 0) return "OVER";

  return "VALID";
}

function getReadiness(params: {
  visits: VisitApiRow[];
  authStatus: BillingAuthStatus;
  rate: number;
}): BillingReadiness {
  const { visits, authStatus, rate } = params;

  const allCanceled = visits.every((v) => v.status === "CANCELED");
  if (allCanceled) return "HOLD";

  if (authStatus === "MISSING" || authStatus === "EXPIRED" || authStatus === "OVER") {
    return "ERROR";
  }

  if (!rate || rate <= 0) {
    return "HOLD";
  }

  const hasOpen = visits.some((v) => v.status === "OPEN");
  if (hasOpen) return "REVIEW";

  const quality = getVisitQuality(visits);
  if (quality === "MISSING_CLOCK" || quality === "NO_EVV") {
    return "REVIEW";
  }

  return "READY";
}

function groupVisitsToWorkspaceRows(params: {
  visits: VisitApiRow[];
  authorizations: AuthorizationApiRow[];
  services: ServicesResponse["services"];
  dateFrom: string;
  dateTo: string;
}): {
  rows: BillingWorkspaceRow[];
  groupedVisitsMap: WorkspaceVisitGroupMap;
} {
  const { visits, authorizations, services, dateFrom, dateTo } = params;

  const serviceMap = new Map(
    (services || []).map((s) => [String(s.serviceCode || "").trim().toUpperCase(), s])
  );

  const completedOrOpenVisits = visits.filter((visit) => {
    if (!visit.date) return false;
    if (visit.date < dateFrom || visit.date > dateTo) return false;
    return true;
  });

  const grouped = new Map<
    string,
    {
      individualName: string;
      serviceCode: string;
      visits: VisitApiRow[];
    }
  >();

  for (const visit of completedOrOpenVisits) {
    const key = `${normalizeName(visit.individualName)}__${String(
      visit.serviceCode || ""
    ).toUpperCase()}`;

    const current = grouped.get(key);
    if (current) {
      current.visits.push(visit);
    } else {
      grouped.set(key, {
        individualName: visit.individualName,
        serviceCode: String(visit.serviceCode || "").toUpperCase(),
        visits: [visit],
      });
    }
  }

  const rows: BillingWorkspaceRow[] = [];
  const groupedVisitsMap: WorkspaceVisitGroupMap = {};

  for (const [key, group] of grouped.entries()) {
    const sortedVisits = [...group.visits].sort((a, b) => a.date.localeCompare(b.date));
    const periodFrom = sortedVisits[0]?.date || dateFrom;
    const periodTo = sortedVisits[sortedVisits.length - 1]?.date || dateTo;

    const authMatch =
      authorizations.find((auth) => {
        const authName = normalizeName(buildAuthIndividualName(auth));
        const visitName = normalizeName(group.individualName);
        const authServiceCode = String(auth.serviceCode || "").trim().toUpperCase();
        return (
          authName === visitName &&
          authServiceCode === group.serviceCode &&
          isDateWithinRange(periodFrom, auth.startDate, auth.endDate) &&
          isDateWithinRange(periodTo, auth.startDate, auth.endDate)
        );
      }) || null;

    const service = serviceMap.get(group.serviceCode);

    const units = sortedVisits.reduce((sum, v) => sum + Number(v.unitsActual || 0), 0);

    const firstVisitWithRate =
      sortedVisits.find((v) => typeof v.rate === "number") || sortedVisits[0] || null;

    const rate =
      firstVisitWithRate && typeof firstVisitWithRate.rate === "number"
        ? Number(firstVisitWithRate.rate || 0)
        : 0;

    const amount = Number((units * rate).toFixed(2));

    const authStatus = getAuthStatus(authMatch, periodFrom, periodTo);
    const visitQuality = getVisitQuality(sortedVisits);
    const readiness = getReadiness({
      visits: sortedVisits,
      authStatus,
      rate,
    });

    const rowId = `BW-${key}`;

    rows.push({
      id: rowId,
      individualId: normalizeName(group.individualName),
      individualName: group.individualName,
      maNumber: authMatch?.individual?.medicaidId || null,
      payer: "ODP",
      program: authMatch?.program || null,
      serviceCode: group.serviceCode,
      serviceName:
        authMatch?.serviceName ||
        firstVisitWithRate?.serviceName ||
        service?.serviceName ||
        group.serviceCode ||
        "—",
      authorizationNumber: authMatch?.authorizationNumber || null,
      authStatus,
      periodFrom,
      periodTo,
      visits: sortedVisits.length,
      units,
      rate,
      amount,
      previouslyBilled: 0,
      remainingAuth: authMatch?.remaining ?? null,
      claimNumber: null,
      readiness,
      visitQuality,
      source: sortedVisits.some((v) => v.source === "MANUAL")
        ? "MANUAL"
        : "VISITS",
    });

    groupedVisitsMap[rowId] = sortedVisits;
  }

  rows.sort((a, b) => {
    if (a.periodFrom !== b.periodFrom) return b.periodFrom.localeCompare(a.periodFrom);
    return a.individualName.localeCompare(b.individualName);
  });

  return { rows, groupedVisitsMap };
}

function VisitDetailsTable({
  visits,
  reviewingVisitIds,
  onReviewOne,
}: {
  visits: VisitApiRow[];
  reviewingVisitIds: string[];
  onReviewOne: (visitId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-bac-border bg-bac-panel">
      <div className="overflow-x-auto">
        <table className="min-w-[1350px] w-full text-left text-sm">
          <thead className="border-b border-bac-border text-bac-muted">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">DSP</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Planned</th>
              <th className="px-4 py-3">Check In</th>
              <th className="px-4 py-3">Check Out</th>
              <th className="px-4 py-3">Units Planned</th>
              <th className="px-4 py-3">Units Actual</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Daily Note</th>
              <th className="px-4 py-3">Reviewed</th>
              <th className="px-4 py-3">Cancel Reason</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bac-border">
            {visits.map((visit) => {
              const reviewing = reviewingVisitIds.includes(visit.id);

              return (
                <tr key={visit.id} className="text-bac-text hover:bg-white/3">
                  <td className="px-4 py-3">{visit.date || "—"}</td>
                  <td className="px-4 py-3">{visit.dspName || "—"}</td>
                  <td className="px-4 py-3">{visit.serviceCode || "—"}</td>
                  <td className="px-4 py-3">
                    {visit.plannedStart || "—"} → {visit.plannedEnd || "—"}
                  </td>
                  <td className="px-4 py-3">{visit.checkIn || "—"}</td>
                  <td className="px-4 py-3">{visit.checkOut || "—"}</td>
                  <td className="px-4 py-3">{visit.unitsPlanned ?? 0}</td>
                  <td className="px-4 py-3">{visit.unitsActual ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge kind={visit.status}>{visit.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge kind={visit.source}>{visit.source}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {visit.noteLinked ? (
                      <Badge kind="CLEAN">LINKED</Badge>
                    ) : (
                      <Badge kind="MISSING_CLOCK">NOT LINKED</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {visit.reviewed ? (
                      <Badge kind="CLEAN">REVIEWED</Badge>
                    ) : (
                      <Badge kind="OPEN">PENDING</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">{visit.cancelReason || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      {!visit.reviewed ? (
                        <button
                          type="button"
                          onClick={() => onReviewOne(visit.id)}
                          disabled={reviewing}
                          className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {reviewing ? "Reviewing..." : "Mark Reviewed"}
                        </button>
                      ) : (
                        <span className="text-xs text-bac-muted">Done</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {visits.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-4 py-8 text-center text-bac-muted">
                  No visits available.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BillingWorkspaceTab() {
  const defaultWeek = getMondayAndSundayOfCurrentWeek();

  const [serviceDateFrom, setServiceDateFrom] = useState(defaultWeek.from);
  const [serviceDateTo, setServiceDateTo] = useState(defaultWeek.to);
  const [quickRange, setQuickRange] = useState("THIS_WEEK");

  const [payer, setPayer] = useState("ALL");
  const [program, setProgram] = useState("");
  const [individual, setIndividual] = useState("");
  const [service, setService] = useState("");
  const [dsp, setDsp] = useState("");
  const [readiness, setReadiness] = useState("ALL");
  const [authorization, setAuthorization] = useState("ALL");
  const [visitQuality, setVisitQuality] = useState("ALL");
  const [search, setSearch] = useState("");

  const [excludeAlreadyBilled, setExcludeAlreadyBilled] = useState(true);
  const [showVisitDetails, setShowVisitDetails] = useState(false);
  const [groupByIndividual, setGroupByIndividual] = useState(true);
  const [groupByService, setGroupByService] = useState(true);
  const [groupByPayer, setGroupByPayer] = useState(false);

  const [visits, setVisits] = useState<VisitApiRow[]>([]);
  const [authorizations, setAuthorizations] = useState<AuthorizationApiRow[]>([]);
  const [services, setServices] = useState<ServicesResponse["services"]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedRowIds, setExpandedRowIds] = useState<string[]>([]);
  const [selectedRowForModal, setSelectedRowForModal] = useState<BillingWorkspaceRow | null>(
    null
  );

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [reviewingVisitIds, setReviewingVisitIds] = useState<string[]>([]);
  const [bulkReviewing, setBulkReviewing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const backendBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "https://blueangelscareapi.onrender.com";

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [visitsRes, authRes, servicesRes] = await Promise.all([
        fetch(`${backendBaseUrl}/visited-maintenance/visits`, {
          cache: "no-store",
        }),
        fetch("/api/authorizations", {
          cache: "no-store",
        }),
        fetch("/api/services", {
          cache: "no-store",
        }),
      ]);

      if (!visitsRes.ok) {
        throw new Error("Failed to load visited maintenance data.");
      }
      if (!authRes.ok) {
        throw new Error("Failed to load authorizations.");
      }
      if (!servicesRes.ok) {
        throw new Error("Failed to load services.");
      }

      const visitsJson: VisitsResponse = await visitsRes.json();
      const authJson: AuthorizationsResponse = await authRes.json();
      const servicesJson: ServicesResponse = await servicesRes.json();

      setVisits(Array.isArray(visitsJson) ? visitsJson : []);
      setAuthorizations(Array.isArray(authJson.items) ? authJson.items : []);
      setServices(
        Array.isArray(servicesJson.services)
          ? servicesJson.services
          : Array.isArray(servicesJson.items)
          ? servicesJson.items
          : []
      );
    } catch (err: any) {
      setError(String(err?.message || err || "Failed to load billing workspace."));
    } finally {
      setLoading(false);
    }
  }, [backendBaseUrl]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (quickRange === "TODAY") {
      const today = todayIso();
      setServiceDateFrom(today);
      setServiceDateTo(today);
      return;
    }

    if (quickRange === "THIS_WEEK") {
      const range = getMondayAndSundayOfCurrentWeek();
      setServiceDateFrom(range.from);
      setServiceDateTo(range.to);
      return;
    }

    if (quickRange === "LAST_WEEK") {
      const range = getLastWeekRange();
      setServiceDateFrom(range.from);
      setServiceDateTo(range.to);
      return;
    }

    if (quickRange === "THIS_MONTH") {
      const range = getCurrentMonthRange();
      setServiceDateFrom(range.from);
      setServiceDateTo(range.to);
    }
  }, [quickRange]);

  const groupedWorkspace = useMemo(() => {
    return groupVisitsToWorkspaceRows({
      visits,
      authorizations,
      services,
      dateFrom: serviceDateFrom,
      dateTo: serviceDateTo,
    });
  }, [visits, authorizations, services, serviceDateFrom, serviceDateTo]);

  const workspaceRows = groupedWorkspace.rows;
  const groupedVisitsMap = groupedWorkspace.groupedVisitsMap;

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return workspaceRows.filter((row) => {
      if (excludeAlreadyBilled && row.readiness === "ALREADY_BILLED") return false;
      if (payer !== "ALL" && row.payer !== payer) return false;
      if (readiness !== "ALL" && row.readiness !== readiness) return false;

      if (authorization !== "ALL") {
        if (authorization === "NO_RATE") {
          if ((row.rate || 0) > 0) return false;
        } else if (row.authStatus !== authorization) {
          return false;
        }
      }

      if (visitQuality !== "ALL" && row.visitQuality !== visitQuality) return false;

      if (program.trim()) {
        const p = program.trim().toLowerCase();
        if (!(row.program || "").toLowerCase().includes(p)) return false;
      }

      if (individual.trim()) {
        const i = individual.trim().toLowerCase();
        if (!row.individualName.toLowerCase().includes(i)) return false;
      }

      if (service.trim()) {
        const s = service.trim().toLowerCase();
        const hay = `${row.serviceCode} ${row.serviceName || ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }

      if (dsp.trim()) {
        const dspNeedle = dsp.trim().toLowerCase();
        const matchingVisits = (groupedVisitsMap[row.id] || []).filter((v) =>
          v.dspName.toLowerCase().includes(dspNeedle)
        );
        if (matchingVisits.length === 0) return false;
      }

      if (!q) return true;

      const searchHay =
        `${row.individualName} ${row.maNumber || ""} ${row.payer} ${
          row.program || ""
        } ${row.serviceCode} ${row.serviceName || ""} ${
          row.authorizationNumber || ""
        }`.toLowerCase();

      return searchHay.includes(q);
    });
  }, [
    workspaceRows,
    groupedVisitsMap,
    excludeAlreadyBilled,
    payer,
    readiness,
    authorization,
    visitQuality,
    program,
    individual,
    service,
    dsp,
    search,
  ]);

  const summary = useMemo(() => {
    const rows = filteredRows;
    return {
      lines: rows.length,
      visits: rows.reduce((sum, row) => sum + row.visits, 0),
      units: rows.reduce((sum, row) => sum + row.units, 0),
      amount: rows.reduce((sum, row) => sum + row.amount, 0),
      ready: rows.filter((row) => row.readiness === "READY").length,
      review: rows.filter((row) => row.readiness === "REVIEW").length,
      error: rows.filter((row) => row.readiness === "ERROR").length,
      alreadyBilled: rows.filter((row) => row.readiness === "ALREADY_BILLED").length,
    };
  }, [filteredRows]);

  const selectedModalVisits = selectedRowForModal
    ? groupedVisitsMap[selectedRowForModal.id] || []
    : [];

  const visibleRowIds = filteredRows.map((row) => row.id);
  const allVisibleSelected =
    visibleRowIds.length > 0 && visibleRowIds.every((id) => selectedRowIds.includes(id));

  function toggleExpandRow(rowId: string) {
    setExpandedRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  }

  function openVisitsModal(row: BillingWorkspaceRow) {
    setSelectedRowForModal(row);
  }

  function closeVisitsModal() {
    setSelectedRowForModal(null);
  }

  function toggleRowSelection(rowId: string) {
    setSelectedRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  }

  function toggleSelectAllVisible() {
    setSelectedRowIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((id) => !visibleRowIds.includes(id));
      }

      return Array.from(new Set([...prev, ...visibleRowIds]));
    });
  }

  async function markVisitReviewed(visitId: string) {
    setActionMessage(null);
    setReviewingVisitIds((prev) => (prev.includes(visitId) ? prev : [...prev, visitId]));

    try {
      const res = await fetch(`${backendBaseUrl}/visited-maintenance/visits/${visitId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to mark visit as reviewed.");
      }

      setVisits((prev) =>
        prev.map((visit) =>
          visit.id === visitId ? { ...visit, reviewed: true } : visit
        )
      );
      setActionMessage("Visit marked as reviewed.");
    } catch (err: any) {
      setError(String(err?.message || err || "Failed to review visit."));
    } finally {
      setReviewingVisitIds((prev) => prev.filter((id) => id !== visitId));
    }
  }

  async function markSelectedRowsReviewedBulk() {
    setActionMessage(null);

    const visitIds = Array.from(
      new Set(
        selectedRowIds.flatMap((rowId) =>
          (groupedVisitsMap[rowId] || [])
            .filter((visit) => !visit.reviewed)
            .map((visit) => visit.id)
        )
      )
    );

    if (!visitIds.length) {
      setActionMessage("No pending visits found in the selected rows.");
      return;
    }

    setBulkReviewing(true);

    try {
      const res = await fetch(`${backendBaseUrl}/visited-maintenance/visits/review-bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ visitIds }),
      });

      if (!res.ok) {
        throw new Error("Failed to bulk review visits.");
      }

      setVisits((prev) =>
        prev.map((visit) =>
          visitIds.includes(visit.id) ? { ...visit, reviewed: true } : visit
        )
      );
      setActionMessage(`${visitIds.length} visit(s) marked as reviewed.`);
    } catch (err: any) {
      setError(String(err?.message || err || "Failed to bulk review visits."));
    } finally {
      setBulkReviewing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Service Date From</div>
            <input
              type="date"
              value={serviceDateFrom}
              onChange={(e) => {
                setQuickRange("CUSTOM");
                setServiceDateFrom(e.target.value);
              }}
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Service Date To</div>
            <input
              type="date"
              value={serviceDateTo}
              onChange={(e) => {
                setQuickRange("CUSTOM");
                setServiceDateTo(e.target.value);
              }}
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Quick Range</div>
            <select
              value={quickRange}
              onChange={(e) => setQuickRange(e.target.value)}
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
            >
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="LAST_WEEK">Last Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Payer</div>
            <select
              value={payer}
              onChange={(e) => setPayer(e.target.value)}
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
            >
              <option value="ALL">All</option>
              <option value="ODP">ODP</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Program</div>
            <input
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              placeholder="Program..."
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Individual</div>
            <input
              value={individual}
              onChange={(e) => setIndividual(e.target.value)}
              placeholder="Individual..."
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Service</div>
            <input
              value={service}
              onChange={(e) => setService(e.target.value)}
              placeholder="Service..."
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">DSP</div>
            <input
              value={dsp}
              onChange={(e) => setDsp(e.target.value)}
              placeholder="DSP..."
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Readiness</div>
            <select
              value={readiness}
              onChange={(e) => setReadiness(e.target.value)}
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
            >
              <option value="ALL">All</option>
              <option value="READY">Ready</option>
              <option value="REVIEW">Review</option>
              <option value="HOLD">Hold</option>
              <option value="ERROR">Error</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Authorization</div>
            <select
              value={authorization}
              onChange={(e) => setAuthorization(e.target.value)}
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
            >
              <option value="ALL">All</option>
              <option value="VALID">Valid</option>
              <option value="MISSING">Missing</option>
              <option value="EXPIRED">Expired</option>
              <option value="OVER">Over</option>
              <option value="NO_RATE">No Rate</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Visit Quality</div>
            <select
              value={visitQuality}
              onChange={(e) => setVisitQuality(e.target.value)}
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none"
            >
              <option value="ALL">All</option>
              <option value="CLEAN">Clean</option>
              <option value="MISSING_CLOCK">Missing Clock</option>
              <option value="NO_EVV">No EVV</option>
              <option value="CANCELED">Canceled</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-bac-muted">Search</div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none"
            />
          </div>

          <div className="md:col-span-12 flex flex-wrap items-center gap-4 pt-1 text-sm text-bac-muted">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={excludeAlreadyBilled}
                onChange={(e) => setExcludeAlreadyBilled(e.target.checked)}
                className="rounded border-bac-border"
              />
              <span>Exclude already billed</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={showVisitDetails}
                onChange={(e) => setShowVisitDetails(e.target.checked)}
                className="rounded border-bac-border"
              />
              <span>Show visit details</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={groupByIndividual}
                onChange={(e) => setGroupByIndividual(e.target.checked)}
                className="rounded border-bac-border"
              />
              <span>Group by individual</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={groupByService}
                onChange={(e) => setGroupByService(e.target.checked)}
                className="rounded border-bac-border"
              />
              <span>Group by service</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={groupByPayer}
                onChange={(e) => setGroupByPayer(e.target.checked)}
                className="rounded border-bac-border"
              />
              <span>Group by payer</span>
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Billable Lines" value={summary.lines} />
        <SummaryCard label="Total Visits" value={summary.visits} />
        <SummaryCard label="Total Units" value={summary.units} />
        <SummaryCard label="Estimated Amount" value={`$${summary.amount.toFixed(2)}`} />
        <SummaryCard label="Ready" value={summary.ready} />
        <SummaryCard label="Need Review" value={summary.review} />
        <SummaryCard label="Error" value={summary.error} />
        <SummaryCard label="Already Billed" value={summary.alreadyBilled} />
      </div>

      <div className="rounded-2xl border border-dashed border-bac-border bg-bac-panel px-4 py-3 text-sm text-bac-muted">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            Bulk action bar: Create Claims, Mark Hold, Unhold, Mark Reviewed, Export
            Selected.
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-bac-muted">
              Selected Rows: {selectedRowIds.length}
            </span>
            <button
              type="button"
              onClick={markSelectedRowsReviewedBulk}
              disabled={bulkReviewing || selectedRowIds.length === 0}
              className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkReviewing ? "Reviewing..." : "Mark Reviewed (Bulk)"}
            </button>
          </div>
        </div>

        {actionMessage ? (
          <div className="mt-2 text-xs text-bac-green">{actionMessage}</div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-bac-border bg-bac-panel">
        {loading ? (
          <div className="px-4 py-10 text-center text-bac-muted">
            Loading real billing workspace data...
          </div>
        ) : error ? (
          <div className="px-4 py-10 text-center text-bac-red">{error}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[1500px] w-full text-left text-sm">
                <thead className="border-b border-bac-border text-bac-muted">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        className="rounded border-bac-border"
                      />
                    </th>
                    <th className="px-4 py-3">Readiness</th>
                    <th className="px-4 py-3">Individual</th>
                    <th className="px-4 py-3">MA #</th>
                    <th className="px-4 py-3">Payer</th>
                    <th className="px-4 py-3">Program</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Auth #</th>
                    <th className="px-4 py-3">Auth Status</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Visits</th>
                    <th className="px-4 py-3">Units</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Previously Billed</th>
                    <th className="px-4 py-3">Remaining Auth</th>
                    <th className="px-4 py-3">Claim #</th>
                    <th className="px-4 py-3">Visit Quality</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bac-border">
                  {filteredRows.map((row) => {
                    const isExpanded = expandedRowIds.includes(row.id);
                    const rowVisits = groupedVisitsMap[row.id] || [];
                    const selected = selectedRowIds.includes(row.id);

                    return (
                      <React.Fragment key={row.id}>
                        <tr className="text-bac-text hover:bg-white/3">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleRowSelection(row.id)}
                              className="rounded border-bac-border"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Badge kind={row.readiness}>{row.readiness}</Badge>
                          </td>
                          <td className="px-4 py-3 font-medium">{row.individualName}</td>
                          <td className="px-4 py-3">{row.maNumber || "—"}</td>
                          <td className="px-4 py-3">{row.payer}</td>
                          <td className="px-4 py-3">{row.program || "—"}</td>
                          <td className="px-4 py-3">{row.serviceName || row.serviceCode}</td>
                          <td className="px-4 py-3">{row.authorizationNumber || "—"}</td>
                          <td className="px-4 py-3">
                            <Badge kind={row.authStatus}>{row.authStatus}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            {row.periodFrom} → {row.periodTo}
                          </td>
                          <td className="px-4 py-3">{row.visits}</td>
                          <td className="px-4 py-3">{row.units}</td>
                          <td className="px-4 py-3">${row.rate.toFixed(2)}</td>
                          <td className="px-4 py-3 font-medium">
                            ${row.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">{row.previouslyBilled ?? 0}</td>
                          <td className="px-4 py-3">{row.remainingAuth ?? "—"}</td>
                          <td className="px-4 py-3">{row.claimNumber || "—"}</td>
                          <td className="px-4 py-3">
                            <Badge kind={row.visitQuality}>{row.visitQuality}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => toggleExpandRow(row.id)}
                                className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm hover:bg-white/5"
                              >
                                {isExpanded ? "Collapse" : "Expand"}
                              </button>
                              <button
                                type="button"
                                onClick={() => openVisitsModal(row)}
                                className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm hover:bg-white/5"
                              >
                                View Visits
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded ? (
                          <tr className="bg-bac-bg/60">
                            <td colSpan={19} className="px-4 py-4">
                              <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                                <div className="rounded-2xl border border-bac-border bg-bac-panel p-3">
                                  <div className="text-xs text-bac-muted">Individual</div>
                                  <div className="mt-1 text-sm font-semibold text-bac-text">
                                    {row.individualName}
                                  </div>
                                </div>
                                <div className="rounded-2xl border border-bac-border bg-bac-panel p-3">
                                  <div className="text-xs text-bac-muted">Service</div>
                                  <div className="mt-1 text-sm font-semibold text-bac-text">
                                    {row.serviceName || row.serviceCode}
                                  </div>
                                </div>
                                <div className="rounded-2xl border border-bac-border bg-bac-panel p-3">
                                  <div className="text-xs text-bac-muted">Authorization</div>
                                  <div className="mt-1 text-sm font-semibold text-bac-text">
                                    {row.authorizationNumber || "—"}
                                  </div>
                                </div>
                                <div className="rounded-2xl border border-bac-border bg-bac-panel p-3">
                                  <div className="text-xs text-bac-muted">Period</div>
                                  <div className="mt-1 text-sm font-semibold text-bac-text">
                                    {row.periodFrom} → {row.periodTo}
                                  </div>
                                </div>
                              </div>

                              <VisitDetailsTable
                                visits={rowVisits}
                                reviewingVisitIds={reviewingVisitIds}
                                onReviewOne={markVisitReviewed}
                              />
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })}

                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={19}
                        className="px-4 py-10 text-center text-bac-muted"
                      >
                        No workspace rows found for the current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="border-t border-bac-border px-4 py-3 text-xs text-bac-muted">
          Real workspace data connected from visited maintenance, authorizations,
          and services. Rate is now read from ServiceRate (ODP only) through the
          visited-maintenance backend.
        </div>
      </div>

      <Modal
        open={Boolean(selectedRowForModal)}
        title={
          selectedRowForModal
            ? `Visits — ${selectedRowForModal.individualName} / ${
                selectedRowForModal.serviceName || selectedRowForModal.serviceCode
              }`
            : "Visits"
        }
        onClose={closeVisitsModal}
      >
        {!selectedRowForModal ? null : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
                <div className="text-xs text-bac-muted">Individual</div>
                <div className="mt-1 text-sm font-semibold text-bac-text">
                  {selectedRowForModal.individualName}
                </div>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
                <div className="text-xs text-bac-muted">Service</div>
                <div className="mt-1 text-sm font-semibold text-bac-text">
                  {selectedRowForModal.serviceName || selectedRowForModal.serviceCode}
                </div>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
                <div className="text-xs text-bac-muted">Authorization</div>
                <div className="mt-1 text-sm font-semibold text-bac-text">
                  {selectedRowForModal.authorizationNumber || "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
                <div className="text-xs text-bac-muted">Visit Count</div>
                <div className="mt-1 text-sm font-semibold text-bac-text">
                  {selectedModalVisits.length}
                </div>
              </div>
            </div>

            <VisitDetailsTable
              visits={selectedModalVisits}
              reviewingVisitIds={reviewingVisitIds}
              onReviewOne={markVisitReviewed}
            />
          </div>
         )}
      </Modal>
    </div>
  );
}
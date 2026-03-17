"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type AuthStatus = "ACTIVE" | "PENDING" | "EXPIRED" | "SUSPENDED";

type AuthRow = {
  id: string;
  authorizationNumber: string;
  individualId: string;
  individualName: string;
  payer: "ODP" | "CHC" | "PRIVATE" | "OTHER";
  program?: string | null;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  startDate: string;
  endDate: string;
  unitsAuthorized: number;
  unitsUsed: number;
  unitsRemaining: number;
  status: AuthStatus;
  notes?: string | null;
  source: "MANUAL" | "IMPORT";
  eventCode?: string | null;
  format?: string | null;
  modifier1?: string | null;
  modifier2?: string | null;
  modifier3?: string | null;
  modifier4?: string | null;
  voided?: boolean;
};

type AuthorizationApiItem = {
  id: string;
  authorizationNumber: string;
  individualId: string;
  payer: "ODP" | "CHC" | "PRIVATE" | "OTHER";
  program?: string | null;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  startDate: string;
  endDate: string;
  maximum: number;
  used: number;
  remaining: number;
  status: AuthStatus;
  source: "MANUAL" | "IMPORT";
  comments?: string | null;
  eventCode?: string | null;
  format?: string | null;
  modifier1?: string | null;
  modifier2?: string | null;
  modifier3?: string | null;
  modifier4?: string | null;
  voided?: boolean;
  individual?: {
    id: string;
    code: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
  } | null;
};

type IndividualSimpleItem = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  dob?: string | null;
  primaryPhone?: string | null;
  email?: string | null;
  city?: string | null;
  county?: string | null;
  state?: string | null;
  zip?: string | null;
  branch?: string | null;
  location?: string | null;
  status?: string | null;
};

type IndividualDetailItem = {
  id: string;
  code: string;
  status?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dob?: string | null;
  gender?: string | null;
  medicaidId?: string | null;
  primaryPhone?: string | null;
  secondaryPhone?: string | null;
  email?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  county?: string | null;
  state?: string | null;
  zip?: string | null;
  branch?: string | null;
  location?: string | null;
  acceptedServices?: string | string[] | null;
};

type ServiceApiItem = {
  id: string;
  serviceCode: string;
  serviceName: string;
  billingCode?: string | null;
  category?: string | null;
  description?: string | null;
  status?: string | null;
  billable?: boolean | null;
  notes?: string | null;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatFullName(parts: Array<string | null | undefined>) {
  return parts
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

function formatAcceptedServices(v: string | string[] | null | undefined) {
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  if (typeof v === "string") {
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

function formatAddressLine2(detail?: IndividualDetailItem | null) {
  if (!detail) return "—";
  const parts = [detail.address2, detail.city, detail.state, detail.zip]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function formatServiceLabel(service?: ServiceApiItem | null) {
  if (!service) return "";
  const code = (service.serviceCode ?? "").trim();
  const name = (service.serviceName ?? "").trim();
  if (code && name) return `${code} - ${name}`;
  return code || name || "";
}

function formatDateOnly(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function Badge({
  variant,
  children,
}: {
  variant: "default" | "success" | "warning" | "danger" | "muted";
  children: React.ReactNode;
}) {
  const cls =
    variant === "success"
      ? "bg-bac-green/15 text-bac-green border-bac-green/30"
      : variant === "warning"
        ? "bg-yellow-500/15 text-yellow-200 border-yellow-500/30"
        : variant === "danger"
          ? "bg-bac-red/15 text-bac-red border-bac-red/30"
          : variant === "muted"
            ? "bg-white/5 text-bac-muted border-bac-border"
            : "bg-white/10 text-bac-text border-bac-border";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none focus:ring-2 focus:ring-bac-primary/40"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary/40"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Modal({
  open,
  title,
  children,
  onClose,
  maxWidthClass = "max-w-4xl",
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  maxWidthClass?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={cx(
          "max-h-[92vh] w-full overflow-hidden rounded-2xl border border-bac-border bg-bac-bg shadow-xl",
          maxWidthClass,
        )}
      >
        <div className="flex items-center justify-between border-b border-bac-border px-5 py-4">
          <div className="text-base font-semibold text-bac-text">{title}</div>
          <button
            onClick={onClose}
            className="rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text hover:bg-white/5"
          >
            Close
          </button>
        </div>
        <div className="max-h-[calc(92vh-72px)] overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
      <div className="text-xs text-bac-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-bac-text">{value}</div>
      {hint ? <div className="mt-1 text-xs text-bac-muted">{hint}</div> : null}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
      <div className="flex flex-col gap-1 border-b border-bac-border pb-3">
        <div className="text-sm font-semibold text-bac-text">{title}</div>
        {subtitle ? (
          <div className="text-xs text-bac-muted">{subtitle}</div>
        ) : null}
      </div>
      <div className="pt-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-xs text-bac-muted">
        {label}
        {required ? <span className="text-bac-red"> *</span> : null}
      </div>
      {children}
    </div>
  );
}

function ReadonlyLine({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-bac-muted">{label}</div>
      <div className="mt-1 text-sm font-medium text-bac-text">{value}</div>
    </div>
  );
}

export default function AuthorizationsPage() {
  const [tab, setTab] = useState<"AUTH" | "UTIL" | "SETTINGS">("AUTH");

  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-12-31");
  const [payer, setPayer] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [service, setService] = useState("ALL");
  const [q, setQ] = useState("");

  const [selected, setSelected] = useState<AuthRow | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [openNew, setOpenNew] = useState(false);

  const [dbRows, setDbRows] = useState<AuthRow[]>([]);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [newIndividual, setNewIndividual] = useState("");
  const [newPayer, setNewPayer] =
    useState<"ODP" | "CHC" | "PRIVATE" | "OTHER">("ODP");
  const [newAuthorizationNumber, setNewAuthorizationNumber] = useState("");
  const [newStatus, setNewStatus] = useState<AuthStatus>("PENDING");
  const [newSource, setNewSource] = useState<"MANUAL" | "IMPORT">("MANUAL");
  const [newServiceId, setNewServiceId] = useState("");
  const [newEventCode, setNewEventCode] = useState("NONE");
  const [newFormat, setNewFormat] = useState("Units");
  const [newProgram, setNewProgram] = useState("ID/A");
  const [newModifier1, setNewModifier1] = useState("");
  const [newModifier2, setNewModifier2] = useState("");
  const [newModifier3, setNewModifier3] = useState("");
  const [newModifier4, setNewModifier4] = useState("");
  const [newStartDate, setNewStartDate] = useState("2026-02-01");
  const [newEndDate, setNewEndDate] = useState("2026-04-30");
  const [newVoided, setNewVoided] = useState(false);
  const [newComments, setNewComments] = useState("");
  const [newMaximum, setNewMaximum] = useState("40");
  const [hasIntervalLimit, setHasIntervalLimit] = useState(false);
  const [intervalType, setIntervalType] = useState("Weekly");
  const [intervalLimit, setIntervalLimit] = useState("10");
  const [intervalStart, setIntervalStart] = useState("");
  const [intervalEnd, setIntervalEnd] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  const [individualSearch, setIndividualSearch] = useState("");
  const [individualOptions, setIndividualOptions] = useState<
    IndividualSimpleItem[]
  >([]);
  const [individualOptionsLoading, setIndividualOptionsLoading] =
    useState(false);
  const [individualOptionsError, setIndividualOptionsError] = useState("");
  const [showIndividualDropdown, setShowIndividualDropdown] = useState(false);
  const [selectedIndividualId, setSelectedIndividualId] = useState("");
  const [selectedIndividualDetail, setSelectedIndividualDetail] =
    useState<IndividualDetailItem | null>(null);
  const [selectedIndividualLoading, setSelectedIndividualLoading] =
    useState(false);
  const [selectedIndividualError, setSelectedIndividualError] = useState("");

  const [serviceOptions, setServiceOptions] = useState<ServiceApiItem[]>([]);
  const [serviceOptionsLoading, setServiceOptionsLoading] = useState(false);
  const [serviceOptionsError, setServiceOptionsError] = useState("");

  const loadAuthorizations = useCallback(async () => {
    try {
      setAuthLoading(true);
      setAuthError("");

      const res = await fetch("/api/authorizations", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const items: AuthorizationApiItem[] = Array.isArray(data?.items)
        ? data.items
        : [];

      const mapped: AuthRow[] = items.map((r) => ({
        id: r.id,
        authorizationNumber: r.authorizationNumber,
        individualId: r.individualId,
        individualName:
          formatFullName([
            r.individual?.firstName,
            r.individual?.middleName,
            r.individual?.lastName,
          ]) || "—",
        payer: r.payer,
        program: r.program ?? null,
        serviceId: r.serviceId,
        serviceCode: r.serviceCode,
        serviceName: r.serviceName,
        startDate: formatDateOnly(r.startDate),
        endDate: formatDateOnly(r.endDate),
        unitsAuthorized: Number(r.maximum ?? 0),
        unitsUsed: Number(r.used ?? 0),
        unitsRemaining: Number(r.remaining ?? 0),
        status: r.status,
        notes: r.comments ?? null,
        source: r.source,
        eventCode: r.eventCode ?? null,
        format: r.format ?? null,
        modifier1: r.modifier1 ?? null,
        modifier2: r.modifier2 ?? null,
        modifier3: r.modifier3 ?? null,
        modifier4: r.modifier4 ?? null,
        voided: !!r.voided,
      }));

      setDbRows(mapped);
    } catch (err: any) {
      console.error("Load authorizations error:", err);
      setAuthError("Failed to load authorizations.");
      setDbRows([]);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuthorizations();
  }, [loadAuthorizations]);

  useEffect(() => {
    async function loadServices() {
      try {
        setServiceOptionsLoading(true);
        setServiceOptionsError("");

        const res = await fetch("/api/services", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const rawList: ServiceApiItem[] = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.services)
            ? data.services
            : [];

        const activeOnly = rawList.filter((s) => {
          const v = String(s.status ?? "")
            .trim()
            .toLowerCase();
          return v === "active";
        });

        setServiceOptions(activeOnly);

        if (!newServiceId && activeOnly.length > 0) {
          setNewServiceId(activeOnly[0].id);
        }
      } catch (err: any) {
        console.error("Load services error:", err);
        setServiceOptionsError("Failed to load services.");
      } finally {
        setServiceOptionsLoading(false);
      }
    }

    loadServices();
  }, [newServiceId]);

  const selectedService = useMemo(
    () => serviceOptions.find((s) => s.id === newServiceId) ?? null,
    [serviceOptions, newServiceId],
  );

  const rows = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return dbRows.filter((r) => {
      if (from && r.endDate < from) return false;
      if (to && r.startDate > to) return false;
      if (payer !== "ALL" && r.payer !== payer) return false;
      if (status !== "ALL" && r.status !== status) return false;
      if (service !== "ALL" && r.serviceCode !== service) return false;

      if (!qLower) return true;
      const hay =
        `${r.authorizationNumber} ${r.individualName} ${r.serviceCode} ${r.serviceName} ${r.payer} ${r.program ?? ""}`.toLowerCase();
      return hay.includes(qLower);
    });
  }, [dbRows, from, to, payer, status, service, q]);

  const summary = useMemo(() => {
    const count = rows.length;
    const active = rows.filter((r) => r.status === "ACTIVE").length;
    const pending = rows.filter((r) => r.status === "PENDING").length;
    const expired = rows.filter((r) => r.status === "EXPIRED").length;

    const authorized = rows.reduce((a, r) => a + (r.unitsAuthorized || 0), 0);
    const used = rows.reduce((a, r) => a + (r.unitsUsed || 0), 0);
    const remaining = rows.reduce((a, r) => a + (r.unitsRemaining || 0), 0);

    return { count, active, pending, expired, authorized, used, remaining };
  }, [rows]);

  const utilRows = useMemo(() => {
    const map = new Map<
      string,
      {
        individualName: string;
        serviceCode: string;
        payer: string;
        authorized: number;
        used: number;
        remaining: number;
      }
    >();

    rows.forEach((r) => {
      const key = `${r.individualName}||${r.serviceCode}||${r.payer}`;
      const cur = map.get(key);
      if (!cur) {
        map.set(key, {
          individualName: r.individualName,
          serviceCode: `${r.serviceCode} - ${r.serviceName}`,
          payer: r.payer,
          authorized: r.unitsAuthorized,
          used: r.unitsUsed,
          remaining: r.unitsRemaining,
        });
      } else {
        cur.authorized += r.unitsAuthorized;
        cur.used += r.unitsUsed;
        cur.remaining += r.unitsRemaining;
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.individualName.localeCompare(b.individualName),
    );
  }, [rows]);

  const openDetails = (r: AuthRow) => {
    setSelected(r);
    setOpenDetail(true);
  };

  const resetNewForm = useCallback(() => {
    setNewIndividual("");
    setIndividualSearch("");
    setSelectedIndividualId("");
    setSelectedIndividualDetail(null);
    setSelectedIndividualError("");
    setShowIndividualDropdown(false);

    setNewPayer("ODP");
    setNewAuthorizationNumber("");
    setNewStatus("PENDING");
    setNewSource("MANUAL");
    setNewServiceId(serviceOptions[0]?.id ?? "");
    setNewEventCode("NONE");
    setNewFormat("Units");
    setNewProgram("ID/A");
    setNewModifier1("");
    setNewModifier2("");
    setNewModifier3("");
    setNewModifier4("");
    setNewStartDate("2026-02-01");
    setNewEndDate("2026-04-30");
    setNewVoided(false);
    setNewComments("");
    setNewMaximum("40");
    setHasIntervalLimit(false);
    setIntervalType("Weekly");
    setIntervalLimit("10");
    setIntervalStart("");
    setIntervalEnd("");
  }, [serviceOptions]);

  const newAuthorizedNumeric = Number(newMaximum) || 0;
  const newUsedNumeric = 0;
  const newRemainingNumeric = Math.max(newAuthorizedNumeric - newUsedNumeric, 0);
  const newUsedPct =
    newAuthorizedNumeric > 0
      ? Math.min(Math.round((newUsedNumeric / newAuthorizedNumeric) * 100), 100)
      : 0;

  const previewProfile = useMemo(() => {
    if (selectedIndividualDetail) {
      return {
        fullName:
          formatFullName([
            selectedIndividualDetail.firstName,
            selectedIndividualDetail.middleName,
            selectedIndividualDetail.lastName,
          ]) || "—",
        code: selectedIndividualDetail.code || "—",
        medicaidId: selectedIndividualDetail.medicaidId || "—",
        dob: selectedIndividualDetail.dob || "—",
        gender: selectedIndividualDetail.gender || "—",
        phone:
          selectedIndividualDetail.primaryPhone ||
          selectedIndividualDetail.secondaryPhone ||
          "—",
        email: selectedIndividualDetail.email || "—",
        address1: selectedIndividualDetail.address1 || "—",
        address2: formatAddressLine2(selectedIndividualDetail),
        branch: selectedIndividualDetail.branch || "—",
        location: selectedIndividualDetail.location || "—",
        acceptedServices:
          formatAcceptedServices(selectedIndividualDetail.acceptedServices) ||
          "—",
        status: selectedIndividualDetail.status || "—",
      };
    }

    return {
      fullName: newIndividual || "No individual selected",
      code: "—",
      medicaidId: "—",
      dob: "—",
      gender: "—",
      phone: "—",
      email: "—",
      address1: "—",
      address2: "—",
      branch: "—",
      location: "—",
      acceptedServices: "—",
      status: "—",
    };
  }, [newIndividual, selectedIndividualDetail]);

  useEffect(() => {
    if (!openNew) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setIndividualOptionsLoading(true);
        setIndividualOptionsError("");

        const qp = new URLSearchParams();
        qp.set("simple", "true");
        if (individualSearch.trim()) qp.set("q", individualSearch.trim());

        const res = await fetch(`/api/individuals?${qp.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = (await res.json()) as IndividualSimpleItem[];
        setIndividualOptions(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("Load individuals error:", err);
        setIndividualOptionsError("Failed to load individual list.");
      } finally {
        setIndividualOptionsLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [openNew, individualSearch]);

  const handleSelectIndividual = async (item: IndividualSimpleItem) => {
    try {
      setSelectedIndividualLoading(true);
      setSelectedIndividualError("");
      setSelectedIndividualId(item.id);
      setShowIndividualDropdown(false);

      const fullName = formatFullName([item.firstName, item.lastName]);
      setNewIndividual(fullName);
      setIndividualSearch(fullName);

      const res = await fetch(`/api/individuals/${item.id}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = (await res.json()) as IndividualDetailItem;
      setSelectedIndividualDetail(data);
    } catch (err: any) {
      console.error("Load individual detail error:", err);
      setSelectedIndividualDetail(null);
      setSelectedIndividualError("Failed to load selected individual profile.");
    } finally {
      setSelectedIndividualLoading(false);
    }
  };

  const clearSelectedIndividual = () => {
    setSelectedIndividualId("");
    setSelectedIndividualDetail(null);
    setSelectedIndividualError("");
    setNewIndividual(individualSearch);
  };

  const handleSaveAuthorization = async () => {
    const maximum = Number(newMaximum);

    if (!selectedIndividualId) {
      alert("Please select an Individual.");
      return;
    }

    if (!newAuthorizationNumber.trim()) {
      alert("Please enter Authorization Number.");
      return;
    }

    if (!newServiceId) {
      alert("Please select a Service.");
      return;
    }

    if (!Number.isFinite(maximum)) {
      alert("Maximum must be a valid number.");
      return;
    }

    try {
      setSaveLoading(true);

      const res = await fetch("/api/authorizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorizationNumber: newAuthorizationNumber.trim(),
          individualId: selectedIndividualId,
          payer: newPayer,
          serviceId: newServiceId,
          eventCode: newEventCode === "NONE" ? null : newEventCode,
          format: newFormat,
          program: newProgram || null,
          modifier1: newModifier1 || null,
          modifier2: newModifier2 || null,
          modifier3: newModifier3 || null,
          modifier4: newModifier4 || null,
          startDate: newStartDate,
          endDate: newEndDate,
          maximum,
          status: newStatus,
          source: newSource,
          voided: newVoided,
          comments: newComments || null,
          intervalType: hasIntervalLimit ? intervalType : null,
          intervalLimit: hasIntervalLimit ? intervalLimit : null,
          intervalStart: hasIntervalLimit ? intervalStart || null : null,
          intervalEnd: hasIntervalLimit ? intervalEnd || null : null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409 && data?.field === "authorizationNumber") {
          alert(
            "Authorization Number already exists.\nPlease enter a different number.",
          );
          return;
        }

        alert(data?.message || "Failed to save authorization.");
        return;
      }

      await loadAuthorizations();
      setOpenNew(false);
      resetNewForm();
      alert("Authorization saved successfully!");
    } catch (err: any) {
      console.error("Save authorization error:", err);
      alert("Failed to save authorization.");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] bg-bac-bg p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-semibold text-bac-text">
            Authorizations
          </div>
          <div className="mt-1 text-sm text-bac-muted">
            Track authorized units by payer and service, monitor utilization,
            and prevent overuse.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/billing"
            className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
          >
            Go to Billing
          </Link>

          <button
            className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
            onClick={() => alert("Wire export later")}
          >
            Export
          </button>

          <button
            className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95 active:scale-[0.99]"
            onClick={() => {
              resetNewForm();
              setOpenNew(true);
            }}
          >
            + New Authorization
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["AUTH", "Authorizations"],
            ["UTIL", "Utilization"],
            ["SETTINGS", "Settings"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className={cx(
              "rounded-xl border px-4 py-2 text-sm",
              tab === key
                ? "border-bac-primary bg-bac-primary/15 text-bac-text"
                : "border-bac-border bg-bac-panel text-bac-muted hover:bg-white/5",
            )}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "AUTH" ? (
        <>
          <div className="mb-4 rounded-2xl border border-bac-border bg-bac-panel p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">
                  From (overlap)
                </div>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary/40"
                />
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">To (overlap)</div>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary/40"
                />
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">Payer</div>
                <Select
                  value={payer}
                  onChange={setPayer}
                  options={[
                    { value: "ALL", label: "All" },
                    { value: "ODP", label: "ODP" },
                    { value: "CHC", label: "CHC" },
                    { value: "PRIVATE", label: "Private" },
                    { value: "OTHER", label: "Other" },
                  ]}
                />
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">Status</div>
                <Select
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: "ALL", label: "All" },
                    { value: "ACTIVE", label: "Active" },
                    { value: "PENDING", label: "Pending" },
                    { value: "EXPIRED", label: "Expired" },
                    { value: "SUSPENDED", label: "Suspended" },
                  ]}
                />
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">Service</div>
                <Select
                  value={service}
                  onChange={setService}
                  options={[
                    { value: "ALL", label: "All" },
                    ...serviceOptions.map((s) => ({
                      value: s.serviceCode,
                      label: formatServiceLabel(s),
                    })),
                  ]}
                />
              </div>

              <div className="md:col-span-4">
                <div className="mb-1 text-xs text-bac-muted">Search</div>
                <TextInput
                  value={q}
                  onChange={setQ}
                  placeholder="Search by Individual, Service, Auth Number..."
                />
              </div>

              <div className="md:col-span-12 flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="muted">Records: {summary.count}</Badge>
                <Badge variant="success">Active: {summary.active}</Badge>
                <Badge variant="warning">Pending: {summary.pending}</Badge>
                <Badge variant="danger">Expired: {summary.expired}</Badge>
                <Badge variant="muted">Authorized: {summary.authorized}</Badge>
                <Badge variant="muted">Used: {summary.used}</Badge>
                <Badge variant="muted">Remaining: {summary.remaining}</Badge>
              </div>
            </div>
          </div>

          {authError ? (
            <div className="mb-4 rounded-2xl border border-bac-red/30 bg-bac-red/10 px-4 py-3 text-sm text-bac-red">
              {authError}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-bac-border bg-bac-panel">
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full text-left text-sm">
                <thead className="border-b border-bac-border text-bac-muted">
                  <tr>
                    <th className="px-4 py-3">Authorization Number</th>
                    <th className="px-4 py-3">Individual</th>
                    <th className="px-4 py-3">Payer</th>
                    <th className="px-4 py-3">Program</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Start</th>
                    <th className="px-4 py-3">End</th>
                    <th className="px-4 py-3">Authorized</th>
                    <th className="px-4 py-3">Used</th>
                    <th className="px-4 py-3">Remaining</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bac-border">
                  {authLoading ? (
                    <tr>
                      <td
                        colSpan={13}
                        className="px-4 py-10 text-center text-bac-muted"
                      >
                        Loading authorizations...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={13}
                        className="px-4 py-10 text-center text-bac-muted"
                      >
                        No authorizations found for the current filters.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="text-bac-text hover:bg-white/3">
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {r.authorizationNumber}
                          </div>
                          <div className="text-xs text-bac-muted">
                            {r.eventCode || "No Event Code"}
                          </div>
                        </td>
                        <td className="px-4 py-3">{r.individualName}</td>
                        <td className="px-4 py-3">
                          <Badge variant="muted">{r.payer}</Badge>
                        </td>
                        <td className="px-4 py-3">{r.program ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-lg border border-bac-border bg-bac-bg px-2 py-1 text-xs">
                            {r.serviceCode} - {r.serviceName}
                          </span>
                        </td>
                        <td className="px-4 py-3">{r.startDate}</td>
                        <td className="px-4 py-3">{r.endDate}</td>
                        <td className="px-4 py-3">{r.unitsAuthorized}</td>
                        <td className="px-4 py-3">{r.unitsUsed}</td>
                        <td className="px-4 py-3 font-medium">
                          {r.unitsRemaining}
                        </td>
                        <td className="px-4 py-3">
                          {r.status === "ACTIVE" && (
                            <Badge variant="success">ACTIVE</Badge>
                          )}
                          {r.status === "PENDING" && (
                            <Badge variant="warning">PENDING</Badge>
                          )}
                          {r.status === "EXPIRED" && (
                            <Badge variant="danger">EXPIRED</Badge>
                          )}
                          {r.status === "SUSPENDED" && (
                            <Badge variant="muted">SUSPENDED</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="muted">{r.source}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm hover:bg-white/5"
                              onClick={() => openDetails(r)}
                            >
                              Details
                            </button>
                            <button
                              className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm hover:bg-white/5"
                              onClick={() =>
                                alert("Edit/suspend will be wired next phase")
                              }
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-bac-border px-4 py-3 text-xs text-bac-muted">
              Phase 3 complete: authorizations now save to and load from the real
              database.
            </div>
          </div>
        </>
      ) : null}

      {tab === "UTIL" ? (
        <div className="overflow-hidden rounded-2xl border border-bac-border bg-bac-panel">
          <div className="border-b border-bac-border px-5 py-4">
            <div className="text-base font-semibold text-bac-text">
              Utilization (live authorization data)
            </div>
            <div className="mt-1 text-sm text-bac-muted">
              Summary by Individual + Service. Real used/remaining from visits
              will be added in a later phase.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="border-b border-bac-border text-bac-muted">
                <tr>
                  <th className="px-4 py-3">Individual</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Payer</th>
                  <th className="px-4 py-3">Authorized</th>
                  <th className="px-4 py-3">Used</th>
                  <th className="px-4 py-3">Remaining</th>
                  <th className="px-4 py-3">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bac-border">
                {utilRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-bac-muted"
                    >
                      No utilization data for current filters.
                    </td>
                  </tr>
                ) : (
                  utilRows.map((r) => {
                    const pct =
                      r.authorized === 0
                        ? 0
                        : Math.round((r.used / r.authorized) * 100);
                    const badge =
                      pct >= 90 ? "danger" : pct >= 75 ? "warning" : "success";

                    return (
                      <tr
                        key={`${r.individualName}-${r.serviceCode}-${r.payer}`}
                        className="text-bac-text"
                      >
                        <td className="px-4 py-3">{r.individualName}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-lg border border-bac-border bg-bac-bg px-2 py-1 text-xs">
                            {r.serviceCode}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="muted">{r.payer}</Badge>
                        </td>
                        <td className="px-4 py-3">{r.authorized}</td>
                        <td className="px-4 py-3">{r.used}</td>
                        <td className="px-4 py-3 font-medium">
                          {r.remaining}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={badge as any}>{pct}%</Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "SETTINGS" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-6">
            <div className="text-base font-semibold text-bac-text">
              Authorization Settings (UI only)
            </div>
            <div className="mt-2 text-sm text-bac-muted">
              Configure alert thresholds and overuse prevention.
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs text-bac-muted">
                  Warning Threshold (%)
                </div>
                <input
                  defaultValue="75"
                  className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
                />
              </div>
              <div>
                <div className="mb-1 text-xs text-bac-muted">
                  Critical Threshold (%)
                </div>
                <input
                  defaultValue="90"
                  className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <div className="mb-1 text-xs text-bac-muted">
                  Notes Template
                </div>
                <textarea
                  defaultValue="Authorization is monitored weekly. Please renew before end date to avoid service interruption."
                  className="min-h-[120px] w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                className="rounded-xl border border-bac-border bg-bac-bg px-4 py-2 text-sm text-bac-text hover:bg-white/5"
                onClick={() => alert("Wire save settings later")}
              >
                Save Settings
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-6">
            <div className="text-base font-semibold text-bac-text">Notes</div>
            <div className="mt-2 space-y-2 text-sm text-bac-muted">
              <p>
                Phase 4 can compute real used units from approved/completed
                visits.
              </p>
              <p>
                Scheduling warnings and overuse blocking can be connected after
                real utilization is implemented.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <Modal
        open={openDetail}
        title="Authorization Details"
        onClose={() => {
          setOpenDetail(false);
          setSelected(null);
        }}
      >
        {!selected ? (
          <div className="text-bac-muted">No authorization selected.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
              <div className="text-xs text-bac-muted">Authorization Number</div>
              <div className="mt-1 text-sm font-semibold text-bac-text">
                {selected.authorizationNumber}
              </div>

              <div className="mt-3 text-xs text-bac-muted">Individual</div>
              <div className="mt-1 text-sm font-medium text-bac-text">
                {selected.individualName}
              </div>

              <div className="mt-3 text-xs text-bac-muted">Payer</div>
              <div className="mt-1">
                <Badge variant="muted">{selected.payer}</Badge>
              </div>

              <div className="mt-3 text-xs text-bac-muted">Program</div>
              <div className="mt-1 text-sm font-medium text-bac-text">
                {selected.program ?? "—"}
              </div>

              <div className="mt-3 text-xs text-bac-muted">Service</div>
              <div className="mt-1 text-sm font-medium text-bac-text">
                {selected.serviceCode} - {selected.serviceName}
              </div>

              <div className="mt-3 text-xs text-bac-muted">Status</div>
              <div className="mt-1">
                <Badge
                  variant={
                    selected.status === "ACTIVE"
                      ? "success"
                      : selected.status === "PENDING"
                        ? "warning"
                        : selected.status === "EXPIRED"
                          ? "danger"
                          : "muted"
                  }
                >
                  {selected.status}
                </Badge>
              </div>
            </div>

            <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
              <div className="text-xs text-bac-muted">Date Range</div>
              <div className="mt-1 text-sm font-medium text-bac-text">
                {selected.startDate} → {selected.endDate}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                  <div className="text-xs text-bac-muted">Authorized</div>
                  <div className="mt-1 text-lg font-semibold text-bac-text">
                    {selected.unitsAuthorized}
                  </div>
                </div>
                <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                  <div className="text-xs text-bac-muted">Used</div>
                  <div className="mt-1 text-lg font-semibold text-bac-text">
                    {selected.unitsUsed}
                  </div>
                </div>
                <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                  <div className="text-xs text-bac-muted">Remaining</div>
                  <div className="mt-1 text-lg font-semibold text-bac-text">
                    {selected.unitsRemaining}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-bac-muted">Notes</div>
              <div className="mt-1 rounded-2xl border border-bac-border bg-bac-bg p-3 text-sm text-bac-text">
                {selected.notes || "—"}
              </div>

              <div className="mt-3 text-xs text-bac-muted">Source</div>
              <div className="mt-1">
                <Badge variant="muted">{selected.source}</Badge>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={openNew}
        title="New Authorization"
        onClose={() => setOpenNew(false)}
        maxWidthClass="max-w-6xl"
      >
        <div className="space-y-4">
          <div className="text-sm text-bac-muted">
            Phase 3: Save Authorization now writes to the real database and
            refreshes the list immediately.
          </div>

          <SectionCard
            title="Individual Profile"
            subtitle="Search and select an individual from real data, then review the profile snapshot before entering authorization details."
          >
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <div className="xl:col-span-4">
                <Field label="Individual" required>
                  <div className="relative">
                    <input
                      value={individualSearch}
                      onChange={(e) => {
                        setIndividualSearch(e.target.value);
                        setShowIndividualDropdown(true);
                        if (selectedIndividualId) clearSelectedIndividual();
                      }}
                      onFocus={() => setShowIndividualDropdown(true)}
                      placeholder="Search individual by name, code, city..."
                      className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none focus:ring-2 focus:ring-bac-primary/40"
                    />

                    {showIndividualDropdown ? (
                      <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-bac-border bg-bac-panel shadow-xl">
                        {individualOptionsLoading ? (
                          <div className="px-3 py-3 text-sm text-bac-muted">
                            Loading individuals...
                          </div>
                        ) : individualOptionsError ? (
                          <div className="px-3 py-3 text-sm text-bac-red">
                            {individualOptionsError}
                          </div>
                        ) : individualOptions.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-bac-muted">
                            No individual found.
                          </div>
                        ) : (
                          individualOptions.map((item) => {
                            const fullName = formatFullName([
                              item.firstName,
                              item.lastName,
                            ]);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSelectIndividual(item)}
                                className="flex w-full flex-col items-start gap-1 border-b border-bac-border px-3 py-3 text-left hover:bg-white/5 last:border-b-0"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-bac-text">
                                    {fullName || item.code}
                                  </span>
                                  {item.status ? (
                                    <Badge variant="muted">{item.status}</Badge>
                                  ) : null}
                                </div>
                                <div className="text-xs text-bac-muted">
                                  Code: {item.code}
                                  {item.branch ? ` • ${item.branch}` : ""}
                                  {item.location ? ` • ${item.location}` : ""}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    ) : null}
                  </div>
                </Field>

                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedIndividualId ? (
                    <Badge variant="success">Connected to real profile</Badge>
                  ) : (
                    <Badge variant="muted">No individual selected</Badge>
                  )}

                  {selectedIndividualLoading ? (
                    <Badge variant="warning">Loading profile...</Badge>
                  ) : null}
                </div>

                {selectedIndividualError ? (
                  <div className="mt-3 rounded-2xl border border-bac-red/30 bg-bac-red/10 px-3 py-2 text-xs text-bac-red">
                    {selectedIndividualError}
                  </div>
                ) : null}
              </div>

              <div className="xl:col-span-8">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-semibold text-bac-text">
                        Basic Info
                      </div>
                      <Badge variant="muted">{previewProfile.status}</Badge>
                    </div>

                    <div className="space-y-3">
                      <ReadonlyLine
                        label="Full Name"
                        value={previewProfile.fullName}
                      />
                      <ReadonlyLine
                        label="Individual Code"
                        value={previewProfile.code}
                      />
                      <ReadonlyLine
                        label="Medicaid ID / MA Number"
                        value={previewProfile.medicaidId}
                      />
                      <ReadonlyLine label="DOB" value={previewProfile.dob} />
                      <ReadonlyLine
                        label="Gender"
                        value={previewProfile.gender}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                    <div className="mb-3 text-sm font-semibold text-bac-text">
                      Contact
                    </div>

                    <div className="space-y-3">
                      <ReadonlyLine label="Phone" value={previewProfile.phone} />
                      <ReadonlyLine label="Email" value={previewProfile.email} />
                      <ReadonlyLine
                        label="Address 1"
                        value={previewProfile.address1}
                      />
                      <ReadonlyLine
                        label="Address 2"
                        value={previewProfile.address2}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                    <div className="mb-3 text-sm font-semibold text-bac-text">
                      Program Snapshot
                    </div>

                    <div className="space-y-3">
                      <ReadonlyLine
                        label="Branch"
                        value={previewProfile.branch}
                      />
                      <ReadonlyLine
                        label="Location"
                        value={previewProfile.location}
                      />
                      <ReadonlyLine
                        label="Accepted Services"
                        value={previewProfile.acceptedServices}
                      />
                      <ReadonlyLine
                        label="Authorization Payer"
                        value={newPayer}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Authorization Details"
            subtitle="Enter payer, authorization number, service, event code, format, modifiers, date range, and notes."
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-3">
                <Field label="Payer" required>
                  <Select
                    value={newPayer}
                    onChange={(v) =>
                      setNewPayer(v as "ODP" | "CHC" | "PRIVATE" | "OTHER")
                    }
                    options={[
                      { value: "ODP", label: "ODP" },
                      { value: "CHC", label: "CHC" },
                      { value: "PRIVATE", label: "Private" },
                      { value: "OTHER", label: "Other" },
                    ]}
                  />
                </Field>
              </div>

              <div className="lg:col-span-5">
                <Field label="Authorization Number" required>
                  <input
                    value={newAuthorizationNumber}
                    onChange={(e) => setNewAuthorizationNumber(e.target.value)}
                    placeholder="Enter authorization number..."
                    className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none focus:ring-2 focus:ring-bac-primary/40"
                  />
                </Field>
              </div>

              <div className="lg:col-span-2">
                <Field label="Status" required>
                  <Select
                    value={newStatus}
                    onChange={(v) => setNewStatus(v as AuthStatus)}
                    options={[
                      { value: "PENDING", label: "Pending" },
                      { value: "ACTIVE", label: "Active" },
                      { value: "EXPIRED", label: "Expired" },
                      { value: "SUSPENDED", label: "Suspended" },
                    ]}
                  />
                </Field>
              </div>

              <div className="lg:col-span-2">
                <Field label="Source" required>
                  <Select
                    value={newSource}
                    onChange={(v) => setNewSource(v as "MANUAL" | "IMPORT")}
                    options={[
                      { value: "MANUAL", label: "Manual" },
                      { value: "IMPORT", label: "Import" },
                    ]}
                  />
                </Field>
              </div>

              <div className="lg:col-span-6">
                <Field label="Service" required>
                  <select
                    value={newServiceId}
                    onChange={(e) => setNewServiceId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary/40"
                  >
                    <option value="">Select Service</option>
                    {serviceOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {formatServiceLabel(s)}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="mt-2 flex flex-wrap gap-2">
                  {serviceOptionsLoading ? (
                    <Badge variant="warning">Loading services...</Badge>
                  ) : null}
                  {selectedService ? (
                    <Badge variant="success">
                      Selected: {formatServiceLabel(selectedService)}
                    </Badge>
                  ) : null}
                  {serviceOptionsError ? (
                    <Badge variant="danger">{serviceOptionsError}</Badge>
                  ) : null}
                </div>
              </div>

              <div className="lg:col-span-3">
                <Field label="Event Code" required>
                  <Select
                    value={newEventCode}
                    onChange={setNewEventCode}
                    options={[
                      { value: "NONE", label: "NONE - None" },
                      { value: "U1-ECS", label: "U1 - ECS" },
                      { value: "U4-NOBENEFIT", label: "U4 - NoBenefit" },
                      {
                        value: "U4U1-NOBENEFIT-ECS",
                        label: "U4U1 - NoBenefit ECS",
                      },
                    ]}
                  />
                </Field>
              </div>

              <div className="lg:col-span-3">
                <Field label="Format" required>
                  <Select
                    value={newFormat}
                    onChange={setNewFormat}
                    options={[
                      { value: "Days", label: "Days" },
                      { value: "Hours", label: "Hours" },
                      { value: "Units", label: "Units" },
                      { value: "Visits", label: "Visits" },
                    ]}
                  />
                </Field>
              </div>

              <div className="lg:col-span-3">
                <Field label="Program">
                  <Select
                    value={newProgram}
                    onChange={setNewProgram}
                    options={[
                      { value: "ID/A", label: "ID/A" },
                      { value: "CHC", label: "CHC" },
                      { value: "OBRA", label: "OBRA" },
                      { value: "Other", label: "Other" },
                    ]}
                  />
                </Field>
              </div>

              <div className="lg:col-span-2">
                <Field label="Modifier 1">
                  <input
                    value={newModifier1}
                    onChange={(e) => setNewModifier1(e.target.value)}
                    placeholder="Optional"
                    className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none focus:ring-2 focus:ring-bac-primary/40"
                  />
                </Field>
              </div>

              <div className="lg:col-span-2">
                <Field label="Modifier 2">
                  <input
                    value={newModifier2}
                    onChange={(e) => setNewModifier2(e.target.value)}
                    placeholder="Optional"
                    className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none focus:ring-2 focus:ring-bac-primary/40"
                  />
                </Field>
              </div>

              <div className="lg:col-span-2">
                <Field label="Modifier 3">
                  <input
                    value={newModifier3}
                    onChange={(e) => setNewModifier3(e.target.value)}
                    placeholder="Optional"
                    className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none focus:ring-2 focus:ring-bac-primary/40"
                  />
                </Field>
              </div>

              <div className="lg:col-span-2">
                <Field label="Modifier 4">
                  <input
                    value={newModifier4}
                    onChange={(e) => setNewModifier4(e.target.value)}
                    placeholder="Optional"
                    className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text placeholder:text-bac-muted outline-none focus:ring-2 focus:ring-bac-primary/40"
                  />
                </Field>
              </div>

              <div className="lg:col-span-2">
                <Field label="Start Date" required>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary/40"
                  />
                </Field>
              </div>

              <div className="lg:col-span-2">
                <Field label="End Date" required>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary/40"
                  />
                </Field>
              </div>

              <div className="lg:col-span-2 flex items-end">
                <label className="flex h-10 items-center gap-2 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text">
                  <input
                    type="checkbox"
                    checked={newVoided}
                    onChange={(e) => setNewVoided(e.target.checked)}
                    className="h-4 w-4 rounded border-bac-border bg-bac-panel"
                  />
                  Voided
                </label>
              </div>

              <div className="lg:col-span-12">
                <Field label="Comments">
                  <textarea
                    value={newComments}
                    onChange={(e) => setNewComments(e.target.value)}
                    placeholder="Write comments here..."
                    className="min-h-[110px] w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text placeholder:text-bac-muted outline-none focus:ring-2 focus:ring-bac-primary/40"
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <SectionCard
                title="Authorization Limitation"
                subtitle="Define the maximum authorization amount and optional interval-based limitation."
              >
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-5">
                    <Field
                      label={`Maximum ${newFormat ? `(${newFormat})` : ""}`}
                      required
                    >
                      <input
                        value={newMaximum}
                        onChange={(e) => setNewMaximum(e.target.value)}
                        className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary/40"
                      />
                    </Field>
                  </div>

                  <div className="lg:col-span-7">
                    <div className="grid grid-cols-3 gap-3">
                      <StatCard label="Total Used" value="0.00" />
                      <StatCard label="Total Missed" value="0.00" />
                      <StatCard label="Total Remaining" value="0.00" />
                    </div>
                  </div>

                  <div className="lg:col-span-12">
                    <div className="mb-2 text-xs text-bac-muted">
                      Interval Based Limits
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm text-bac-text">
                        <input
                          type="radio"
                          name="intervalLimitMode"
                          checked={!hasIntervalLimit}
                          onChange={() => setHasIntervalLimit(false)}
                        />
                        None
                      </label>

                      <label className="flex items-center gap-2 text-sm text-bac-text">
                        <input
                          type="radio"
                          name="intervalLimitMode"
                          checked={hasIntervalLimit}
                          onChange={() => setHasIntervalLimit(true)}
                        />
                        Has Limitations
                      </label>
                    </div>
                  </div>

                  {hasIntervalLimit ? (
                    <>
                      <div className="lg:col-span-3">
                        <Field label="Interval Type">
                          <Select
                            value={intervalType}
                            onChange={setIntervalType}
                            options={[
                              { value: "Daily", label: "Daily" },
                              { value: "Weekly", label: "Weekly" },
                              { value: "Monthly", label: "Monthly" },
                            ]}
                          />
                        </Field>
                      </div>

                      <div className="lg:col-span-3">
                        <Field label="Interval Limit">
                          <input
                            value={intervalLimit}
                            onChange={(e) => setIntervalLimit(e.target.value)}
                            className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary/40"
                          />
                        </Field>
                      </div>

                      <div className="lg:col-span-3">
                        <Field label="Effective Start">
                          <input
                            type="date"
                            value={intervalStart}
                            onChange={(e) => setIntervalStart(e.target.value)}
                            className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary/40"
                          />
                        </Field>
                      </div>

                      <div className="lg:col-span-3">
                        <Field label="Effective End">
                          <input
                            type="date"
                            value={intervalEnd}
                            onChange={(e) => setIntervalEnd(e.target.value)}
                            className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary/40"
                          />
                        </Field>
                      </div>
                    </>
                  ) : null}
                </div>
              </SectionCard>
            </div>

            <div className="xl:col-span-5">
              <SectionCard
                title="Utilization Preview"
                subtitle="Preview the authorization amount and remaining balance for this record."
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <StatCard
                    label={`Authorized ${newFormat}`}
                    value={newAuthorizedNumeric || 0}
                  />
                  <StatCard label="Used" value={newUsedNumeric} />
                  <StatCard label="Remaining" value={newRemainingNumeric} />
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-bac-muted">
                    <span>Utilization Progress</span>
                    <span>{newUsedPct}%</span>
                  </div>

                  <div className="h-3 w-full overflow-hidden rounded-full bg-bac-bg">
                    <div
                      className="h-full rounded-full bg-bac-primary transition-all"
                      style={{ width: `${newUsedPct}%` }}
                    />
                  </div>

                  <div className="mt-3 rounded-2xl border border-dashed border-bac-border bg-bac-bg p-3 text-xs text-bac-muted">
                    Phase 3 default: used = 0, remaining = maximum. Real visit
                    utilization will come later.
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-bac-border pt-4">
            <button
              className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
              onClick={() => setOpenNew(false)}
            >
              Cancel
            </button>

            <button
              className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
              onClick={() => alert("Save Draft can be added next")}
            >
              Save Draft
            </button>

            <button
              className="rounded-xl border border-bac-primary bg-bac-primary/10 px-4 py-2 text-sm font-medium text-bac-text hover:bg-bac-primary/15"
              onClick={() => alert("Save & Add New can be added next")}
            >
              Save & Add New
            </button>

            <button
              className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saveLoading}
              onClick={handleSaveAuthorization}
            >
              {saveLoading ? "Saving..." : "Save Authorization"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
"use client";

import React, { useEffect, useMemo, useState } from "react";

type IndividualDetail = Record<string, any> | null;

type ServiceLookupItem = {
  id: string; // service.id (cuid)
  code: string; // normalized => serviceType (HCSS/COMP/...)
  name: string; // human label
  rawName?: string;
  rawCode?: string; // some APIs return "code" as cuid too
};

function Pill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "active";
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "active"
          ? "bg-bac-panel text-yellow-200"
          : "bg-bac-panel/40 text-bac-muted",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-none rounded-2xl border border-bac-border bg-bac-panel/30 p-6">
      <div className="text-base font-semibold text-bac-text">{title}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-bac-muted">{label}</div>
      <div className="mt-1 rounded-xl border border-bac-border bg-bac-panel/40 px-3 py-2 text-sm text-bac-text">
        {value ?? <span className="text-bac-muted">--</span>}
      </div>
    </div>
  );
}

function safeText(v: any) {
  const s = String(v ?? "").trim();
  return s ? s : "";
}

function pickFirst(obj: any, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    const s = safeText(v);
    if (s) return s;
  }
  return "";
}

function pickObj(obj: any, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v && typeof v === "object") return v;
  }
  return null;
}

function normalizePhone(raw: any) {
  const s = safeText(raw);
  return s || "";
}

/** Detect “cuid-like” ids quickly */
function looksLikeId(s: string): boolean {
  const t = safeText(s);
  if (!t) return false;
  // typical cuid starts with "c" and is long
  if (t.length >= 18 && t.startsWith("c")) return true;
  // allow other long ids
  if (t.length >= 18 && /^[a-z0-9_-]+$/i.test(t)) return true;
  return false;
}

/**
 * Many of your Service rows include:
 *   "... \n\n[CONFIG] {\"serviceType\":\"HCSS\", ... }"
 * We must extract serviceType to use as the real code shown in UI.
 */
function extractServiceTypeFromText(text: string): string {
  const s = safeText(text);
  if (!s) return "";

  const m = s.match(/"serviceType"\s*:\s*"([^"]+)"/i);
  if (m?.[1]) return m[1].trim().toUpperCase();

  const idx = s.toUpperCase().indexOf("[CONFIG]");
  if (idx >= 0) {
    const after = s.slice(idx + "[CONFIG]".length).trim();
    const braceStart = after.indexOf("{");
    const braceEnd = after.lastIndexOf("}");
    if (braceStart >= 0 && braceEnd > braceStart) {
      const jsonStr = after.slice(braceStart, braceEnd + 1);
      try {
        const obj = JSON.parse(jsonStr);
        const st = safeText(obj?.serviceType);
        if (st) return st.trim().toUpperCase();
      } catch {
        // ignore
      }
    }
  }

  return "";
}

function extractHumanLabel(text: string): string {
  const s = safeText(text);
  if (!s) return "";
  const idx = s.toUpperCase().indexOf("[CONFIG]");
  if (idx >= 0) {
    const before = s.slice(0, idx).trim();
    return before || "Service";
  }
  return s;
}

/**
 * Try to find accepted services "raw" value from MANY shapes/keys
 * because projects evolve and keys vary.
 */
function getAcceptedServicesRaw(individual: any): any {
  if (!individual) return null;

  const candidates = [
    "acceptedServices",
    "servicesAccepted",
    "acceptedServiceCodes",
    "acceptedService",
    "acceptedServiceIds",
    "acceptedServicesIds",
    "acceptedServicesIDs",
    "acceptedServicesSelected",
    "acceptedServicesLookup",
    "services",
  ];

  for (const k of candidates) {
    const v = individual?.[k];
    if (v != null) return v;
  }

  // nested fallbacks
  const nested =
    individual?.profile?.acceptedServices ??
    individual?.contacts?.acceptedServices ??
    individual?.clinical?.acceptedServices ??
    null;

  if (nested != null) return nested;

  // last resort: scan keys containing "accepted" + "service"
  const keys = Object.keys(individual || {});
  for (const k of keys) {
    const lk = k.toLowerCase();
    if (lk.includes("accepted") && lk.includes("service")) {
      const v = individual?.[k];
      if (v != null) return v;
    }
  }

  return null;
}

/**
 * Normalize accepted services into CODE LIST (HCSS/COMP/...)
 * Supports:
 * - array of codes ["HCSS","COMP"]
 * - array of IDs ["cmk...","cmk..."] => map to codes using serviceId->code map
 * - string "HCSS,COMP" or JSON string '["HCSS","COMP"]'
 * - object map {HCSS:true}
 */
function normalizeAcceptedCodes(
  individual: any,
  serviceIdToCode: Map<string, string>,
): string[] {
  const raw = getAcceptedServicesRaw(individual);
  if (raw == null) return [];

  // helper: map token to code
  const tokenToCode = (t: string): string => {
    const s = safeText(t);
    if (!s) return "";

    // if already looks like a short code
    const up = s.trim().toUpperCase();
    if (!looksLikeId(up) && up.length <= 12) return up;

    // if it's an id => map
    const mapped = serviceIdToCode.get(s) || serviceIdToCode.get(up);
    if (mapped) return mapped;

    return "";
  };

  // array
  if (Array.isArray(raw)) {
    const out: string[] = [];
    for (const x of raw) {
      if (typeof x === "string") {
        const c = tokenToCode(x);
        if (c) out.push(c);
        continue;
      }
      if (x && typeof x === "object") {
        // direct fields
        const direct =
          safeText((x as any).serviceType) ||
          safeText((x as any).code) ||
          safeText((x as any).serviceCode) ||
          safeText((x as any).id);

        // if direct is id => map; if direct is code => keep
        const c1 = tokenToCode(direct);
        if (c1) {
          out.push(c1);
          continue;
        }

        // parse from name/notes/description
        const fromText =
          extractServiceTypeFromText(
            safeText((x as any).name) ||
              safeText((x as any).notes) ||
              safeText((x as any).description),
          ) || "";

        const c2 = tokenToCode(fromText);
        if (c2) out.push(c2);
      }
    }
    return Array.from(new Set(out.map((x) => x.toUpperCase()))).filter(Boolean);
  }

  // object map
  if (typeof raw === "object") {
    const out = Object.entries(raw)
      .filter(([, v]) => v === true || v === 1 || v === "true")
      .map(([k]) => tokenToCode(k))
      .filter(Boolean)
      .map((x) => x.toUpperCase());
    return Array.from(new Set(out));
  }

  // string
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return [];

    // json string array
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) {
          return Array.from(
            new Set(
              arr
                .map((x) => tokenToCode(String(x)))
                .filter(Boolean)
                .map((x) => x.toUpperCase()),
            ),
          );
        }
      } catch {
        // fallthrough
      }
    }

    // comma/semicolon list
    const parts = s.split(/[,;]+/g).map((x) => x.trim());
    const out = parts.map(tokenToCode).filter(Boolean).map((x) => x.toUpperCase());
    return Array.from(new Set(out));
  }

  return [];
}

function getEmergencyContact(individual: any, index: 1 | 2) {
  if (!individual) return {};

  const arr = individual?.emergencyContacts;
  if (Array.isArray(arr) && arr[index - 1]) return arr[index - 1];

  const obj =
    (index === 1
      ? pickObj(individual, ["emergencyContact1", "emergency1", "ec1"])
      : pickObj(individual, ["emergencyContact2", "emergency2", "ec2"])) ?? null;

  if (obj) return obj;

  const prefix = index === 1 ? "emergencyContact1" : "emergencyContact2";
  return {
    name:
      individual?.[`${prefix}Name`] ??
      individual?.[`${prefix}_name`] ??
      individual?.[`${prefix}FullName`],
    relationship:
      individual?.[`${prefix}Relationship`] ??
      individual?.[`${prefix}_relationship`],
    primaryPhone:
      individual?.[`${prefix}Phone`] ??
      individual?.[`${prefix}PrimaryPhone`] ??
      individual?.[`${prefix}_phone`],
    secondaryPhone:
      individual?.[`${prefix}SecondaryPhone`] ??
      individual?.[`${prefix}_secondaryPhone`],
    notes: individual?.[`${prefix}Notes`] ?? individual?.[`${prefix}_notes`],
  };
}

// Fallback list only (if DB lookup fails or empty)
const FALLBACK_SERVICES: ServiceLookupItem[] = [
  { id: "fallback-1", code: "HCSS", name: "In-Home & Community Supports" },
  { id: "fallback-2", code: "COMP", name: "Companion Services" },
  { id: "fallback-3", code: "BSP", name: "Behavioral Supports" },
  { id: "fallback-4", code: "LPN", name: "Licensed Practical Nurse" },
];

export default function ProfileModule({ individualId }: { individualId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [individual, setIndividual] = useState<IndividualDetail>(null);

  // ✅ load real services from DB (once)
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceLookupItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    const loadServices = async () => {
      try {
        setServicesLoading(true);
        setServicesError(null);

        const res = await fetch("/api/lookups/services", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json().catch(() => null);
        const items: any[] = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : [];

        const cleaned: ServiceLookupItem[] = items
          .map((x) => {
            const rawId = safeText(x?.id);
            const rawCode = safeText(x?.code);
            const rawName = safeText(x?.name);

            const serviceType =
              safeText(x?.serviceType) ||
              extractServiceTypeFromText(rawName) ||
              extractServiceTypeFromText(safeText(x?.notes)) ||
              "";

            const human =
              safeText(x?.displayName) ||
              extractHumanLabel(rawName) ||
              safeText(x?.notes) ||
              "Service";

            return {
              id: rawId || rawCode || human,
              code: serviceType.trim().toUpperCase(),
              name: human,
              rawName,
              rawCode,
            };
          })
          .filter((x) => x.code);

        // De-duplicate by code (show only one per serviceType)
        const byCode = new Map<string, ServiceLookupItem>();
        for (const s of cleaned) {
          if (!byCode.has(s.code)) byCode.set(s.code, s);
        }

        const uniq = Array.from(byCode.values()).sort((a, b) =>
          a.code.localeCompare(b.code),
        );

        setServices(uniq);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        console.error("ProfileModule load services lookup failed:", e);
        setServicesError(String(e?.message || e));
        setServices([]);
      } finally {
        setServicesLoading(false);
      }
    };

    loadServices();
    return () => controller.abort();
  }, []);

  // load selected individual details
  useEffect(() => {
    if (!individualId) {
      setIndividual(null);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/individuals/${individualId}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json().catch(() => null);
        const obj = data?.item ?? data?.individual ?? data;

        setIndividual(obj ?? null);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        console.error("ProfileModule load failed:", e);
        setError(String(e?.message || e));
        setIndividual(null);
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [individualId]);

  const servicesToRender = useMemo(() => {
    return services.length > 0 ? services : FALLBACK_SERVICES;
  }, [services]);

  /** Build map: serviceId/rawCode -> serviceType code (HCSS/COMP/...) */
  const serviceIdToCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of servicesToRender) {
      const code = safeText(s.code).toUpperCase();
      if (!code) continue;

      const id = safeText(s.id);
      const rawCode = safeText(s.rawCode);

      if (id) map.set(id, code);
      if (rawCode) map.set(rawCode, code);

      // also map upper variants
      if (id) map.set(id.toUpperCase(), code);
      if (rawCode) map.set(rawCode.toUpperCase(), code);
    }
    return map;
  }, [servicesToRender]);

  /**
   * ✅ Accepted codes computed AFTER we have services map,
   * so if Individual returns accepted service IDs => we still check correctly.
   */
  const acceptedCodes = useMemo(() => {
    return normalizeAcceptedCodes(individual, serviceIdToCode);
  }, [individual, serviceIdToCode]);

  const acceptedSet = useMemo(() => {
    return new Set(acceptedCodes.map((x) => x.toUpperCase()));
  }, [acceptedCodes]);

  const headerTitle = useMemo(() => {
    const firstName = pickFirst(individual, ["firstName", "firstname"]);
    const lastName = pickFirst(individual, ["lastName", "lastname"]);
    const full = `${firstName} ${lastName}`.trim();
    return full || "Profile";
  }, [individual]);

  // computed fields
  const code = pickFirst(individual, ["code", "individualCode"]);
  const firstName = pickFirst(individual, ["firstName", "firstname"]);
  const lastName = pickFirst(individual, ["lastName", "lastname"]);
  const middleName = pickFirst(individual, ["middleName", "middlename"]);
  const dob = pickFirst(individual, ["dateOfBirth", "dob", "birthDate"]);
  const gender = pickFirst(individual, ["gender"]);
  const medicaidId = pickFirst(individual, ["medicaidId", "medicaidID", "altId"]);
  const status = pickFirst(individual, ["status", "individualStatus"]);

  const branch = pickFirst(individual, ["branch", "branchName"]);
  const locationPrimary = pickFirst(individual, [
    "locationPrimary",
    "primaryLocation",
    "location",
    "locationName",
  ]);

  const primaryPhone = normalizePhone(
    pickFirst(individual, ["primaryPhone", "phone", "homePhone"]),
  );
  const secondaryPhone = normalizePhone(
    pickFirst(individual, ["secondaryPhone", "phone2", "altPhone"]),
  );
  const email = pickFirst(individual, ["email"]);

  const addr1 = pickFirst(individual, ["address1", "addressLine1", "street1"]);
  const addr2 = pickFirst(individual, ["address2", "addressLine2", "street2"]);
  const city = pickFirst(individual, ["city"]);
  const county = pickFirst(individual, ["county"]);
  const state = pickFirst(individual, ["state"]);
  const zip = pickFirst(individual, ["zip", "zipCode", "postalCode"]);

  const ec1 = getEmergencyContact(individual, 1);
  const ec2 = getEmergencyContact(individual, 2);

  if (loading) {
    return (
      <div className="w-full max-w-none rounded-2xl border border-bac-border bg-bac-panel/30 p-6">
        <div className="text-lg font-semibold text-bac-text">Profile</div>
        <div className="mt-2 text-sm text-bac-muted">Loading profile…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-none rounded-2xl border border-bac-border bg-bac-panel/30 p-6">
        <div className="text-lg font-semibold text-bac-text">Profile</div>
        <div className="mt-2 text-sm text-bac-red">
          Failed to load profile: {error}
        </div>
      </div>
    );
  }

  if (!individual) {
    return (
      <div className="w-full max-w-none rounded-2xl border border-bac-border bg-bac-panel/30 p-6">
        <div className="text-lg font-semibold text-bac-text">Profile</div>
        <div className="mt-2 text-sm text-bac-muted">
          No data. Please select an Individual.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-bac-text">{headerTitle}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {code ? <Pill tone="active">{code}</Pill> : <Pill tone="muted">--</Pill>}
            {status ? <Pill tone="muted">{status}</Pill> : null}
          </div>
        </div>
      </div>

      <SectionCard title="Profile">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="First Name *" value={firstName || "--"} />
          <Field label="Middle Name" value={middleName || "--"} />
          <Field label="Last Name *" value={lastName || "--"} />

          <Field label="Date of Birth (YYYY-MM-DD) *" value={dob || "--"} />
          <Field label="Gender" value={gender || "--"} />
          <Field label="Medicaid ID" value={medicaidId || "--"} />
        </div>
      </SectionCard>

      <SectionCard title="Enrollment">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Branch *" value={branch || "--"} />
          <Field label="Location (Primary) *" value={locationPrimary || "--"} />
          <Field label="Individual Status" value={status || "--"} />
        </div>
      </SectionCard>

      <SectionCard title="Contacts">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Primary Phone" value={primaryPhone || "--"} />
          <Field label="Secondary Phone" value={secondaryPhone || "--"} />
          <Field label="Email" value={email || "--"} />
        </div>
      </SectionCard>

      <SectionCard title="Primary Address">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Address Line 1" value={addr1 || "--"} />
          <Field label="Address Line 2" value={addr2 || "--"} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Field label="City" value={city || "--"} />
          <Field label="County" value={county || "--"} />
          <Field label="State" value={state || "--"} />
          <Field label="ZIP" value={zip || "--"} />
        </div>
      </SectionCard>

      <SectionCard title="Accepted Services *">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-bac-muted">
            {servicesLoading
              ? "Loading services from database…"
              : servicesError
                ? `Services lookup error: ${servicesError} (showing fallback list)`
                : `Services (unique by serviceType): ${services.length}`}
          </div>

          <div className="text-sm text-bac-muted">
            Accepted (from Individual data):{" "}
            <span className="text-bac-text font-semibold">
              {acceptedCodes.length}
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {servicesToRender.map((s) => {
            const codeUpper = String(s.code || "").toUpperCase();
            const checked = acceptedSet.has(codeUpper);

            return (
              <label
                key={s.id || s.code}
                className="flex items-center gap-2 rounded-xl border border-bac-border bg-bac-panel/20 px-3 py-2 text-sm"
                title={s.name}
              >
                <input type="checkbox" checked={checked} readOnly />
                <span className={checked ? "text-bac-text" : "text-bac-muted"}>
                  {codeUpper}
                </span>
                <span className="ml-1 truncate text-xs text-bac-muted">
                  {s.name ? `— ${s.name}` : ""}
                </span>
              </label>
            );
          })}
        </div>

        {acceptedCodes.length === 0 && (
          <div className="mt-3 text-sm text-bac-muted">
            No accepted services found in this Individual payload yet (or payload stores IDs not being returned).
          </div>
        )}

        <div className="mt-2 text-xs text-bac-muted">
          * Read-only view. We will add Edit/Save later.
        </div>
      </SectionCard>

      <SectionCard title="Emergency Contacts">
        <div className="grid grid-cols-1 gap-6">
          <div className="rounded-2xl border border-bac-border bg-bac-panel/20 p-4">
            <div className="text-sm font-semibold text-bac-text">
              Emergency Contact 1 *
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field
                label="Name"
                value={
                  pickFirst(ec1, ["name", "fullName"]) ||
                  pickFirst(ec1, ["firstName"]) ||
                  "--"
                }
              />
              <Field
                label="Relationship"
                value={pickFirst(ec1, ["relationship"]) || "--"}
              />
              <Field
                label="Primary Phone"
                value={
                  normalizePhone(pickFirst(ec1, ["primaryPhone", "phone"])) || "--"
                }
              />
              <Field
                label="Secondary Phone"
                value={normalizePhone(pickFirst(ec1, ["secondaryPhone"])) || "--"}
              />
              <Field label="Notes" value={pickFirst(ec1, ["notes"]) || "--"} />
            </div>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel/20 p-4">
            <div className="text-sm font-semibold text-bac-text">
              Emergency Contact 2
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field
                label="Name"
                value={
                  pickFirst(ec2, ["name", "fullName"]) ||
                  pickFirst(ec2, ["firstName"]) ||
                  "--"
                }
              />
              <Field
                label="Relationship"
                value={pickFirst(ec2, ["relationship"]) || "--"}
              />
              <Field
                label="Primary Phone"
                value={
                  normalizePhone(pickFirst(ec2, ["primaryPhone", "phone"])) || "--"
                }
              />
              <Field
                label="Secondary Phone"
                value={normalizePhone(pickFirst(ec2, ["secondaryPhone"])) || "--"}
              />
              <Field label="Notes" value={pickFirst(ec2, ["notes"]) || "--"} />
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// web/app/individuals/[id]/page.tsx
"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  ChangeEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
import ISPandBSP from "@/components/individual/ISPandBSP";

/* =========================
   NAV / LAYOUT HELPERS
   ========================= */
type TabKey =
  | "profile"
  | "billing"
  | "clinical"
  | "equipment"
  | "preferences"
  | "ispbsp";
const TABS = [
  { key: "profile", label: "Profile & Contacts" },
  { key: "billing", label: "Coverage & Billing" },
  { key: "clinical", label: "Clinical & Medication" },
  { key: "equipment", label: "Preparedness & Equipment" },
  { key: "preferences", label: "Preferences & Directives" },
  { key: "ispbsp", label: "ISP & BSP" },
] as const;

/* =========================
   SERVICE CATALOG (for tooltip)
   - Keep in sync with: app/services/new/page.tsx (SERVICE_OPTIONS)
   ========================= */
type ServiceItem = { code: string; name: string };
const ACCEPTED_SERVICES: ServiceItem[] = [
  { code: "PCA", name: "Personal Care Assistant" },
  { code: "NT", name: "Nursing / Nurse Triage" },
  { code: "PBIS", name: "Positive Behavior Interventions and Supports" },
  { code: "SHHA", name: "Skilled Home Health Aide" },
  { code: "PT", name: "Physical Therapy" },
  { code: "CNA", name: "Certified Nursing Assistant" },
  { code: "RESP", name: "Respite Services" },
  { code: "SHC", name: "Shared Home Care / Shared Habilitation" },
  { code: "OT", name: "Occupational Therapy" },
  { code: "SCM", name: "Service Coordination / Case Management" },
  { code: "COMP", name: "Companion Services" },

  { code: "LPN", name: "Licensed Practical Nurse" },
  { code: "HCSS", name: "In-Home & Community Support Services" },
  { code: "SDP", name: "Structured Day Program" },
  { code: "OTA", name: "Occupational Therapy Assistant" },
  { code: "MSW", name: "Master of Social Work Services" },
  { code: "APC", name: "Advanced Professional Care" },
  { code: "CBSA", name: "Community-Based Supported Activities" },
  { code: "PTA", name: "Physical Therapy Assistant" },
  { code: "HMK", name: "Homemake Services" },
  { code: "CHORE", name: "Chore Services" },
  { code: "ILST", name: "Independent Living Skills Training" },
  { code: "SPC", name: "Specialist / Professional Consultant" },
  { code: "TRAN", name: "Non-Emergency (Transportation)" },
  { code: "BSP", name: "Behavioral Support" },

  { code: "ST", name: "Speech Therapy" },
  { code: "SCI", name: "Specialized Community Integration" },
  { code: "PC", name: "Personal Care" },
  { code: "HHA", name: "Home Health Aide" },
  { code: "RT", name: "Respiratory Therapy / Rehabilitation Therapy" },
  { code: "CH", name: "Companion / Habilitation" },
  { code: "RN", name: "Registered Nurse" },
  { code: "PA", name: "Physician Assistant / Personal Assistant" },
  { code: "ESC", name: "Enhanced Support Companion" },
  { code: "NINS", name: "Non-Insurance / Non-traditional Service" },
];

/* =========================
   FORM TYPES
   ========================= */

type IndividualStatus = "PENDING" | "ACTIVE" | "INACTIVE";

type EmergencyContact = {
  name: string;
  relationship: string;
  phonePrimary: string;
  phoneSecondary: string;
  notes: string;
};

export type ProfileForm = {
  // ✅ NEW: align with DB enum IndividualStatus
  status: IndividualStatus;

  firstName: string;
  middleName: string;
  lastName: string;
  dob: string; // "YYYY-MM-DD"
  gender: string;

  // ✅ CHANGED: Medicaid ID replaces SSN
  medicaidId: string;

  branch: string;
  location: string;
  primaryPhone: string;
  secondaryPhone: string;
  email: string;
  address1: string;
  address2: string;
  city: string;
  county: string;
  state: string;
  zip: string;
  acceptedServices: string[];
  emergency1: EmergencyContact;
  emergency2: EmergencyContact;

  // các field khác lưu dưới dạng any (billing, meds, dx, equipment, ...)
  // để giữ tương thích với trang New Individual và API hiện có.
  [key: string]: any;
};

const makeEmptyForm = (): ProfileForm => ({
  status: "PENDING",

  firstName: "",
  middleName: "",
  lastName: "",
  dob: "",
  gender: "",

  // ✅ CHANGED
  medicaidId: "",

  branch: "",
  location: "",
  primaryPhone: "",
  secondaryPhone: "",
  email: "",
  address1: "",
  address2: "",
  city: "",
  county: "",
  state: "PA",
  zip: "",
  acceptedServices: [],
  emergency1: {
    name: "",
    relationship: "",
    phonePrimary: "",
    phoneSecondary: "",
    notes: "",
  },
  emergency2: {
    name: "",
    relationship: "",
    phonePrimary: "",
    phoneSecondary: "",
    notes: "",
  },
});

/* =========================
   UTIL
   ========================= */

const requiredProfileOk = (f: ProfileForm) => {
  const hasPhoneOrEC1 =
    !!f.primaryPhone || !!f.emergency1?.phonePrimary || !!f.emergency1?.name;

  return (
    !!f.firstName &&
    !!f.lastName &&
    !!f.dob &&
    !!f.branch &&
    !!f.location &&
    hasPhoneOrEC1 &&
    f.acceptedServices.length > 0
  );
};

/* ====================================
   SAFE INPUTS (controlled, ổn định caret)
   ==================================== */

const SafeTextInput = (
  props: React.InputHTMLAttributes<HTMLInputElement> & { value?: string },
) => {
  const { value, className, ...rest } = props;
  const v = value ?? "";
  return (
    <input
      {...rest}
      value={v}
      className={
        "w-full mt-1 px-3 py-2 rounded-xl border border-bac-border bg-bac-panel " +
        (className || "")
      }
      autoComplete={props.autoComplete ?? "off"}
    />
  );
};

const SafeSelect = (
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { value?: string },
) => {
  const { value, className, children, ...rest } = props;
  const v = value ?? "";
  return (
    <select
      {...rest}
      value={v}
      className={
        "w-full mt-1 px-3 py-2 rounded-xl border border-bac-border bg-bac-panel " +
        (className || "")
      }
    >
      {children}
    </select>
  );
};

/* =========================
   SMALL BUILDER
   ========================= */

const Labeled = ({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={className}>
    <label className="text-sm">
      {label} {required ? "*" : ""}
    </label>
    {children}
  </div>
);

/* =========================
   HELPERS: MAP API → FORM
   ========================= */

type ApiIndividual = {
  id: string;
  code: string;

  // ✅ NEW
  status?: string | null;

  firstName: string;
  middleName: string | null;
  lastName: string;
  dob: string;
  gender: string | null;

  // ✅ NEW field
  medicaidId?: string | null;

  // legacy (keep for compatibility; not used in UI anymore)
  ssnLast4?: string | null;

  branch: string;
  location: string;

  primaryPhone: string | null;
  secondaryPhone: string | null;
  email: string | null;

  address1: string | null;
  address2: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  zip: string | null;

  // ⚠️ acceptedServices có thể là string (CSV) hoặc string[] hoặc null
  acceptedServices: string | string[] | null;

  emergency1Name: string | null;
  emergency1Relationship: string | null;
  emergency1PhonePrimary: string | null;
  emergency1PhoneSecondary: string | null;
  emergency1Notes: string | null;

  emergency2Name: string | null;
  emergency2Relationship: string | null;
  emergency2PhonePrimary: string | null;
  emergency2PhoneSecondary: string | null;
  emergency2Notes: string | null;

  billingSameAsPrimary: boolean;
  billingAddress1: string | null;
  billingAddress2: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingZip: string | null;

  guardianName: string | null;
  guardianPhone: string | null;
  repPayeeName: string | null;
  repPayeePhone: string | null;

  pcpName: string | null;
  pcpPhone: string | null;
  pcpFax: string | null;
  pcpNpi: string | null;
  pcpAddress: string | null;
  allergies: string | null;

  priorityCode: string | null;
  mobility: string | null;
  equipOxygen: boolean;
  equip_cpap: boolean;
  equip_ventilator: boolean;
  equip_iv_pump: boolean;
  equip_syringe_pump: boolean;
  equip_feeding_tube: boolean;
  equip_nebulizer: boolean;
  equip_wheelchair: boolean;
  equip_hospital_bed: boolean;
  equipOther: string | null;

  prefTime: string | null;
  prefNotes: string | null;
  langPrimary: string | null;
  langSecondary: string | null;
  caregiverGender: string | null;
  prefOther: string | null;

  advType: string | null;
  advDateIn: string | null;
  advDateOut: string | null;
  advStatus: string | null;
  advPhysician: string | null;
  advAttach: string | null;

  // relations:
  payers: any[];
  medications: any[];
  diagnoses: any[];
};

function toStatus(v: any): IndividualStatus {
  const s = String(v || "")
    .toUpperCase()
    .trim();
  if (s === "ACTIVE") return "ACTIVE";
  if (s === "INACTIVE") return "INACTIVE";
  return "PENDING";
}

const mapApiToForm = (api: ApiIndividual): ProfileForm => {
  const form = makeEmptyForm();

  // ✅ NEW
  form.status = toStatus(api.status);

  form.firstName = api.firstName ?? "";
  form.middleName = api.middleName ?? "";
  form.lastName = api.lastName ?? "";
  form.dob = api.dob ?? "";
  form.gender = api.gender ?? "";

  // ✅ CHANGED: show Medicaid ID only (do NOT show SSN legacy)
  form.medicaidId = api.medicaidId ?? "";

  form.branch = api.branch ?? "";
  form.location = api.location ?? "";

  form.primaryPhone = api.primaryPhone ?? "";
  form.secondaryPhone = api.secondaryPhone ?? "";
  form.email = api.email ?? "";

  form.address1 = api.address1 ?? "";
  form.address2 = api.address2 ?? "";
  form.city = api.city ?? "";
  form.county = api.county ?? "";
  form.state = api.state ?? "PA";
  form.zip = api.zip ?? "";

  // handle array / CSV / null
  if (Array.isArray(api.acceptedServices)) {
    form.acceptedServices = api.acceptedServices.filter(Boolean);
  } else if (
    typeof api.acceptedServices === "string" &&
    api.acceptedServices.trim() !== ""
  ) {
    form.acceptedServices = api.acceptedServices
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    form.acceptedServices = [];
  }

  form.emergency1 = {
    name: api.emergency1Name ?? "",
    relationship: api.emergency1Relationship ?? "",
    phonePrimary: api.emergency1PhonePrimary ?? "",
    phoneSecondary: api.emergency1PhoneSecondary ?? "",
    notes: api.emergency1Notes ?? "",
  };

  form.emergency2 = {
    name: api.emergency2Name ?? "",
    relationship: api.emergency2Relationship ?? "",
    phonePrimary: api.emergency2PhonePrimary ?? "",
    phoneSecondary: api.emergency2PhoneSecondary ?? "",
    notes: api.emergency2Notes ?? "",
  };

  const anyForm: any = form;

  anyForm.billingSameAsPrimary = api.billingSameAsPrimary ?? true;
  anyForm.billingAddress1 = api.billingAddress1 ?? "";
  anyForm.billingAddress2 = api.billingAddress2 ?? "";
  anyForm.billingCity = api.billingCity ?? "";
  anyForm.billingState = api.billingState ?? "PA";
  anyForm.billingZip = api.billingZip ?? "";

  anyForm.guardianName = api.guardianName ?? "";
  anyForm.guardianPhone = api.guardianPhone ?? "";
  anyForm.repPayeeName = api.repPayeeName ?? "";
  anyForm.repPayeePhone = api.repPayeePhone ?? "";

  anyForm.pcpName = api.pcpName ?? "";
  anyForm.pcpPhone = api.pcpPhone ?? "";
  anyForm.pcpFax = api.pcpFax ?? "";
  anyForm.pcpNpi = api.pcpNpi ?? "";
  anyForm.pcpAddress = api.pcpAddress ?? "";
  anyForm.allergies = api.allergies ?? "";

  anyForm.priorityCode = api.priorityCode ?? "";
  anyForm.mobility = api.mobility ?? "";
  anyForm.equip_oxygen = api.equipOxygen ?? false;
  anyForm.equip_cpap = api.equip_cpap ?? false;
  anyForm.equip_ventilator = api.equip_ventilator ?? false;
  anyForm.equip_iv_pump = api.equip_iv_pump ?? false;
  anyForm.equip_syringe_pump = api.equip_syringe_pump ?? false;
  anyForm.equip_feeding_tube = api.equip_feeding_tube ?? false;
  anyForm.equip_nebulizer = api.equip_nebulizer ?? false;
  anyForm.equip_wheelchair = api.equip_wheelchair ?? false;
  anyForm.equip_hospital_bed = api.equip_hospital_bed ?? false;
  anyForm.equipOther = api.equipOther ?? "";

  anyForm.prefTime = api.prefTime ?? "";
  anyForm.prefNotes = api.prefNotes ?? "";
  anyForm.langPrimary = api.langPrimary ?? "";
  anyForm.langSecondary = api.langSecondary ?? "";
  anyForm.caregiverGender = api.caregiverGender ?? "";
  anyForm.prefOther = api.prefOther ?? "";

  anyForm.advType = api.advType ?? "";
  anyForm.advDateIn = api.advDateIn ?? "";
  anyForm.advDateOut = api.advDateOut ?? "";
  anyForm.advStatus = api.advStatus ?? "";
  anyForm.advPhysician = api.advPhysician ?? "";
  anyForm.advAttach = api.advAttach ?? "";

  anyForm.billingPayers = api.payers ?? [];
  anyForm.meds = api.medications ?? [];
  anyForm.dx = api.diagnoses ?? [];

  return form;
};

/* =========================
   MAIN PAGE — EDIT INDIVIDUAL
   ========================= */

export default function IndividualDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id as string | undefined;

  const [code, setCode] = useState<string>("");
  const [form, setForm] = useState<ProfileForm>(() => makeEmptyForm());
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDirty, setDirty] = useState(false);

  const canSave = useMemo(() => requiredProfileOk(form), [form]);

  // đánh dấu chỉnh sửa
  useEffect(() => {
    if (loading) return;
    setDirty(true);
  }, [form, loading]);

  // cảnh báo khi rời trang
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Load individual từ API
  useEffect(() => {
    if (!id) return;
    const run = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const res = await fetch(`/api/individuals/${id}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as ApiIndividual;
        setCode(data.code);
        setForm(mapApiToForm(data));
      } catch (err: any) {
        console.error("Load individual error:", err);
        setLoadError("Failed to load individual");
      } finally {
        setLoading(false);
        setDirty(false);
      }
    };
    run();
  }, [id]);

  const handleBack = () => {
    if (isDirty) {
      const ok = confirm(
        "You have unsaved changes. Do you want to leave without saving?",
      );
      if (!ok) return;
    }
    router.push("/individual");
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      setSaving(true);

      const res = await fetch(`/api/individuals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      // ❗ KHÔNG throw ngay
      if (!res.ok) {
        let data: any = {};
        try {
          data = await res.json();
        } catch {}

        // ✅ Trùng Medicaid ID
        if (res.status === 409 && data?.field === "medicaidId") {
          alert(
            "Medicaid ID already exists.\nPlease check and enter a different Medicaid ID.",
          );
          return;
        }

        // ❌ lỗi khác
        throw new Error(`HTTP ${res.status}`);
      }

      alert("Saved successfully!");
      setDirty(false);
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Save failed. Please try again or contact admin.");
    } finally {
      setSaving(false);
    }
  };

  // Clear theo từng tab
  const clearTab = (tab: TabKey) => {
    setForm((s) => {
      const f = { ...s } as ProfileForm;
      const anyForm: any = f;

      switch (tab) {
        case "profile":
          return {
            ...f,
            // keep status as-is (do not clear)
            firstName: "",
            middleName: "",
            lastName: "",
            dob: "",
            gender: "",

            // ✅ CHANGED
            medicaidId: "",

            primaryPhone: "",
            secondaryPhone: "",
            email: "",
            address1: "",
            address2: "",
            city: "",
            county: "",
            state: "PA",
            zip: "",
            acceptedServices: [],
            emergency1: {
              name: "",
              relationship: "",
              phonePrimary: "",
              phoneSecondary: "",
              notes: "",
            },
            emergency2: {
              name: "",
              relationship: "",
              phonePrimary: "",
              phoneSecondary: "",
              notes: "",
            },
          };
        case "billing":
          anyForm.billingSameAsPrimary = true;
          anyForm.billingAddress1 = "";
          anyForm.billingAddress2 = "";
          anyForm.billingCity = "";
          anyForm.billingState = "PA";
          anyForm.billingZip = "";
          anyForm.guardianName = "";
          anyForm.guardianPhone = "";
          anyForm.repPayeeName = "";
          anyForm.repPayeePhone = "";
          anyForm.billingPayers = [];
          return f;
        case "clinical":
          anyForm.pcpName = "";
          anyForm.pcpPhone = "";
          anyForm.pcpFax = "";
          anyForm.pcpNpi = "";
          anyForm.pcpAddress = "";
          anyForm.allergies = "";
          anyForm.meds = [];
          anyForm.dx = [];
          return f;
        case "equipment":
          anyForm.priorityCode = "";
          anyForm.mobility = "";
          anyForm.equip_oxygen = false;
          anyForm.equip_cpap = false;
          anyForm.equip_ventilator = false;
          anyForm.equip_iv_pump = false;
          anyForm.equip_syringe_pump = false;
          anyForm.equip_feeding_tube = false;
          anyForm.equip_nebulizer = false;
          anyForm.equip_wheelchair = false;
          anyForm.equip_hospital_bed = false;
          anyForm.equipOther = "";
          return f;
        case "preferences":
          anyForm.prefTime = "";
          anyForm.prefNotes = "";
          anyForm.langPrimary = "";
          anyForm.langSecondary = "";
          anyForm.caregiverGender = "";
          anyForm.prefOther = "";
          anyForm.advType = "";
          anyForm.advDateIn = "";
          anyForm.advDateOut = "";
          anyForm.advStatus = "";
          anyForm.advPhysician = "";
          anyForm.advAttach = "";
          return f;
        case "ispbsp":
          // No-op for now: giữ nguyên dữ liệu tab ISP/BSP (sẽ nối API sau)
          return f;
      }
    });
  };

  if (!id) {
    return (
      <div className="p-6 text-red-400">Missing individual id in the URL.</div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="px-3 py-1 rounded-xl border border-bac-border bg-bac-bg hover:shadow"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-semibold">Loading individual…</h1>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="px-3 py-1 rounded-xl border border-bac-border bg-bac-bg hover:shadow"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-semibold text-red-400">
              Failed to load individual
            </h1>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl border border-bac-border bg-bac-bg hover:shadow"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // =================== RENDER TABS ===================

  return (
    <div className="p-6 space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="px-3 py-1 rounded-xl border border-bac-border bg-bac-bg hover:shadow"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Individual Detail</h1>
            {code && (
              <div className="text-sm text-bac-muted">
                Individual Code: <span className="font-semibold">{code}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-bac-muted">
            {isDirty ? "Unsaved changes" : "All changes saved"}
          </div>
          <button
            type="button"
            disabled={saving || !canSave}
            onClick={handleSave}
            className={`px-4 py-2 rounded-xl ${
              canSave
                ? "bg-bac-primary text-white hover:opacity-90"
                : "bg-bac-border text-bac-muted cursor-not-allowed"
            }`}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Banner note */}
      <div className="rounded-xl border border-yellow-600/30 bg-yellow-500/10 px-4 py-3 text-sm">
        <span className="font-semibold">Required to complete at least: </span>
        First Name, Last Name, Date of Birth, Branch, Location, Primary Phone or
        Emergency Contact 1, At least 1 service in Accepted Services.
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-bac-border">
        <div className="flex gap-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as TabKey)}
              className={
                "px-3 py-2 -mb-px border-b-2 " +
                (activeTab === (t.key as TabKey)
                  ? "border-white text-white"
                  : "border-transparent text-bac-muted hover:text-white")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => clearTab(activeTab)}
          className="text-xs px-3 py-1 rounded-lg border border-bac-border bg-bac-bg hover:shadow"
        >
          Clear this tab
        </button>
      </div>

      {/* =========================
          TAB 1 — PROFILE & CONTACTS
          ========================= */}
      {activeTab === "profile" && (
        <div className="space-y-8">
          {/* Basic / Demographics */}
          <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
            <h2 className="text-lg font-semibold mb-3">Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Labeled label="First Name" required>
                <SafeTextInput
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, firstName: e.target.value }))
                  }
                />
              </Labeled>
              <Labeled label="Middle Name">
                <SafeTextInput
                  value={form.middleName}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, middleName: e.target.value }))
                  }
                />
              </Labeled>
              <Labeled label="Last Name" required>
                <SafeTextInput
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, lastName: e.target.value }))
                  }
                />
              </Labeled>

              <Labeled label="Date of Birth (YYYY-MM-DD)" required>
                <SafeTextInput
                  type="date"
                  value={form.dob}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, dob: e.target.value }))
                  }
                />
              </Labeled>

              <Labeled label="Gender">
                <SafeSelect
                  value={form.gender}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, gender: e.target.value }))
                  }
                >
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other / Prefer not to say</option>
                </SafeSelect>
              </Labeled>

              {/* ✅ CHANGED: Medicaid ID */}
              <Labeled label="Medicaid ID">
                <SafeTextInput
                  type="text"
                  placeholder="Medicaid ID"
                  maxLength={32}
                  value={form.medicaidId}
                  onChange={(e) => {
                    // keep it simple + safe: trim leading spaces only
                    const v = String(e.target.value ?? "").replace(/^\s+/, "");
                    setForm((s) => ({ ...s, medicaidId: v }));
                  }}
                />
              </Labeled>
            </div>
          </section>

          {/* Enrollment */}
          <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
            <h2 className="text-lg font-semibold mb-3">Enrollment</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Labeled label="Branch" required>
                <SafeSelect
                  value={form.branch}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, branch: e.target.value }))
                  }
                >
                  <option value="">Select Branch</option>
                  <option>Altoona Office</option>
                  <option>Bellefonte Office</option>
                  <option>Bedford County Branch</option>
                  <option>Johnstown Office</option>
                </SafeSelect>
              </Labeled>

              <Labeled label="Location (Primary)" required>
                <SafeSelect
                  value={form.location}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, location: e.target.value }))
                  }
                >
                  <option value="">Select Location</option>
                  <option>Home / Residential</option>
                  <option>Community</option>
                  <option>Day Program</option>
                  <option>School</option>
                  <option>Workplace</option>
                  <option>Home and Community</option>
                </SafeSelect>
              </Labeled>

              {/* ✅ NEW: Individual Status */}
              <Labeled label="Individual Status">
                <SafeSelect
                  value={form.status}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      status: toStatus(e.target.value),
                    }))
                  }
                  className={
                    form.status === "ACTIVE"
                      ? "text-green-400"
                      : form.status === "INACTIVE"
                        ? "text-red-400"
                        : "text-yellow-400"
                  }
                >
                  <option value="PENDING">PENDING</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </SafeSelect>
              </Labeled>
            </div>
          </section>

          {/* Contacts */}
          <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
            <h2 className="text-lg font-semibold mb-3">Contacts</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Labeled label="Primary Phone">
                <SafeTextInput
                  type="text"
                  inputMode="tel"
                  placeholder="(xxx) xxx-xxxx"
                  value={form.primaryPhone}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, primaryPhone: e.target.value }))
                  }
                />
              </Labeled>
              <Labeled label="Secondary Phone">
                <SafeTextInput
                  type="text"
                  inputMode="tel"
                  placeholder="(xxx) xxx-xxxx"
                  value={form.secondaryPhone}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, secondaryPhone: e.target.value }))
                  }
                />
              </Labeled>
              <Labeled label="Email">
                <SafeTextInput
                  type="email"
                  placeholder="name@email.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, email: e.target.value }))
                  }
                />
              </Labeled>
            </div>
          </section>

          {/* Address */}
          <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
            <h2 className="text-lg font-semibold mb-3">Primary Address</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Labeled label="Address Line 1">
                <SafeTextInput
                  value={form.address1}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, address1: e.target.value }))
                  }
                />
              </Labeled>
              <Labeled label="Address Line 2">
                <SafeTextInput
                  value={form.address2}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, address2: e.target.value }))
                  }
                />
              </Labeled>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:col-span-2">
                <Labeled label="City">
                  <SafeTextInput
                    value={form.city}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, city: e.target.value }))
                    }
                  />
                </Labeled>
                <Labeled label="County">
                  <SafeTextInput
                    value={form.county}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, county: e.target.value }))
                    }
                  />
                </Labeled>
                <Labeled label="State">
                  <SafeTextInput
                    value={form.state}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, state: e.target.value }))
                    }
                  />
                </Labeled>
                <Labeled label="ZIP">
                  <SafeTextInput
                    value={form.zip}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, zip: e.target.value }))
                    }
                  />
                </Labeled>
              </div>
            </div>
          </section>

          {/* Accepted Services */}
          <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
            <h2 className="text-lg font-semibold mb-3">Accepted Services *</h2>
            <div className="grid md:grid-cols-3 gap-y-2">
              {ACCEPTED_SERVICES.map((svc) => {
                const checked = form.acceptedServices.includes(svc.code);
                return (
                  <label
                    key={svc.code}
                    className="inline-flex items-center gap-2 text-sm cursor-pointer"
                    title={svc.name}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setForm((s) => {
                          const set = new Set(s.acceptedServices);
                          if (e.target.checked) set.add(svc.code);
                          else set.delete(svc.code);
                          return {
                            ...s,
                            acceptedServices: Array.from(set),
                          };
                        })
                      }
                    />
                    {svc.code}
                  </label>
                );
              })}
            </div>
          </section>

          {/* Emergency Contacts */}
          <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
            <h2 className="text-lg font-semibold mb-3">Emergency Contacts</h2>

            <div className="mb-6">
              <div className="text-sm font-medium mb-2">
                Emergency Contact 1 *
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Labeled label="Name">
                  <SafeTextInput
                    value={form.emergency1.name}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        emergency1: {
                          ...s.emergency1,
                          name: e.target.value,
                        },
                      }))
                    }
                  />
                </Labeled>
                <Labeled label="Relationship">
                  <SafeTextInput
                    value={form.emergency1.relationship}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        emergency1: {
                          ...s.emergency1,
                          relationship: e.target.value,
                        },
                      }))
                    }
                  />
                </Labeled>
                <Labeled label="Primary Phone">
                  <SafeTextInput
                    value={form.emergency1.phonePrimary}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        emergency1: {
                          ...s.emergency1,
                          phonePrimary: e.target.value,
                        },
                      }))
                    }
                  />
                </Labeled>
                <Labeled label="Secondary Phone">
                  <SafeTextInput
                    value={form.emergency1.phoneSecondary}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        emergency1: {
                          ...s.emergency1,
                          phoneSecondary: e.target.value,
                        },
                      }))
                    }
                  />
                </Labeled>
                <Labeled label="Notes">
                  <SafeTextInput
                    value={form.emergency1.notes}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        emergency1: {
                          ...s.emergency1,
                          notes: e.target.value,
                        },
                      }))
                    }
                  />
                </Labeled>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">
                Emergency Contact 2
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Labeled label="Name">
                  <SafeTextInput
                    value={form.emergency2.name}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        emergency2: {
                          ...s.emergency2,
                          name: e.target.value,
                        },
                      }))
                    }
                  />
                </Labeled>
                <Labeled label="Relationship">
                  <SafeTextInput
                    value={form.emergency2.relationship}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        emergency2: {
                          ...s.emergency2,
                          relationship: e.target.value,
                        },
                      }))
                    }
                  />
                </Labeled>
                <Labeled label="Primary Phone">
                  <SafeTextInput
                    value={form.emergency2.phonePrimary}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        emergency2: {
                          ...s.emergency2,
                          phonePrimary: e.target.value,
                        },
                      }))
                    }
                  />
                </Labeled>
                <Labeled label="Secondary Phone">
                  <SafeTextInput
                    value={form.emergency2.phoneSecondary}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        emergency2: {
                          ...s.emergency2,
                          phoneSecondary: e.target.value,
                        },
                      }))
                    }
                  />
                </Labeled>
                <Labeled label="Notes">
                  <SafeTextInput
                    value={form.emergency2.notes}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        emergency2: {
                          ...s.emergency2,
                          notes: e.target.value,
                        },
                      }))
                    }
                  />
                </Labeled>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ============================================================
          TAB 2 — COVERAGE & BILLING
          ============================================================ */}
      {activeTab === "billing" && (
        <div className="space-y-8">
          <h2 className="text-lg font-semibold">Coverage & Billing</h2>

          {/* Insurance Payers */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-base font-semibold">Insurance Payers</h3>
              <button
                type="button"
                onClick={() =>
                  setForm((s) => {
                    const prev = ((s as any).billingPayers ?? []) as any[];
                    return {
                      ...s,
                      billingPayers: [
                        ...prev,
                        {
                          type: "Secondary",
                          name: "",
                          plan: "",
                          memberId: "",
                          groupId: "",
                          startDate: "",
                          endDate: "",
                          eligibility: "Pending",
                          notes: "",
                        },
                      ],
                    } as any;
                  })
                }
                className="text-xs px-2 py-1 rounded-lg border border-bac-border bg-bac-bg hover:shadow"
              >
                + Add Secondary
              </button>
            </div>

            {(
              ((form as any).billingPayers as any[]) || [
                {
                  type: "Primary",
                  name: "",
                  plan: "",
                  memberId: "",
                  groupId: "",
                  startDate: "",
                  endDate: "",
                  eligibility: "Pending",
                  notes: "",
                },
              ]
            ).map((p: any, idx: number) => (
              <div
                key={idx}
                className="mb-4 rounded-xl border border-bac-border p-4 bg-bac-bg"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium">
                    {p.type === "Primary" ? "Primary Payer" : "Secondary Payer"}
                  </div>
                  {p.type !== "Primary" && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((s) => {
                          const arr = [
                            ...(((s as any).billingPayers ?? []) as any[]),
                          ];
                          arr.splice(idx, 1);
                          return {
                            ...(s as any),
                            billingPayers: arr,
                          };
                        })
                      }
                      className="text-xs px-2 py-1 rounded-lg border border-bac-border bg-bac-bg hover:shadow"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Labeled label="Payer Name *" required>
                    <SafeTextInput
                      value={p.name ?? ""}
                      onChange={(e) => {
                        const payers = [
                          ...(((form as any).billingPayers ?? []) as any[]),
                        ];
                        if (!payers[idx])
                          payers[idx] = { ...p, name: e.target.value ?? "" };
                        else
                          payers[idx] = {
                            ...payers[idx],
                            name: e.target.value,
                          };
                        setForm((s) => ({
                          ...(s as any),
                          billingPayers: payers,
                        }));
                      }}
                      placeholder="UPMC, Aetna, Highmark …"
                    />
                  </Labeled>

                  <Labeled label="Plan">
                    <SafeTextInput
                      value={p.plan ?? ""}
                      onChange={(e) => {
                        const payers = [
                          ...(((form as any).billingPayers ?? []) as any[]),
                        ];
                        if (!payers[idx])
                          payers[idx] = { ...p, plan: e.target.value ?? "" };
                        else
                          payers[idx] = {
                            ...payers[idx],
                            plan: e.target.value,
                          };
                        setForm((s) => ({
                          ...(s as any),
                          billingPayers: payers,
                        }));
                      }}
                    />
                  </Labeled>

                  <Labeled label="Eligibility">
                    <SafeSelect
                      value={p.eligibility ?? ""}
                      onChange={(e) => {
                        const payers = [
                          ...(((form as any).billingPayers ?? []) as any[]),
                        ];
                        const v = e.target.value;
                        if (!payers[idx])
                          payers[idx] = { ...p, eligibility: v };
                        else payers[idx] = { ...payers[idx], eligibility: v };
                        setForm((s) => ({
                          ...(s as any),
                          billingPayers: payers,
                        }));
                      }}
                    >
                      <option>Verified</option>
                      <option>Pending</option>
                      <option>Not Eligible</option>
                    </SafeSelect>
                  </Labeled>

                  <Labeled label="Member / Policy ID *">
                    <SafeTextInput
                      value={p.memberId ?? ""}
                      onChange={(e) => {
                        const payers = [
                          ...(((form as any).billingPayers ?? []) as any[]),
                        ];
                        if (!payers[idx])
                          payers[idx] = {
                            ...p,
                            memberId: e.target.value ?? "",
                          };
                        else
                          payers[idx] = {
                            ...payers[idx],
                            memberId: e.target.value,
                          };
                        setForm((s) => ({
                          ...(s as any),
                          billingPayers: payers,
                        }));
                      }}
                    />
                  </Labeled>

                  <Labeled label="Group #">
                    <SafeTextInput
                      value={p.groupId ?? ""}
                      onChange={(e) => {
                        const payers = [
                          ...(((form as any).billingPayers ?? []) as any[]),
                        ];
                        if (!payers[idx])
                          payers[idx] = {
                            ...p,
                            groupId: e.target.value ?? "",
                          };
                        else
                          payers[idx] = {
                            ...payers[idx],
                            groupId: e.target.value,
                          };
                        setForm((s) => ({
                          ...(s as any),
                          billingPayers: payers,
                        }));
                      }}
                    />
                  </Labeled>

                  <div className="grid grid-cols-2 gap-2">
                    <Labeled label="Start Date">
                      <SafeTextInput
                        type="date"
                        value={p.startDate ?? ""}
                        onChange={(e) => {
                          const payers = [
                            ...(((form as any).billingPayers ?? []) as any[]),
                          ];
                          if (!payers[idx])
                            payers[idx] = {
                              ...p,
                              startDate: e.target.value ?? "",
                            };
                          else
                            payers[idx] = {
                              ...payers[idx],
                              startDate: e.target.value,
                            };
                          setForm((s) => ({
                            ...(s as any),
                            billingPayers: payers,
                          }));
                        }}
                      />
                    </Labeled>
                    <Labeled label="End Date">
                      <SafeTextInput
                        type="date"
                        value={p.endDate ?? ""}
                        onChange={(e) => {
                          const payers = [
                            ...(((form as any).billingPayers ?? []) as any[]),
                          ];
                          if (!payers[idx])
                            payers[idx] = {
                              ...p,
                              endDate: e.target.value ?? "",
                            };
                          else
                            payers[idx] = {
                              ...payers[idx],
                              endDate: e.target.value,
                            };
                          setForm((s) => ({
                            ...(s as any),
                            billingPayers: payers,
                          }));
                        }}
                      />
                    </Labeled>
                  </div>

                  <Labeled label="Notes" className="md:col-span-3">
                    <SafeTextInput
                      value={p.notes ?? ""}
                      onChange={(e) => {
                        const payers = [
                          ...(((form as any).billingPayers ?? []) as any[]),
                        ];
                        if (!payers[idx])
                          payers[idx] = {
                            ...p,
                            notes: e.target.value ?? "",
                          };
                        else
                          payers[idx] = {
                            ...payers[idx],
                            notes: e.target.value,
                          };
                        setForm((s) => ({
                          ...(s as any),
                          billingPayers: payers,
                        }));
                      }}
                      placeholder="Eligibility ref #, copay details, etc."
                    />
                  </Labeled>
                </div>
              </div>
            ))}
          </section>

          {/* Billing Address */}
          <section>
            <h3 className="text-base font-semibold mb-3">Billing Address</h3>
            <label className="inline-flex items-center gap-2 text-sm mb-3">
              <input
                type="checkbox"
                checked={(form as any).billingSameAsPrimary ?? true}
                onChange={(e) =>
                  setForm((s) => ({
                    ...(s as any),
                    billingSameAsPrimary: e.target.checked,
                  }))
                }
              />
              Same as primary home address
            </label>

            {!((form as any).billingSameAsPrimary ?? true) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Labeled label="Address 1">
                  <SafeTextInput
                    value={(form as any).billingAddress1 ?? ""}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...(s as any),
                        billingAddress1: e.target.value,
                      }))
                    }
                  />
                </Labeled>
                <Labeled label="Address 2">
                  <SafeTextInput
                    value={(form as any).billingAddress2 ?? ""}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...(s as any),
                        billingAddress2: e.target.value,
                      }))
                    }
                  />
                </Labeled>
                <Labeled label="City">
                  <SafeTextInput
                    value={(form as any).billingCity ?? ""}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...(s as any),
                        billingCity: e.target.value,
                      }))
                    }
                  />
                </Labeled>
                <Labeled label="State">
                  <SafeTextInput
                    value={(form as any).billingState ?? "PA"}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...(s as any),
                        billingState: e.target.value,
                      }))
                    }
                  />
                </Labeled>
                <Labeled label="ZIP">
                  <SafeTextInput
                    value={(form as any).billingZip ?? ""}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...(s as any),
                        billingZip: e.target.value,
                      }))
                    }
                  />
                </Labeled>
              </div>
            )}
          </section>

          {/* Guardian / Rep Payee */}
          <section>
            <h3 className="text-base font-semibold mb-3">
              Guardian / Representative Payee
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Labeled label="Guardian / MPOA Name">
                <SafeTextInput
                  value={(form as any).guardianName ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      guardianName: e.target.value,
                    }))
                  }
                />
              </Labeled>
              <Labeled label="Guardian Phone">
                <SafeTextInput
                  value={(form as any).guardianPhone ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      guardianPhone: e.target.value,
                    }))
                  }
                />
              </Labeled>
              <Labeled label="Representative Payee Name">
                <SafeTextInput
                  value={(form as any).repPayeeName ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      repPayeeName: e.target.value,
                    }))
                  }
                />
              </Labeled>
              <Labeled label="Rep Payee Phone">
                <SafeTextInput
                  value={(form as any).repPayeePhone ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      repPayeePhone: e.target.value,
                    }))
                  }
                />
              </Labeled>
            </div>
          </section>
        </div>
      )}

      {/* ============================================================
          TAB 3 — CLINICAL & MEDICATION
          ============================================================ */}
      {activeTab === "clinical" && (
        <div className="space-y-8">
          <h2 className="text-lg font-semibold">Clinical & Medication</h2>

          {/* PCP */}
          <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
            <h3 className="text-base font-semibold mb-3">
              Primary Care Physician
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Labeled label="Physician Name">
                <SafeTextInput
                  value={(form as any).pcpName ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      pcpName: e.target.value,
                    }))
                  }
                />
              </Labeled>
              <Labeled label="Phone">
                <SafeTextInput
                  value={(form as any).pcpPhone ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      pcpPhone: e.target.value,
                    }))
                  }
                />
              </Labeled>
              <Labeled label="Fax">
                <SafeTextInput
                  value={(form as any).pcpFax ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      pcpFax: e.target.value,
                    }))
                  }
                />
              </Labeled>
              <Labeled label="NPI">
                <SafeTextInput
                  value={(form as any).pcpNpi ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      pcpNpi: e.target.value,
                    }))
                  }
                />
              </Labeled>
              <Labeled label="Address" className="md:col-span-2">
                <SafeTextInput
                  value={(form as any).pcpAddress ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      pcpAddress: e.target.value,
                    }))
                  }
                />
              </Labeled>
            </div>
          </section>

          {/* Medications */}
          <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Medications</h3>
              <button
                type="button"
                onClick={() =>
                  setForm((s) => {
                    const prev = (((s as any).meds ?? []) as any[]).slice();
                    prev.push({ name: "", dose: "", schedule: "" });
                    return { ...(s as any), meds: prev };
                  })
                }
                className="text-xs px-2 py-1 rounded-lg border border-bac-border bg-bac-bg hover:shadow"
              >
                + Add Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-bac-border rounded-xl overflow-hidden">
                <thead className="bg-bac-bg">
                  <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
                    <th style={{ minWidth: 220 }}>Medication</th>
                    <th style={{ minWidth: 120 }}>Dose</th>
                    <th style={{ minWidth: 160 }}>Schedule</th>
                    <th style={{ width: 60 }} />
                  </tr>
                </thead>
                <tbody>
                  {(((form as any).meds as any[]) ?? []).length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-bac-muted" colSpan={4}>
                        No medication rows yet. Click “+ Add Row”.
                      </td>
                    </tr>
                  )}
                  {(((form as any).meds as any[]) ?? []).map(
                    (m: any, i: number) => (
                      <tr
                        key={i}
                        className="border-t border-bac-border [&>td]:px-3 [&>td]:py-2"
                      >
                        <td>
                          <SafeTextInput
                            value={m.name ?? ""}
                            onChange={(e) => {
                              const list = [
                                ...(((form as any).meds ?? []) as any[]),
                              ];
                              list[i] = { ...list[i], name: e.target.value };
                              setForm((s) => ({ ...(s as any), meds: list }));
                            }}
                          />
                        </td>
                        <td>
                          <SafeTextInput
                            value={m.dose ?? ""}
                            onChange={(e) => {
                              const list = [
                                ...(((form as any).meds ?? []) as any[]),
                              ];
                              list[i] = { ...list[i], dose: e.target.value };
                              setForm((s) => ({ ...(s as any), meds: list }));
                            }}
                          />
                        </td>
                        <td>
                          <SafeTextInput
                            value={m.schedule ?? ""}
                            onChange={(e) => {
                              const list = [
                                ...(((form as any).meds ?? []) as any[]),
                              ];
                              list[i] = {
                                ...list[i],
                                schedule: e.target.value,
                              };
                              setForm((s) => ({ ...(s as any), meds: list }));
                            }}
                          />
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setForm((s) => {
                                const list = [
                                  ...(((s as any).meds ?? []) as any[]),
                                ];
                                list.splice(i, 1);
                                return { ...(s as any), meds: list };
                              })
                            }
                            className="text-xs px-2 py-1 rounded-lg border border-bac-border bg-bac-bg hover:shadow"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Allergies */}
          <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
            <h3 className="text-base font-semibold mb-3">Allergies</h3>
            <Labeled label="Known allergies / reactions (comma-separated)">
              <SafeTextInput
                placeholder="Penicillin (rash), Nuts (anaphylaxis)…"
                value={(form as any).allergies ?? ""}
                onChange={(e) =>
                  setForm((s) => ({
                    ...(s as any),
                    allergies: e.target.value,
                  }))
                }
              />
            </Labeled>
          </section>

          {/* Diagnosis */}
          <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Diagnosis (ICD)</h3>
              <button
                type="button"
                onClick={() =>
                  setForm((s) => {
                    const prev = (((s as any).dx ?? []) as any[]).slice();
                    prev.push({ icd: "", description: "", onset: "" });
                    return { ...(s as any), dx: prev };
                  })
                }
                className="text-xs px-2 py-1 rounded-lg border border-bac-border bg-bac-bg hover:shadow"
              >
                + Add Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-bac-border rounded-xl overflow-hidden">
                <thead className="bg-bac-bg">
                  <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
                    <th style={{ minWidth: 120 }}>ICD Code</th>
                    <th style={{ minWidth: 240 }}>Description</th>
                    <th style={{ minWidth: 140 }}>Onset Date</th>
                    <th style={{ width: 60 }} />
                  </tr>
                </thead>
                <tbody>
                  {(((form as any).dx as any[]) ?? []).length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-bac-muted" colSpan={4}>
                        No diagnosis rows yet. Click “+ Add Row”.
                      </td>
                    </tr>
                  )}
                  {(((form as any).dx as any[]) ?? []).map(
                    (d: any, i: number) => (
                      <tr
                        key={i}
                        className="border-t border-bac-border [&>td]:px-3 [&>td]:py-2"
                      >
                        <td>
                          <SafeTextInput
                            value={d.icd ?? ""}
                            onChange={(e) => {
                              const list = [
                                ...(((form as any).dx ?? []) as any[]),
                              ];
                              list[i] = { ...list[i], icd: e.target.value };
                              setForm((s) => ({ ...(s as any), dx: list }));
                            }}
                            placeholder="F84.0"
                          />
                        </td>
                        <td>
                          <SafeTextInput
                            value={d.description ?? ""}
                            onChange={(e) => {
                              const list = [
                                ...(((form as any).dx ?? []) as any[]),
                              ];
                              list[i] = {
                                ...list[i],
                                description: e.target.value,
                              };
                              setForm((s) => ({ ...(s as any), dx: list }));
                            }}
                            placeholder="Autistic disorder…"
                          />
                        </td>
                        <td>
                          <SafeTextInput
                            type="date"
                            value={d.onset ?? ""}
                            onChange={(e) => {
                              const list = [
                                ...(((form as any).dx ?? []) as any[]),
                              ];
                              list[i] = { ...list[i], onset: e.target.value };
                              setForm((s) => ({ ...(s as any), dx: list }));
                            }}
                          />
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setForm((s) => {
                                const list = [
                                  ...(((s as any).dx ?? []) as any[]),
                                ];
                                list.splice(i, 1);
                                return { ...(s as any), dx: list };
                              })
                            }
                            className="text-xs px-2 py-1 rounded-lg border border-bac-border bg-bac-bg hover:shadow"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ============================================================
          TAB 4 — PREPAREDNESS & EQUIPMENT
          ============================================================ */}
      {activeTab === "equipment" && (
        <div className="space-y-8">
          <h2 className="text-lg font-semibold">Preparedness & Equipment</h2>

          <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
            <h3 className="text-base font-semibold mb-3">Preparedness</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Labeled label="Priority Code">
                <SafeSelect
                  value={(form as any).priorityCode ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      priorityCode: e.target.value,
                    }))
                  }
                >
                  <option value="">Select</option>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </SafeSelect>
              </Labeled>
              <Labeled label="Mobility Status">
                <SafeSelect
                  value={(form as any).mobility ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      mobility: e.target.value,
                    }))
                  }
                >
                  <option value="">Select</option>
                  <option>Independent</option>
                  <option>Walker</option>
                  <option>Wheelchair</option>
                  <option>Bed-bound</option>
                </SafeSelect>
              </Labeled>
            </div>
          </section>

          <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
            <h3 className="text-base font-semibold mb-3">
              Equipment / Dependencies
            </h3>

            <div className="grid md:grid-cols-3 gap-y-2">
              {[
                "Oxygen",
                "CPAP",
                "Ventilator",
                "IV Pump",
                "Syringe Pump",
                "Feeding Tube",
                "Nebulizer",
                "Wheelchair",
                "Hospital Bed",
              ].map((name) => {
                const key = `equip_${name.replace(/\s+/g, "_").toLowerCase()}`;
                const checked = Boolean((form as any)[key]);
                return (
                  <label
                    key={key}
                    className="inline-flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...(s as any),
                          [key]: e.target.checked,
                        }))
                      }
                    />
                    {name}
                  </label>
                );
              })}
            </div>

            <div className="mt-4">
              <Labeled label="Other (please specify)">
                <SafeTextInput
                  value={(form as any).equipOther ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      equipOther: e.target.value,
                    }))
                  }
                />
              </Labeled>
            </div>
          </section>
        </div>
      )}

      {/* ============================================================
          TAB 5 — PREFERENCES & DIRECTIVES
          ============================================================ */}
      {activeTab === "preferences" && (
        <div className="space-y-8">
          <h2 className="text-lg font-semibold">Preferences & Directives</h2>

          {/* Scheduling Preferences */}
          <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
            <h3 className="text-base font-semibold mb-3">
              Scheduling Preferences
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm">Preferred Weekdays</div>
                <div className="mt-2 grid grid-cols-3 gap-y-2 text-sm">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (d) => {
                      const key = `prefDay_${d}`;
                      const checked = Boolean((form as any)[key]);
                      return (
                        <label
                          key={d}
                          className="inline-flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setForm((s) => ({
                                ...(s as any),
                                [key]: e.target.checked,
                              }))
                            }
                          />
                          {d}
                        </label>
                      );
                    },
                  )}
                </div>
              </div>
              <Labeled label="Preferred Time Window">
                <SafeText
                  երկրների
                  placeholder="e.g., 9:00 AM – 2:00 PM"
                  value={(form as any).prefTime ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      prefTime: e.target.value,
                    }))
                  }
                />
              </Labeled>
              <Labeled label="Notes">
                <SafeTextInput
                  value={(form as any).prefNotes ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      prefNotes: e.target.value,
                    }))
                  }
                />
              </Labeled>
            </div>
          </section>

          {/* Non-Scheduling Preferences */}
          <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
            <h3 className="text-base font-semibold mb-3">
              Non-Scheduling Preferences
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Labeled label="Primary Language">
                <SafeTextInput
                  value={(form as any).langPrimary ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      langPrimary: e.target.value,
                    }))
                  }
                />
              </Labeled>
              <Labeled label="Secondary Language">
                <SafeTextInput
                  value={(form as any).langSecondary ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      langSecondary: e.target.value,
                    }))
                  }
                />
              </Labeled>
              <Labeled label="Preferred Caregiver Gender">
                <SafeSelect
                  value={(form as any).caregiverGender ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      caregiverGender: e.target.value,
                    }))
                  }
                >
                  <option value="">No preference</option>
                  <option>Male</option>
                  <option>Female</option>
                </SafeSelect>
              </Labeled>
            </div>
            <div className="mt-4">
              <Labeled label="Other">
                <SafeTextInput
                  value={(form as any).prefOther ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      prefOther: e.target.value,
                    }))
                  }
                />
              </Labeled>
            </div>
          </section>

          {/* Advanced Directives */}
          <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
            <h3 className="text-base font-semibold mb-3">
              Advanced Directives
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Labeled label="Directive Type">
                <SafeSelect
                  value={(form as any).advType ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      advType: e.target.value,
                    }))
                  }
                >
                  <option value="">Select</option>
                  <option>Do Not Resuscitate (DNR)</option>
                  <option>Do Not Intubate (DNI)</option>
                  <option>Living Will</option>
                  <option>Power of Attorney</option>
                </SafeSelect>
              </Labeled>
              <Labeled label="Date In">
                <SafeTextInput
                  type="date"
                  value={(form as any).advDateIn ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      advDateIn: e.target.value,
                    }))
                  }
                />
              </Labeled>
              <Labeled label="Date Out">
                <SafeTextInput
                  type="date"
                  value={(form as any).advDateOut ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      advDateOut: e.target.value,
                    }))
                  }
                />
              </Labeled>
              <Labeled label="Status">
                <SafeSelect
                  value={(form as any).advStatus ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      advStatus: e.target.value,
                    }))
                  }
                >
                  <option>Active</option>
                  <option>Inactive</option>
                  <option>Pending</option>
                </SafeSelect>
              </Labeled>
              <Labeled label="Physician">
                <SafeTextInput
                  value={(form as any).advPhysician ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      advPhysician: e.target.value,
                    }))
                  }
                />
              </Labeled>
              <Labeled label="Attachments / Notes" className="md:col-span-2">
                <SafeTextInput
                  placeholder="Link, file name or short note…"
                  value={(form as any).advAttach ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...(s as any),
                      advAttach: e.target.value,
                    }))
                  }
                />
              </Labeled>
            </div>
          </section>
        </div>
      )}

      {/* ============================================================
          TAB 6 — ISP & BSP
          ============================================================ */}
      {activeTab === "ispbsp" && (
        <div className="space-y-4">
          <ISPandBSP individualId={id} />
        </div>
      )}
    </div>
  );
}

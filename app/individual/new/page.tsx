"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* =========================
   NAV / LAYOUT HELPERS
   ========================= */
type TabKey = "profile" | "billing" | "clinical" | "equipment" | "preferences";
const TABS = [
  { key: "profile", label: "Profile & Contacts" },
  { key: "billing", label: "Coverage & Billing" },
  { key: "clinical", label: "Clinical & Medication" },
  { key: "equipment", label: "Preparedness & Equipment" },
  { key: "preferences", label: "Preferences & Directives" },
] as const;

/* =========================
   SERVICE CATALOG (for tooltip)
   ========================= */
type ServiceItem = { code: string; name: string };
const ACCEPTED_SERVICES: ServiceItem[] = [
  { code: "PCA", name: "Personal Care Assistant" },
  { code: "LPN", name: "Licensed Practical Nurse" },
  { code: "ST", name: "Speech Therapy" },
  { code: "NT", name: "Nutrition Therapy" },
  { code: "HCSS", name: "Home & Community Support Services" },
  { code: "SCI", name: "Skilled Care – In-Home" },
  { code: "PBIS", name: "Positive Behavior Intervention & Supports" },
  { code: "SDP", name: "Self-Directed Programs" },
  { code: "PC", name: "Personal Care (Non-Skilled)" },
  { code: "SHHA", name: "Skilled Home Health Aide" },
  { code: "OTA", name: "Occupational Therapy Assistant" },

  { code: "HHA", name: "Home Health Aide" },
  { code: "PT", name: "Physical Therapy" },
  { code: "MSW", name: "Medical Social Worker" },
  { code: "RT", name: "Respiratory Therapy" },
  { code: "CNA", name: "Certified Nursing Assistant" },
  { code: "APC", name: "Advanced Practice Clinician" },
  { code: "HMK", name: "Homemaker" },
  { code: "RESP", name: "Respite" },
  { code: "CBSA", name: "Community-Based Supports Assistant" },
  { code: "CH", name: "Companion / Habilitation" },
  { code: "SHC", name: "Shared Home Care" },
  { code: "PTA", name: "Physical Therapist Assistant" },

  { code: "RN", name: "Registered Nurse" },
  { code: "OT", name: "Occupational Therapy" },
  { code: "HSK", name: "Housekeeping" },
  { code: "PA", name: "Physician Assistant" },

  { code: "SCM", name: "Service Coordination / Case Management" },
  { code: "ILST", name: "Independent Living Skills Training" },
  { code: "ESC", name: "Enhanced / Specialized Care" },
  { code: "COMP", name: "Community Companion" },
  { code: "SPC", name: "Specialized Community Support" },
  { code: "NINS", name: "Non-Insurance / Private Pay" },
];

/* =========================
   FORM TYPES
   ========================= */
type EmergencyContact = {
  name: string;
  relationship: string;
  phonePrimary: string;
  phoneSecondary: string;
  notes: string;
};

type ProfileForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string; // store YYYY-MM-DD for <input type="date">
  gender: string;
  ssn: string; // last 4
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
} & Record<string, any>;

/* =========================
   UTIL
   ========================= */
const STORAGE_KEY = "bac-hms:new-individual:draft";

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

const defaultPrimaryPayer = () => ({
  type: "Primary",
  name: "",
  plan: "",
  memberId: "",
  groupId: "",
  startDate: "",
  endDate: "",
  eligibility: "Pending",
  notes: "",
});

const defaultSecondaryPayer = () => ({
  type: "Secondary",
  name: "",
  plan: "",
  memberId: "",
  groupId: "",
  startDate: "",
  endDate: "",
  eligibility: "Pending",
  notes: "",
});

const defaultForm = (): ProfileForm => ({
  firstName: "",
  middleName: "",
  lastName: "",
  dob: "",
  gender: "",
  ssn: "",
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
  billingPayers: [defaultPrimaryPayer()],
  billingSameAsPrimary: true,
});

/* ====================================
   SAFE INPUTS (fix caret loss)
   ==================================== */
const SafeTextInput = (
  props: React.InputHTMLAttributes<HTMLInputElement> & { value?: string }
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
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { value?: string }
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

/* ====================================
   Labeled
   ==================================== */
const Labeled: React.FC<{
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ label, required, children, className }) => (
  <div className={className}>
    <label className="text-sm">
      {label} {required ? "*" : ""}
    </label>
    {children}
  </div>
);

/* =========================
   PAGE
   ========================= */
export default function NewIndividualPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [form, setForm] = useState<ProfileForm>(defaultForm);
  const [isDirty, setDirty] = useState(false);
  const [tick, setTick] = useState(0);
  const [restorableDraft, setRestorableDraft] = useState<ProfileForm | null>(
    null
  );
  const savingRef = useRef(false);

  // one-time: detect old draft but KEEP UI clean; offer Restore button
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ProfileForm;
        setRestorableDraft(parsed);
      }
      // ensure new session starts clean
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Dirty tracking
  useEffect(() => {
    if (savingRef.current) return;
    setDirty(true);
  }, [form]);

  // Autosave to localStorage (every 5s)
  useEffect(() => {
    const id = setInterval(() => {
      try {
        savingRef.current = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
        savingRef.current = false;
        setTick((t) => t + 1);
      } catch {}
    }, 5000);
    return () => clearInterval(id);
  }, [form]);

  // Warn before unload
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const missingList = useMemo(() => {
    const list: string[] = [];
    if (!form.firstName) list.push("First Name");
    if (!form.lastName) list.push("Last Name");
    if (!form.dob) list.push("Date of Birth");
    if (!form.branch) list.push("Branch");
    if (!form.location) list.push("Location");
    if (
      !(
        form.primaryPhone ||
        form.emergency1.name ||
        form.emergency1.phonePrimary
      )
    ) {
      list.push("Primary Phone or Emergency Contact 1");
    }
    if (form.acceptedServices.length === 0)
      list.push("At least 1 service in Accepted Services");
    return list;
  }, [form]);

  const canSave = requiredProfileOk(form);

  const safeNavigateBack = () => {
    if (isDirty) {
      const ok = confirm(
        "You have unsaved changes. Do you want to leave without saving?"
      );
      if (!ok) return;
    }
    router.push("/individual");
  };

  const onSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    const ok = canSave;
    const msg = ok
      ? "Draft saved locally ✅"
      : `Draft saved locally ✅\n\nStill missing required fields:\n- ${missingList.join(
          "\n- "
        )}`;
    alert(msg);
    setDirty(false);
  };

  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  // NEW: Create Individual (call API)
  async function onCreateIndividual() {
    if (!requiredProfileOk(form)) {
      alert("Please complete required fields before creating the Individual.");
      return;
    }
    try {
      const res = await fetch("/api/individuals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json(); // { id, code }
      // clear local draft after successful creation
      localStorage.removeItem(STORAGE_KEY);
      alert(`Created successfully!\nID: ${data.id}\nCode: ${data.code}`);
      // TODO: navigate to detail page when it's ready
      // router.push(`/individual/${data.id}`);
      setDirty(false);
    } catch (e: any) {
      alert("Create failed: " + (e?.message || "Unknown error"));
    }
  }
  // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  /* =========================
     CLEAR BUTTON HANDLERS PER TAB
     ========================= */
  const clearProfileTab = () => {
    setForm((s) => ({
      ...s,
      firstName: "",
      middleName: "",
      lastName: "",
      dob: "",
      gender: "",
      ssn: "",
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
    }));
  };

  const clearBillingTab = () => {
    setForm((s) => ({
      ...s,
      billingPayers: [defaultPrimaryPayer()],
      billingSameAsPrimary: true,
      billingAddress1: "",
      billingAddress2: "",
      billingCity: "",
      billingState: "PA",
      billingZip: "",
      guardianName: "",
      guardianPhone: "",
      repPayeeName: "",
      repPayeePhone: "",
    }));
  };

  const clearClinicalTab = () => {
    setForm((s) => ({
      ...s,
      pcpName: "",
      pcpPhone: "",
      pcpFax: "",
      pcpNpi: "",
      pcpAddress: "",
      meds: [],
      allergies: "",
      dx: [],
    }));
  };

  const clearEquipmentTab = () => {
    const cleared: Record<string, any> = {
      priorityCode: "",
      mobility: "",
      equipOther: "",
    };
    [
      "Oxygen",
      "CPAP",
      "Ventilator",
      "IV Pump",
      "Syringe Pump",
      "Feeding Tube",
      "Nebulizer",
      "Wheelchair",
      "Hospital Bed",
    ].forEach((name) => {
      const key = `equip_${name.replace(/\s+/g, "_").toLowerCase()}`;
      cleared[key] = false;
    });
    setForm((s) => ({ ...s, ...cleared }));
  };

  const clearPreferencesTab = () => {
    const cleared: Record<string, any> = {
      prefTime: "",
      prefNotes: "",
      langPrimary: "",
      langSecondary: "",
      caregiverGender: "",
      prefOther: "",
      advType: "",
      advDateIn: "",
      advDateOut: "",
      advStatus: "",
      advPhysician: "",
      advAttach: "",
    };
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((d) => {
      cleared[`prefDay_${d}`] = false;
    });
    setForm((s) => ({ ...s, ...cleared }));
  };

  /* =========================
     HEADER
     ========================= */
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={safeNavigateBack}
            className="px-3 py-1 rounded-xl border border-bac-border bg-bac-bg hover:shadow"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-semibold">New Individual</h1>
        </div>

        <div className="flex items-center gap-2">
          {restorableDraft && (
            <button
              type="button"
              onClick={() => {
                setForm(restorableDraft);
                setRestorableDraft(null);
                setDirty(false);
              }}
              className="px-3 py-2 rounded-xl border border-bac-border bg-bac-bg text-sm hover:shadow"
              title="Restore last saved draft into this form"
            >
              Restore draft
            </button>
          )}
          <div className="mx-2 text-sm text-bac-muted">
            Autosave draft • tick {tick}
          </div>
          <button
            type="button"
            onClick={onSave}
            className="px-4 py-2 rounded-xl bg-bac-primary text-white hover:opacity-90"
          >
            Save
          </button>
          {/* NEW: Create Individual button */}
          <button
            type="button"
            onClick={onCreateIndividual}
            className="px-4 py-2 rounded-xl bg-bac-green text-white hover:opacity-90"
          >
            Create Individual
          </button>
        </div>
      </div>

      {/* Banner note */}
      <div className="rounded-xl border border-yellow-600/30 bg-yellow-500/10 px-4 py-3 text-sm">
        <span className="font-semibold">Required to complete at least: </span>
        First Name, Last Name, Date of Birth, Branch, Location, Primary Phone or
        Emergency Contact 1, At least 1 service in Accepted Services. You can
        still click <b>Save</b> to save as a draft.
      </div>

      {/* Tabs */}
      <div className="flex gap-3 border-b border-bac-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as TabKey)}
            className={
              "px-3 py-2 -mb-px border-b-2 " +
              (activeTab === t.key
                ? "border-white text-white"
                : "border-transparent text-bac-muted hover:text-white")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* =========================
          TAB 1 — PROFILE & CONTACTS
          ========================= */}
      {activeTab === "profile" && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Profile</h2>
            <button
              type="button"
              onClick={clearProfileTab}
              className="text-xs px-3 py-1 rounded-lg border border-bac-border bg-bac-bg hover:shadow"
            >
              Clear this tab
            </button>
          </div>

          {/* Basic / Demographics */}
          <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
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

              {/* DOB now uses native date input */}
              <Labeled label="Date of Birth" required>
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

              <Labeled label="SSN (last 4)">
                <SafeTextInput
                  type="text"
                  inputMode="numeric"
                  placeholder="Last 4 digits"
                  maxLength={4}
                  value={form.ssn}
                  onChange={(e) => {
                    const v = (e.target.value ?? "")
                      .replace(/\D/g, "")
                      .slice(0, 4);
                    setForm((s) => ({ ...s, ssn: v }));
                  }}
                />
              </Labeled>
            </div>
          </section>

          {/* Enrollment */}
          <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
            <h3 className="text-base font-semibold mb-3">Enrollment</h3>
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
            </div>
          </section>

          {/* Contacts */}
          <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
            <h3 className="text-base font-semibold mb-3">Contacts</h3>
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
            <h3 className="text-base font-semibold mb-3">Primary Address</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Address Line 1 + 2 */}
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

              {/* City + County + State + ZIP trên cùng một dòng */}
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
            <h3 className="text-base font-semibold mb-3">
              Accepted Services *
            </h3>
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
                          return { ...s, acceptedServices: Array.from(set) };
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
            <h3 className="text-base font-semibold mb-3">Emergency Contacts</h3>

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
                        emergency1: { ...s.emergency1, name: e.target.value },
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
                        emergency1: { ...s.emergency1, notes: e.target.value },
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
                        emergency2: { ...s.emergency2, name: e.target.value },
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
                        emergency2: { ...s.emergency2, notes: e.target.value },
                      }))
                    }
                  />
                </Labeled>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* =========================
          TAB 2 — COVERAGE & BILLING
          ========================= */}
      {activeTab === "billing" && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Coverage & Billing</h2>
            <button
              type="button"
              onClick={clearBillingTab}
              className="text-xs px-3 py-1 rounded-lg border border-bac-border bg-bac-bg hover:shadow"
            >
              Clear this tab
            </button>
          </div>

          {/* Insurance Payers */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-base font-semibold">Insurance Payers</h3>
              <button
                type="button"
                onClick={() =>
                  setForm((s) => {
                    const prev = ((s as any).billingPayers ?? []) as any[];
                    const normalized =
                      prev.length === 0 ? [defaultPrimaryPayer()] : prev;
                    return {
                      ...s,
                      billingPayers: [...normalized, defaultSecondaryPayer()],
                    } as any;
                  })
                }
                className="text-xs px-2 py-1 rounded-lg border border-bac-border bg-bac-bg hover:shadow"
              >
                + Add Secondary
              </button>
            </div>

            {((form as any).billingPayers || [defaultPrimaryPayer()]).map(
              (p: any, idx: number) => (
                <div
                  key={idx}
                  className="mb-4 rounded-xl border border-bac-border p-4 bg-bac-bg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium">
                      {p.type === "Primary"
                        ? "Primary Payer"
                        : "Secondary Payer"}
                    </div>
                    {p.type !== "Primary" && (
                      <button
                        type="button"
                        onClick={() =>
                          setForm((s) => {
                            const list = [
                              ...(((s as any).billingPayers ?? []) as any[]),
                            ];
                            list.splice(idx, 1);
                            return { ...(s as any), billingPayers: list };
                          })
                        }
                        className="text-xs px-2 py-1 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10"
                        aria-label="Remove this secondary payer"
                        title="Remove this secondary payer"
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
                          if (!payers[idx]) {
                            payers[idx] = { ...p, name: e.target.value ?? "" };
                          } else {
                            payers[idx] = {
                              ...payers[idx],
                              name: e.target.value,
                            };
                          }
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
                            payers[idx] = { ...p, notes: e.target.value ?? "" };
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
              )
            )}
          </section>

          {/* Authorization Summary */}
          <section>
            <h3 className="text-base font-semibold mb-3">
              Authorization (Summary)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-bac-border rounded-xl overflow-hidden">
                <thead className="bg-bac-bg">
                  <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
                    <th style={{ minWidth: 100 }}>Service Code</th>
                    <th style={{ minWidth: 180 }}>Description</th>
                    <th>Approved</th>
                    <th>Used</th>
                    <th>Start</th>
                    <th>End</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 text-bac-muted" colSpan={6}>
                      (Authorization rows UI to be implemented later)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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

      {/* =========================
          TAB 3 — CLINICAL & MEDICATION
          ========================= */}
      {activeTab === "clinical" && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Clinical & Medication</h2>
            <button
              type="button"
              onClick={clearClinicalTab}
              className="text-xs px-3 py-1 rounded-lg border border-bac-border bg-bac-bg hover:shadow"
            >
              Clear this tab
            </button>
          </div>

          {/* Physicians */}
          <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
            <h3 className="text-base font-semibold mb-3">
              Primary Care Physician
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Labeled label="Physician Name">
                <SafeTextInput
                  value={(form as any).pcpName ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({ ...(s as any), pcpName: e.target.value }))
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
                    setForm((s) => ({ ...(s as any), pcpFax: e.target.value }))
                  }
                />
              </Labeled>
              <Labeled label="NPI">
                <SafeTextInput
                  value={(form as any).pcpNpi ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({ ...(s as any), pcpNpi: e.target.value }))
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
                    const prev = ((s as any).meds ?? []) as any[];
                    const list = [
                      ...prev,
                      { name: "", dose: "", schedule: "" },
                    ];
                    return { ...(s as any), meds: list };
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
                  </tr>
                </thead>
                <tbody>
                  {(((form as any).meds as any[]) ?? []).length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-bac-muted" colSpan={3}>
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
                      </tr>
                    )
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
                  setForm((s) => ({ ...(s as any), allergies: e.target.value }))
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
                    const prev = ((s as any).dx ?? []) as any[];
                    const list = [
                      ...prev,
                      { icd: "", description: "", onset: "" },
                    ];
                    return { ...(s as any), dx: list };
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
                  </tr>
                </thead>
                <tbody>
                  {(((form as any).dx as any[]) ?? []).length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-bac-muted" colSpan={3}>
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
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* =========================
          TAB 4 — PREPAREDNESS & EQUIPMENT
          ========================= */}
      {activeTab === "equipment" && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Preparedness & Equipment</h2>
            <button
              type="button"
              onClick={clearEquipmentTab}
              className="text-xs px-3 py-1 rounded-lg border border-bac-border bg-bac-bg hover:shadow"
            >
              Clear this tab
            </button>
          </div>

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

      {/* =========================
          TAB 5 — PREFERENCES & DIRECTIVES
          ========================= */}
      {activeTab === "preferences" && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Preferences & Directives</h2>
            <button
              type="button"
              onClick={clearPreferencesTab}
              className="text-xs px-3 py-1 rounded-lg border border-bac-border bg-bac-bg hover:shadow"
            >
              Clear this tab
            </button>
          </div>

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
                    }
                  )}
                </div>
              </div>
              <Labeled label="Preferred Time Window">
                <SafeTextInput
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
                    setForm((s) => ({ ...(s as any), advType: e.target.value }))
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
    </div>
  );
}

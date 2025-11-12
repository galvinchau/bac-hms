"use client";

import React from "react";

/** Local inputs styled to match project dark theme */
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={
      "w-full mt-1 px-3 py-2 rounded-xl border border-bac-border bg-bac-panel " +
      (props.className || "")
    }
    autoComplete={props.autoComplete ?? "off"}
  />
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={
      "w-full mt-1 px-3 py-2 rounded-xl border border-bac-border bg-bac-panel " +
      (props.className || "")
    }
  />
);

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={
      "w-full mt-1 px-3 py-2 rounded-xl border border-bac-border bg-bac-panel " +
      (props.className || "")
    }
  />
);

const Section: React.FC<{ title: string; right?: React.ReactNode }> = ({
  title,
  right,
  children,
}) => (
  <section className="rounded-xl border border-bac-border p-4 bg-bac-bg">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-base font-semibold">{title}</h3>
      {right ? <div className="text-xs text-bac-muted">{right}</div> : null}
    </div>
    {children}
  </section>
);

const L: React.FC<{ label: string; className?: string }> = ({
  label,
  className,
  children,
}) => (
  <div className={className}>
    <label className="text-sm">{label}</label>
    {children}
  </div>
);

export default function ISPandBSP() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* ========== ISP LEFT ========== */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-bac-muted">
          ISP (Individual Support Plan)
        </h2>

        <Section title="General">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <L label="Plan Status">
              <Select defaultValue="Active">
                <option>Active</option>
                <option>Inactive</option>
                <option>Pending</option>
                <option>Closed</option>
              </Select>
            </L>
            <L label="Service Coordinator">
              <Select defaultValue="">
                <option value="">Select Coordinator</option>
                <option>ODP – Coordinator A</option>
                <option>ODP – Coordinator B</option>
              </Select>
            </L>
            <L label="Effective From">
              <Input type="date" />
            </L>
            <L label="Effective To">
              <Input type="date" />
            </L>
            <L label="Notes" className="md:col-span-2">
              <Textarea rows={3} placeholder="Optional notes…" />
            </L>
          </div>
        </Section>

        <Section
          title="Outcomes (auto-fill for Daily Notes)"
          right={
            <span>
              Only <b>Active</b> outcomes show in DSP Daily Note.
            </span>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <L
              label="Outcome Statement (required) – no character limit"
              className="md:col-span-2"
            >
              <Textarea
                rows={3}
                placeholder="Describe the outcome to guide DSP…"
              />
            </L>
            <div className="grid grid-cols-1 gap-4">
              <L label="Service (optional)">
                <Select defaultValue="">
                  <option value="">All Services</option>
                  <option value="HCSS">HCSS</option>
                  <option value="CH">Companion/Hab</option>
                  <option value="RESP">Respite</option>
                </Select>
              </L>
              <L label="Status">
                <Select defaultValue="Active">
                  <option>Active</option>
                  <option>Paused</option>
                  <option>Archived</option>
                </Select>
              </L>
            </div>
          </div>
          <div className="mt-3 text-xs text-bac-muted">
            * “Outcome Statement” is required and has no character limit.
          </div>
        </Section>

        <Section title="Authorized Services (Units & Alerts)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-bac-border rounded-xl overflow-hidden">
              <thead className="bg-bac-bg">
                <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
                  <th style={{ minWidth: 120 }}>Service</th>
                  <th>Contract Units (total)</th>
                  <th>Weekly Units (ISP)</th>
                  <th>Week-to-date Units (Actual)</th>
                  <th>Cum. Units Done (Actual)</th>
                  <th>Remaining</th>
                  <th style={{ minWidth: 120 }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {/* Placeholder row */}
                <tr className="border-t border-bac-border [&>td]:px-3 [&>td]:py-2">
                  <td>
                    <Select defaultValue="">
                      <option value="">Select…</option>
                      <option value="HCSS">HCSS</option>
                      <option value="CH">CH</option>
                      <option value="RESP">RESP</option>
                    </Select>
                  </td>
                  <td>
                    <Input placeholder="e.g. 520" inputMode="numeric" />
                  </td>
                  <td>
                    <Input placeholder="e.g. 20" inputMode="numeric" />
                  </td>
                  <td>
                    <Input placeholder="auto" disabled />
                  </td>
                  <td>
                    <Input placeholder="Initial actual" />
                  </td>
                  <td>
                    <Input placeholder="auto" disabled />
                  </td>
                  <td>
                    <Input placeholder="Stopped on MM/DD/YYYY …" />
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-bac-muted" colSpan={7}>
                    1 hour = 4 units. “Week” is Sun→Sat. Totals will
                    auto-compute when connected to Schedule/Daily Notes.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Health & Safety">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <L label="Allergies / Risks">
              <Textarea
                rows={2}
                placeholder="E.g., seizure risk, nut allergy…"
              />
            </L>
            <L label="Emergency Plan">
              <Textarea
                rows={2}
                placeholder="E.g., call 911, notify guardian…"
              />
            </L>
          </div>
        </Section>
      </div>

      {/* ========== BSP RIGHT ========== */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-bac-muted">
          BSP (Behavior Support Plan)
        </h2>

        <Section title="Overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <L label="Behaviors of Concern" className="md:col-span-2">
              <select
                multiple
                className="w-full mt-1 px-3 py-2 rounded-xl border border-bac-border bg-bac-panel h-28"
              >
                <option>Aggression</option>
                <option>Self-injury (SIB)</option>
                <option>Elopement</option>
                <option>Property Destruction</option>
                <option>Non-compliance</option>
              </select>
              <div className="text-xs text-bac-muted mt-1">
                Hold CTRL/CMD to select multiple.
              </div>
            </L>
            <L label="Frequency">
              <Select defaultValue="Daily">
                <option>Hourly</option>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </Select>
            </L>
            <L label="Severity">
              <Select defaultValue="Mild">
                <option>Mild</option>
                <option>Moderate</option>
                <option>Severe</option>
              </Select>
            </L>
            <L label="Function (optional)" className="md:col-span-2">
              <Select defaultValue="">
                <option value="">Select function</option>
                <option>Escape</option>
                <option>Attention</option>
                <option>Tangible</option>
                <option>Automatic / Sensory</option>
              </Select>
            </L>
          </div>
        </Section>

        <Section title="Triggers & Prevention">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <L label="Trigger">
              <Input placeholder="E.g., loud noise" />
            </L>
            <L label="Prevention Strategy">
              <Input placeholder="Provide headphones" />
            </L>
          </div>
        </Section>

        <Section title="Intervention Procedures">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <L label="Behavior">
              <Input placeholder="E.g., hitting" />
            </L>
            <L label="Staff Response / Procedure">
              <Input placeholder="Calm voice, redirect to task" />
            </L>
            <L label="Reinforcement / Follow-up">
              <Input placeholder="Reward when calm" />
            </L>
          </div>
        </Section>

        <Section title="Data & Team">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <L label="Data Collection Method">
              <Select defaultValue="ABC">
                <option value="ABC">
                  ABC (Antecedent–Behavior–Consequence)
                </option>
                <option value="Duration">Duration</option>
                <option value="Frequency">Frequency</option>
                <option value="Interval">Interval</option>
              </Select>
            </L>
            <L label="Responsible Staff / Team">
              <Input placeholder="Names or roles…" />
            </L>
          </div>
        </Section>

        <Section title="Attachments">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <L label="Files / Links">
              <Input placeholder="Link to PDF, Google Drive, etc." />
            </L>
            <L label="Notes">
              <Input placeholder="Short note…" />
            </L>
          </div>
        </Section>
      </div>
    </div>
  );
}

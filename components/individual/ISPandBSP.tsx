"use client";

import React from "react";
import {
  useIspBspForm,
  DEFAULT_ISP_BSP_FORM,
  type IspBspFormValues,
} from "./useIspBspForm";

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

/** ===== Behaviors of Concern options ===== */
const BOC_OPTIONS = [
  "Aggression",
  "Self-injury (SIB)",
  "Elopement",
  "Property Destruction",
  "Non-compliance",
  "Other…",
] as const;

type ISPandBSPProps = {
  individualId?: string;
};

export default function ISPandBSP({ individualId }: ISPandBSPProps) {
  const { data, loading, saving, error, success, save } =
    useIspBspForm(individualId);

  const [form, setForm] =
    React.useState<IspBspFormValues>(DEFAULT_ISP_BSP_FORM);

  // Khi data từ server về thì merge vào default
  React.useEffect(() => {
    if (data) {
      setForm((prev) => ({
        ...prev,
        ...data,
        behaviorsOfConcern: data.behaviorsOfConcern || [],
      }));
    } else {
      // nếu chưa có data trên server thì dùng default
      setForm(DEFAULT_ISP_BSP_FORM);
    }
  }, [data]);

  const handleChange =
    (field: keyof IspBspFormValues) =>
      (
        e:
          | React.ChangeEvent<HTMLInputElement>
          | React.ChangeEvent<HTMLTextAreaElement>
          | React.ChangeEvent<HTMLSelectElement>
      ) => {
        const value = e.target.value;
        setForm((prev) => ({
          ...prev,
          [field]: value,
        }));
      };

  const boc = form.behaviorsOfConcern || [];

  const toggleBoc = (label: string, checked: boolean) => {
    setForm((prev) => {
      const current = prev.behaviorsOfConcern || [];
      const s = new Set(current);
      if (checked) s.add(label);
      else s.delete(label);
      return {
        ...prev,
        behaviorsOfConcern: Array.from(s),
      };
    });
  };

  const otherChecked = boc.includes("Other…");

  const onSaveClick = () => {
    // nếu chưa có individualId thì không làm gì
    if (!individualId) return;
    save(form);
  };

  return (
    <div className="space-y-3">
      {/* Thanh trạng thái + nút Save */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="text-xs text-bac-muted min-h-[1.25rem]">
          {loading && "Loading ISP/BSP data…"}
          {!loading && saving && "Saving ISP/BSP data…"}

          {/* NEW INDIVIDUAL: chưa có id nên chỉ hiển thị hướng dẫn, không báo lỗi */}
          {!loading && !saving && !individualId && (
            <span>
              ISP &amp; BSP will be available after this Individual is created.
              Please create/save the Individual first, then open it again from
              “Search Individual”. Galvin!
            </span>
          )}

          {/* ĐÃ CÓ individualId: lúc này mới hiển thị error/success thật sự */}
          {!loading && !saving && individualId && error && (
            <span className="text-red-400">{error}</span>
          )}
          {!loading && !saving && individualId && !error && success && (
            <span className="text-green-400">{success}</span>
          )}
        </div>
        <button
          type="button"
          onClick={onSaveClick}
          disabled={!individualId || loading || saving}
          className="self-start md:self-auto px-4 py-2 rounded-xl text-sm font-medium bg-bac-primary text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save ISP & BSP"}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ========== ISP LEFT ========== */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide text-bac-muted">
            ISP (Individual Support Plan)
          </h2>

          <Section title="General">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <L label="Plan Status">
                <Select
                  value={form.planStatus}
                  onChange={handleChange("planStatus")}
                >
                  <option>Active</option>
                  <option>Inactive</option>
                  <option>Pending</option>
                  <option>Closed</option>
                </Select>
              </L>
              <L label="Service Coordinator">
                <Select
                  value={form.serviceCoordinator}
                  onChange={handleChange("serviceCoordinator")}
                >
                  <option value="">Select Coordinator</option>
                  <option>ODP – Coordinator A</option>
                  <option>ODP – Coordinator B</option>
                </Select>
              </L>
              <L label="Effective From">
                <Input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={handleChange("effectiveFrom")}
                />
              </L>
              <L label="Effective To">
                <Input
                  type="date"
                  value={form.effectiveTo}
                  onChange={handleChange("effectiveTo")}
                />
              </L>
              <L label="Notes" className="md:col-span-2">
                <Textarea
                  rows={3}
                  placeholder="Optional notes…"
                  value={form.generalNotes}
                  onChange={handleChange("generalNotes")}
                />
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
                  value={form.outcomeStatement}
                  onChange={handleChange("outcomeStatement")}
                />
              </L>
              <div className="grid grid-cols-1 gap-4">
                <L label="Service (optional)">
                  <Select
                    value={form.outcomeService}
                    onChange={handleChange("outcomeService")}
                  >
                    <option value="">All Services</option>
                    <option value="HCSS">HCSS</option>
                    <option value="CH">Companion/Hab</option>
                    <option value="RESP">Respite</option>
                  </Select>
                </L>
                <L label="Status">
                  <Select
                    value={form.outcomeStatus}
                    onChange={handleChange("outcomeStatus")}
                  >
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
                      <Select
                        value={form.authService}
                        onChange={handleChange("authService")}
                      >
                        <option value="">Select…</option>
                        <option value="HCSS">HCSS</option>
                        <option value="CH">CH</option>
                        <option value="RESP">RESP</option>
                      </Select>
                    </td>
                    <td>
                      <Input
                        placeholder="e.g. 520"
                        inputMode="numeric"
                        value={form.authContractUnits}
                        onChange={handleChange("authContractUnits")}
                      />
                    </td>
                    <td>
                      <Input
                        placeholder="e.g. 20"
                        inputMode="numeric"
                        value={form.authWeeklyUnits}
                        onChange={handleChange("authWeeklyUnits")}
                      />
                    </td>
                    <td>
                      <Input
                        placeholder="auto"
                        disabled
                        value={form.authWeekToDateUnits}
                        onChange={handleChange("authWeekToDateUnits")}
                      />
                    </td>
                    <td>
                      <Input
                        placeholder="Initial actual"
                        value={form.authCumUnitsDone}
                        onChange={handleChange("authCumUnitsDone")}
                      />
                    </td>
                    <td>
                      <Input
                        placeholder="auto"
                        disabled
                        value={form.authRemaining}
                        onChange={handleChange("authRemaining")}
                      />
                    </td>
                    <td>
                      <Input
                        placeholder="Stopped on MM/DD/YYYY …"
                        value={form.authNote}
                        onChange={handleChange("authNote")}
                      />
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
                  value={form.healthAllergiesRisks}
                  onChange={handleChange("healthAllergiesRisks")}
                />
              </L>
              <L label="Emergency Plan">
                <Textarea
                  rows={2}
                  placeholder="E.g., call 911, notify guardian…"
                  value={form.healthEmergencyPlan}
                  onChange={handleChange("healthEmergencyPlan")}
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
              {/* Behaviors of Concern */}
              <div className="md:col-span-2">
                <div className="text-sm">Behaviors of Concern</div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-y-2">
                  {BOC_OPTIONS.map((label) => {
                    const checked = boc.includes(label);
                    return (
                      <label
                        key={label}
                        className="inline-flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleBoc(label, e.target.checked)}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>

                {otherChecked && (
                  <div className="mt-3">
                    <L label="Other — please specify">
                      <Input
                        placeholder="Describe other behaviors…"
                        value={form.behaviorsOther}
                        onChange={handleChange("behaviorsOther")}
                      />
                    </L>
                  </div>
                )}

                <div className="text-xs text-bac-muted mt-2">
                  (Tick “Other…” to specify details.)
                </div>
              </div>

              <L label="Frequency">
                <Select
                  value={form.bspFrequency}
                  onChange={handleChange("bspFrequency")}
                >
                  <option>Hourly</option>
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </Select>
              </L>
              <L label="Severity">
                <Select
                  value={form.bspSeverity}
                  onChange={handleChange("bspSeverity")}
                >
                  <option>Mild</option>
                  <option>Moderate</option>
                  <option>Severe</option>
                </Select>
              </L>
              <L label="Function (optional)" className="md:col-span-2">
                <Select
                  value={form.bspFunction}
                  onChange={handleChange("bspFunction")}
                >
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
                <Input
                  placeholder="E.g., loud noise"
                  value={form.bspTrigger}
                  onChange={handleChange("bspTrigger")}
                />
              </L>
              <L label="Prevention Strategy">
                <Input
                  placeholder="Provide headphones"
                  value={form.bspPreventionStrategy}
                  onChange={handleChange("bspPreventionStrategy")}
                />
              </L>
            </div>
          </Section>

          <Section title="Intervention Procedures">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <L label="Behavior">
                <Input
                  placeholder="E.g., hitting"
                  value={form.bspBehavior}
                  onChange={handleChange("bspBehavior")}
                />
              </L>
              <L label="Staff Response / Procedure">
                <Input
                  placeholder="Calm voice, redirect to task"
                  value={form.bspStaffResponse}
                  onChange={handleChange("bspStaffResponse")}
                />
              </L>
              <L label="Reinforcement / Follow-up">
                <Input
                  placeholder="Reward when calm"
                  value={form.bspReinforcement}
                  onChange={handleChange("bspReinforcement")}
                />
              </L>
            </div>
          </Section>

          <Section title="Data & Team">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <L label="Data Collection Method">
                <Select
                  value={form.bspDataCollectionMethod}
                  onChange={handleChange("bspDataCollectionMethod")}
                >
                  <option value="ABC">
                    ABC (Antecedent–Behavior–Consequence)
                  </option>
                  <option value="Duration">Duration</option>
                  <option value="Frequency">Frequency</option>
                  <option value="Interval">Interval</option>
                </Select>
              </L>
              <L label="Responsible Staff / Team">
                <Input
                  placeholder="Names or roles…"
                  value={form.bspResponsibleStaff}
                  onChange={handleChange("bspResponsibleStaff")}
                />
              </L>
            </div>
          </Section>

          <Section title="Attachments">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <L label="Files / Links">
                <Input
                  placeholder="Link to PDF, Google Drive, etc."
                  value={form.attachmentsLink}
                  onChange={handleChange("attachmentsLink")}
                />
              </L>
              <L label="Notes">
                <Input
                  placeholder="Short note…"
                  value={form.attachmentsNotes}
                  onChange={handleChange("attachmentsNotes")}
                />
              </L>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

// bac-hms/web/components/house-management/tabs/ResidentsTab.tsx

"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import {
  renderCareRateBadge,
  renderResidentialTypeBadge,
  Badge,
  ResidentRow,
  SectionCard,
  StatCard,
} from "../shared";

type ResidentialPlacementType = "FULL_TIME_247" | "HOME_VISIT_SPLIT";
type BehaviorSupportLevel = "NONE" | "MODERATE" | "INTENSIVE";
type AppointmentLoad = "LOW" | "MODERATE" | "HIGH";

export type AvailableIndividualOption = {
  id: string;
  name: string;
  maNumber?: string | null;
  status?: string | null;
};

export type ResidentialProfilePayload = {
  residentialPlacementType: ResidentialPlacementType;
  homeVisitSchedule: string;
  housingCoverage: string;
  careRateTier: string;
  roomLabel: string;
  behaviorSupportLevel: BehaviorSupportLevel;
  appointmentLoad: AppointmentLoad;
};

type ResidentsTabProps = {
  selectedHouseName: string;
  residents: ResidentRow[];
  fullTime247Count: number;
  homeVisitSplitCount: number;
  highNeedCount: number;

  availableIndividuals?: AvailableIndividualOption[];
  assignBusy?: boolean;
  profileBusy?: boolean;
  removeBusyId?: string | null;

  onAssignResident?: (individualId: string) => Promise<void> | void;
  onRemoveResident?: (individualId: string) => Promise<void> | void;
  onUpdateResidentialProfile?: (
    individualId: string,
    payload: ResidentialProfilePayload
  ) => Promise<void> | void;
};

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-bac-border bg-bac-panel shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-bac-border px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-bac-text">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-bac-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text hover:bg-white/5"
          >
            Close
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <div className="text-sm font-medium text-bac-text">{label}</div>
      {children}
    </label>
  );
}

function inputClassName() {
  return "w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2.5 text-sm text-bac-text outline-none placeholder:text-bac-muted focus:border-bac-primary";
}

function getResidentResidentialPlacementType(
  resident: ResidentRow
): ResidentialPlacementType {
  if (resident.residentialType === "HOME_VISIT_SPLIT") return "HOME_VISIT_SPLIT";
  return "FULL_TIME_247";
}

function getResidentBehaviorSupportLevel(resident: ResidentRow): BehaviorSupportLevel {
  if (resident.behaviorSupportLevel === "INTENSIVE") return "INTENSIVE";
  if (resident.behaviorSupportLevel === "MODERATE") return "MODERATE";
  return "NONE";
}

function getResidentAppointmentLoad(resident: ResidentRow): AppointmentLoad {
  if (resident.appointmentLoad === "HIGH") return "HIGH";
  if (resident.appointmentLoad === "MODERATE") return "MODERATE";
  return "LOW";
}

export default function ResidentsTab({
  selectedHouseName,
  residents,
  fullTime247Count,
  homeVisitSplitCount,
  highNeedCount,
  availableIndividuals = [],
  assignBusy = false,
  profileBusy = false,
  removeBusyId = null,
  onAssignResident,
  onRemoveResident,
  onUpdateResidentialProfile,
}: ResidentsTabProps) {
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedAssignId, setSelectedAssignId] = useState("");
  const [assignError, setAssignError] = useState("");

  const [editingResident, setEditingResident] = useState<ResidentRow | null>(null);
  const [profileError, setProfileError] = useState("");

  const [profileForm, setProfileForm] = useState<ResidentialProfilePayload>({
    residentialPlacementType: "FULL_TIME_247",
    homeVisitSchedule: "",
    housingCoverage: "",
    careRateTier: "",
    roomLabel: "",
    behaviorSupportLevel: "NONE",
    appointmentLoad: "LOW",
  });

  const residentOptions = useMemo(() => {
    return availableIndividuals.filter(Boolean);
  }, [availableIndividuals]);

  useEffect(() => {
    if (!editingResident) return;

    setProfileForm({
      residentialPlacementType: getResidentResidentialPlacementType(editingResident),
      homeVisitSchedule: editingResident.homeVisitSchedule ?? "",
      housingCoverage: editingResident.housingCoverage ?? "",
      careRateTier: editingResident.careRateTier ?? "",
      roomLabel: editingResident.room ?? "",
      behaviorSupportLevel: getResidentBehaviorSupportLevel(editingResident),
      appointmentLoad: getResidentAppointmentLoad(editingResident),
    });
    setProfileError("");
  }, [editingResident]);

  async function handleAssignResident() {
    if (!selectedAssignId) {
      setAssignError("Please select an individual.");
      return;
    }

    setAssignError("");

    try {
      await onAssignResident?.(selectedAssignId);
      setAssignModalOpen(false);
      setSelectedAssignId("");
    } catch (error) {
      setAssignError(error instanceof Error ? error.message : "Failed to assign resident.");
    }
  }

  async function handleRemoveResident(individualId: string) {
    const confirmed = window.confirm(
      "Remove this resident from the current house?"
    );
    if (!confirmed) return;

    try {
      await onRemoveResident?.(individualId);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to remove resident.");
    }
  }

  async function handleSaveResidentialProfile() {
    if (!editingResident) return;

    if (!profileForm.homeVisitSchedule.trim()) {
      setProfileError("Home Visit Schedule is required.");
      return;
    }

    if (!profileForm.housingCoverage.trim()) {
      setProfileError("Housing Coverage is required.");
      return;
    }

    if (!profileForm.careRateTier.trim()) {
      setProfileError("Care Rate Tier is required.");
      return;
    }

    setProfileError("");

    try {
      await onUpdateResidentialProfile?.(editingResident.id, {
        residentialPlacementType: profileForm.residentialPlacementType,
        homeVisitSchedule: profileForm.homeVisitSchedule.trim(),
        housingCoverage: profileForm.housingCoverage.trim(),
        careRateTier: profileForm.careRateTier.trim(),
        roomLabel: profileForm.roomLabel.trim(),
        behaviorSupportLevel: profileForm.behaviorSupportLevel,
        appointmentLoad: profileForm.appointmentLoad,
      });
      setEditingResident(null);
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "Failed to update residential profile."
      );
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title={`Residents — ${selectedHouseName}`}
        subtitle="Residential roster with care model, housing status, home visits, meds, appointments, and behavior support."
        right={
          <button
            type="button"
            onClick={() => {
              setAssignError("");
              setAssignModalOpen(true);
            }}
            className="rounded-xl border border-bac-border bg-bac-bg px-4 py-2 text-sm text-bac-text hover:bg-white/5"
          >
            Assign Resident
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <StatCard label="Total Residents" value={residents.length} />
          <StatCard label="24/7 Full-Time" value={fullTime247Count} tone="violet" />
          <StatCard label="Home-Visit Split" value={homeVisitSplitCount} tone="sky" />
          <StatCard label="High Need" value={highNeedCount} tone="danger" />
          <StatCard label="Daily Med Users" value={residents.length} tone="success" />
          <StatCard
            label="Behavior Intensive"
            value={residents.filter((r) => r.behaviorSupportLevel === "INTENSIVE").length}
            tone="warning"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Resident Roster"
        subtitle="Designed for both single-resident homes and multi-resident house models."
      >
        <div className="overflow-x-auto">
          <table className="min-w-[1700px] w-full text-left text-sm">
            <thead className="border-b border-bac-border text-bac-muted">
              <tr>
                <th className="px-3 py-3">Resident</th>
                <th className="px-3 py-3">MA #</th>
                <th className="px-3 py-3">Room</th>
                <th className="px-3 py-3">Residential Type</th>
                <th className="px-3 py-3">Home Visit</th>
                <th className="px-3 py-3">Housing</th>
                <th className="px-3 py-3">Care Rate Tier</th>
                <th className="px-3 py-3">ISP</th>
                <th className="px-3 py-3">Risk</th>
                <th className="px-3 py-3">Behavior</th>
                <th className="px-3 py-3">Medication</th>
                <th className="px-3 py-3">Appointments</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bac-border">
              {residents.map((r) => (
                <tr key={r.id} className="text-bac-text">
                  <td className="px-3 py-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-bac-muted">{r.id}</div>
                  </td>
                  <td className="px-3 py-3">{r.maNumber}</td>
                  <td className="px-3 py-3">{r.room}</td>
                  <td className="px-3 py-3">{renderResidentialTypeBadge(r.residentialType)}</td>
                  <td className="px-3 py-3">{r.homeVisitSchedule}</td>
                  <td className="px-3 py-3">
                    <Badge variant="violet">{r.housingCoverage}</Badge>
                  </td>
                  <td className="px-3 py-3">{renderCareRateBadge(r.careRateTier)}</td>
                  <td className="px-3 py-3">
                    {r.ispStatus === "CURRENT" ? (
                      <Badge variant="success">Current</Badge>
                    ) : r.ispStatus === "DUE_SOON" ? (
                      <Badge variant="warning">Due Soon</Badge>
                    ) : (
                      <Badge variant="danger">Overdue</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {r.riskFlag === "HIGH" ? (
                      <Badge variant="danger">High</Badge>
                    ) : (
                      <Badge variant="muted">Standard</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {r.behaviorSupportLevel === "INTENSIVE" ? (
                      <Badge variant="danger">Intensive</Badge>
                    ) : r.behaviorSupportLevel === "MODERATE" ? (
                      <Badge variant="warning">Moderate</Badge>
                    ) : (
                      <Badge variant="muted">None</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {r.medProfile === "MULTIPLE_DAILY" ? (
                      <Badge variant="violet">Multiple Daily</Badge>
                    ) : (
                      <Badge variant="success">Daily</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {r.appointmentLoad === "HIGH" ? (
                      <Badge variant="warning">High</Badge>
                    ) : r.appointmentLoad === "MODERATE" ? (
                      <Badge variant="muted">Moderate</Badge>
                    ) : (
                      <Badge variant="success">Low</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {r.status === "ACTIVE" ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="muted">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingResident(r)}
                        className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm hover:bg-white/5"
                      >
                        Residential Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveResident(r.id)}
                        disabled={removeBusyId === r.id}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {removeBusyId === r.id ? "Removing..." : "Remove"}
                      </button>

                      <Link href={`/individual/${r.id}`}>
                        <button
                          type="button"
                          className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm hover:bg-white/5"
                        >
                          View
                        </button>
                      </Link>

                      <Link href={`/individual/${r.id}?tab=documents`}>
                        <button
                          type="button"
                          className="rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm hover:bg-white/5"
                        >
                          Documents
                        </button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {residents.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-3 py-10 text-center text-sm text-bac-muted">
                    No residents assigned to this house yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {assignModalOpen ? (
        <ModalShell
          title={`Assign Resident — ${selectedHouseName}`}
          subtitle="Choose an active individual to assign into this house."
          onClose={() => {
            setAssignModalOpen(false);
            setAssignError("");
            setSelectedAssignId("");
          }}
        >
          <div className="space-y-4">
            <Field label="Individual">
              <select
                value={selectedAssignId}
                onChange={(e) => setSelectedAssignId(e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select individual...</option>
                {residentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.maNumber ? ` — ${item.maNumber}` : ""}
                    {item.status ? ` (${item.status})` : ""}
                  </option>
                ))}
              </select>
            </Field>

            {assignError ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {assignError}
              </div>
            ) : null}

            {residentOptions.length === 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                No available individuals found for assignment.
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAssignModalOpen(false);
                  setAssignError("");
                  setSelectedAssignId("");
                }}
                className="rounded-xl border border-bac-border bg-bac-bg px-4 py-2 text-sm text-bac-text hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignResident}
                disabled={assignBusy}
                className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {assignBusy ? "Assigning..." : "Assign Resident"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {editingResident ? (
        <ModalShell
          title={`Residential Profile — ${editingResident.name}`}
          subtitle="Update residential placement and house-level care profile."
          onClose={() => {
            setEditingResident(null);
            setProfileError("");
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Residential Placement Type">
              <select
                value={profileForm.residentialPlacementType}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    residentialPlacementType: e.target.value as ResidentialPlacementType,
                  }))
                }
                className={inputClassName()}
              >
                <option value="FULL_TIME_247">FULL_TIME_247</option>
                <option value="HOME_VISIT_SPLIT">HOME_VISIT_SPLIT</option>
              </select>
            </Field>

            <Field label="Room Label">
              <input
                value={profileForm.roomLabel}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, roomLabel: e.target.value }))
                }
                className={inputClassName()}
                placeholder="Room A / Bedroom 2 / Main Floor"
              />
            </Field>

            <Field label="Home Visit Schedule">
              <input
                value={profileForm.homeVisitSchedule}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    homeVisitSchedule: e.target.value,
                  }))
                }
                className={inputClassName()}
                placeholder="Weekends / Fri-Sun / Twice monthly"
              />
            </Field>

            <Field label="Housing Coverage">
              <input
                value={profileForm.housingCoverage}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    housingCoverage: e.target.value,
                  }))
                }
                className={inputClassName()}
                placeholder="24/7 staffed / split support / overnight only"
              />
            </Field>

            <Field label="Care Rate Tier">
              <input
                value={profileForm.careRateTier}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    careRateTier: e.target.value,
                  }))
                }
                className={inputClassName()}
                placeholder="Tier 1 / Tier 2 / High Acuity"
              />
            </Field>

            <Field label="Behavior Support Level">
              <select
                value={profileForm.behaviorSupportLevel}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    behaviorSupportLevel: e.target.value as BehaviorSupportLevel,
                  }))
                }
                className={inputClassName()}
              >
                <option value="NONE">NONE</option>
                <option value="MODERATE">MODERATE</option>
                <option value="INTENSIVE">INTENSIVE</option>
              </select>
            </Field>

            <Field label="Appointment Load">
              <select
                value={profileForm.appointmentLoad}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    appointmentLoad: e.target.value as AppointmentLoad,
                  }))
                }
                className={inputClassName()}
              >
                <option value="LOW">LOW</option>
                <option value="MODERATE">MODERATE</option>
                <option value="HIGH">HIGH</option>
              </select>
            </Field>
          </div>

          {profileError ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {profileError}
            </div>
          ) : null}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingResident(null);
                setProfileError("");
              }}
              className="rounded-xl border border-bac-border bg-bac-bg px-4 py-2 text-sm text-bac-text hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveResidentialProfile}
              disabled={profileBusy}
              className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {profileBusy ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
// bac-hms/web/components/house-management/tabs/StaffingTab.tsx

"use client";

import React, { useMemo, useState } from "react";
import {
  RatioBox,
  SectionCard,
  StaffRow,
  StatCard,
  Badge,
  Modal,
} from "../shared";

type AvailableEmployeeRow = {
  id: string;
  name: string;
  role?: string;
  status?: string;
};

const HOUSE_ROLE_OPTIONS = [
  "DSP",
  "SUPERVISOR",
  "BEHAVIOR SPECIALIST",
  "MED CERTIFIED",
] as const;

type HouseRole = (typeof HOUSE_ROLE_OPTIONS)[number];

export default function StaffingTab({
  selectedHouseName,
  staff,
  specialistsCount,
  multiDspShiftCount,
  availableEmployees = [],
  availableEmployeesLoading = false,
  staffingSaving = false,
  onOpenAssignStaff,
  onAssignStaff,
  onRemoveStaff,
  onUpdateStaffRole,
}: {
  selectedHouseName: string;
  staff: StaffRow[];
  specialistsCount: number;
  multiDspShiftCount: number;
  availableEmployees?: AvailableEmployeeRow[];
  availableEmployeesLoading?: boolean;
  staffingSaving?: boolean;
  onOpenAssignStaff?: () => void;
  onAssignStaff?: (payload: {
    employeeId: string;
    houseRole: string;
    isPrimaryStaff: boolean;
  }) => Promise<void> | void;
  onRemoveStaff?: (employeeId: string) => Promise<void> | void;
  onUpdateStaffRole?: (payload: {
    employeeId: string;
    houseRole?: string;
    isPrimaryStaff?: boolean;
  }) => Promise<void> | void;
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [assignRole, setAssignRole] = useState<HouseRole>("DSP");
  const [assignPrimary, setAssignPrimary] = useState(false);

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [primaryDrafts, setPrimaryDrafts] = useState<Record<string, boolean>>({});

  const [confirmRemoveStaff, setConfirmRemoveStaff] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const sortedStaff = useMemo(() => {
    return [...staff].sort((a, b) => {
      const aPrimary = (a as StaffRow & { isPrimaryStaff?: boolean }).isPrimaryStaff ? 1 : 0;
      const bPrimary = (b as StaffRow & { isPrimaryStaff?: boolean }).isPrimaryStaff ? 1 : 0;
      if (aPrimary !== bPrimary) return bPrimary - aPrimary;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [staff]);

  const openAssignModal = () => {
    onOpenAssignStaff?.();
    setSelectedEmployeeId("");
    setAssignRole("DSP");
    setAssignPrimary(false);
    setAssignOpen(true);
  };

  const closeAssignModal = () => {
    if (staffingSaving) return;
    setAssignOpen(false);
  };

  const handleAssignSubmit = async () => {
    if (!selectedEmployeeId) return;
    await onAssignStaff?.({
      employeeId: selectedEmployeeId,
      houseRole: assignRole,
      isPrimaryStaff: assignPrimary,
    });
    setAssignOpen(false);
    setSelectedEmployeeId("");
    setAssignRole("DSP");
    setAssignPrimary(false);
  };

  const beginEdit = (row: StaffRow) => {
    const typedRow = row as StaffRow & { isPrimaryStaff?: boolean };
    setEditingRowId(row.id);
    setRoleDrafts((prev) => ({
      ...prev,
      [row.id]: String(row.role || "DSP").toUpperCase(),
    }));
    setPrimaryDrafts((prev) => ({
      ...prev,
      [row.id]: Boolean(typedRow.isPrimaryStaff),
    }));
  };

  const cancelEdit = () => {
    if (staffingSaving) return;
    setEditingRowId(null);
  };

  const saveEdit = async (employeeId: string) => {
    const nextRole = roleDrafts[employeeId] || "DSP";
    const nextPrimary = Boolean(primaryDrafts[employeeId]);

    await onUpdateStaffRole?.({
      employeeId,
      houseRole: nextRole,
      isPrimaryStaff: nextPrimary,
    });

    setEditingRowId(null);
  };

  const handleConfirmRemove = async () => {
    if (!confirmRemoveStaff) return;
    await onRemoveStaff?.(confirmRemoveStaff.id);
    setConfirmRemoveStaff(null);
  };

  const renderRoleBadge = (role: string) => {
    const normalized = String(role || "").toUpperCase();

    if (normalized.includes("SUPERVISOR")) {
      return <Badge variant="violet">Supervisor</Badge>;
    }

    if (normalized.includes("BEHAVIOR")) {
      return <Badge variant="warning">Behavior Specialist</Badge>;
    }

    if (normalized.includes("MED")) {
      return <Badge variant="sky">Med Certified</Badge>;
    }

    return <Badge variant="success">DSP</Badge>;
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title={`Staffing — ${selectedHouseName}`}
        subtitle="House coverage, multi-DSP shifts, specialty support, training readiness, and care intensity."
      >
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6 lg:flex-1">
            <StatCard label="Assigned Staff" value={staff.length} />
            <StatCard
              label="On Duty Now"
              value={staff.filter((s) => s.status === "ON_DUTY").length}
              tone="success"
            />
            <StatCard label="2+ DSP Shifts" value={multiDspShiftCount} tone="warning" />
            <StatCard label="Behavior Specialists" value={specialistsCount} tone="sky" />
            <StatCard
              label="Med-Cert Staff"
              value={staff.filter((s) => s.medCertified).length}
              tone="violet"
            />
            <StatCard
              label="Training Overdue"
              value={staff.filter((s) => s.trainingStatus === "OVERDUE").length}
              tone="danger"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={openAssignModal}
              className="inline-flex items-center rounded-xl bg-bac-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Assign Staff
            </button>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <SectionCard
          title="Staff Roster"
          subtitle="Assigned employees, specialists, certifications, and house-readiness."
          className="xl:col-span-8"
        >
          <div className="overflow-x-auto">
            <table className="min-w-[1320px] w-full text-left text-sm">
              <thead className="border-b border-bac-border text-bac-muted">
                <tr>
                  <th className="px-3 py-3">Employee</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Primary</th>
                  <th className="px-3 py-3">Shift Today</th>
                  <th className="px-3 py-3">Training</th>
                  <th className="px-3 py-3">Med Cert</th>
                  <th className="px-3 py-3">CPR</th>
                  <th className="px-3 py-3">Driver</th>
                  <th className="px-3 py-3">Clearance</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bac-border">
                {sortedStaff.map((s) => {
                  const typedRow = s as StaffRow & { isPrimaryStaff?: boolean };
                  const isEditing = editingRowId === s.id;

                  return (
                    <tr key={s.id} className="text-bac-text">
                      <td className="px-3 py-3">
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-bac-muted">{s.id}</div>
                      </td>

                      <td className="px-3 py-3">
                        {isEditing ? (
                          <select
                            value={roleDrafts[s.id] || String(s.role || "DSP").toUpperCase()}
                            onChange={(e) =>
                              setRoleDrafts((prev) => ({
                                ...prev,
                                [s.id]: e.target.value,
                              }))
                            }
                            className="w-[190px] rounded-lg border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text outline-none"
                          >
                            {HOUSE_ROLE_OPTIONS.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        ) : (
                          renderRoleBadge(String(s.role || "DSP"))
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {isEditing ? (
                          <label className="inline-flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={Boolean(primaryDrafts[s.id])}
                              onChange={(e) =>
                                setPrimaryDrafts((prev) => ({
                                  ...prev,
                                  [s.id]: e.target.checked,
                                }))
                              }
                            />
                            <span>Primary</span>
                          </label>
                        ) : typedRow.isPrimaryStaff ? (
                          <Badge variant="violet">Primary</Badge>
                        ) : (
                          <Badge variant="muted">No</Badge>
                        )}
                      </td>

                      <td className="px-3 py-3">{s.shiftToday || "-"}</td>

                      <td className="px-3 py-3">
                        {s.trainingStatus === "CURRENT" ? (
                          <Badge variant="success">Current</Badge>
                        ) : s.trainingStatus === "DUE_SOON" ? (
                          <Badge variant="warning">Due Soon</Badge>
                        ) : (
                          <Badge variant="danger">Overdue</Badge>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {s.medCertified ? (
                          <Badge variant="success">Yes</Badge>
                        ) : (
                          <Badge variant="danger">No</Badge>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {s.cpr === "CURRENT" ? (
                          <Badge variant="success">Current</Badge>
                        ) : (
                          <Badge variant="danger">Expired</Badge>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {s.driver === "ACTIVE" ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="muted">Inactive</Badge>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {s.clearance === "CURRENT" ? (
                          <Badge variant="success">Current</Badge>
                        ) : (
                          <Badge variant="danger">Expired</Badge>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {s.status === "ON_DUTY" ? (
                          <Badge variant="violet">On Duty</Badge>
                        ) : (
                          <Badge variant="muted">Off Duty</Badge>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => saveEdit(s.id)}
                                disabled={staffingSaving}
                                className="rounded-lg bg-bac-primary px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={staffingSaving}
                                className="rounded-lg border border-bac-border px-3 py-2 text-xs font-semibold text-bac-text transition hover:bg-bac-bg disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => beginEdit(s)}
                                disabled={staffingSaving}
                                className="rounded-lg border border-bac-border px-3 py-2 text-xs font-semibold text-bac-text transition hover:bg-bac-bg disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Edit Role
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmRemoveStaff({
                                    id: s.id,
                                    name: s.name,
                                  })
                                }
                                disabled={staffingSaving}
                                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {sortedStaff.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-3 py-10 text-center text-sm text-bac-muted">
                      No staff assigned to this house yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Coverage & Intensity"
          subtitle="Coverage health for shared houses and high-need residents."
          className="xl:col-span-4"
        >
          <div className="space-y-3">
            <RatioBox label="Current House Ratio" value="2 DSP : 3 Residents" status="GOOD" />
            <RatioBox
              label="High-Need Shift Coverage"
              value="3 DSP : 1 Resident overnight"
              status="WARNING"
            />
            <RatioBox
              label="Medication-Capable Coverage"
              value="Available on all core shifts"
              status="GOOD"
            />
            <RatioBox
              label="Behavior Specialist Access"
              value="1 specialist visit today"
              status="GOOD"
            />
            <RatioBox
              label="Weekend Backup Depth"
              value="Needs one more trained DSP"
              status="CRITICAL"
            />
          </div>
        </SectionCard>
      </div>

      <Modal
        open={assignOpen}
        title="Assign Staff"
        onClose={closeAssignModal}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-bac-text">
              Employee
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-3 text-sm text-bac-text outline-none"
              disabled={availableEmployeesLoading || staffingSaving}
            >
              <option value="">
                {availableEmployeesLoading ? "Loading employees..." : "Select employee"}
              </option>
              {availableEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} {employee.role ? `• ${employee.role}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-bac-text">
              House Role
            </label>
            <select
              value={assignRole}
              onChange={(e) => setAssignRole(e.target.value as HouseRole)}
              className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-3 text-sm text-bac-text outline-none"
              disabled={staffingSaving}
            >
              {HOUSE_ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <label className="inline-flex items-center gap-3 text-sm text-bac-text">
            <input
              type="checkbox"
              checked={assignPrimary}
              onChange={(e) => setAssignPrimary(e.target.checked)}
              disabled={staffingSaving}
            />
            <span>Set as primary staff for this house</span>
          </label>

          {!availableEmployeesLoading && availableEmployees.length === 0 && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
              No available employees found.
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={closeAssignModal}
            disabled={staffingSaving}
            className="rounded-xl border border-bac-border px-4 py-2 text-sm font-semibold text-bac-text transition hover:bg-bac-bg disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAssignSubmit}
            disabled={!selectedEmployeeId || staffingSaving}
            className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {staffingSaving ? "Saving..." : "Assign Staff"}
          </button>
        </div>
      </Modal>

      <Modal
        open={!!confirmRemoveStaff}
        title="Remove Staff"
        onClose={() => {
          if (staffingSaving) return;
          setConfirmRemoveStaff(null);
        }}
      >
        <div className="text-sm text-bac-muted">
          Are you sure you want to remove{" "}
          <span className="font-semibold text-bac-text">
            {confirmRemoveStaff?.name || "this staff"}
          </span>{" "}
          from <span className="font-semibold text-bac-text">{selectedHouseName}</span>?
          <br />
          <br />
          This action will remove the employee from the current house roster.
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmRemoveStaff(null)}
            disabled={staffingSaving}
            className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmRemove}
            disabled={staffingSaving}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {staffingSaving ? "Removing..." : "Remove Staff"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
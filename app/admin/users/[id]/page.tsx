// app/admin/users/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Role = { id: string; code: string; name: string };
type Privilege = { id: string; code: string; name: string };
type Supervisor = { id: string; code: string; name: string };

type Lookups = {
  roles: Role[];
  privileges: Privilege[];
  supervisors: Supervisor[];
};

type LoadedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  locked: boolean;
  userType: string;
  roles: Role[];
  privileges: Privilege[];
  supervisors: Supervisor[];
};

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params.id;

  // form fields
  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [locked, setLocked] = useState(false);
  const [userType, setUserType] = useState("ADMIN");

  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [assignedRoleIds, setAssignedRoleIds] = useState<string[]>([]);
  const [assignedPrivilegeIds, setAssignedPrivilegeIds] = useState<string[]>(
    []
  );
  const [assignedSupervisorIds, setAssignedSupervisorIds] = useState<string[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // helpers
  function assignItem(current: string[], id: string): string[] {
    if (current.includes(id)) return current;
    return [...current, id];
  }
  function unassignItem(current: string[], id: string): string[] {
    return current.filter((x) => x !== id);
  }

  // load lookups + user
  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true);
        setError(null);

        const [lkRes, userRes] = await Promise.all([
          fetch("/api/admin/user-lookups"),
          fetch(`/api/admin/users/${userId}`),
        ]);

        if (!lkRes.ok) throw new Error("Failed to load lookups");
        if (!userRes.ok) {
          const txt = await userRes.text();
          throw new Error(txt || "Failed to load user");
        }

        const lkData: Lookups = await lkRes.json();
        const userData: LoadedUser = await userRes.json();

        setLookups(lkData);

        setEmail(userData.email);
        setEmailConfirm(userData.email);
        setFirstName(userData.firstName);
        setLastName(userData.lastName);
        setLocked(userData.locked);
        setUserType(userData.userType || "ADMIN");

        setAssignedRoleIds(userData.roles.map((r) => r.id));
        setAssignedPrivilegeIds(userData.privileges.map((p) => p.id));
        setAssignedSupervisorIds(userData.supervisors.map((s) => s.id));
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load data.");
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      loadAll();
    }
  }, [userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !emailConfirm || !firstName || !lastName) {
      setError("Please fill all required fields.");
      return;
    }
    if (email !== emailConfirm) {
      setError("Username/Email confirmation does not match.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          locked,
          userType,
          roleIds: assignedRoleIds,
          privilegeIds: assignedPrivilegeIds,
          supervisorIds: assignedSupervisorIds,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update user");
      }

      setSuccess("User updated successfully.");
      setTimeout(() => {
        router.push("/admin/users");
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update user.");
    } finally {
      setSaving(false);
    }
  }

  const availableRoles =
    lookups?.roles.filter((r) => !assignedRoleIds.includes(r.id)) ?? [];
  const assignedRoles =
    lookups?.roles.filter((r) => assignedRoleIds.includes(r.id)) ?? [];

  const availablePrivileges =
    lookups?.privileges.filter((p) => !assignedPrivilegeIds.includes(p.id)) ??
    [];
  const assignedPrivileges =
    lookups?.privileges.filter((p) => assignedPrivilegeIds.includes(p.id)) ??
    [];

  const availableSupervisors =
    lookups?.supervisors.filter((s) => !assignedSupervisorIds.includes(s.id)) ??
    [];
  const assignedSupervisors =
    lookups?.supervisors.filter((s) => assignedSupervisorIds.includes(s.id)) ??
    [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Modify User</h1>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-bac-green bg-bac-green/10 px-3 py-2 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Username / Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-bac-muted uppercase">
              Username/Email *
            </label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm"
              placeholder="Enter Username/Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-bac-muted uppercase">
              Username/Email Confirmation *
            </label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm"
              placeholder="Confirm Username/Email"
              value={emailConfirm}
              onChange={(e) => setEmailConfirm(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        {/* Last / First / Locked / UserType */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-bac-muted uppercase">
              Last Name *
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-bac-muted uppercase">
              First Name *
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="text-xs font-semibold text-bac-muted uppercase">
              Locked
            </label>
            <div className="flex items-center gap-2 mt-1">
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={locked}
                  onChange={(e) => setLocked(e.target.checked)}
                />
                <span>Lock account</span>
              </label>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-bac-muted uppercase">
              User Type
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm"
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="COORDINATOR">COORDINATOR</option>
              <option value="DSP">DSP</option>
              <option value="STAFF">STAFF</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-bac-muted">Loading data...</div>
        ) : (
          <>
            {/* ROLES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-bac-muted uppercase mb-1">
                  Available Roles
                </div>
                <div className="rounded-xl border border-bac-border bg-bac-panel max-h-60 overflow-auto text-sm">
                  {availableRoles.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between px-3 py-1 border-b border-bac-border/40 last:border-b-0"
                    >
                      <span>{r.code}</span>
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() =>
                          setAssignedRoleIds((prev) => assignItem(prev, r.id))
                        }
                      >
                        &gt;&gt;
                      </button>
                    </div>
                  ))}
                  {availableRoles.length === 0 && (
                    <div className="px-3 py-2 text-xs text-bac-muted">
                      No more roles.
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-bac-muted uppercase mb-1">
                  Assigned Roles
                </div>
                <div className="rounded-xl border border-bac-border bg-bac-panel max-h-60 overflow-auto text-sm">
                  {assignedRoles.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between px-3 py-1 border-b border-bac-border/40 last:border-b-0"
                    >
                      <span>{r.code}</span>
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() =>
                          setAssignedRoleIds((prev) => unassignItem(prev, r.id))
                        }
                      >
                        &lt;&lt;
                      </button>
                    </div>
                  ))}
                  {assignedRoles.length === 0 && (
                    <div className="px-3 py-2 text-xs text-bac-muted">
                      No roles assigned.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PRIVILEGES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-bac-muted uppercase mb-1">
                  Available Privileges
                </div>
                <div className="rounded-xl border border-bac-border bg-bac-panel max-h-72 overflow-auto text-xs">
                  {availablePrivileges.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-3 py-1 border-b border-bac-border/40 last:border-b-0"
                    >
                      <span>{p.name}</span>
                      <button
                        type="button"
                        className="text-[11px] underline"
                        onClick={() =>
                          setAssignedPrivilegeIds((prev) =>
                            assignItem(prev, p.id)
                          )
                        }
                      >
                        &gt;&gt;
                      </button>
                    </div>
                  ))}
                  {availablePrivileges.length === 0 && (
                    <div className="px-3 py-2 text-xs text-bac-muted">
                      No more privileges.
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-bac-muted uppercase mb-1">
                  Assigned Privileges
                </div>
                <div className="rounded-xl border border-bac-border bg-bac-panel max-h-72 overflow-auto text-xs">
                  {assignedPrivileges.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-3 py-1 border-b border-bac-border/40 last:border-b-0"
                    >
                      <span>{p.name}</span>
                      <button
                        type="button"
                        className="text-[11px] underline"
                        onClick={() =>
                          setAssignedPrivilegeIds((prev) =>
                            unassignItem(prev, p.id)
                          )
                        }
                      >
                        &lt;&lt;
                      </button>
                    </div>
                  ))}
                  {assignedPrivileges.length === 0 && (
                    <div className="px-3 py-2 text-xs text-bac-muted">
                      No privileges assigned.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SUPERVISORS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-bac-muted uppercase mb-1">
                  Available Supervisors
                </div>
                <div className="rounded-xl border border-bac-border bg-bac-panel max-h-60 overflow-auto text-sm">
                  {availableSupervisors.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between px-3 py-1 border-b border-bac-border/40 last:border-b-0"
                    >
                      <span>
                        {s.code} - {s.name}
                      </span>
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() =>
                          setAssignedSupervisorIds((prev) =>
                            assignItem(prev, s.id)
                          )
                        }
                      >
                        &gt;&gt;
                      </button>
                    </div>
                  ))}
                  {availableSupervisors.length === 0 && (
                    <div className="px-3 py-2 text-xs text-bac-muted">
                      No more supervisors.
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-bac-muted uppercase mb-1">
                  Assigned Supervisors
                </div>
                <div className="rounded-xl border border-bac-border bg-bac-panel max-h-60 overflow-auto text-sm">
                  {assignedSupervisors.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between px-3 py-1 border-b border-bac-border/40 last:border-b-0"
                    >
                      <span>
                        {s.code} - {s.name}
                      </span>
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() =>
                          setAssignedSupervisorIds((prev) =>
                            unassignItem(prev, s.id)
                          )
                        }
                      >
                        &lt;&lt;
                      </button>
                    </div>
                  ))}
                  {assignedSupervisors.length === 0 && (
                    <div className="px-3 py-2 text-xs text-bac-muted">
                      No supervisors assigned.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="px-4 py-2 rounded-xl border border-bac-border text-sm"
            onClick={() => router.push("/admin/users")}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-bac-primary text-white text-sm font-medium disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving..." : "SAVE CHANGES"}
          </button>
        </div>
      </form>
    </div>
  );
}

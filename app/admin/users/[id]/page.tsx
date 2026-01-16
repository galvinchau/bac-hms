// app/admin/users/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Privilege = { id: string; code: string; name: string };
type Supervisor = { id: string; code: string; name: string };
type UserTypeLookup = { code: string; name: string; description?: string };

type Lookups = {
  privileges: Privilege[];
  supervisors: Supervisor[];
  userTypes?: UserTypeLookup[];
};

type LoadedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  locked: boolean;
  userType: string;
  privileges: Privilege[];
  supervisors: Supervisor[];
};

const FALLBACK_USER_TYPES: UserTypeLookup[] = [
  { code: "ADMIN", name: "Admin" },
  { code: "COORDINATOR", name: "Coordinator" },
  { code: "OFFICE", name: "Office" },
  { code: "DSP", name: "DSP" },
  { code: "HR", name: "HR" },
];

// legacy UI normalization
function normalizeUserTypeUi(input: string): string {
  if (input === "STAFF") return "OFFICE";
  return input || "ADMIN";
}

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
  const [assignedPrivilegeIds, setAssignedPrivilegeIds] = useState<string[]>(
    []
  );
  const [assignedSupervisorIds, setAssignedSupervisorIds] = useState<string[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ✅ NEW: deleting state
  const [deleting, setDeleting] = useState(false);

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
        setUserType(normalizeUserTypeUi(userData.userType || "ADMIN"));

        setAssignedPrivilegeIds(userData.privileges.map((p) => p.id));
        setAssignedSupervisorIds(userData.supervisors.map((s) => s.id));
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load data.");
      } finally {
        setLoading(false);
      }
    }

    if (userId) loadAll();
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
          userType: normalizeUserTypeUi(userType),
          privilegeIds: assignedPrivilegeIds,
          supervisorIds: assignedSupervisorIds,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update user");
      }

      setSuccess("User updated successfully.");
      setTimeout(() => router.push("/admin/users"), 800);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update user.");
    } finally {
      setSaving(false);
    }
  }

  // ✅ NEW: delete handler
  async function handleDelete() {
    setError(null);
    setSuccess(null);

    if (!userId) return;

    const ok = window.confirm(
      `Delete this user?\n\nUsername/Email: ${email}\n\nThis action cannot be undone.`
    );
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setError(data?.error || "Failed to delete user.");
        return;
      }

      setSuccess("User deleted successfully.");
      setTimeout(() => router.push("/admin/users"), 500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to delete user.");
    } finally {
      setDeleting(false);
    }
  }

  const userTypeOptions = useMemo(() => {
    const list = lookups?.userTypes?.length
      ? lookups.userTypes
      : FALLBACK_USER_TYPES;
    return list
      .filter((x) => x.code !== "STAFF")
      .map((x) => ({ ...x, code: normalizeUserTypeUi(x.code) }));
  }, [lookups]);

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

        {/* ✅ NEW: Delete button (top-right) */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading || saving || deleting}
          className="px-4 py-2 rounded-xl border border-red-500/60 text-red-200 text-sm hover:bg-red-500/10 disabled:opacity-60"
          title="Delete user"
        >
          {deleting ? "Deleting..." : "DELETE USER"}
        </button>
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
              value={emailConfirm}
              onChange={(e) => setEmailConfirm(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        {/* Name / Locked / UserType */}
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
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={locked}
                onChange={(e) => setLocked(e.target.checked)}
              />
              <span>Lock account</span>
            </label>
          </div>
          <div>
            <label className="text-xs font-semibold text-bac-muted uppercase">
              User Type
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm"
              value={normalizeUserTypeUi(userType)}
              onChange={(e) => setUserType(normalizeUserTypeUi(e.target.value))}
            >
              {userTypeOptions.map((ut) => (
                <option key={ut.code} value={ut.code}>
                  {ut.code}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-bac-muted">
              User Type controls system access (menus + API).
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-bac-muted">Loading data...</div>
        ) : (
          <>
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
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="px-4 py-2 rounded-xl border border-bac-border text-sm"
            onClick={() => router.push("/admin/users")}
            disabled={saving || deleting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-bac-primary text-white text-sm font-medium disabled:opacity-60"
            disabled={saving || deleting}
          >
            {saving ? "Saving..." : "SAVE CHANGES"}
          </button>
        </div>
      </form>
    </div>
  );
}

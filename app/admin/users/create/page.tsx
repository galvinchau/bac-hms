// app/admin/users/create/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Role = {
  id: string;
  code: string;
  name: string;
};

type Privilege = {
  id: string;
  code: string;
  name: string;
};

type Supervisor = {
  id: string;
  code: string;
  name: string;
};

type Lookups = {
  roles: Role[];
  privileges: Privilege[];
  // supervisors vẫn có thể trả về từ API nhưng ta không dùng nữa
  supervisors?: Supervisor[];
};

type EnsurePrivilege = {
  code: string;
  name: string; // display label
};

const REQUIRED_PRIVILEGES: EnsurePrivilege[] = [
  // Medication
  { code: "MEDICATION_VIEW", name: "Medication - View" },
  { code: "MEDICATION_WRITE", name: "Medication - Add/Update" },

  // Employees
  { code: "EMPLOYEES_VIEW", name: "Employees - View" },
  { code: "EMPLOYEES_WRITE", name: "Employees - Add/Update" },

  // Services
  { code: "SERVICES_VIEW", name: "Services - View" },
  { code: "SERVICES_WRITE", name: "Services - Add/Update" },

  // Programs
  { code: "PROGRAMS_VIEW", name: "Programs - View" },
  { code: "PROGRAMS_WRITE", name: "Programs - Add/Update" },

  // FireDrill
  { code: "FIREDRILL_VIEW", name: "FireDrill - View" },
  { code: "FIREDRILL_WRITE", name: "FireDrill - Add/Update" },

  // Authorizations
  { code: "AUTHORIZATIONS_VIEW", name: "Authorizations - View" },
  { code: "AUTHORIZATIONS_WRITE", name: "Authorizations - Add/Update" },
];

function norm(s?: string | null) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

export default function CreateUserPage() {
  const router = useRouter();

  // Form fields
  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [locked, setLocked] = useState(false);
  const [userType, setUserType] = useState("ADMIN");

  // Lookups
  const [lookups, setLookups] = useState<Lookups | null>(null);

  // Assigned ids
  const [assignedRoleIds, setAssignedRoleIds] = useState<string[]>([]);
  const [assignedPrivilegeIds, setAssignedPrivilegeIds] = useState<string[]>(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Extra helper states (non-blocking)
  const [ensuring, setEnsuring] = useState(false);
  const [ensureNote, setEnsureNote] = useState<string | null>(null);

  async function fetchLookups(): Promise<Lookups> {
    const r = await fetch("/api/admin/user-lookups", { cache: "no-store" });
    if (!r.ok) throw new Error("Failed to load lookups");
    return (await r.json()) as Lookups;
  }

  function privilegeExists(all: Privilege[], wanted: EnsurePrivilege) {
    const wCode = norm(wanted.code);
    const wName = norm(wanted.name);
    return all.some((p) => norm(p.code) === wCode || norm(p.name) === wName);
  }

  // Ensure missing privileges exist in DB (best-effort)
  async function ensureRequiredPrivileges(existing: Privilege[]) {
    const missing = REQUIRED_PRIVILEGES.filter(
      (rp) => !privilegeExists(existing, rp),
    );

    if (missing.length === 0) {
      setEnsureNote(null);
      return;
    }

    setEnsuring(true);
    setEnsureNote(`Adding missing privileges: ${missing.length} ...`);

    try {
      // Best-effort create
      for (const m of missing) {
        // Assumption: POST /api/admin/privileges accepts { code, name }
        const res = await fetch("/api/admin/privileges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: m.code, name: m.name }),
        });

        // If API already has it or rejects duplicates, we ignore quietly
        if (!res.ok) {
          // Try to read error, but do not block page
          const msg = await res.text().catch(() => "");
          console.warn("[ensure privileges] create failed", {
            code: m.code,
            name: m.name,
            status: res.status,
            msg,
          });
        }
      }

      setEnsureNote("Missing privileges were ensured (refreshing list) ...");
    } catch (e) {
      console.warn("[ensure privileges] error", e);
      setEnsureNote(
        "Warning: could not auto-create some privileges. Please ask Admin/IT to add them.",
      );
    } finally {
      setEnsuring(false);
    }
  }

  // Load lookups when entering page
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      setEnsureNote(null);

      try {
        const data = await fetchLookups();

        if (cancelled) return;
        setLookups(data);

        // ✅ Ensure additional privileges exist (best-effort)
        await ensureRequiredPrivileges(data.privileges);

        // refetch after ensure (so new privileges appear)
        const data2 = await fetchLookups();
        if (cancelled) return;
        setLookups(data2);
        setEnsureNote(null);
      } catch (err: any) {
        console.error(err);
        if (!cancelled) setError("Failed to load lookups.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Helper: move item from available -> assigned
  function assignItem(current: string[], id: string): string[] {
    if (current.includes(id)) return current;
    return [...current, id];
  }

  // Helper: remove item from assigned
  function unassignItem(current: string[], id: string): string[] {
    return current.filter((x) => x !== id);
  }

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
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          locked,
          userType,
          roleIds: assignedRoleIds,
          privilegeIds: assignedPrivilegeIds,
          // supervisorIds bỏ hẳn, vì ta không dùng supervisor ở màn này nữa
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create user");
      }

      setSuccess("User created successfully.");
      // After 1s go back to Manage Users
      setTimeout(() => {
        router.push("/admin/users");
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create user.");
    } finally {
      setSaving(false);
    }
  }

  // ====== FILTER ROLES: remove DSP from Available / Assigned ======
  const allRoles = lookups?.roles ?? [];
  const rolesWithoutDSP = allRoles.filter((r) => r.code !== "DSP");

  const availableRoles =
    rolesWithoutDSP.filter((r) => !assignedRoleIds.includes(r.id)) ?? [];
  const assignedRoles =
    rolesWithoutDSP.filter((r) => assignedRoleIds.includes(r.id)) ?? [];

  const availablePrivileges =
    lookups?.privileges.filter((p) => !assignedPrivilegeIds.includes(p.id)) ??
    [];
  const assignedPrivileges =
    lookups?.privileges.filter((p) => assignedPrivilegeIds.includes(p.id)) ??
    [];

  // Optional: sort privileges A-Z by name for easier selection
  const availablePrivilegesSorted = useMemo(() => {
    return [...availablePrivileges].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [availablePrivileges]);

  const assignedPrivilegesSorted = useMemo(() => {
    return [...assignedPrivileges].sort((a, b) => a.name.localeCompare(b.name));
  }, [assignedPrivileges]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Create User</h1>
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

      {ensureNote && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100">
          {ensureNote}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row: Username / Email */}
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

        {/* Row: Last / First / Locked / UserType */}
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
              <option value="STAFF">STAFF</option>
              {/* Không cho chọn DSP ở đây nữa */}
            </select>
          </div>
        </div>

        {/* Lookups loading */}
        {loading ? (
          <div className="text-sm text-bac-muted">Loading lookups...</div>
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
                <div className="rounded-xl border border-bac-border bg-bac-panel max-h-[520px] overflow-auto text-xs">
                  {availablePrivilegesSorted.map((p) => (
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
                            assignItem(prev, p.id),
                          )
                        }
                      >
                        &gt;&gt;
                      </button>
                    </div>
                  ))}
                  {availablePrivilegesSorted.length === 0 && (
                    <div className="px-3 py-2 text-xs text-bac-muted">
                      No more privileges.
                    </div>
                  )}
                </div>

                {/* Optional helper */}
                <div className="mt-1 text-[11px] text-bac-muted">
                  {ensuring
                    ? "Ensuring privileges..."
                    : "Tip: Privileges are sorted A–Z by name."}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-bac-muted uppercase mb-1">
                  Assigned Privileges
                </div>
                <div className="rounded-xl border border-bac-border bg-bac-panel max-h-[520px] overflow-auto text-xs">
                  {assignedPrivilegesSorted.map((p) => (
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
                            unassignItem(prev, p.id),
                          )
                        }
                      >
                        &lt;&lt;
                      </button>
                    </div>
                  ))}
                  {assignedPrivilegesSorted.length === 0 && (
                    <div className="px-3 py-2 text-xs text-bac-muted">
                      No privileges assigned.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SUPERVISORS section đã bỏ hoàn toàn */}
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
            {saving ? "Saving..." : "CREATE USER"}
          </button>
        </div>
      </form>
    </div>
  );
}

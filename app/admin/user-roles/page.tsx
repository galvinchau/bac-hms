// app/admin/user-roles/page.tsx
"use client";

import { useEffect, useState } from "react";

type RoleRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  userCount: number;
};

export default function ManageUserRolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch("/api/admin/roles")
      .then((r) => {
        if (!r.ok) {
          throw new Error(`Failed to load roles (status ${r.status}).`);
        }
        return r.json();
      })
      .then((data: RoleRow[]) => {
        setRoles(data);
      })
      .catch((err: any) => {
        console.error(err);
        setError(err.message || "Failed to load roles.");
      })
      .finally(() => setLoading(false));
  }, []);

  // 🔹 ẨN ROLE DSP KHỎI BẢNG (không đụng tới DB)
  const visibleRoles = roles.filter((r) => r.code !== "DSP");

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage User Roles</h1>
      </div>

      <p className="text-sm text-bac-muted max-w-2xl">
        Roles determine the high-level access level for each user (e.g. ADMIN,
        COORDINATOR, DSP). This screen is read-only for now.
      </p>

      {error && (
        <div className="rounded-xl border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="bg-bac-panel border border-bac-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bac-bg border-b border-bac-border">
            <tr>
              <th className="px-3 py-2 text-left w-32">CODE</th>
              <th className="px-3 py-2 text-left">NAME</th>
              <th className="px-3 py-2 text-left">DESCRIPTION</th>
              <th className="px-3 py-2 text-right w-24"># USERS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-4 text-center text-bac-muted"
                >
                  Loading roles...
                </td>
              </tr>
            ) : visibleRoles.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-4 text-center text-bac-muted"
                >
                  No roles to display.
                </td>
              </tr>
            ) : (
              visibleRoles.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-bac-border hover:bg-bac-bg/40"
                >
                  <td className="px-3 py-2 uppercase text-xs font-semibold">
                    {r.code}
                  </td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-bac-muted">
                    {r.description || "-"}
                  </td>
                  <td className="px-3 py-2 text-right">{r.userCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-bac-muted">
        Note: Roles are linked to users via the Admin &gt; Manage Users screen.
      </p>
    </div>
  );
}

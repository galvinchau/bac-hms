// app/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  locked: boolean;
  userType: string;
  roles: string[];
};

export default function ManageUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch("/api/admin/users")
      .then(async (r) => {
        if (!r.ok) {
          const msg = await r.text().catch(() => "");
          console.error(
            "GET /api/admin/users error:",
            r.status,
            msg || r.statusText
          );
          setError(
            msg || `Failed to load users (status ${r.status}).`
          );
          return null;
        }
        return r.json();
      })
      .then((data: UserRow[] | null) => {
        if (data) {
          setUsers(data);
        }
      })
      .catch((err) => {
        console.error("GET /api/admin/users error:", err);
        setError(err.message || "Failed to load users.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Users</h1>

        {/* Nút CREATE USER */}
        <Link
          href="/admin/users/create"
          className="px-4 py-2 rounded-xl bg-bac-primary text-white text-sm font-medium hover:opacity-90"
        >
          CREATE USER
        </Link>
      </div>

      {/* Alert lỗi nếu có */}
      {error && (
        <div className="rounded-xl border border-red-500/70 bg-red-500/10 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Bảng danh sách */}
      <div className="bg-bac-panel border border-bac-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bac-bg border-b border-bac-border">
            <tr>
              <th className="px-3 py-2 text-left">USERNAME</th>
              <th className="px-3 py-2 text-left">USER TYPE</th>
              <th className="px-3 py-2 text-left">STATUS</th>
              <th className="px-3 py-2 text-left">FIRST NAME</th>
              <th className="px-3 py-2 text-left">LAST NAME</th>
              <th className="px-3 py-2 text-left">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  className="px-3 py-4 text-center text-bac-muted"
                  colSpan={6}
                >
                  Loading users...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  className="px-3 py-4 text-center text-bac-muted"
                  colSpan={6}
                >
                  Failed to load users. Please refresh the page.
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-4 text-center text-bac-muted"
                  colSpan={6}
                >
                  No users found. Click &quot;CREATE USER&quot; to add a new
                  one.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-bac-border hover:bg-bac-bg/40"
                >
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{u.userType}</td>
                  <td className="px-3 py-2">{u.locked ? "LOCKED" : "OPEN"}</td>
                  <td className="px-3 py-2">{u.firstName}</td>
                  <td className="px-3 py-2">{u.lastName}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-xs underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

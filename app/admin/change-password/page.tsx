// app/admin/change-password/page.tsx
"use client";

import { FormEvent, useState } from "react";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill all required fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password confirmation does not match.");
      return;
    }

    // Hiện tại chưa có hệ thống đăng nhập / password thật,
    // nên form này chỉ làm UI + validate cơ bản.
    // Sau này khi có auth backend, mình sẽ gọi API đổi mật khẩu ở đây.
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSuccess(
        "Password form submitted (demo only). Backend change will be added later."
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">Change Password</h1>

      <p className="text-sm text-bac-muted mb-4">
        This screen provides the password change form UI. Actual password
        changes will be connected when the authentication system is enabled.
      </p>

      {error && (
        <div className="mb-3 rounded-xl border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 rounded-xl border border-bac-green bg-bac-green/10 px-3 py-2 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-bac-muted uppercase">
            Current Password *
          </label>
          <input
            type="password"
            className="mt-1 w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-bac-muted uppercase">
            New Password *
          </label>
          <input
            type="password"
            className="mt-1 w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-bac-muted uppercase">
            Confirm New Password *
          </label>
          <input
            type="password"
            className="mt-1 w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-bac-primary text-white text-sm font-medium disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving..." : "CHANGE PASSWORD"}
          </button>
        </div>
      </form>
    </div>
  );
}

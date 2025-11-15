// app/admin/change-password/page.tsx
"use client";

import { FormEvent, useState } from "react";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill all required fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    try {
      // TODO: implement real API when authentication is ready.
      // For now we just simulate a short delay.
      await new Promise((resolve) => setTimeout(resolve, 700));

      console.log("Change password requested", {
        currentPassword,
        newPassword,
      });

      setSuccess(
        "Your password change request has been submitted (demo only – backend not implemented yet)."
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      setError("Failed to change password. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Change Password</h1>
      </div>

      {/* Alerts */}
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

      {/* Info note */}
      <div className="rounded-xl border border-bac-border bg-bac-panel px-4 py-3 text-xs text-bac-muted">
        <div className="font-semibold mb-1 text-sm text-bac-text">
          Note
        </div>
        <p>
          This screen currently provides the user interface and validation only.
          The actual password change logic will be connected once the
          authentication backend for BAC-HMS is implemented.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
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
          <p className="mt-1 text-[11px] text-bac-muted">
            Minimum 8 characters. Use a mix of letters, numbers, and symbols
            for better security.
          </p>
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

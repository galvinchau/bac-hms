// app/admin/password/page.tsx
"use client";

import React, { useState } from "react";

export default function ChangePasswordPage() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !newPassword || !confirmPassword) {
      setError("Please fill all required fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });

      if (!res.ok) {
        let msg = "Failed to change password.";
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      setSuccess("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to change password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Change Password</h1>
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

      <div className="rounded-2xl border border-bac-border bg-bac-panel p-4 max-w-xl">
        <p className="text-sm text-bac-muted mb-4">
          Enter your username/email and choose a new password. This screen is
          for internal use while the full sign-in system is being developed.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-bac-muted uppercase">
              Username / Email *
            </label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              placeholder="your.email@blueangelscare.org"
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
              {saving ? "Saving..." : "UPDATE PASSWORD"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// app/admin/change-password/page.tsx
"use client";

import React, {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

function isStrongPassword(pw: string): boolean {
  if (!pw || pw.length < 8) return false;
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasDigit = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  return hasUpper && hasLower && hasDigit && hasSpecial;
}

function ChangePasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const passwordPolicyText = useMemo(() => {
    return "Password must be at least 8 characters and include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.";
  }, []);

  // ✅ Prefill email + current password from last successful login
  useEffect(() => {
    const qEmail = (searchParams.get("email") || "").trim().toLowerCase();

    let rememberedEmail = "";
    let rememberedPass = "";
    try {
      rememberedEmail = (sessionStorage.getItem("hms:lastLoginEmail") || "")
        .trim()
        .toLowerCase();
      rememberedPass = sessionStorage.getItem("hms:lastLoginPassword") || "";
    } catch {
      // ignore
    }

    const finalEmail = qEmail || rememberedEmail;
    if (finalEmail) setEmail(finalEmail);

    // key: auto-fill current password
    if (rememberedPass) setCurrentPassword(rememberedPass);
  }, [searchParams]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const normEmail = email.trim().toLowerCase();

    if (!normEmail || !currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill all required fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password confirmation does not match.");
      return;
    }

    if (!isStrongPassword(newPassword)) {
      setError(passwordPolicyText);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normEmail,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Failed to change password.");
        return;
      }

      setSuccess("Password updated successfully. You can sign in now.");

      // clear sensitive remembered temp password to avoid confusion later
      try {
        sessionStorage.removeItem("hms:lastLoginPassword");
      } catch {
        // ignore
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // ✅ auto back to login, prefill email with ?user=
      setTimeout(() => {
        router.push(`/login?user=${encodeURIComponent(normEmail)}`);
        router.refresh();
      }, 900);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">Change Password</h1>

      <p className="text-sm text-bac-muted mb-4">
        Enter your username/email and change your password.
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
            Username / Email *
          </label>
          <input
            type="email"
            className="mt-1 w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>

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
          <div className="mt-1 text-[11px] text-bac-muted">
            (Auto-filled from your last successful sign-in.)
          </div>
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
          <div className="mt-1 text-[11px] text-bac-muted">
            {passwordPolicyText}
          </div>
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

export default function ChangePasswordPage() {
  // ✅ Fix Vercel build: useSearchParams must be wrapped in Suspense
  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-bac-muted">Loading...</div>}
    >
      <ChangePasswordInner />
    </Suspense>
  );
}

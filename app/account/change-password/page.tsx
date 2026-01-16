// web/app/account/change-password/page.tsx
"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type MeResponse =
  | {
      ok: true;
      user: {
        id: string;
        email: string;
        firstName?: string | null;
        lastName?: string | null;
        userType?: string | null;
      };
    }
  | { ok?: false; error?: string };

function isStrongPassword(pw: string): boolean {
  if (!pw || pw.length < 8) return false;
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasDigit = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  return hasUpper && hasLower && hasDigit && hasSpecial;
}

export default function AccountChangePasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loadingMe, setLoadingMe] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const passwordPolicyText = useMemo(() => {
    return "Password must be at least 8 characters and include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.";
  }, []);

  const forgotCurrentText = useMemo(() => {
    return "If you forgot your current password, please contact your Admin for support.";
  }, []);

  // Load current user from session
  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      setLoadingMe(true);
      setError(null);

      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as MeResponse;

        if (!res.ok || !(data as any)?.user?.email) {
          router.push("/login?from=/account/change-password");
          router.refresh();
          return;
        }

        if (cancelled) return;

        const sessionEmail = String(
          (data as any).user.email || ""
        ).toLowerCase();
        setEmail(sessionEmail);

        // ✅ Auto-fill current password from last login (temporary password)
        try {
          const remembered =
            sessionStorage.getItem("hms:lastLoginPassword") || "";
          if (remembered && !currentPassword) {
            setCurrentPassword(remembered);
          }
        } catch {
          // ignore
        }
      } catch {
        router.push("/login?from=/account/change-password");
        router.refresh();
      } finally {
        if (!cancelled) setLoadingMe(false);
      }
    }

    loadMe();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const normEmail = email.trim().toLowerCase();

    if (!normEmail) {
      setError("Missing user email. Please re-login.");
      return;
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
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

      setSuccess("Password updated successfully. Redirecting to login...");

      // clear remembered temp password (if exists)
      try {
        sessionStorage.removeItem("hms:lastLoginPassword");
      } catch {
        // ignore
      }

      // reset fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // ✅ After success, go back to Login and prefill email via ?user=
      setTimeout(() => {
        router.push(`/login?user=${encodeURIComponent(normEmail)}`);
        router.refresh();
      }, 600);
    } catch (err: any) {
      setError(err?.message || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Change Password</h1>
      </div>

      <p className="text-sm text-bac-muted mb-4">
        Update your password anytime. Your email is loaded from your current
        session.
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

      {loadingMe ? (
        <div className="text-sm text-bac-muted">Loading...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-bac-muted uppercase">
              Username / Email
            </label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm opacity-90"
              value={email}
              readOnly
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
              {forgotCurrentText}
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

          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-bac-primary text-white text-sm font-medium disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Saving..." : "CHANGE PASSWORD"}
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-xl border border-bac-border text-sm"
              onClick={() => router.back()}
              disabled={saving}
            >
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

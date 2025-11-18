// app/login/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Nếu có ?error trên URL (ví dụ do middleware redirect) thì cũng hiện lên
  const urlError = searchParams.get("error");
  const from = searchParams.get("from") || "/dashboard";

  const finalError =
    error ||
    (urlError === "invalid"
      ? "Invalid username or password."
      : urlError === "locked"
      ? "This account is locked. Please contact the administrator."
      : null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          from,
        }),
      });

      if (res.ok) {
        // Login thành công → đi tới from (mặc định /dashboard)
        router.push(from);
        router.refresh();
        return;
      }

      let message = "Invalid username or password.";
      try {
        const data = (await res.json()) as { error?: string };
        if (data?.error) {
          message = data.error;
        }
      } catch {
        // ignore JSON parse errors
      }
      setError(message);
    } catch (err) {
      console.error("Login error", err);
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bac-bg text-bac-text px-4">
      <div className="w-full max-w-md rounded-2xl border border-bac-border bg-bac-panel/70 px-8 py-6 shadow-xl">
        <div className="text-center mb-6">
          <div className="text-xl font-semibold text-yellow-300">
            Blue Angels Care
          </div>
          <div className="text-xs text-bac-muted mt-1">
            Health Management System
          </div>
        </div>

        {finalError && (
          <div className="mb-4 rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {finalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Username</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-primary"
              placeholder="your.email@blueangelscare.org"
              autoComplete="username"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-primary"
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>

          {/* Hidden để giữ đường dẫn redirect sau khi login */}
          <input type="hidden" name="from" value={from} />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-bac-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-bac-muted">
          If you forget your password, please contact the system administrator.
        </div>
      </div>
    </div>
  );
}

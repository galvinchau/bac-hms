"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("Missing username or password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Unable to sign in.");
        return;
      }

      // ưu tiên redirect về trang "from", nếu không có thì về dashboard
      const from = searchParams.get("from") || "/dashboard";
      router.push(from);
      router.refresh();
    } catch (err) {
      console.error("Login error", err);
      setError("Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bac-bg text-bac-text">
      <div className="w-full max-w-md rounded-2xl border border-bac-border bg-bac-panel p-8 shadow-xl">
        {/* Logo + title */}
        <div className="text-center mb-6">
          <div className="text-lg font-semibold text-yellow-300">
            Blue Angels Care
          </div>
          <div className="text-xs text-bac-muted mt-1">
            Health Management System
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500 bg-red-900/20 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 text-sm">
            <label className="block text-bac-muted">Username</label>
            <input
              type="email"
              autoComplete="username"
              className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-1 text-sm">
            <label className="block text-bac-muted">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Footer nhỏ */}
        <div className="mt-4 flex items-center justify-between text-xs text-bac-muted">
          <a
            href="/admin/password"
            className="hover:text-yellow-200 underline-offset-2 hover:underline"
          >
            Change password
          </a>
          <span>© 2025 Blue Angels Care</span>
        </div>
      </div>
    </div>
  );
}

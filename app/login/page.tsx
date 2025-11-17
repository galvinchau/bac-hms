"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setIsSubmitting(true);

    // TODO: replace with real authentication later.
    // For now, just redirect to dashboard.
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 300);
  }

  return (
    <div className="min-h-screen bg-bac-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-bac-border bg-bac-panel p-8 shadow-lg">
        <div className="text-center mb-6">
          <div className="text-2xl font-semibold text-bac-text">
            Blue Angels Care
          </div>
          <div className="text-sm text-bac-muted mt-1">
            Health Management System
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-bac-text">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-bac-text">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm text-bac-text outline-none focus:ring-2 focus:ring-bac-primary"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-bac-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs text-bac-muted">
          <Link
            href="/change-password"
            className="text-bac-primary hover:underline"
          >
            Change password
          </Link>
          <span>© {new Date().getFullYear()} Blue Angels Care</span>
        </div>
      </div>
    </div>
  );
}

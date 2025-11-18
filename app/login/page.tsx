// app/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Invalid username or password.");
        setLoading(false);
        return;
      }

      const from = searchParams.get("from") || "/dashboard";
      router.push(from);
      router.refresh();
    } catch (err) {
      console.error("Login error", err);
      setError("Unable to sign in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bac-bg text-bac-text">
      <div className="w-full max-w-md rounded-2xl border border-bac-border bg-bac-panel p-6 shadow-lg">
        <div className="text-center mb-6">
          <div className="text-xl font-semibold text-yellow-200">
            Blue Angels Care
          </div>
          <div className="text-xs text-bac-muted">
            Health Management System
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm font-medium">Username</div>
          <input
            type="email"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-bac-primary"
          />

          <div className="text-sm font-medium">Password</div>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-bac-primary"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
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

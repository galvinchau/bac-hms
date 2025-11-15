// app/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "Invalid username or password.");
        return;
      }

      // ✅ Đã set cookie, redirect về trang cũ hoặc "/"
      router.push(from || "/");
    } catch (err) {
      console.error(err);
      setError("Failed to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bac-bg">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-bac-border bg-bac-panel px-6 py-8 space-y-4"
      >
        <h1 className="text-xl font-semibold text-center">Blue Angels Care</h1>
        <p className="text-xs text-bac-muted text-center">
          Health Management System – Sign in
        </p>

        {error && (
          <div className="rounded-xl border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-bac-muted uppercase">
            Username / Email
          </label>
          <input
            type="email"
            className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-bac-muted uppercase">
            Password
          </label>
          <input
            type="password"
            className="mt-1 w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 rounded-xl bg-bac-primary text-white text-sm font-semibold py-2 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "SIGN IN"}
        </button>

        <p className="text-[11px] text-bac-muted text-center">
          If you forget your password, please contact the system administrator.
        </p>
      </form>
    </div>
  );
}

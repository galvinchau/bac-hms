// components/layout/AppShell.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar/Sidebar";

type MeUser = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  userType?: string | null;
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [me, setMe] = useState<MeUser | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // ===== 1) Load current user info =====
  useEffect(() => {
    let cancelled = false;

    const loadMe = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json().catch(() => null);
        if (!data || cancelled) return;

        // Usually { user: {...} }, but also support direct object
        const user: MeUser = data.user ?? data;
        setMe(user);
      } catch (err) {
        console.error("Failed to load current user info", err);
      }
    };

    loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName =
    (me?.firstName || me?.lastName
      ? `${me?.firstName ?? ""} ${me?.lastName ?? ""}`.trim()
      : me?.email) ?? "";

  // ===== 2) Logout (used by button + auto-logout) =====
  const handleLogout = useCallback(
    async (silent: boolean = false) => {
      try {
        if (!silent) setLogoutLoading(true);

        await fetch("/api/auth/logout", {
          method: "POST",
        });

        router.push("/login");
        router.refresh();
      } catch (err) {
        console.error("Logout error", err);
      } finally {
        if (!silent) setLogoutLoading(false);
      }
    },
    [router]
  );

  // ===== 3) Auto-logout after 30 minutes inactivity =====
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        // silent = true => no spinner, just logout
        handleLogout(true);
      }, INACTIVITY_MS);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((evt) => window.addEventListener(evt, resetTimer));
    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [handleLogout]);

  // ===== 4) Full-width override for wide-table pages (Payroll + Time Keeping) =====
  const isFullWidthPage = useMemo(() => {
    if (!pathname) return false;

    const fullWidthPrefixes = ["/payroll", "/time-keeping"];

    return fullWidthPrefixes.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
  }, [pathname]);

  const contentContainerClass = isFullWidthPage
    ? "w-full"
    : "mx-auto w-full max-w-6xl";

  // ===== 5) Render layout =====
  return (
    <div className="min-h-screen flex bg-bac-bg text-bac-text">
      {/* LEFT SIDEBAR */}
      <aside className="w-64 border-r border-bac-border">
        <Sidebar onLogoClick={() => router.push("/dashboard")} />
      </aside>

      {/* MAIN AREA */}
      <main className="flex-1 flex flex-col">
        {/* TOPBAR */}
        <div className="h-12 flex items-center justify-end gap-3 px-4 border-b border-bac-border text-sm">
          {/* Logged-in user */}
          {displayName && (
            <div className="flex items-center gap-2 text-bac-muted">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-bac-panel border border-bac-border text-xs font-semibold uppercase">
                {displayName.charAt(0)}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs text-bac-muted">Signed in as</span>
                <span className="text-sm font-medium text-bac-text">
                  {displayName}
                </span>
              </div>
            </div>
          )}

          {/* Logout button */}
          <button
            type="button"
            onClick={() => handleLogout(false)}
            disabled={logoutLoading}
            className="ml-4 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {logoutLoading ? "Logging out..." : "Log out"}
          </button>
        </div>

        {/* PAGE CONTENT */}
        <div className="p-4 flex-1 overflow-auto">
          <div className={contentContainerClass}>{children}</div>
        </div>
      </main>
    </div>
  );
}

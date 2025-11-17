// components/layout/AppShell.tsx
"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import { usePathname, useRouter } from "next/navigation";

type MeResponse = {
  email: string;
  firstName: string;
  lastName: string;
  userType: string;
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [me, setMe] = useState<MeResponse | null>(null);

  // Lấy thông tin user hiện tại
  useEffect(() => {
    let isMounted = true;

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: MeResponse | null) => {
        if (isMounted && data) {
          setMe(data);
        }
      })
      .catch(() => {
        // ignore lỗi nhỏ, user vẫn bị middleware chặn nếu chưa login
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      // ignore
    } finally {
      router.push("/login");
    }
  };

  const headerTitle =
    pathname === "/dashboard" ? "Dashboard" : pathname || "Dashboard";

  return (
    <div className="min-h-screen flex bg-bac-bg text-bac-text">
      {/* LEFT SIDEBAR */}
      <aside className="w-64 border-r border-bac-border">
        <Sidebar
          onLogoClick={() => router.push("/dashboard")}
          currentUserType={me?.userType ?? null}
        />
      </aside>

      {/* MAIN AREA */}
      <main className="flex-1 flex flex-col">
        {/* TOPBAR */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-bac-border text-sm">
          <div className="text-xs text-bac-muted truncate">{headerTitle}</div>

          <div className="flex items-center gap-3">
            {me && (
              <span className="text-xs text-bac-muted">
                {me.firstName} {me.lastName} · {me.userType}
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1 text-xs rounded-full bg-bac-primary text-white hover:opacity-90"
            >
              Log out
            </button>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div className="p-4 flex-1">{children}</div>
      </main>
    </div>
  );
}

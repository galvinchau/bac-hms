// components/layout/AppShell.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar/Sidebar";
import React from "react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen flex bg-bac-bg text-bac-text">
      {/* LEFT SIDEBAR (single instance app-wide) */}
      <aside className="w-64 border-r border-bac-border">
        <Sidebar
          onLogoClick={() => {
            if (pathname !== "/dashboard") router.push("/dashboard");
          }}
        />
      </aside>

      {/* MAIN AREA */}
      <main className="flex-1">
        {/* TOPBAR (optional) */}
        <div className="h-12 flex items-center justify-end px-4 border-b border-bac-border text-sm">
          System Administrator
        </div>

        {/* PAGE CONTENT */}
        <div className="p-4">{children}</div>
      </main>
    </div>
  );
}

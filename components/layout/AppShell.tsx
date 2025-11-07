// components/layout/AppShell.tsx
"use client";

import React from "react";
import Sidebar from "@/components/sidebar/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-bac-bg text-bac-text">
      {/* LEFT SIDEBAR (single instance app-wide) */}
      <aside className="w-64 border-r border-bac-border">
        <Sidebar />
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

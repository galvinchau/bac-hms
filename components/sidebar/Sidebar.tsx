// components/sidebar/Sidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";

type SidebarProps = {
  onLogoClick?: () => void;
};

const MENU = [
  { label: "Programs", href: "/programs" },
 {
  label: "Services",
  children: [
    { label: "New Service", href: "/services/new" },
    { label: "Search Service", href: "/services/search" },
  ],
},
  {
    label: "Individual",
    children: [
      { label: "New Individual", href: "/individual/new" },
      { label: "Search Individual", href: "/individual" },
    ],
  },
  {
    label: "Employees",
    children: [
      { label: "New Employee", href: "/employees/new" },
      { label: "Search Employee", href: "/employees/search" },
    ],
  },
  { label: "Schedule", href: "/schedule" },
  { label: "Visited Maintenance", href: "/visited" },
  { label: "Medication", href: "/medication" },
  { label: "FireDrill", href: "/firedrill" },
  { label: "Billing", href: "/billing" },
  { label: "Authorizations", href: "/authorizations" },
  { label: "Reports", href: "/reports" },
];

const ADMIN = [
  { label: "Manage Users", href: "/admin/users" },
  { label: "Manage User Roles", href: "/admin/roles" },
  { label: "Change Password", href: "/admin/password" },
];

export default function Sidebar({ onLogoClick }: SidebarProps) {
  return (
    <div className="h-full flex flex-col">
      {/* LOGO + BRAND */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-bac-border">
        <button
          type="button"
          onClick={onLogoClick}
          className="flex items-center gap-3 hover:opacity-90"
          aria-label="Go to dashboard"
          title="Blue Angels Care — Dashboard"
        >
          <Image src="/Logo.png" alt="Logo" width={28} height={28} />
          <div className="leading-4 text-left">
            <div className="font-semibold">Blue Angels Care</div>
            <div className="text-xs text-bac-muted">
              Health Management System
            </div>
          </div>
        </button>
      </div>

      {/* NAV */}
      <div className="flex-1 overflow-y-auto py-3">
        <div className="px-4 text-xs uppercase tracking-wide text-bac-muted mb-2">
          Dashboard
        </div>
        <nav className="space-y-1 px-2">
          {MENU.map((m) =>
            m.children ? (
              <div key={m.label} className="mb-1">
                <div className="px-2 py-1 text-sm text-bac-muted">
                  {m.label}
                </div>
                <div className="ml-2 space-y-1">
                  {m.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      className="block px-2 py-1 rounded hover:bg-bac-panel"
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={m.href}
                href={m.href}
                className="block px-2 py-1 rounded hover:bg-bac-panel"
              >
                {m.label}
              </Link>
            )
          )}
        </nav>

        <div className="px-4 mt-4 text-xs uppercase tracking-wide text-bac-muted mb-2">
          Admin
        </div>
        <nav className="space-y-1 px-2">
          {ADMIN.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="block px-2 py-1 rounded hover:bg-bac-panel"
            >
              {a.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

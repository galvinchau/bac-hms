// web/components/sidebar/Sidebar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";

type SidebarProps = {
  onLogoClick?: () => void;
};

type MeResponse = {
  user?: {
    id?: string;
    email?: string | null;
    userType?: string | null; // e.g. "ADMIN" | "HR" | "DSP" | "STAFF" ...
  } | null;
  employee?: {
    staffId: string;
    firstName: string;
    lastName: string;
    position: string; // mapped from Employee.role
    address: string;
    phone: string;
    email: string;
  } | null;
};

type MenuChild = {
  label: string;
  href: string;
};

type MenuItem = {
  label: string;
  href?: string;
  children?: MenuChild[];
};

const MENU: MenuItem[] = [
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
  { label: "Visited Maintenance", href: "/visited-maintenance" },
  { label: "Medication", href: "/medication" },
  { label: "FireDrill", href: "/firedrill" },

  // 🔒 Admin-only (menu)
  { label: "Billing", href: "/billing" },
  { label: "Payroll", href: "/payroll" },

  // ✅ Office/Admin/HR can see
  { label: "Time Keeping", href: "/time-keeping" },

  { label: "Authorizations", href: "/authorizations" },

  {
    label: "Reports",
    children: [{ label: "Daily Notes", href: "/reports/daily-notes" }],
  },
];

const ADMIN: MenuItem[] = [
  { label: "Manage Users", href: "/admin/users" },
  { label: "Manage User Roles", href: "/admin/roles" },
  { label: "Change Password", href: "/admin/password" },
];

// ✅ NEW: Self-service change password for ALL users (logged-in)
const ACCOUNT: MenuItem[] = [
  { label: "Change Password", href: "/account/change-password" },
];

function norm(s?: string | null) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function isOfficeRole(roleOrPosition?: string | null) {
  const r = norm(roleOrPosition);
  // You can tighten this later if needed
  return (
    r === "office staff" ||
    r === "office" ||
    r.includes("office") ||
    r.includes("admin assistant")
  );
}

export default function Sidebar({ onLogoClick }: SidebarProps) {
  const pathname = usePathname();
  const [openParent, setOpenParent] = useState<string | null>(null);

  const [userType, setUserType] = useState<string | null>(null);
  const [employeePosition, setEmployeePosition] = useState<string | null>(null);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as MeResponse;

        setUserType((data.user?.userType ?? null) as any);
        setEmployeePosition((data.employee?.position ?? null) as any);
      } catch (err) {
        console.error("Failed to load current user", err);
      }
    };
    loadMe();
  }, []);

  const isAdmin = userType === "ADMIN";
  const isHR = userType === "HR";

  // ✅ This is the key fix:
  // Time Keeping visible if ADMIN/HR OR Employee role/position is Office Staff
  const canSeeTimeKeeping = useMemo(() => {
    if (isAdmin || isHR) return true;
    return isOfficeRole(employeePosition);
  }, [isAdmin, isHR, employeePosition]);

  function canSeeMenuItem(m: MenuItem) {
    // Hide admin-only menus unless ADMIN
    if (m.href === "/billing" || m.href === "/payroll") return isAdmin;

    // Time Keeping visible to ADMIN/HR/Office Staff (via employee.position)
    if (m.href === "/time-keeping") return canSeeTimeKeeping;

    return true;
  }

  const VISIBLE_MENU = useMemo(() => {
    return MENU.filter(canSeeMenuItem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userType, employeePosition, canSeeTimeKeeping]);

  useEffect(() => {
    let foundParent: string | null = null;

    VISIBLE_MENU.forEach((m) => {
      if (!m.children) return;
      const hasActiveChild = m.children.some((c) =>
        pathname.startsWith(c.href)
      );
      if (hasActiveChild) foundParent = m.label;
    });

    const adminHasActive = ADMIN.some((a) =>
      a.href ? pathname.startsWith(a.href) : false
    );
    if (adminHasActive) foundParent = "Admin";

    // ✅ Account (self change password) active highlight
    const accountHasActive = ACCOUNT.some((a) =>
      a.href ? pathname.startsWith(a.href) : false
    );
    if (accountHasActive) foundParent = "Account";

    if (foundParent) setOpenParent(foundParent);
  }, [pathname, userType, employeePosition, VISIBLE_MENU]);

  const toggleParent = (label: string) => {
    setOpenParent((prev) => (prev === label ? null : label));
  };

  const renderMainItem = (m: MenuItem) => {
    if (!m.children && m.href) {
      const isActive = pathname.startsWith(m.href);

      return (
        <Link
          key={m.href}
          href={m.href}
          className={`block rounded-xl px-3 py-2 text-base font-medium transition-colors
            ${
              isActive
                ? "bg-bac-panel text-yellow-200"
                : "text-yellow-300 hover:bg-bac-panel/60 hover:text-yellow-200"
            }`}
        >
          {m.label}
        </Link>
      );
    }

    const isOpen = openParent === m.label;

    return (
      <div key={m.label} className="mb-1">
        <button
          type="button"
          onClick={() => toggleParent(m.label)}
          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-base font-semibold transition-colors
            ${
              isOpen
                ? "bg-bac-panel text-yellow-200"
                : "text-yellow-300 hover:bg-bac-panel/60 hover:text-yellow-200"
            }`}
        >
          <span className="font-semibold">{m.label}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>

        {isOpen && m.children && (
          <div className="mt-1 space-y-1 pl-4">
            {m.children.map((c) => {
              const isChildActive = pathname.startsWith(c.href);
              return (
                <Link
                  key={c.href}
                  href={c.href}
                  className={`block rounded-lg px-3 py-1.5 text-sm italic transition-colors
                    ${
                      isChildActive
                        ? "bg-bac-panel text-yellow-200"
                        : "text-yellow-300 hover:bg-bac-panel/70 hover:text-yellow-200"
                    }`}
                >
                  {c.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderAdminChild = (a: MenuItem) => {
    if (!a.href) return null;
    const isActive = pathname.startsWith(a.href);

    return (
      <Link
        key={a.href}
        href={a.href}
        className={`block rounded-lg px-3 py-1.5 text-sm italic transition-colors
          ${
            isActive
              ? "bg-bac-panel text-yellow-200"
              : "text-yellow-300 hover:bg-bac-panel/70 hover:text-yellow-200"
          }`}
      >
        {a.label}
      </Link>
    );
  };

  const renderAdminSection = () => {
    // 🔒 Admin section itself should only be visible to ADMIN
    if (!isAdmin) return null;

    const isOpen = openParent === "Admin";

    return (
      <div className="mt-4 px-2">
        <button
          type="button"
          onClick={() => toggleParent("Admin")}
          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-base font-semibold transition-colors
            ${
              isOpen
                ? "bg-bac-panel text-yellow-200"
                : "text-yellow-300 hover:bg-bac-panel/60 hover:text-yellow-200"
            }`}
        >
          <span className="font-semibold">Admin</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>

        {isOpen && (
          <div className="mt-1 space-y-1 pl-4">
            {ADMIN.map((a) => renderAdminChild(a))}
          </div>
        )}
      </div>
    );
  };

  // ✅ NEW: Account section for ALL logged-in users
  const renderAccountSection = () => {
    const isOpen = openParent === "Account";

    return (
      <div className="mt-4 px-2">
        <button
          type="button"
          onClick={() => toggleParent("Account")}
          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-base font-semibold transition-colors
            ${
              isOpen
                ? "bg-bac-panel text-yellow-200"
                : "text-yellow-300 hover:bg-bac-panel/60 hover:text-yellow-200"
            }`}
        >
          <span className="font-semibold">Account</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>

        {isOpen && (
          <div className="mt-1 space-y-1 pl-4">
            {ACCOUNT.map((a) => {
              if (!a.href) return null;
              const isActive = pathname.startsWith(a.href);
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  className={`block rounded-lg px-3 py-1.5 text-sm italic transition-colors
                    ${
                      isActive
                        ? "bg-bac-panel text-yellow-200"
                        : "text-yellow-300 hover:bg-bac-panel/70 hover:text-yellow-200"
                    }`}
                >
                  {a.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 flex items-center gap-3 px-4 border-b border-bac-border">
        <Link
          href="/dashboard"
          onClick={onLogoClick}
          className="flex items-center gap-3 hover:opacity-90"
          aria-label="Go to dashboard"
          title="Blue Angels Care — Dashboard"
        >
          <Image src="/Logo.png" alt="Logo" width={28} height={28} />
          <div className="leading-4 text-left">
            <div className="font-semibold text-yellow-300">
              Blue Angels Care
            </div>
            <div className="text-xs text-bac-muted">
              Health Management System
            </div>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        <div className="px-4 text-xs uppercase tracking-wide text-bac-muted mb-2">
          Dashboard
        </div>

        <nav className="space-y-1 px-2">{VISIBLE_MENU.map(renderMainItem)}</nav>

        {/* ✅ NEW: Account section visible to all users */}
        {renderAccountSection()}

        {renderAdminSection()}
      </div>
    </div>
  );
}

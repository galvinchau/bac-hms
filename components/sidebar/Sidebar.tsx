// web/components/sidebar/Sidebar.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
    userType?: string | null;
  } | null;
  employee?: {
    staffId: string;
    firstName: string;
    lastName: string;
    position: string;
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

type HealthIncidentListItem = {
  id: string;
};

type HealthIncidentListResponse = {
  items?: HealthIncidentListItem[];
};

const HEALTH_INCIDENT_SEEN_KEY = "bac_hi_seen_report_ids";
const HEALTH_INCIDENT_SEEN_EVENT = "health-incident-seen-changed";

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
      { label: "Individual Detail", href: "/individual/detail" },
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
  {
    label: "Medication",
    children: [
      { label: "Orders", href: "/medication/orders" },
      { label: "MAR", href: "/medication/mar" },
      { label: "Treatment Record", href: "/medication/treatment" },
      { label: "PRN & Vitals", href: "/medication/prn-vitals" },
      {
        label: "Inventory & Controlled",
        href: "/medication/inventory-controlled",
      },
      { label: "Incidents & Reports", href: "/medication/incidents" },
    ],
  },
  { label: "House Management", href: "/house-management" },
  { label: "Billing", href: "/billing" },
  { label: "Payroll", href: "/payroll" },
  { label: "Time Keeping", href: "/time-keeping" },
  { label: "Authorizations", href: "/authorizations" },
  {
    label: "Reports",
    children: [
      { label: "Daily Notes", href: "/reports/daily-notes" },
      { label: "Health & Incident", href: "/reports/health-incident" },
    ],
  },
];

const ADMIN: MenuItem[] = [
  { label: "Manage Users", href: "/admin/users" },
  { label: "Manage User Roles", href: "/admin/roles" },
  { label: "Change Password", href: "/admin/password" },
];

const ACCOUNT: MenuItem[] = [
  { label: "Change Password", href: "/account/change-password" },
];

function norm(s?: string | null) {
  return String(s ?? "").trim().toLowerCase();
}

function isOfficeRole(roleOrPosition?: string | null) {
  const r = norm(roleOrPosition);
  return (
    r === "office staff" ||
    r === "office" ||
    r.includes("office") ||
    r.includes("admin assistant")
  );
}

function isSupervisorUserType(userType?: string | null) {
  const t = String(userType ?? "").trim().toUpperCase();
  return t === "ADMIN" || t === "HR" || t === "COORDINATOR" || t === "OFFICE";
}

function readSeenHealthIncidentIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HEALTH_INCIDENT_SEEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => String(x ?? "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function writeSeenHealthIncidentIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    const unique = Array.from(new Set(ids.map((x) => String(x ?? "").trim()).filter(Boolean)));
    window.localStorage.setItem(HEALTH_INCIDENT_SEEN_KEY, JSON.stringify(unique));
  } catch {
    // ignore
  }
}

function markHealthIncidentSeen(id: string) {
  if (typeof window === "undefined") return;
  const clean = String(id ?? "").trim();
  if (!clean) return;

  const current = readSeenHealthIncidentIds();
  if (current.includes(clean)) return;

  writeSeenHealthIncidentIds([...current, clean]);
  window.dispatchEvent(new Event(HEALTH_INCIDENT_SEEN_EVENT));
}

export default function Sidebar({ onLogoClick }: SidebarProps) {
  const pathname = usePathname();
  const [openParent, setOpenParent] = useState<string | null>(null);

  const [userType, setUserType] = useState<string | null>(null);
  const [employeePosition, setEmployeePosition] = useState<string | null>(null);

  const [healthIncidentSubmittedIds, setHealthIncidentSubmittedIds] = useState<string[]>([]);
  const [healthIncidentNewCount, setHealthIncidentNewCount] = useState(0);

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
  const canSeeHealthIncidentNewBadge = useMemo(
    () => isSupervisorUserType(userType),
    [userType]
  );

  const canSeeTimeKeeping = useMemo(() => {
    if (isAdmin || isHR) return true;
    return isOfficeRole(employeePosition);
  }, [isAdmin, isHR, employeePosition]);

  function canSeeMenuItem(m: MenuItem) {
    if (m.href === "/billing" || m.href === "/payroll") return isAdmin;
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
      const hasActiveChild = m.children.some((c) => pathname.startsWith(c.href));
      if (hasActiveChild) foundParent = m.label;
    });

    const adminHasActive = ADMIN.some((a) =>
      a.href ? pathname.startsWith(a.href) : false
    );
    if (adminHasActive) foundParent = "Admin";

    const accountHasActive = ACCOUNT.some((a) =>
      a.href ? pathname.startsWith(a.href) : false
    );
    if (accountHasActive) foundParent = "Account";

    if (foundParent) setOpenParent(foundParent);
  }, [pathname, userType, employeePosition, VISIBLE_MENU]);

  useEffect(() => {
    if (!canSeeHealthIncidentNewBadge) return;

    const match = /^\/reports\/health-incident\/([^/]+)$/.exec(pathname || "");
    if (!match) return;

    const reportId = decodeURIComponent(match[1] || "").trim();
    if (!reportId) return;

    markHealthIncidentSeen(reportId);
  }, [pathname, canSeeHealthIncidentNewBadge]);

  const refreshHealthIncidentBadge = useCallback(async () => {
    if (!canSeeHealthIncidentNewBadge) {
      setHealthIncidentSubmittedIds([]);
      setHealthIncidentNewCount(0);
      return;
    }

    try {
      const res = await fetch("/api/reports/health-incident?status=SUBMITTED", {
        cache: "no-store",
      });
      if (!res.ok) return;

      const data = (await res.json()) as HealthIncidentListResponse;
      const ids = (data.items || [])
        .map((x) => String(x?.id ?? "").trim())
        .filter(Boolean);

      const seenIds = readSeenHealthIncidentIds();
      const unseen = ids.filter((id) => !seenIds.includes(id));

      setHealthIncidentSubmittedIds(ids);
      setHealthIncidentNewCount(unseen.length);
    } catch (err) {
      console.error("Failed to load health incident new badge", err);
    }
  }, [canSeeHealthIncidentNewBadge]);

  useEffect(() => {
    refreshHealthIncidentBadge();
  }, [refreshHealthIncidentBadge]);

  useEffect(() => {
    if (!canSeeHealthIncidentNewBadge) return;

    const onSeenChanged = () => {
      refreshHealthIncidentBadge();
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === HEALTH_INCIDENT_SEEN_KEY) {
        refreshHealthIncidentBadge();
      }
    };

    window.addEventListener(HEALTH_INCIDENT_SEEN_EVENT, onSeenChanged);
    window.addEventListener("storage", onStorage);

    const timer = window.setInterval(() => {
      refreshHealthIncidentBadge();
    }, 20000);

    return () => {
      window.removeEventListener(HEALTH_INCIDENT_SEEN_EVENT, onSeenChanged);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(timer);
    };
  }, [canSeeHealthIncidentNewBadge, refreshHealthIncidentBadge]);

  const toggleParent = (label: string) => {
    setOpenParent((prev) => (prev === label ? null : label));
  };

  const renderReportsParentBadge = () => {
    if (!canSeeHealthIncidentNewBadge || healthIncidentNewCount <= 0) return null;

    return (
      <div className="ml-2 inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white animate-pulse">
        New
      </div>
    );
  };

  const renderHealthIncidentChildBadge = () => {
    if (!canSeeHealthIncidentNewBadge || healthIncidentNewCount <= 0) return null;

    return (
      <div className="ml-auto flex min-w-[112px] flex-col items-end">
        <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white animate-pulse">
          NEW
        </span>
        <span className="mt-0.5 text-[10px] not-italic text-red-300">
          Health &amp; Incident report
        </span>
      </div>
    );
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
    const showReportsBadge = m.label === "Reports";

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
          <span className="flex items-center font-semibold">
            {m.label}
            {showReportsBadge ? renderReportsParentBadge() : null}
          </span>
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
              const isHealthIncidentChild = c.href === "/reports/health-incident";

              return (
                <Link
                  key={c.href}
                  href={c.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm italic transition-colors
                    ${
                      isChildActive
                        ? "bg-bac-panel text-yellow-200"
                        : "text-yellow-300 hover:bg-bac-panel/70 hover:text-yellow-200"
                    }`}
                >
                  <span>{c.label}</span>
                  {isHealthIncidentChild ? renderHealthIncidentChildBadge() : null}
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
            <div className="font-semibold text-yellow-300">Blue Angels Care</div>
            <div className="text-xs text-bac-muted">Health Management System</div>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        <div className="px-4 text-xs uppercase tracking-wide text-bac-muted mb-2">
          Dashboard
        </div>

        <nav className="space-y-1 px-2">{VISIBLE_MENU.map(renderMainItem)}</nav>

        {renderAccountSection()}
        {renderAdminSection()}
      </div>
    </div>
  );
}
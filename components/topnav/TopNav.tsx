// web/components/topnav/TopNav.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import MENUS, { MenuItem, MenuSection } from "@/components/sidebar/menus";
import { ChevronDown } from "lucide-react";

type MeResponse = {
  user?: {
    userType?: string | null;
  } | null;
  employee?: {
    position?: string | null;
  } | null;
};

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

function isItemActive(pathname: string, item: MenuItem) {
  if (item.href) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }
  if (item.children?.length) {
    return item.children.some((c) =>
      c.href ? pathname === c.href || pathname.startsWith(c.href + "/") : false,
    );
  }
  return false;
}

type OpenMenuState =
  | { key: string; anchor: DOMRect; items: MenuItem[]; align: "left" | "right" }
  | null;

export default function TopNav({
  onLogoClick,
}: {
  onLogoClick?: () => void;
}) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement | null>(null);

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
      } catch (e) {
        console.error("TopNav loadMe failed", e);
      }
    };
    loadMe();
  }, []);

  const isAdmin = userType === "ADMIN";
  const isHR = userType === "HR";

  const canSeeTimeKeeping = useMemo(() => {
    if (isAdmin || isHR) return true;
    return isOfficeRole(employeePosition);
  }, [isAdmin, isHR, employeePosition]);

  const canSeeMenuItem = (m: MenuItem) => {
    if (m.href === "/billing" || m.href === "/payroll") return isAdmin;
    if (m.href === "/time-keeping") return canSeeTimeKeeping;
    if (m.href?.startsWith("/admin")) return isAdmin;
    return true;
  };

  const visibleSections: MenuSection[] = useMemo(() => {
    return MENUS.map((sec) => ({
      ...sec,
      items: sec.items.filter(canSeeMenuItem),
    })).filter((sec) => sec.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, canSeeTimeKeeping, userType, employeePosition]);

  const dashboardItems = useMemo(() => {
    return (
      visibleSections.find((s) => s.title === "DASHBOARD")?.items ?? []
    );
  }, [visibleSections]);

  const adminItems = useMemo(() => {
    if (!isAdmin) return [];
    return visibleSections.find((s) => s.title === "ADMIN")?.items ?? [];
  }, [visibleSections, isAdmin]);

  // ✅ NEW: dropdown rendered as "fixed" overlay so it won't be clipped by overflow-x containers
  const [openMenu, setOpenMenu] = useState<OpenMenuState>(null);

  // Close dropdown on route change
  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  // Close on click outside + ESC
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!openMenu) return;
      const el = e.target as HTMLElement | null;
      if (!el) return;

      // If click inside dropdown OR inside navbar root, allow (we still close when clicking a menu item via route change)
      const dropdown = document.getElementById("topnav-dropdown");
      if (dropdown && dropdown.contains(el)) return;
      if (rootRef.current && rootRef.current.contains(el)) return;

      setOpenMenu(null);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  const openDropdown = (
    key: string,
    btnEl: HTMLButtonElement,
    items: MenuItem[],
    align: "left" | "right" = "left",
  ) => {
    const rect = btnEl.getBoundingClientRect();
    setOpenMenu((prev) => {
      // toggle
      if (prev?.key === key) return null;
      return { key, anchor: rect, items, align };
    });
  };

  const renderTopItem = (m: MenuItem) => {
    const active = isItemActive(pathname, m);
    const hasChildren = !!m.children?.length;

    if (!hasChildren && m.href) {
      return (
        <Link
          key={m.label}
          href={m.href}
          className={[
            "inline-flex items-center rounded-full px-3 py-2 text-sm font-semibold transition-colors whitespace-nowrap",
            active
              ? "bg-bac-panel text-yellow-200"
              : "text-yellow-300 hover:bg-bac-panel/60 hover:text-yellow-200",
          ].join(" ")}
        >
          {m.label}
        </Link>
      );
    }

    return (
      <button
        key={m.label}
        type="button"
        onClick={(e) =>
          openDropdown(m.label, e.currentTarget, m.children ?? [], "left")
        }
        className={[
          "inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors whitespace-nowrap",
          active
            ? "bg-bac-panel text-yellow-200"
            : "text-yellow-300 hover:bg-bac-panel/60 hover:text-yellow-200",
        ].join(" ")}
      >
        <span>{m.label}</span>
        <ChevronDown className="h-4 w-4 opacity-80" />
      </button>
    );
  };

  // Dropdown positioning (fixed)
  const dropdownStyle = useMemo(() => {
    if (!openMenu) return null;

    const top = Math.round(openMenu.anchor.bottom + 8); // gap
    let left = Math.round(openMenu.anchor.left);
    let width = 260;

    // Keep in viewport
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const margin = 8;
    if (left + width > vw - margin) {
      left = vw - width - margin;
    }
    if (left < margin) left = margin;

    // If align right (Admin button on the far right)
    if (openMenu.align === "right") {
      const right = Math.round(openMenu.anchor.right);
      left = right - width;
      if (left + width > vw - margin) left = vw - width - margin;
      if (left < margin) left = margin;
    }

    return { top, left, width };
  }, [openMenu]);

  return (
    <div ref={rootRef} className="w-full border-b border-bac-border bg-bac-bg">
      <div className="flex items-center gap-4 px-4 h-14">
        {/* Logo */}
        <Link
          href="/dashboard"
          onClick={onLogoClick}
          className="flex items-center gap-3 hover:opacity-90 shrink-0"
          aria-label="Go to dashboard"
          title="Blue Angels Care — Dashboard"
        >
          <Image src="/Logo.png" alt="Logo" width={28} height={28} />
          <div className="leading-4 text-left">
            <div className="font-semibold text-yellow-300">Blue Angels Care</div>
            <div className="text-xs text-bac-muted">Health Management System</div>
          </div>
        </Link>

        {/* Horizontal menu (scrollable) */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max pr-2">
            {dashboardItems.map(renderTopItem)}
          </div>
        </div>

        {/* Admin dropdown */}
        {isAdmin && adminItems.length > 0 && (
          <button
            type="button"
            onClick={(e) => openDropdown("__ADMIN__", e.currentTarget, adminItems, "right")}
            className={[
              "inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0",
              openMenu?.key === "__ADMIN__"
                ? "bg-bac-panel text-yellow-200"
                : "text-yellow-300 hover:bg-bac-panel/60 hover:text-yellow-200",
            ].join(" ")}
          >
            <span>Admin</span>
            <ChevronDown className="h-4 w-4 opacity-80" />
          </button>
        )}
      </div>

      {/* ✅ FIXED dropdown overlay (not clipped by overflow-x) */}
      {openMenu && dropdownStyle && (
        <div
          id="topnav-dropdown"
          className="fixed z-[9999] rounded-2xl border border-bac-border bg-bac-bg shadow-lg"
          style={{
            top: dropdownStyle.top,
            left: dropdownStyle.left,
            width: dropdownStyle.width,
          }}
        >
          <div className="p-2 space-y-1">
            {openMenu.items.map((it) => {
              if (!it.href) return null;
              const active =
                pathname === it.href || pathname.startsWith(it.href + "/");
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={[
                    "block rounded-xl px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-bac-panel text-yellow-200"
                      : "text-yellow-300 hover:bg-bac-panel/60 hover:text-yellow-200",
                  ].join(" ")}
                >
                  {it.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

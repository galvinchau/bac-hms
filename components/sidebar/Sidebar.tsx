// web/components/sidebar/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

import { MAIN_ITEMS, ADMIN_ITEMS, type MenuItem } from "./menus";

type SectionProps = {
  title: string;
  items: MenuItem[];
};

function isActivePath(href: string | undefined, pathname: string) {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function ItemLink({ item, pathname }: { item: MenuItem; pathname: string }) {
  const active = isActivePath(item.href, pathname);

  const baseCls =
    "block px-3 py-2 rounded-xl text-sm hover:bg-bac-panel hover:text-bac-text transition-colors";
  return (
    <Link
      href={item.href || "#"}
      className={clsx(baseCls, active && "bg-bac-panel text-bac-text")}
    >
      {item.label}
    </Link>
  );
}

function ItemWithChildren({
  item,
  pathname,
}: {
  item: MenuItem;
  pathname: string;
}) {
  // ⬇️ Luôn mở submenu (theo yêu cầu hiển thị 2 menu con ngay)
  const open = true;

  return (
    <div className="mb-1">
      <div className="text-sm font-medium px-3 py-2 text-bac-muted">
        {item.label}
      </div>
      {open && (
        <div className="ml-2 space-y-1">
          {(item.children || []).map((child, idx) => (
            <div key={`${item.label}-${child.href || idx}`}>
              <ItemLink item={child} pathname={pathname} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, items }: SectionProps) {
  const pathname = usePathname();

  return (
    <div className="mb-6">
      <div className="text-[11px] uppercase tracking-widest text-bac-muted px-3 mb-2">
        {title}
      </div>

      <div className="space-y-1">
        {items.map((item, idx) => {
          const key = item.href || item.label || String(idx);
          const hasChildren =
            Array.isArray(item.children) && item.children.length > 0;

          return (
            <div key={key}>
              {hasChildren ? (
                <ItemWithChildren item={item} pathname={pathname} />
              ) : (
                <ItemLink item={item} pathname={pathname} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="h-full w-64 shrink-0 border-r border-bac-border bg-bac-bg">
      <div className="p-4 flex items-center gap-3 border-b border-bac-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <img
            src="/Logo.png"
            alt="Blue Angels Care"
            className="w-8 h-8 rounded"
          />
          <div className="text-base font-semibold leading-5">
            Blue Angels Care
            <div className="text-xs font-normal text-bac-muted -mt-0.5">
              Health Management System
            </div>
          </div>
        </Link>
      </div>

      <nav className="p-3 overflow-y-auto h-[calc(100%-72px)]">
        <Section title="DASHBOARD" items={MAIN_ITEMS} />
        <Section title="ADMIN" items={ADMIN_ITEMS} />
      </nav>
    </aside>
  );
}

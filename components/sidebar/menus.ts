// web/components/sidebar/menus.ts

export type MenuItem = {
  label: string;
  href?: string;
  icon?: string; // optional: name for lucide-react icon if you use it in Sidebar
  children?: MenuItem[];
  exact?: boolean;
};

export type MenuSection = {
  title: string;
  items: MenuItem[];
};

/** ========= MAIN (DASHBOARD) ITEMS ========= **/
export const MAIN_ITEMS: MenuItem[] = [
  { label: "Programs", href: "/programs" },
  { label: "Services", href: "/services" },

  // Individual có 2 menu con theo yêu cầu
  {
    label: "Individual",
    children: [
      { label: "New Individual", href: "/individual/new", exact: true },
      { label: "Search Individual", href: "/individual" },
    ],
  },

  { label: "Employees", href: "/employees" },
  { label: "Schedule", href: "/schedule" },
  { label: "Visited Maintenance", href: "/visited-maintenance" },
  { label: "Medication", href: "/medication" },
  { label: "FireDrill", href: "/firedrill" },
  { label: "Billing", href: "/billing" },
  { label: "Authorizations", href: "/authorizations" },
  { label: "Reports", href: "/reports" },
];

/** ========= ADMIN ITEMS ========= **/
export const ADMIN_ITEMS: MenuItem[] = [
  { label: "Manage Users", href: "/admin/users" },
  { label: "Manage User Roles", href: "/admin/roles" },
  { label: "Change Password", href: "/admin/change-password" },
];

/** ========= OPTIONAL GROUPED EXPORT (nếu Sidebar có dùng) ========= **/
export const dashboardSection: MenuSection = {
  title: "DASHBOARD",
  items: MAIN_ITEMS,
};

export const adminSection: MenuSection = {
  title: "ADMIN",
  items: ADMIN_ITEMS,
};

export const MENUS: MenuSection[] = [dashboardSection, adminSection];

export default MENUS;

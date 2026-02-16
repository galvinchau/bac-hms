// web/components/sidebar/menus.ts

export type MenuItem = {
  label: string;
  href?: string;
  icon?: string;
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
      { label: "New Individual", href: "/individual/new", exact: true },
      { label: "Search Individual", href: "/individual" },

      // ✅ NEW
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

  // ✅ Medication (PA-compliant submenus)
  {
    label: "Medication",
    children: [
      { label: "Orders", href: "/medication/orders" },
      { label: "MAR", href: "/medication/mar" },
      { label: "Treatment Record", href: "/medication/treatment" },

      // ✅ FIX: match folder names under app/medication/
      { label: "PRN & Vitals", href: "/medication/prn-vitals" },
      {
        label: "Inventory & Controlled",
        href: "/medication/inventory-controlled",
      },

      { label: "Incidents & Reports", href: "/medication/incidents" },
    ],
  },

  // ✅ RENAME
  { label: "House Management", href: "/firedrill" },

  // 🔒 ADMIN only (menu visibility)
  { label: "Billing", href: "/billing" },
  { label: "Payroll", href: "/payroll" },

  // ✅ Visible to ADMIN / HR / Office Staff (by employee.role)
  { label: "Time Keeping", href: "/time-keeping" },

  { label: "Authorizations", href: "/authorizations" },

  {
    label: "Reports",
    children: [{ label: "Daily Notes", href: "/reports/daily-notes" }],
  },
];

/** ========= ADMIN ITEMS ========= **/
export const ADMIN_ITEMS: MenuItem[] = [
  { label: "Manage Users", href: "/admin/users" },
  { label: "Manage User Roles", href: "/admin/user-roles" },
  { label: "Change Password", href: "/admin/change-password" },
];

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

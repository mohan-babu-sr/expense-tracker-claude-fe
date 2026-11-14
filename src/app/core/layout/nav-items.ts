export interface NavItem {
  path: string;
  label: string;
  /** Material icon (shown with the label — NFR5). */
  icon: string;
}

const DASHBOARD_ITEM: NavItem = { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' };
const EXPENSES_ITEM: NavItem = { path: '/expenses', label: 'Expenses', icon: 'receipt_long' };
const UPCOMING_ITEM: NavItem = { path: '/upcoming', label: 'Upcoming', icon: 'event_upcoming' };
const PLAN_ITEM: NavItem = { path: '/plan', label: 'Plan', icon: 'payments' };

/**
 * v5 (R10 v5, R21 AC3): Budgets leaves the phone bar (room for the centre Add button) and becomes a secondary page
 * on the phone — Settings → Manage, next to Categories. The laptop side nav keeps it with the main pages.
 */
export const BUDGETS_ITEM: NavItem = { path: '/budgets', label: 'Budgets', icon: 'savings' };

/** The 5 main pages (R10, R14, v4 R17–R19) — laptop side nav + toolbar titles. */
export const NAV_ITEMS: readonly NavItem[] = [DASHBOARD_ITEM, EXPENSES_ITEM, UPCOMING_ITEM, BUDGETS_ITEM, PLAN_ITEM];

/**
 * Phone bar (v5): 2 tabs · centre Add · 2 tabs. Split in halves so the template can put the Add button between
 * them while the tab order stays Dashboard → Expenses → Add → Upcoming → Plan.
 */
export const BOTTOM_NAV_ITEMS: { readonly start: readonly NavItem[]; readonly end: readonly NavItem[] } = {
  start: [DASHBOARD_ITEM, EXPENSES_ITEM],
  end: [UPCOMING_ITEM, PLAN_ITEM],
};

/**
 * v4 (R10 v4 change): Plan took Categories' place in the bottom nav (5 fit at 360px). Categories is now a
 * secondary page like Settings: side nav (above Settings) on laptop, Settings → Categories on mobile.
 */
export const CATEGORIES_ITEM: NavItem = { path: '/categories', label: 'Categories', icon: 'category' };

/** The admin's pages (R13 AC6); Settings (sign out) is the secondary item as for users. */
export const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  { path: '/admin/users', label: 'Users', icon: 'manage_accounts' },
  { path: '/admin/groups', label: 'Groups', icon: 'groups' },
];

/** Not in the nav — only gives the mobile toolbar a title. */
export const ADMIN_PASSWORD_ITEM: NavItem = { path: '/admin/password', label: 'Admin password', icon: 'password' };

/** Main nav for the signed-in account: group pages for users, the admin panel for the admin. */
export function navItemsFor(kind: 'user' | 'admin' | undefined): readonly NavItem[] {
  return kind === 'admin' ? ADMIN_NAV_ITEMS : NAV_ITEMS;
}

/**
 * Secondary destination (R11 AC1): bottom of the side nav on laptop, gear icon in the mobile
 * toolbar — deliberately NOT in the bottom nav, which keeps the 5 main pages.
 */
export const SETTINGS_ITEM: NavItem = { path: '/settings', label: 'Settings', icon: 'settings' };

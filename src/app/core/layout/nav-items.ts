export interface NavItem {
  path: string;
  label: string;
  /** Material icon (shown with the label — NFR5). */
  icon: string;
}

/** The 5 main pages (R10, R14, v4 R17–R19). Single source for the side nav, bottom nav and toolbar title. */
export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/expenses', label: 'Expenses', icon: 'receipt_long' },
  { path: '/upcoming', label: 'Upcoming', icon: 'event_upcoming' },
  { path: '/budgets', label: 'Budgets', icon: 'savings' },
  { path: '/plan', label: 'Plan', icon: 'payments' },
];

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

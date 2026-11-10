export interface NavItem {
  path: string;
  label: string;
  /** Material icon (shown with the label — NFR5). */
  icon: string;
}

/** The 4 pages (R10). Single source for the side nav, bottom nav and toolbar title. */
export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/expenses', label: 'Expenses', icon: 'receipt_long' },
  { path: '/budgets', label: 'Budgets', icon: 'savings' },
  { path: '/categories', label: 'Categories', icon: 'category' },
];

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
 * toolbar — deliberately NOT in the bottom nav, which keeps the 4 main pages.
 */
export const SETTINGS_ITEM: NavItem = { path: '/settings', label: 'Settings', icon: 'settings' };

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

/**
 * Secondary destination (R11 AC1): bottom of the side nav on laptop, gear icon in the mobile
 * toolbar — deliberately NOT in the bottom nav, which keeps the 4 main pages.
 */
export const SETTINGS_ITEM: NavItem = { path: '/settings', label: 'Settings', icon: 'settings' };

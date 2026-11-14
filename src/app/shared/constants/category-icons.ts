/**
 * Icons offered by the category icon picker (R5 AC2). All are Material Symbols names (v5: Material Symbols Rounded; `npm run icons` adds them to the font subset).
 * The first 10 match the seeded defaults (server/src/services/seed.ts).
 */
/** Readable name for an icon ligature, e.g. `local_grocery_store` → "local grocery store" (NFR5). */
export function iconName(icon: string): string {
  return icon.replace(/_/g, ' ');
}

export const CATEGORY_ICONS: readonly string[] = [
  // seeded defaults
  'restaurant',
  'directions_car',
  'shopping_bag',
  'receipt_long',
  'movie',
  'medical_services',
  'school',
  'home',
  'local_grocery_store',
  'category',
  // extra choices
  'pets',
  'local_cafe',
  'fastfood',
  'local_gas_station',
  'train',
  'flight',
  'hotel',
  'fitness_center',
  'spa',
  'checkroom',
  'phone_iphone',
  'wifi',
  'bolt',
  'water_drop',
  'child_care',
  'card_giftcard',
  'volunteer_activism',
  'savings',
  'build',
  'subscriptions',
  'sports_esports',
  'local_hospital',
  'menu_book',
  'celebration',
  'park',
  'work',
];

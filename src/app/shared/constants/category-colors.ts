/**
 * Palette for the category color picker (R5 AC2) — Material 300 shades, readable with dark text.
 *
 * These are DATA, not UI styling: the chosen hex is saved on the category in MongoDB and used
 * for its chip and chart slice. That's why they live here and not in the theme
 * (CLAUDE.md "no hard-coded colors" applies to component styles).
 * The first 10 match the seeded defaults (server/src/services/seed.ts).
 *
 * Each hex has a human name so screen readers announce "Red", not "#E57373" (NFR5).
 */
export const CATEGORY_COLOR_NAMES: Readonly<Record<string, string>> = {
  '#E57373': 'Red',
  '#64B5F6': 'Blue',
  '#BA68C8': 'Purple',
  '#FFB74D': 'Orange',
  '#F06292': 'Pink',
  '#4DB6AC': 'Teal',
  '#7986CB': 'Indigo',
  '#A1887F': 'Brown',
  '#81C784': 'Green',
  '#90A4AE': 'Blue grey',
  '#4FC3F7': 'Light blue',
  '#AED581': 'Light green',
  '#FFD54F': 'Amber',
  '#FF8A65': 'Deep orange',
  '#9575CD': 'Deep purple',
  '#4DD0E1': 'Cyan',
};

/** Picker order = insertion order of the map above (JS keeps string keys in insertion order). */
export const CATEGORY_COLORS: readonly string[] = Object.keys(CATEGORY_COLOR_NAMES);

/** Accessible name for a saved color; falls back to the hex for colors outside the palette. */
export function colorName(hex: string): string {
  return CATEGORY_COLOR_NAMES[hex.toUpperCase()] ?? hex;
}

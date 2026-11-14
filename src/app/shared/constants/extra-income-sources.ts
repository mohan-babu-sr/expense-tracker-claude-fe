import { ExtraIncomeSource } from '../models';

export interface ExtraIncomeSourceOption {
  value: ExtraIncomeSource;
  label: string;
  /** Material Symbols name shown in the Savings list. */
  icon: string;
}

/**
 * R20 AC1 — a fixed list, not a managed one: four values cover "parents gave money", "office bonus", gifts, and
 * anything else (with a note). `value` must match the server's EXTRA_INCOME_SOURCES.
 */
export const EXTRA_INCOME_SOURCES: readonly ExtraIncomeSourceOption[] = [
  { value: 'parents', label: 'Parents', icon: 'family_restroom' },
  { value: 'bonus', label: 'Bonus', icon: 'work' },
  { value: 'gift', label: 'Gift', icon: 'redeem' },
  { value: 'other', label: 'Other', icon: 'add_card' },
];

/** sourceOption('bonus') → { label: 'Bonus', icon: 'work' }; unknown values fall back to Other. */
export function sourceOption(source: string): ExtraIncomeSourceOption {
  return EXTRA_INCOME_SOURCES.find((o) => o.value === source) ?? EXTRA_INCOME_SOURCES[EXTRA_INCOME_SOURCES.length - 1];
}

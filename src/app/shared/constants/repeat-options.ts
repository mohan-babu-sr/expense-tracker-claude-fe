import { Repeat } from '../models';

export interface RepeatOption {
  value: Repeat;
  label: string;
}

/** R14 AC1 — order used in the select. `value` must match the server enum. */
export const REPEAT_OPTIONS: readonly RepeatOption[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'half_yearly', label: 'Every 6 months' },
  { value: 'yearly', label: 'Yearly' },
];

/** Quick lookup: REPEAT_LABELS['yearly'] → 'Yearly'. */
export const REPEAT_LABELS: Readonly<Record<Repeat, string>> = Object.fromEntries(
  REPEAT_OPTIONS.map((o) => [o.value, o.label]),
) as Record<Repeat, string>;

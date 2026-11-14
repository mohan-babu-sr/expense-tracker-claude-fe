import { RegularEvery } from '../models';

export interface RegularEveryOption {
  value: RegularEvery;
  label: string;
}

/** R18 AC1 — "repeats every" choices. `value` must match the server's REGULAR_EVERY. */
export const REGULAR_EVERY_OPTIONS: readonly RegularEveryOption[] = [
  { value: 1, label: 'Every month' },
  { value: 3, label: 'Every 3 months' },
  { value: 4, label: 'Every 4 months' },
  { value: 6, label: 'Every 6 months' },
  { value: 12, label: 'Every year' },
];

/** everyLabel(3) → 'Every 3 months'. */
export function everyLabel(every: number): string {
  return REGULAR_EVERY_OPTIONS.find((o) => o.value === every)?.label ?? `Every ${every} months`;
}

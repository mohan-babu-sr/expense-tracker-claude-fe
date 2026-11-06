import { PaymentMethod } from '../models';

export interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
  /** Material icon shown next to the label (NFR5: never color alone). */
  icon: string;
}

/** R1 AC1 — order used in selects and filters. `value` must match the server enum. */
export const PAYMENT_METHODS: readonly PaymentMethodOption[] = [
  { value: 'Cash', label: 'Cash', icon: 'payments' },
  { value: 'UPI', label: 'UPI', icon: 'qr_code_scanner' },
  { value: 'Card', label: 'Card', icon: 'credit_card' },
  { value: 'NetBanking', label: 'Net Banking', icon: 'account_balance' },
  { value: 'Other', label: 'Other', icon: 'more_horiz' },
];

/** Quick lookup: PAYMENT_METHOD_MAP['NetBanking'].label → 'Net Banking'. */
export const PAYMENT_METHOD_MAP: Readonly<Record<PaymentMethod, PaymentMethodOption>> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m]),
) as Record<PaymentMethod, PaymentMethodOption>;

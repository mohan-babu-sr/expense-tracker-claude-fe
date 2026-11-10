import { PaymentMethod } from './expense.model';

/**
 * Expense filters (design §2 "Common expense filters", R6).
 * Either `month` OR a custom `from`/`to` range is used; the range wins when set.
 */
export interface ExpenseFilter {
  /** `YYYY-MM` — default: current month. */
  month?: string;
  /** `YYYY-MM-DD` */
  from?: string;
  /** `YYYY-MM-DD` */
  to?: string;
  categoryIds?: string[];
  paymentMethod?: PaymentMethod;
  /** Member id (R12 v2 / R13 AC9). */
  userId?: string;
  /** Search text in note or merchant. */
  q?: string;
}

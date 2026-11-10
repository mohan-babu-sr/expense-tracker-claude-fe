import { Category } from './category.model';

/** Must match the server enum (server/src/models/expense.model.ts). */
export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'NetBanking' | 'Other';

/** Who spent it, as populated by the API (R13 AC9): just the member's id + name. */
export interface ExpenseUser {
  id: string;
  name: string;
}

/** Expense as returned by the API (design §1, R1–R4). */
export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  /** Populated category (may be null only in edge cases). */
  category: Category | null;
  /** Calendar date `YYYY-MM-DD`. */
  date: string;
  merchant?: string;
  note?: string;
  paymentMethod?: PaymentMethod;
  /** Member who spent it (R13 AC9). */
  userId: string;
  /** Populated member; null only if that account was deleted. */
  user: ExpenseUser | null;
  createdAt: string;
  updatedAt: string;
}

/** Body for POST/PUT /expenses. Empty optional fields may be sent as null. */
export interface ExpenseInput {
  amount: number;
  categoryId: string;
  date: string;
  merchant?: string | null;
  note?: string | null;
  paymentMethod?: PaymentMethod | null;
  /** Must be an active member of the group; missing → the signed-in user (server). */
  userId: string;
}

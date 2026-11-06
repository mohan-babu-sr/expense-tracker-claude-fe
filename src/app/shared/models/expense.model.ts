import { Category } from './category.model';

/** Must match the server enum (server/src/models/expense.model.ts). */
export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'NetBanking' | 'Other';

/** Who spent it (R12). Must match the server enum (USERS in server/src/models/expense.model.ts). */
export type ExpenseUser = 'Mohan' | 'Abhinaya';

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
  /** Always present: the server fills the default for older expenses (R12 AC2). */
  user: ExpenseUser;
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
  user: ExpenseUser;
}

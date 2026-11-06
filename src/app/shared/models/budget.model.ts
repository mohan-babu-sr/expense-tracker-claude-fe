import { Category } from './category.model';

/** R8 AC3: ok < 80%, warning 80–100%, danger > 100%. */
export type BudgetLevel = 'ok' | 'warning' | 'danger';

/** One budget with this month's spending (design §2 "BudgetStatus"). */
export interface BudgetStatus {
  /** Budget id (use for DELETE /budgets/:id). */
  id: string;
  /** null = overall monthly budget. */
  category: Category | null;
  budget: number;
  spent: number;
  percent: number;
  status: BudgetLevel;
}

/** GET /budgets?month= */
export interface BudgetSummary {
  overall: BudgetStatus | null;
  items: BudgetStatus[];
}

/** Body for PUT /budgets (upsert). `categoryId: null` = overall budget. */
export interface BudgetInput {
  categoryId: string | null;
  amount: number;
}

/** Response of PUT /budgets. */
export interface Budget {
  id: string;
  categoryId: string | null;
  amount: number;
  category?: Category | null;
}

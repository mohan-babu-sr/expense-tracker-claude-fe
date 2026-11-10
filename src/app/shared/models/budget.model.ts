import { UserRole } from './auth.model';
import { Category } from './category.model';

/** R8 AC3: ok < 80%, warning 80–100%, danger > 100%. */
export type BudgetLevel = 'ok' | 'warning' | 'danger';

/** One budget with this month's spending (design §2 "BudgetStatus"). */
export interface BudgetStatus {
  /** Budget id (use for DELETE /budgets/:id); 'overall' for the computed overall budget. */
  id: string;
  /** null = overall monthly budget (v3: sum of member limits, R15 AC3). */
  category: Category | null;
  budget: number;
  spent: number;
  percent: number;
  status: BudgetLevel;
}

/** One active member's monthly limit vs. their spending (design §10.2, R15 AC2). Nulls = no limit. */
export interface MemberBudget {
  user: { id: string; name: string; role: UserRole };
  limit: number | null;
  spent: number;
  /** limit − spent; negative = overspent. */
  balance: number | null;
  percent: number | null;
  status: BudgetLevel | null;
}

/** GET /budgets?month= */
export interface BudgetSummary {
  overall: BudgetStatus | null;
  members: MemberBudget[];
  items: BudgetStatus[];
}

/** Body for PUT /budgets (upsert a category budget). */
export interface BudgetInput {
  categoryId: string;
  amount: number;
}

/** Response of PUT /budgets. */
export interface Budget {
  id: string;
  categoryId: string | null;
  amount: number;
  category?: Category | null;
}

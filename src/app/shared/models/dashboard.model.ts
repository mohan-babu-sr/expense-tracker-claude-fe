import { BudgetStatus } from './budget.model';
import { Category } from './category.model';
import { Expense } from './expense.model';

export interface CategoryAmount {
  category: Category | null;
  amount: number;
}

export interface MonthAmount {
  /** `YYYY-MM` */
  month: string;
  amount: number;
}

/** GET /dashboard?month= (design §2, R7, R8 AC4). */
export interface Dashboard {
  month: string;
  totalSpent: number;
  count: number;
  avgPerDay: number;
  topCategory: CategoryAmount | null;
  /** null when the previous month had no spending. */
  changeVsPrevPct: number | null;
  /** Doughnut chart, largest first. */
  byCategory: CategoryAmount[];
  /** Bar chart, oldest → newest, always 6 entries. */
  last6Months: MonthAmount[];
  /** 5 most recent expenses of the month. */
  recent: Expense[];
  /** Budgets with status 'danger'. */
  overBudget: BudgetStatus[];
}

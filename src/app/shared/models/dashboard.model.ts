import { BudgetStatus, MemberBudget } from './budget.model';
import { Category } from './category.model';
import { Expense } from './expense.model';
import { DashboardPlan } from './plan.model';
import { Upcoming } from './upcoming.model';

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
  /** Members whose balance is below zero (R15 AC6). */
  overMembers: MemberBudget[];
  /** Every active member's limit / balance for the month — "My balance" card (R15 AC6). */
  members: MemberBudget[];
  /** Up to 5 open items due in the next 30 days (overdue included) + total of all of them (R14 AC6). */
  comingUp: { items: Upcoming[]; total: number };
  /** Salary banner for the dashboard month (R17 AC4). The Monthly plan card was removed (R19 AC7). */
  plan: DashboardPlan;
}

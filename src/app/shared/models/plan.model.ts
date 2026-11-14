/** Monthly plan & savings (R17–R19, design §12.4). Months are `YYYY-MM`, dates `YYYY-MM-DD`. */

export interface NamedUser {
  id: string;
  name: string;
}

/** One salary row of a month (R17). */
export interface SalaryRow {
  user: NamedUser;
  /** null = not entered yet. */
  amount: number | null;
  updatedBy: NamedUser | null;
  /** ISO timestamp of the last change. */
  updatedAt: string | null;
  /** Has a salary this month but is no longer an active member — read-only, still counted. */
  former: boolean;
}

/** One month's copy of a regular item (R18 AC3). `id` null = preview of a future month. */
export interface RegularEntry {
  id: string | null;
  itemId: string;
  month: string;
  name: string;
  amount: number;
  /** Repeats every N months (1, 3, 4, 6, 12). */
  every: number;
  paidAt: string | null;
  paidBy: NamedUser | null;
}

/** The numbers of the formula (R19 AC1–AC2) — shared by GET /plan and the dashboard card. */
export interface PlanNumbers {
  month: string;
  /** false before the plan start month (nothing required, nothing counted). */
  started: boolean;
  /** true when the month is over (it then counts in the overall savings). */
  finished: boolean;
  salaryTotal: number;
  regularTotal: number;
  limitsTotal: number;
  /** Salary − (regular + limits). */
  planned: number;
  spent: number;
  /** Salary − regular − spent (so far, for the current month). */
  actual: number;
  /** Active members without a salary for this month. */
  missing: NamedUser[];
}

/** GET /plan?month= */
export interface PlanMonth extends PlanNumbers {
  planStartMonth: string | null;
  salaries: SalaryRow[];
  regular: RegularEntry[];
}

/** Dashboard `plan` — only what the salary banner needs (R17 AC4). */
export interface DashboardPlan {
  month: string;
  /** false for months before the plan start → no banner. */
  started: boolean;
  missing: NamedUser[];
}

export type RegularEvery = 1 | 3 | 4 | 6 | 12;

/** A regular item template (R18 AC1). */
export interface RegularItem {
  id: string;
  name: string;
  amount: number;
  every: RegularEvery;
  startMonth: string;
  endMonth: string | null;
  note?: string;
  /** Next month it's due from the current month on; null = ended. */
  nextDue: string | null;
}

export interface RegularItemInput {
  name: string;
  amount: number;
  every: RegularEvery;
  startMonth: string;
  endMonth: string | null;
  note: string | null;
}

/** One row of the savings history (R19 AC6). */
export interface SavingsMonth {
  month: string;
  salaryTotal: number;
  regularTotal: number;
  spent: number;
  actual: number;
  /** Extra income dated in this month (R20) — shown on the row, not part of `actual`. */
  extra: number;
  /** false = current month, not yet in the overall total. */
  finished: boolean;
}

export interface Withdrawal {
  id: string;
  amount: number;
  date: string;
  reason: string;
  recordedBy: NamedUser;
}

export interface WithdrawalInput {
  amount: number;
  date: string;
  reason: string;
}

/** R20 AC1 — must match the server's EXTRA_INCOME_SOURCES. */
export type ExtraIncomeSource = 'parents' | 'bonus' | 'gift' | 'other';

/** Money that isn't salary, straight into savings (R20). */
export interface ExtraIncome {
  id: string;
  amount: number;
  date: string;
  source: ExtraIncomeSource;
  note: string | null;
  recordedBy: NamedUser;
}

export interface ExtraIncomeInput {
  amount: number;
  date: string;
  source: ExtraIncomeSource;
  note: string | null;
}

/** GET /savings (R19 AC4–AC6, R20). */
export interface Savings {
  started: boolean;
  planStartMonth: string | null;
  /** savedTotal + extraTotal − withdrawnTotal. */
  overall: number;
  savedTotal: number;
  extraTotal: number;
  withdrawnTotal: number;
  thisMonth: { month: string; planned: number; actual: number } | null;
  /** Newest first. */
  months: SavingsMonth[];
  /** Newest first. */
  extraIncome: ExtraIncome[];
  withdrawals: Withdrawal[];
}

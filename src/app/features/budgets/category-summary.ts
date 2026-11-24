import { BudgetStatus } from '../../shared/models';

/**
 * R8 AC6 (v8.4, design §13.11): the numbers behind the "By category" summary card, which explains why the family
 * total can show money left while a category is over — the overspend came out of the other categories' unused share.
 * Pure function (no Angular) so it's easy to read and reason about; only the Budgets page uses it.
 */
export interface CategorySummary {
  /** A — Σ category budgets, Σ spent in them, and the difference (negative = over). */
  budgetTotal: number;
  spentTotal: number;
  left: number;
  /** A — categories over budget: names (for the sentence) and Σ (spent − budget). */
  over: { names: string[]; amount: number };
  /** A — Σ (budget − spent) of the categories NOT over: the money that "covers" the overspend. */
  unused: number;
  /** B — Σ category budgets vs. the family total (sum of member limits). null when no limits are set. */
  check: 'equal' | 'short' | 'more' | null;
  /** B — |Σ budgets − family total|. */
  diff: number;
  /** B — family spent − Σ category spent: spending in categories without a budget. null when no limits. */
  unbudgetedSpent: number | null;
}

/** Work in paise so ₹0.1 + ₹0.2 style float noise never shows up as "₹0 over". */
const paise = (rupees: number) => Math.round(rupees * 100);
const rupees = (p: number) => p / 100;

export function categorySummary(items: BudgetStatus[], overall: BudgetStatus | null): CategorySummary {
  let budget = 0;
  let spent = 0;
  let over = 0;
  let unused = 0;
  const overNames: string[] = [];

  for (const i of items) {
    const b = paise(i.budget);
    const s = paise(i.spent);
    budget += b;
    spent += s;
    if (s > b) {
      over += s - b;
      overNames.push(i.category?.name ?? 'A category');
    } else {
      unused += b - s;
    }
  }

  let check: CategorySummary['check'] = null;
  let diff = 0;
  let unbudgetedSpent: number | null = null;
  if (overall) {
    const family = paise(overall.budget);
    check = budget === family ? 'equal' : budget < family ? 'short' : 'more';
    diff = Math.abs(budget - family);
    // Family spent counts every expense; category rows only budgeted categories. Never below 0.
    unbudgetedSpent = rupees(Math.max(0, paise(overall.spent) - spent));
  }

  return {
    budgetTotal: rupees(budget),
    spentTotal: rupees(spent),
    left: rupees(budget - spent),
    over: { names: overNames, amount: rupees(over) },
    unused: rupees(unused),
    check,
    diff: rupees(diff),
    unbudgetedSpent,
  };
}

/** "Food is" / "Food and Shopping are" / "3 categories are" — the subject of the over sentence. */
export function overSubject(names: string[]): string {
  if (names.length === 1) return `${names[0]} is`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are`;
  return `${names.length} categories are`;
}

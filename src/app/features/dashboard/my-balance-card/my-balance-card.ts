import { Component, computed, inject, input } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { BudgetLevel, MemberBudget } from '../../../shared/models';
import { currentMonth } from '../../../shared/utils/date.utils';

/** "Safe to spend today" (R15 AC6 v8.3): whole rupees per day for the days left, today included. */
export interface SafeToSpend {
  perDay: number;
  days: number;
}

const STATUS_ICON: Record<BudgetLevel, string> = { ok: 'check_circle', warning: 'warning', danger: 'error' };

/**
 * "My balance" (R15 AC6): the signed-in member's balance for the dashboard month (big number + progress),
 * and a compact list of the other members' balances. The dashboard only shows it when a limit is set.
 * Follows the dashboard month because the members' rows come from GET /dashboard?month=.
 */
@Component({
  selector: 'app-my-balance-card',
  standalone: false,
  templateUrl: './my-balance-card.html',
  styleUrl: './my-balance-card.scss',
})
export class MyBalanceCard {
  readonly members = input.required<MemberBudget[]>();
  /** The dashboard month (YYYY-MM) — "Safe to spend" only makes sense for the current one. */
  readonly month = input.required<string>();

  private readonly auth = inject(AuthService);
  private readonly myId = computed(() => this.auth.userMe()?.user.id ?? null);

  protected readonly me = computed(() => this.members().find((m) => m.user.id === this.myId()) ?? null);

  /**
   * R15 AC6 v8.3: balance ÷ days left in the month. Today counts (you can still spend today), so on the 30th of a
   * 30-day month days = 1. Rounded DOWN — a "safe" figure should never be a rupee more than you have.
   * null → line hidden: another month, no limit, or nothing left (the big number already says "Over by").
   */
  protected readonly safeToSpend = computed<SafeToSpend | null>(() => {
    const m = this.me();
    if (!m || m.limit === null || m.balance === null || m.balance <= 0 || this.month() !== currentMonth()) return null;
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const days = daysInMonth - today.getDate() + 1;
    return { perDay: Math.floor(m.balance / days), days };
  });
  protected readonly others = computed(() => this.members().filter((m) => m.user.id !== this.myId()));

  protected icon(m: MemberBudget): string {
    return m.status ? STATUS_ICON[m.status] : 'remove';
  }
}

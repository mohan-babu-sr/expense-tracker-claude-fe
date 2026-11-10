import { Component, computed, inject, input } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { BudgetLevel, MemberBudget } from '../../../shared/models';

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

  private readonly auth = inject(AuthService);
  private readonly myId = computed(() => this.auth.userMe()?.user.id ?? null);

  protected readonly me = computed(() => this.members().find((m) => m.user.id === this.myId()) ?? null);
  protected readonly others = computed(() => this.members().filter((m) => m.user.id !== this.myId()));

  protected icon(m: MemberBudget): string {
    return m.status ? STATUS_ICON[m.status] : 'remove';
  }
}

import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { LayoutService } from '../../../core/services/layout.service';
import { ExpenseFormDialog } from '../../../shared/components/expense-form-dialog/expense-form-dialog';
import { SalaryDialog } from '../../../shared/components/salary-dialog/salary-dialog';
import { Dashboard, Expense } from '../../../shared/models';
import { BalancePipe } from '../../../shared/pipes/balance.pipe';
import { currentMonth, monthToDate } from '../../../shared/utils/date.utils';

/**
 * Dashboard (R7, R8 AC4, R15 AC6): month picker, over-budget banner, summary cards, my balance, doughnut by category,
 * 6-month bar chart and the 5 most recent expenses. Everything comes from ONE request
 * (GET /api/dashboard?month=), so all numbers on the page are consistent with each other.
 */
@Component({
  selector: 'app-dashboard-page',
  standalone: false,
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  private readonly dashboardService = inject(DashboardService);
  private readonly dialog = inject(MatDialog);
  private readonly isMobile = inject(LayoutService).isMobile;
  private readonly balance = new BalancePipe();
  private readonly auth = inject(AuthService);

  protected readonly month = signal(currentMonth());
  protected readonly data = signal<Dashboard | null>(null);
  private request?: Subscription;

  protected readonly subtitle = computed(() =>
    new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(monthToDate(this.month())),
  );

  /** R8 AC4 + R15 AC6: "Over budget: Food (110%), Overall (104%), Abhinaya (over by ₹200)". */
  protected readonly overBudgetText = computed(() => {
    const d = this.data();
    if (!d) return '';
    const budgets = d.overBudget.map((b) => `${b.category?.name ?? 'Overall'} (${b.percent}%)`);
    const members = d.overMembers.map((m) => `${m.user.name} (${this.balance.transform(m.balance).toLowerCase()})`);
    return [...budgets, ...members].join(', ');
  });

  /** "My balance" card only when at least one member has a limit (R15 AC6). */
  protected readonly hasLimits = computed(() => (this.data()?.members ?? []).some((m) => m.limit !== null));

  /** R17 AC4: banner while the signed-in member's salary for the dashboard month is missing. */
  protected readonly mySalaryMissing = computed(() => {
    const plan = this.data()?.plan;
    const me = this.auth.userMe()?.user.id;
    return !!plan?.started && !!me && plan.missing.some((u) => u.id === me);
  });

  constructor() {
    effect(() => {
      this.month();
      untracked(() => this.load());
    });
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.request = this.dashboardService.get(this.month()).subscribe((d) => this.data.set(d));
  }

  protected enterSalary(): void {
    const me = this.auth.userMe()?.user;
    if (!me) return;
    SalaryDialog.open(this.dialog, { user: me, month: this.month(), amount: null, isMe: true })
      .pipe(filter(Boolean))
      .subscribe(() => this.load());
  }

  /** Tap a recent expense → edit it; numbers refresh after saving (R3 AC2). */
  protected onEdit(expense: Expense): void {
    ExpenseFormDialog.open(this.dialog, this.isMobile(), { expense })
      .pipe(filter(Boolean))
      .subscribe(() => this.load());
  }
}

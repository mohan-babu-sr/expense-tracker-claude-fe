import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription, filter } from 'rxjs';
import { DashboardService } from '../../../core/services/dashboard.service';
import { LayoutService } from '../../../core/services/layout.service';
import { ExpenseFormDialog } from '../../../shared/components/expense-form-dialog/expense-form-dialog';
import { Dashboard, Expense } from '../../../shared/models';
import { currentMonth, monthToDate } from '../../../shared/utils/date.utils';

/**
 * Dashboard (R7, R8 AC4): month picker, over-budget banner, summary cards, doughnut by category,
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

  protected readonly month = signal(currentMonth());
  protected readonly data = signal<Dashboard | null>(null);
  private request?: Subscription;

  protected readonly subtitle = computed(() =>
    new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(monthToDate(this.month())),
  );

  /** R8 AC4: "Over budget: Food (110%), Overall (104%)". */
  protected readonly overBudgetText = computed(() =>
    (this.data()?.overBudget ?? []).map((b) => `${b.category?.name ?? 'Overall'} (${b.percent}%)`).join(', '),
  );

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

  /** Tap a recent expense → edit it; numbers refresh after saving (R3 AC2). */
  protected onEdit(expense: Expense): void {
    ExpenseFormDialog.open(this.dialog, this.isMobile(), { expense })
      .pipe(filter(Boolean))
      .subscribe(() => this.load());
  }
}

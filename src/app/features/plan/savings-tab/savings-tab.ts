import { Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { filter, switchMap } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { PlanService } from '../../../core/services/plan.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { sourceOption } from '../../../shared/constants';
import { ExtraIncome, Savings, SavingsMonth, Withdrawal } from '../../../shared/models';
import { monthToDate } from '../../../shared/utils/date.utils';
import { ExtraIncomeDialog } from '../extra-income-dialog/extra-income-dialog';
import { WithdrawalDialog } from '../withdrawal-dialog/withdrawal-dialog';

/**
 * Plan → Savings (R19 AC3–AC6, R20):
 *  - overall savings = actual savings of every finished month + extra income − withdrawals
 *    (each month starts at ₹0; extra income counts at once),
 *  - extra income (parents, bonus, gift…): add (any member) and delete with confirmation,
 *  - this month so far (joins the total when the month ends),
 *  - one history row per month since the plan started, newest first,
 *  - withdrawals: record (any member) and delete with confirmation.
 */
@Component({
  selector: 'app-savings-tab',
  standalone: false,
  templateUrl: './savings-tab.html',
  styleUrl: './savings-tab.scss',
})
export class SavingsTab {
  private readonly planService = inject(PlanService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  protected readonly savings = signal<Savings | null>(null);
  protected readonly monthDate = monthToDate;
  protected readonly sourceOption = sourceOption;

  constructor() {
    this.load();
  }

  private load(): void {
    this.planService.getSavings().subscribe((s) => this.savings.set(s));
  }

  protected withdraw(): void {
    const s = this.savings();
    if (!s) return;
    WithdrawalDialog.open(this.dialog, { overall: s.overall })
      .pipe(filter(Boolean))
      .subscribe((updated) => this.savings.set(updated));
  }

  /** History bar (v5.1): share of the month's salary saved, 0–100. A short month shows a small red stub. */
  protected sharePct(m: SavingsMonth): number {
    if (m.salaryTotal <= 0) return 0;
    if (m.actual < 0) return 6;
    return Math.min(100, Math.round((m.actual / m.salaryTotal) * 100));
  }

  protected addExtra(): void {
    const start = this.savings()?.planStartMonth;
    if (!start) return;
    ExtraIncomeDialog.open(this.dialog, { planStartMonth: start })
      .pipe(filter(Boolean))
      .subscribe((updated) => this.savings.set(updated));
  }

  protected removeExtra(e: ExtraIncome): void {
    const label = e.note ? `${this.sourceOption(e.source).label} · ${e.note}` : this.sourceOption(e.source).label;
    ConfirmDialog.open(this.dialog, {
      title: 'Delete this extra income?',
      message: `${label} · ₹${e.amount} — it comes out of the overall savings.`,
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.planService.deleteExtraIncome(e.id)),
      )
      .subscribe(() => {
        this.notification.success('Extra income deleted');
        this.load();
      });
  }

  protected remove(w: Withdrawal): void {
    ConfirmDialog.open(this.dialog, {
      title: 'Delete this withdrawal?',
      message: `${w.reason} · ₹${w.amount} — the amount goes back into the overall savings.`,
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.planService.deleteWithdrawal(w.id)),
      )
      .subscribe(() => {
        this.notification.success('Withdrawal deleted');
        this.load();
      });
  }
}

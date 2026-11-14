import { Component, computed, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/services/auth.service';
import { LayoutService } from '../../../core/services/layout.service';
import { PlanService } from '../../../core/services/plan.service';
import { ExpenseFormDialog } from '../expense-form-dialog/expense-form-dialog';

/**
 * Laptop "Add expense" button for <app-page-header> (R10 AC3). v5: renders nothing on the phone — the bottom bar's
 * centre Add button takes over there (design §13.3). Pages refresh through ExpenseEventsService, which the
 * expense form notifies after every new expense, so this button no longer emits anything.
 */
@Component({
  selector: 'app-add-expense-button',
  standalone: false,
  templateUrl: './add-expense-button.html',
  styleUrl: './add-expense-button.scss',
})
export class AddExpenseButton {
  private readonly dialog = inject(MatDialog);
  protected readonly isMobile = inject(LayoutService).isMobile;
  private readonly plan = inject(PlanService);
  private readonly auth = inject(AuthService);
  private readonly me = computed(() => this.auth.userMe()?.user ?? null);

  /** Salary first (R17 AC3): openAdd asks for this month's salary when it's missing, then opens the form. */
  protected open(): void {
    ExpenseFormDialog.openAdd(this.dialog, this.isMobile(), this.plan, this.me()).subscribe();
  }
}

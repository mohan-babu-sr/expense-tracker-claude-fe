import { Component, computed, inject, output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { LayoutService } from '../../../core/services/layout.service';
import { PlanService } from '../../../core/services/plan.service';
import { Expense } from '../../models';
import { ExpenseFormDialog } from '../expense-form-dialog/expense-form-dialog';

/**
 * "Add expense" entry point (R10 AC3, design §5) — one component, two looks:
 *   laptop → filled button (place it inside <app-page-header>)
 *   mobile → floating action button above the bottom nav
 * Opens the expense form and emits the created expense so the page can refresh.
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

  readonly saved = output<Expense>();

  /** Salary first (R17 AC3): openAdd asks for this month's salary when it's missing, then opens the form. */
  protected open(): void {
    ExpenseFormDialog.openAdd(this.dialog, this.isMobile(), this.plan, this.me())
      .pipe(filter((e): e is Expense => !!e))
      .subscribe((expense) => this.saved.emit(expense));
  }
}

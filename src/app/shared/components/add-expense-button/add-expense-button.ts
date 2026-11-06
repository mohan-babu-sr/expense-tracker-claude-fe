import { Component, inject, output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { filter } from 'rxjs';
import { LayoutService } from '../../../core/services/layout.service';
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

  readonly saved = output<Expense>();

  protected open(): void {
    ExpenseFormDialog.open(this.dialog, this.isMobile())
      .pipe(filter((e): e is Expense => !!e))
      .subscribe((expense) => this.saved.emit(expense));
  }
}

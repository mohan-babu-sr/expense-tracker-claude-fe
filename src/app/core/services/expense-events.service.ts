import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Expense } from '../../shared/models';

/**
 * "An expense was added" — v5 (R21 AC3, design §13.3).
 *
 * The phone's centre Add button lives in the app shell, not in a page, so it has no page to hand the new expense to.
 * Instead the expense form announces every created expense here, and pages that show totals (Dashboard, Expenses,
 * Budgets, Plan → Month) reload when it fires — whichever button the user pressed.
 */
@Injectable({ providedIn: 'root' })
export class ExpenseEventsService {
  private readonly added = new Subject<Expense>();

  /** Emits each newly created expense (not edits — pages reload after their own edit dialogs). */
  readonly added$: Observable<Expense> = this.added.asObservable();

  notifyAdded(expense: Expense): void {
    this.added.next(expense);
  }
}

import { Injector } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { LayoutService } from '../../../core/services/layout.service';
import { PlanService } from '../../../core/services/plan.service';
import { Expense } from '../../models';
import { ExpenseFormDialog } from './expense-form-dialog';

/**
 * Entry point for the phone bar's centre Add button (v5, design §13.3).
 *
 * The bottom nav lives in CoreModule (main bundle). It loads THIS file with a dynamic import() on tap, so the
 * expense form, salary dialog and their Material modules stay in the lazy chunk instead of the first page load.
 * Same salary-first flow as every other Add (R17 AC3); the form announces the new expense via ExpenseEventsService.
 */
export function openAddExpense(injector: Injector): Observable<Expense | undefined> {
  return ExpenseFormDialog.openAdd(
    injector.get(MatDialog),
    injector.get(LayoutService).isMobile(),
    injector.get(PlanService),
    injector.get(AuthService).userMe()?.user ?? null,
  );
}

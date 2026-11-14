import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { skipErrorSnackbar } from '../../../core/interceptors/http-context.tokens';
import { NotificationService } from '../../../core/services/notification.service';
import { PlanService } from '../../../core/services/plan.service';
import { NamedUser, PlanMonth } from '../../models';
import { applyServerErrors } from '../../utils/server-errors';
import { monthToDate } from '../../utils/date.utils';
import { twoDecimals } from '../../utils/validators';

export interface SalaryDialogData {
  user: NamedUser;
  /** `YYYY-MM`. */
  month: string;
  /** Current amount (edit) or null (not entered yet). */
  amount: number | null;
  /** The signed-in member — the title says "Your salary". */
  isMe: boolean;
  /** Optional line above the field, e.g. why it's asked before adding an expense (R17 AC3). */
  reason?: string;
}

/**
 * Enter / edit one member's salary for one month (R17 AC1–AC2). Shared because three places open it:
 * the Plan page, the dashboard banner and the "salary first" step before adding an expense (R17 AC3).
 * Closes with the updated PlanMonth, or undefined when cancelled.
 */
@Component({
  selector: 'app-salary-dialog',
  standalone: false,
  templateUrl: './salary-dialog.html',
  styleUrl: './salary-dialog.scss',
})
export class SalaryDialog {
  protected readonly data = inject<SalaryDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<SalaryDialog, PlanMonth>>(MatDialogRef);
  private readonly planService = inject(PlanService);
  private readonly notification = inject(NotificationService);

  protected readonly busy = signal(false);
  protected readonly monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(
    monthToDate(this.data.month),
  );
  protected readonly title = this.data.isMe ? 'Your salary' : `${this.data.user.name}'s salary`;

  protected readonly form = inject(FormBuilder).group({
    amount: [this.data.amount, [Validators.required, Validators.min(0), twoDecimals]],
  });

  static open(dialog: MatDialog, data: SalaryDialogData): Observable<PlanMonth | undefined> {
    return dialog
      .open<SalaryDialog, SalaryDialogData, PlanMonth>(SalaryDialog, {
        data,
        width: '440px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: 'input',
      })
      .afterClosed();
  }

  protected amountError(): string {
    const e = this.form.controls.amount.errors;
    if (e?.['server']) return e['server'];
    if (e?.['required']) return 'Salary is required — enter 0 if there was no income';
    if (e?.['min']) return 'Salary cannot be negative';
    if (e?.['decimals']) return 'Use at most 2 decimals (paise)';
    return 'Enter a valid amount';
  }

  protected save(): void {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    const amount = Number(this.form.getRawValue().amount);
    this.planService.setSalary(this.data.user.id, this.data.month, amount, skipErrorSnackbar()).subscribe({
      next: (plan) => {
        this.notification.success('Salary saved');
        this.dialogRef.close(plan);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        if (!applyServerErrors(this.form, err)) this.notification.error(errorMessage(err));
      },
    });
  }
}

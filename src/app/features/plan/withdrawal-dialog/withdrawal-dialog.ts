import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { skipErrorSnackbar } from '../../../core/interceptors/http-context.tokens';
import { NotificationService } from '../../../core/services/notification.service';
import { PlanService } from '../../../core/services/plan.service';
import { Savings } from '../../../shared/models';
import { toIsoDate } from '../../../shared/utils/date.utils';
import { applyServerErrors } from '../../../shared/utils/server-errors';
import { twoDecimals } from '../../../shared/utils/validators';

export interface WithdrawalDialogData {
  /** Current overall savings — shown as a hint and used as the field's max. */
  overall: number;
}

/**
 * Take money out of savings (R19 AC5): amount, date (not in the future), reason.
 * More than the overall savings is refused by the server (409 → "Only ₹X saved" under the amount).
 * Closes with the updated savings.
 */
@Component({
  selector: 'app-withdrawal-dialog',
  standalone: false,
  templateUrl: './withdrawal-dialog.html',
  styleUrl: './withdrawal-dialog.scss',
})
export class WithdrawalDialog {
  protected readonly data = inject<WithdrawalDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<WithdrawalDialog, Savings>>(MatDialogRef);
  private readonly planService = inject(PlanService);
  private readonly notification = inject(NotificationService);

  protected readonly busy = signal(false);
  protected readonly today = new Date();

  protected readonly form = inject(FormBuilder).group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01), twoDecimals]],
    date: [new Date(), Validators.required],
    reason: ['', [Validators.required, Validators.maxLength(100)]],
  });

  static open(dialog: MatDialog, data: WithdrawalDialogData): Observable<Savings | undefined> {
    return dialog
      .open<WithdrawalDialog, WithdrawalDialogData, Savings>(WithdrawalDialog, {
        data,
        width: '440px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: 'first-tabbable',
      })
      .afterClosed();
  }

  protected error(field: keyof typeof this.form.controls): string {
    const e = this.form.controls[field].errors;
    if (!e) return '';
    if (e['server']) return e['server'];
    switch (field) {
      case 'amount':
        if (e['required']) return 'Amount is required';
        if (e['min']) return 'Amount must be greater than 0';
        if (e['decimals']) return 'Use at most 2 decimals (paise)';
        return 'Enter a valid amount';
      case 'date':
        if (e['matDatepickerMax']) return 'Date cannot be in the future';
        if (e['matDatepickerParse']) return 'Enter a date as dd/mm/yyyy';
        return 'Date is required';
      case 'reason':
        return e['required'] ? 'Reason is required' : 'At most 100 characters';
      default:
        return 'Invalid value';
    }
  }

  protected save(): void {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.planService
      .withdraw({ amount: Number(v.amount), date: toIsoDate(v.date!), reason: v.reason!.trim() }, skipErrorSnackbar())
      .subscribe({
        next: (savings) => {
          this.notification.success('Withdrawal recorded');
          this.dialogRef.close(savings);
        },
        error: (err: HttpErrorResponse) => {
          this.busy.set(false);
          if (!applyServerErrors(this.form, err)) this.notification.error(errorMessage(err));
        },
      });
  }
}

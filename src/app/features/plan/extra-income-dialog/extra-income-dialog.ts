import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { skipErrorSnackbar } from '../../../core/interceptors/http-context.tokens';
import { NotificationService } from '../../../core/services/notification.service';
import { PlanService } from '../../../core/services/plan.service';
import { EXTRA_INCOME_SOURCES } from '../../../shared/constants';
import { ExtraIncomeSource, Savings } from '../../../shared/models';
import { monthToDate, toIsoDate } from '../../../shared/utils/date.utils';
import { applyServerErrors } from '../../../shared/utils/server-errors';
import { twoDecimals } from '../../../shared/utils/validators';

export interface ExtraIncomeDialogData {
  /** 'YYYY-MM' — the earliest month allowed (R20 AC1: no "opening balance" before the plan). */
  planStartMonth: string;
}

/**
 * Add money that isn't salary — parents, bonus, gift, other (R20 AC1). It goes straight into overall savings and
 * leaves the month's salary/planned/actual numbers alone (R20 AC2). Closes with the updated savings.
 */
@Component({
  selector: 'app-extra-income-dialog',
  standalone: false,
  templateUrl: './extra-income-dialog.html',
  styleUrl: './extra-income-dialog.scss',
})
export class ExtraIncomeDialog {
  protected readonly data = inject<ExtraIncomeDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ExtraIncomeDialog, Savings>>(MatDialogRef);
  private readonly planService = inject(PlanService);
  private readonly notification = inject(NotificationService);

  protected readonly sources = EXTRA_INCOME_SOURCES;
  protected readonly busy = signal(false);
  protected readonly today = new Date();
  protected readonly minDate = monthToDate(this.data.planStartMonth);

  protected readonly form = inject(FormBuilder).group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01), twoDecimals]],
    date: [new Date(), Validators.required],
    source: [null as ExtraIncomeSource | null, Validators.required],
    note: ['', Validators.maxLength(100)],
  });

  static open(dialog: MatDialog, data: ExtraIncomeDialogData): Observable<Savings | undefined> {
    return dialog
      .open<ExtraIncomeDialog, ExtraIncomeDialogData, Savings>(ExtraIncomeDialog, {
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
        if (e['matDatepickerMin']) return 'Pick a date from the plan start month on';
        if (e['matDatepickerParse']) return 'Enter a date as dd/mm/yyyy';
        return 'Date is required';
      case 'source':
        return 'Pick a source';
      case 'note':
        return 'At most 100 characters';
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
      .addExtraIncome(
        { amount: Number(v.amount), date: toIsoDate(v.date!), source: v.source!, note: v.note?.trim() || null },
        skipErrorSnackbar(),
      )
      .subscribe({
        next: (savings) => {
          this.notification.success('Added to savings');
          this.dialogRef.close(savings);
        },
        error: (err: HttpErrorResponse) => {
          this.busy.set(false);
          if (!applyServerErrors(this.form, err)) this.notification.error(errorMessage(err));
        },
      });
  }
}

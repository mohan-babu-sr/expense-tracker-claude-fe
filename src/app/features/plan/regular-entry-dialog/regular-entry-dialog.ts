import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { skipErrorSnackbar } from '../../../core/interceptors/http-context.tokens';
import { NotificationService } from '../../../core/services/notification.service';
import { PlanService } from '../../../core/services/plan.service';
import { RegularEntry } from '../../../shared/models';
import { applyServerErrors } from '../../../shared/utils/server-errors';
import { twoDecimals } from '../../../shared/utils/validators';

export interface RegularEntryDialogData {
  entry: RegularEntry;
  /** "November 2026". */
  monthLabel: string;
}

/**
 * Change ONE month's amount of a regular item (R18 AC3), e.g. a higher electricity bill.
 * The item itself (and every other month) keeps its usual amount.
 */
@Component({
  selector: 'app-regular-entry-dialog',
  standalone: false,
  templateUrl: './regular-entry-dialog.html',
  styleUrl: './regular-entry-dialog.scss',
})
export class RegularEntryDialog {
  protected readonly data = inject<RegularEntryDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<RegularEntryDialog, RegularEntry>>(MatDialogRef);
  private readonly planService = inject(PlanService);
  private readonly notification = inject(NotificationService);

  protected readonly busy = signal(false);
  protected readonly form = inject(FormBuilder).group({
    amount: [this.data.entry.amount, [Validators.required, Validators.min(0.01), twoDecimals]],
  });

  protected amountError(): string {
    const e = this.form.controls.amount.errors;
    if (e?.['server']) return e['server'];
    if (e?.['required']) return 'Amount is required';
    if (e?.['min']) return 'Amount must be greater than 0';
    if (e?.['decimals']) return 'Use at most 2 decimals (paise)';
    return 'Enter a valid amount';
  }

  protected save(): void {
    if (this.form.invalid || this.busy() || !this.data.entry.id) return;
    this.busy.set(true);
    const amount = Number(this.form.getRawValue().amount);
    this.planService.updateEntry(this.data.entry.id, { amount }, skipErrorSnackbar()).subscribe({
      next: (entry) => {
        this.notification.success(`${entry.name} updated for ${this.data.monthLabel}`);
        this.dialogRef.close(entry);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        if (!applyServerErrors(this.form, err)) this.notification.error(errorMessage(err));
      },
    });
  }
}

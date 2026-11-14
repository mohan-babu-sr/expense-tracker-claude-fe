import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { skipErrorSnackbar } from '../../../core/interceptors/http-context.tokens';
import { NotificationService } from '../../../core/services/notification.service';
import { PlanService } from '../../../core/services/plan.service';
import { REGULAR_EVERY_OPTIONS } from '../../../shared/constants';
import { RegularEvery, RegularItem, RegularItemInput } from '../../../shared/models';
import { currentMonth } from '../../../shared/utils/date.utils';
import { applyServerErrors } from '../../../shared/utils/server-errors';
import { twoDecimals } from '../../../shared/utils/validators';

export interface RegularItemDialogData {
  /** Present = edit; absent = add. */
  item?: RegularItem;
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** "Ends after" must not be before "Starts in" (same rule as the server). Error key `endBeforeStart` on the group. */
function endAfterStart(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startMonth')?.value as string | null;
  const end = group.get('endMonth')?.value as string | null;
  return start && end && end < start ? { endBeforeStart: true } : null;
}

/**
 * Add / edit a regular item template (R18 AC1). Same responsive pattern as the other add/edit forms:
 * 520px dialog on laptop, full-screen on mobile. Months use the browser's month input (YYYY-MM).
 * Saving changes the current and future months only — past months keep what they had (R18 AC5).
 */
@Component({
  selector: 'app-regular-item-dialog',
  standalone: false,
  templateUrl: './regular-item-dialog.html',
  styleUrl: './regular-item-dialog.scss',
})
export class RegularItemDialog {
  private readonly data = inject<RegularItemDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<RegularItemDialog, RegularItem>>(MatDialogRef);
  private readonly planService = inject(PlanService);
  private readonly notification = inject(NotificationService);

  protected readonly isEdit = !!this.data.item;
  protected readonly saving = signal(false);
  protected readonly everyOptions = REGULAR_EVERY_OPTIONS;

  protected readonly form = inject(FormBuilder).group(
    {
      name: [this.data.item?.name ?? '', [Validators.required, Validators.maxLength(40)]],
      amount: [this.data.item?.amount ?? (null as number | null), [Validators.required, Validators.min(0.01), twoDecimals]],
      every: [this.data.item?.every ?? (1 as RegularEvery), Validators.required],
      startMonth: [this.data.item?.startMonth ?? currentMonth(), [Validators.required, Validators.pattern(MONTH_PATTERN)]],
      endMonth: [this.data.item?.endMonth ?? '', Validators.pattern(MONTH_PATTERN)],
      note: [this.data.item?.note ?? '', Validators.maxLength(200)],
    },
    { validators: endAfterStart },
  );

  static open(dialog: MatDialog, isMobile: boolean, data: RegularItemDialogData = {}): Observable<RegularItem | undefined> {
    const config: MatDialogConfig<RegularItemDialogData> = isMobile
      ? { data, width: '100vw', maxWidth: '100vw', height: '100dvh', panelClass: 'full-screen-dialog' }
      : { data, width: '520px', maxWidth: 'calc(100vw - 32px)' };
    return dialog
      .open<RegularItemDialog, RegularItemDialogData, RegularItem>(RegularItemDialog, { ...config, autoFocus: 'first-tabbable' })
      .afterClosed();
  }

  protected error(field: keyof typeof this.form.controls): string {
    const e = this.form.controls[field].errors;
    if (!e) return '';
    if (e['server']) return e['server'];
    switch (field) {
      case 'name':
        return e['required'] ? 'Name is required' : 'At most 40 characters';
      case 'amount':
        if (e['required']) return 'Amount is required';
        if (e['min']) return 'Amount must be greater than 0';
        if (e['decimals']) return 'Use at most 2 decimals (paise)';
        return 'Enter a valid amount';
      case 'startMonth':
        return e['required'] ? 'Start month is required' : 'Choose a month';
      case 'endMonth':
        return 'Choose a month';
      case 'note':
        return 'At most 200 characters';
      default:
        return 'Invalid value';
    }
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input: RegularItemInput = {
      name: v.name!.trim(),
      amount: Number(v.amount),
      every: Number(v.every) as RegularEvery,
      startMonth: v.startMonth!,
      endMonth: v.endMonth || null,
      note: v.note?.trim() || null,
    };

    this.saving.set(true);
    const request = this.data.item
      ? this.planService.updateItem(this.data.item.id, input, skipErrorSnackbar())
      : this.planService.createItem(input, skipErrorSnackbar());
    request.subscribe({
      next: (item) => {
        this.notification.success(this.isEdit ? 'Regular item updated' : 'Regular item added');
        this.dialogRef.close(item);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notification.error(errorMessage(err));
      },
    });
  }
}

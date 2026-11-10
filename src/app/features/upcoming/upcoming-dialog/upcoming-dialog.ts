import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { skipErrorSnackbar } from '../../../core/interceptors/http-context.tokens';
import { CategoryService } from '../../../core/services/category.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UpcomingService } from '../../../core/services/upcoming.service';
import { REPEAT_OPTIONS } from '../../../shared/constants';
import { Repeat, Upcoming, UpcomingInput } from '../../../shared/models';
import { fromIsoDate, toIsoDate } from '../../../shared/utils/date.utils';
import { twoDecimals } from '../../../shared/utils/validators';

export interface UpcomingDialogData {
  /** Present = edit; absent = add. */
  item?: Upcoming;
}

/**
 * Add / edit an upcoming item (R14 AC1, AC4). Same responsive pattern as the expense form (R1 AC4):
 * a 520px dialog on laptop, full-screen on mobile — open with the static helper.
 * Unlike expenses, the due date may be in the future (that's the point) or the past (shown as overdue).
 */
@Component({
  selector: 'app-upcoming-dialog',
  standalone: false,
  templateUrl: './upcoming-dialog.html',
  styleUrl: './upcoming-dialog.scss',
})
export class UpcomingDialog {
  private readonly data = inject<UpcomingDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<UpcomingDialog, Upcoming>>(MatDialogRef);
  private readonly upcomingService = inject(UpcomingService);
  private readonly notification = inject(NotificationService);

  protected readonly isEdit = !!this.data.item;
  protected readonly saving = signal(false);
  protected readonly repeatOptions = REPEAT_OPTIONS;
  protected readonly categories = toSignal(inject(CategoryService).getAll(), { initialValue: [] });

  protected readonly form = inject(FormBuilder).group({
    title: [this.data.item?.title ?? '', [Validators.required, Validators.maxLength(60)]],
    categoryId: [this.data.item?.categoryId ?? '', Validators.required],
    amount: [this.data.item?.amount ?? (null as number | null), [Validators.required, Validators.min(0.01), twoDecimals]],
    dueDate: [this.data.item ? fromIsoDate(this.data.item.dueDate) : (null as Date | null), Validators.required],
    repeat: [this.data.item?.repeat ?? ('none' as Repeat), Validators.required],
    note: [this.data.item?.note ?? '', Validators.maxLength(200)],
  });

  private readonly categoryIdValue = toSignal(this.form.controls.categoryId.valueChanges, {
    initialValue: this.form.controls.categoryId.value,
  });
  protected readonly selectedCategory = computed(() => this.categories().find((c) => c.id === this.categoryIdValue()));

  /** Laptop: 520px dialog. Mobile: full-screen (R14 AC4 → R1 AC4). Emits the saved item. */
  static open(dialog: MatDialog, isMobile: boolean, data: UpcomingDialogData = {}): Observable<Upcoming | undefined> {
    const config: MatDialogConfig<UpcomingDialogData> = isMobile
      ? { data, width: '100vw', maxWidth: '100vw', height: '100dvh', panelClass: 'full-screen-dialog' }
      : { data, width: '520px', maxWidth: 'calc(100vw - 32px)' };
    return dialog
      .open<UpcomingDialog, UpcomingDialogData, Upcoming>(UpcomingDialog, { ...config, autoFocus: 'first-tabbable' })
      .afterClosed();
  }

  protected error(field: keyof typeof this.form.controls): string {
    const e = this.form.controls[field].errors;
    if (!e) return '';
    if (e['server']) return e['server'];
    switch (field) {
      case 'title':
        return e['required'] ? 'Title is required' : 'At most 60 characters';
      case 'amount':
        if (e['required']) return 'Amount is required';
        if (e['min']) return 'Amount must be greater than 0';
        if (e['decimals']) return 'Use at most 2 decimals (paise)';
        return 'Enter a valid amount';
      case 'categoryId':
        return 'Choose a category';
      case 'dueDate':
        if (e['matDatepickerParse']) return 'Enter a date as dd/mm/yyyy';
        return 'Due date is required';
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
    const input: UpcomingInput = {
      title: v.title!.trim(),
      categoryId: v.categoryId!,
      amount: Number(v.amount),
      dueDate: toIsoDate(v.dueDate!),
      repeat: v.repeat!,
      note: v.note?.trim() || null,
    };

    this.saving.set(true);
    const request = this.data.item
      ? this.upcomingService.update(this.data.item.id, input, skipErrorSnackbar())
      : this.upcomingService.create(input, skipErrorSnackbar());

    request.subscribe({
      next: (saved) => {
        this.notification.success(this.isEdit ? 'Item updated' : 'Item added');
        this.dialogRef.close(saved);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        // Server validation (400) → message under its field (NFR3); otherwise snackbar.
        const fieldErrors: Record<string, string> | undefined = err.error?.errors;
        let mapped = false;
        for (const [field, message] of Object.entries(fieldErrors ?? {})) {
          const control = this.form.get(field);
          if (control) {
            control.setErrors({ server: message });
            control.markAsTouched();
            mapped = true;
          }
        }
        if (!mapped) this.notification.error(errorMessage(err));
      },
    });
  }
}

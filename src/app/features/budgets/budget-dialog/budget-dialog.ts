import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { BudgetService } from '../../../core/services/budget.service';
import { NotificationService } from '../../../core/services/notification.service';
import { BudgetStatus, Category } from '../../../shared/models';
import { twoDecimals } from '../../../shared/utils/validators';

export interface BudgetDialogData {
  /** Editing this budget; absent = adding a new one. */
  existing?: BudgetStatus;
  categories: Category[];
  /** Categories that already have a budget — not offered again when adding. */
  budgetedCategoryIds: string[];
}

export type BudgetDialogResult = 'saved' | 'removed';

/**
 * Set / change / remove a monthly category budget (R8 AC1). Owner only (R15 AC5).
 * A budget has no month: it applies to every month until changed.
 * v3: no "Overall" option — the overall budget is the sum of the member limits (R15 AC3).
 */
@Component({
  selector: 'app-budget-dialog',
  standalone: false,
  templateUrl: './budget-dialog.html',
  styleUrl: './budget-dialog.scss',
})
export class BudgetDialog {
  protected readonly data = inject<BudgetDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<BudgetDialog, BudgetDialogResult>>(MatDialogRef);
  private readonly budgetService = inject(BudgetService);
  private readonly notification = inject(NotificationService);

  protected readonly isEdit = !!this.data.existing;
  protected readonly busy = signal(false);

  private readonly existingTarget = this.data.existing?.category?.id ?? '';

  protected readonly form = inject(FormBuilder).group({
    // Target can't be changed while editing — remove and add instead.
    target: [{ value: this.existingTarget, disabled: this.isEdit }, Validators.required],
    amount: [this.data.existing?.budget ?? (null as number | null), [Validators.required, Validators.min(0.01), twoDecimals]],
  });

  /** Categories without a budget yet (+ the one being edited). */
  protected readonly categoryOptions = computed(() =>
    this.data.categories.filter(
      (c) => !this.data.budgetedCategoryIds.includes(c.id) || c.id === this.existingTarget,
    ),
  );

  protected readonly nothingLeft = !this.isEdit && this.categoryOptions().length === 0;

  protected amountError(): string {
    const e = this.form.controls.amount.errors;
    if (e?.['required']) return 'Amount is required';
    if (e?.['min']) return 'Budget must be greater than 0';
    if (e?.['decimals']) return 'Use at most 2 decimals (paise)';
    return 'Enter a valid amount';
  }

  protected save(): void {
    if (this.form.invalid || this.busy()) return;
    const { target, amount } = this.form.getRawValue();
    this.run(
      this.budgetService.save({ categoryId: target!, amount: Number(amount) }),
      this.isEdit ? 'Budget updated' : 'Budget set',
      'saved',
    );
  }

  protected remove(): void {
    if (!this.data.existing || this.busy()) return;
    this.run(this.budgetService.delete(this.data.existing.id), 'Budget removed', 'removed');
  }

  private run(request: Observable<unknown>, message: string, result: BudgetDialogResult): void {
    this.busy.set(true);
    request.subscribe({
      next: () => {
        this.notification.success(message);
        this.dialogRef.close(result);
      },
      error: () => this.busy.set(false), // snackbar shown by the error interceptor
    });
  }
}

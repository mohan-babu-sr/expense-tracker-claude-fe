import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BudgetService } from '../../../core/services/budget.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MemberBudget } from '../../../shared/models';
import { twoDecimals } from '../../../shared/utils/validators';

export interface MemberLimitDialogData {
  member: MemberBudget;
  /** True when the member is the signed-in owner (title says "your"). */
  isMe: boolean;
}

/**
 * Set / change / remove one member's monthly limit (R15 AC1). Owner only — the page shows the button
 * only to the owner, and the API answers 403 to anyone else (R15 AC5).
 * Same layout as BudgetDialog so both budget dialogs feel the same. "Remove limit" = no limit (null).
 */
@Component({
  selector: 'app-member-limit-dialog',
  standalone: false,
  templateUrl: './member-limit-dialog.html',
  styleUrl: './member-limit-dialog.scss',
})
export class MemberLimitDialog {
  protected readonly data = inject<MemberLimitDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<MemberLimitDialog, MemberBudget>>(MatDialogRef);
  private readonly budgetService = inject(BudgetService);
  private readonly notification = inject(NotificationService);

  protected readonly hasLimit = this.data.member.limit !== null;
  protected readonly busy = signal(false);
  protected readonly title = this.data.isMe ? 'Your monthly limit' : `Monthly limit for ${this.data.member.user.name}`;

  protected readonly form = inject(FormBuilder).group({
    limit: [this.data.member.limit, [Validators.required, Validators.min(0.01), twoDecimals]],
  });

  protected limitError(): string {
    const e = this.form.controls.limit.errors;
    if (e?.['required']) return 'Limit is required';
    if (e?.['min']) return 'Limit must be greater than 0';
    if (e?.['decimals']) return 'Use at most 2 decimals (paise)';
    return 'Enter a valid amount';
  }

  protected save(): void {
    if (this.form.invalid || this.busy()) return;
    this.send(Number(this.form.getRawValue().limit), this.hasLimit ? 'Limit updated' : 'Limit set');
  }

  protected remove(): void {
    if (this.busy()) return;
    this.send(null, 'Limit removed');
  }

  private send(limit: number | null, message: string): void {
    this.busy.set(true);
    this.budgetService.setMemberLimit(this.data.member.user.id, limit).subscribe({
      next: (row) => {
        this.notification.success(message);
        this.dialogRef.close(row);
      },
      error: () => this.busy.set(false), // snackbar shown by the error interceptor
    });
  }
}

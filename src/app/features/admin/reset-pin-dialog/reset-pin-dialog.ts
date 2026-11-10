import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { skipErrorSnackbar } from '../../../core/interceptors/http-context.tokens';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AdminUser } from '../../../shared/models';
import { applyServerErrors } from '../../../shared/utils/server-errors';
import { PIN_PATTERN } from '../../../shared/utils/validators';

/**
 * "Forgot PIN" (R13 AC4, AC6): the admin sets a new PIN and tells the person (no SMS).
 * The server also unlocks the account and signs it out everywhere. Closes with true when done.
 */
@Component({
  selector: 'app-reset-pin-dialog',
  standalone: false,
  templateUrl: './reset-pin-dialog.html',
  styleUrl: './reset-pin-dialog.scss',
})
export class ResetPinDialog {
  protected readonly user = inject<AdminUser>(MAT_DIALOG_DATA);
  private readonly admin = inject(AdminService);
  private readonly notification = inject(NotificationService);
  private readonly dialogRef = inject<MatDialogRef<ResetPinDialog, boolean>>(MatDialogRef);

  protected readonly saving = signal(false);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    pin: ['', [Validators.required, Validators.pattern(PIN_PATTERN)]],
  });

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.admin.resetPin(this.user.id, this.form.getRawValue().pin, skipErrorSnackbar()).subscribe({
      next: () => {
        this.notification.success(`New PIN set for ${this.user.name}. Tell them the PIN.`);
        this.dialogRef.close(true);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notification.error(errorMessage(err));
      },
    });
  }
}

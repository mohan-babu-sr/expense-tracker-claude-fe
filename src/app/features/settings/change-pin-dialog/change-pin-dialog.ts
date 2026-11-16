import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { skipErrorSnackbar } from '../../../core/interceptors/http-context.tokens';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { applyServerErrors } from '../../../shared/utils/server-errors';
import { PIN_PATTERN, sameAs } from '../../../shared/utils/validators';

/**
 * Settings → Account → Change PIN (R13 AC4; v6 layout R25 AC1, design §14.4). Same validation and server-error
 * mapping as the old inline form. Success signs out the other devices (server) and closes with true.
 */
@Component({
  selector: 'app-change-pin-dialog',
  standalone: false,
  templateUrl: './change-pin-dialog.html',
  styleUrl: '../settings-dialog.scss',
})
export class ChangePinDialog {
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly dialogRef = inject<MatDialogRef<ChangePinDialog, boolean>>(MatDialogRef);

  protected readonly saving = signal(false);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    currentPin: ['', Validators.required],
    newPin: ['', [Validators.required, Validators.pattern(PIN_PATTERN)]],
    confirmPin: ['', [Validators.required, sameAs('newPin')]],
  });

  constructor() {
    const { newPin, confirmPin } = this.form.controls;
    newPin.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => confirmPin.updateValueAndValidity());
  }

  static open(dialog: MatDialog): Observable<boolean> {
    return dialog
      .open<ChangePinDialog, void, boolean>(ChangePinDialog, {
        width: '420px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: 'input',
      })
      .afterClosed()
      .pipe(map(Boolean));
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const { currentPin, newPin } = this.form.getRawValue();
    this.saving.set(true);
    this.auth.changePin(currentPin, newPin, skipErrorSnackbar()).subscribe({
      next: () => {
        this.notification.success('PIN changed. Your other devices were signed out.');
        this.dialogRef.close(true);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notification.error(errorMessage(err));
      },
    });
  }
}

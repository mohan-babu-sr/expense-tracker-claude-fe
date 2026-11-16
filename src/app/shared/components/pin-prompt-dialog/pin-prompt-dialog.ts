import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { skipErrorSnackbar } from '../../../core/interceptors/http-context.tokens';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { applyServerErrors } from '../../utils/server-errors';

export interface PinPromptData {
  title: string;
  message: string;
  /** Submit button text, e.g. "Show". */
  confirmText: string;
}

/**
 * "Enter your PIN" (R22 AC2, design §14.1): checks the signed-in member's own sign-in PIN with the server and
 * closes with `true` only when it is right. A wrong PIN keeps the dialog open with the error under the field; the
 * lockout message (too many tries) shows there too. Shared so other screens can ask for the PIN the same way.
 */
@Component({
  selector: 'app-pin-prompt-dialog',
  standalone: false,
  templateUrl: './pin-prompt-dialog.html',
  styleUrl: './pin-prompt-dialog.scss',
})
export class PinPromptDialog {
  protected readonly data = inject<PinPromptData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<PinPromptDialog, boolean>>(MatDialogRef);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  protected readonly busy = signal(false);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    pin: ['', [Validators.required]],
  });

  /** Emits true when the right PIN was entered, false when cancelled. */
  static open(dialog: MatDialog, data: PinPromptData): Observable<boolean> {
    return dialog
      .open<PinPromptDialog, PinPromptData, boolean>(PinPromptDialog, {
        data,
        width: '400px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: 'input',
      })
      .afterClosed()
      .pipe(map(Boolean));
  }

  protected pinError(): string {
    return this.form.controls.pin.errors?.['server'] ?? 'Enter your PIN';
  }

  protected submit(): void {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.auth.verifyPin(this.form.getRawValue().pin, skipErrorSnackbar()).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        if (applyServerErrors(this.form, err)) return;
        // Locked out (423): show the server's sentence under the field, where the user is looking.
        if (err.status === 423) {
          this.form.controls.pin.setErrors({ server: errorMessage(err) });
          this.form.controls.pin.markAsTouched();
        } else {
          this.notification.error(errorMessage(err));
        }
      },
    });
  }
}

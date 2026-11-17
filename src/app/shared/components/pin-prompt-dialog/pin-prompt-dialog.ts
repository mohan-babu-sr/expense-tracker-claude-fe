import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { skipErrorSnackbar } from '../../../core/interceptors/http-context.tokens';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  AuthenticationOptions,
  OPTIONS_MAX_AGE_MS,
  PasskeyService,
} from '../../../core/services/passkey.service';
import { applyServerErrors } from '../../utils/server-errors';

export interface PinPromptData {
  title: string;
  message: string;
  /** Submit button text, e.g. "Show". */
  confirmText: string;
  /** v7 (R27): message used instead of `message` when fingerprint / Face ID is offered too. */
  passkeyMessage?: string;
}

/**
 * v7 (R27, design §15.6): when this browser can do passkeys and I have a registered device, a "Use fingerprint /
 * Face ID" button above the PIN field — either one closes with `true`, so callers don't change. Only MY passkeys
 * are accepted (the server checks). Options are fetched when the dialog opens, so the tap starts the device prompt
 * directly (iPhone rule, design §15.5).
 *
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
  private readonly passkeys = inject(PasskeyService);

  protected readonly busy = signal(false);

  // ---- fingerprint / Face ID (R27) ----
  /** Set when the server says I have no devices any more (removed elsewhere). */
  private readonly noDevices = signal(false);
  /**
   * A computed, not a one-off read: PasskeyService may be created by this very dialog (e.g. on Plan), and its
   * browser-support check finishes a moment later.
   */
  protected readonly passkeyAvailable = computed(
    () => this.passkeys.supported() && (this.auth.userMe()?.passkeyCount ?? 0) > 0 && !this.noDevices(),
  );
  protected readonly passkeyBusy = signal(false);
  protected readonly passkeyError = signal<string | null>(null);
  private options: AuthenticationOptions | null = null;
  private optionsAt = 0;
  private prefetched = false;

  constructor() {
    effect(() => {
      if (this.passkeyAvailable() && !this.prefetched) {
        this.prefetched = true;
        untracked(() => this.prefetch());
      }
    });
  }

  private prefetch(): void {
    this.passkeys.verifyOptions().subscribe({
      next: (options) => {
        this.options = options;
        this.optionsAt = Date.now();
      },
      error: (err: HttpErrorResponse) => {
        this.options = null;
        // No devices any more (removed elsewhere) → PIN only (R27 AC1).
        if (err.status === 404) {
          this.noDevices.set(true);
          this.auth.setPasskeyCount(0);
        }
      },
    });
  }

  protected message(): string {
    return this.passkeyAvailable() && this.data.passkeyMessage ? this.data.passkeyMessage : this.data.message;
  }

  /** Runs straight from the tap — no request before the device prompt when the options are fresh. */
  protected async usePasskey(): Promise<void> {
    if (this.passkeyBusy()) return;
    this.passkeyBusy.set(true);
    this.passkeyError.set(null);
    try {
      let options = this.options;
      if (!options || Date.now() - this.optionsAt > OPTIONS_MAX_AGE_MS) {
        options = await new Promise<AuthenticationOptions>((resolve, reject) =>
          this.passkeys.verifyOptions().subscribe({ next: resolve, error: reject }),
        );
      }
      this.options = null; // single use
      await this.passkeys.verifyOnDevice(options);
      this.dialogRef.close(true);
    } catch (err) {
      this.passkeyBusy.set(false);
      // R27 AC3: cancelled or failed → stay open; the PIN field still works.
      this.passkeyError.set(
        PasskeyService.isCancel(err) || !(err instanceof HttpErrorResponse) || err.status === 400
          ? "Didn't work — try again or use your PIN"
          : errorMessage(err),
      );
      this.prefetch();
    }
  }
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
        autoFocus: 'first-tabbable', // the fingerprint button when offered, else the PIN field
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

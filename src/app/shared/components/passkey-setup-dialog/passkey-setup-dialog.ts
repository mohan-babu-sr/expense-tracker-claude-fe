import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable, map, tap } from 'rxjs';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { NotificationService } from '../../../core/services/notification.service';
import {
  OPTIONS_MAX_AGE_MS,
  PasskeyService,
  RegistrationOptions,
} from '../../../core/services/passkey.service';
import { applyServerErrors } from '../../utils/server-errors';

export interface PasskeySetupData {
  /**
   * The PIN just typed on the sign-in page (offer after a PIN sign-in, R26 AC6) — skips the PIN step. Kept only in
   * this dialog's memory and dropped when it closes.
   */
  pin?: string;
  /** The one-time "Sign in faster next time?" offer (R26 AC6): "Not now" is remembered on this device. */
  offer?: boolean;
  /** Needed for "Not now". */
  userId?: string;
}

type Step = 'pin' | 'scan';

/**
 * Set up fingerprint / Face ID on this device (R26 AC3, AC6; design §15.5–15.6). Two steps so the device prompt
 * starts straight from a tap (iPhone rule): 1) PIN → options from the server, 2) "Set up" → device prompt.
 * Closes with true when a device was added.
 */
@Component({
  selector: 'app-passkey-setup-dialog',
  standalone: false,
  templateUrl: './passkey-setup-dialog.html',
  styleUrl: './passkey-setup-dialog.scss',
})
export class PasskeySetupDialog {
  protected readonly data = inject<PasskeySetupData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<PasskeySetupDialog, boolean>>(MatDialogRef);
  private readonly passkeys = inject(PasskeyService);
  private readonly notification = inject(NotificationService);

  protected readonly step = signal<Step>(this.data.pin ? 'scan' : 'pin');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({ pin: ['', Validators.required] });

  private pin = this.data.pin ?? '';
  private options: RegistrationOptions | null = null;
  private optionsAt = 0;

  /** Emits true when a device was added. */
  static open(dialog: MatDialog, data: PasskeySetupData = {}): Observable<boolean> {
    const ref = dialog.open<PasskeySetupDialog, PasskeySetupData, boolean>(PasskeySetupDialog, {
      data,
      width: '420px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: data.pin ? 'dialog' : 'input',
    });
    const passkeys = ref.componentInstance.passkeys; // captured now: the instance is gone after closing
    return ref.afterClosed().pipe(
      map(Boolean),
      // Offer closed without setting up (Not now, Esc, backdrop) → don't ask again on this device (R26 AC6).
      tap((added) => {
        if (data.offer && !added && data.userId) passkeys.dismissOffer(data.userId);
      }),
    );
  }

  constructor() {
    if (this.pin) this.fetchOptions(); // offer: PIN already known → prefetch so "Set up" is a direct tap
  }

  protected pinError(): string {
    return this.form.controls.pin.errors?.['server'] ?? 'Enter your PIN';
  }

  /** Step 1 → 2. */
  protected next(): void {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    this.pin = this.form.getRawValue().pin;
    this.fetchOptions();
  }

  private fetchOptions(): void {
    this.busy.set(true);
    this.error.set(null);
    this.passkeys.registrationOptions(this.pin).subscribe({
      next: (options) => {
        this.options = options;
        this.optionsAt = Date.now();
        this.busy.set(false);
        this.step.set('scan');
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.options = null;
        if (this.step() === 'pin') {
          if (applyServerErrors(this.form, err)) return;
          if (err.status === 423) {
            this.form.controls.pin.setErrors({ server: errorMessage(err) });
            this.form.controls.pin.markAsTouched();
            return;
          }
        }
        this.error.set(errorMessage(err));
      },
    });
  }

  /** Step 2 — runs straight from the tap: no request before the device prompt (design §15.5). */
  protected async setUp(): Promise<void> {
    if (this.busy()) return;
    if (!this.options || Date.now() - this.optionsAt > OPTIONS_MAX_AGE_MS) {
      // Expired (left open a long time) → new options; the next tap starts the prompt.
      this.fetchOptions();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.passkeys.registerOnDevice(this.options);
      this.notification.success('Fingerprint / Face ID is on for this device');
      this.dialogRef.close(true);
    } catch (err) {
      this.busy.set(false);
      if (PasskeyService.isCancel(err)) {
        // Nothing was sent, so the same options work for another try.
        this.error.set('Cancelled. Tap Set up to try again.');
      } else if (PasskeyService.isAlreadyRegistered(err)) {
        this.error.set('Fingerprint / Face ID is already set up on this device.');
      } else {
        this.options = null; // the server used (deleted) the challenge
        this.error.set(err instanceof HttpErrorResponse ? errorMessage(err) : "Couldn't set up fingerprint / Face ID. Please try again.");
      }
    }
  }

  protected notNow(): void {
    this.dialogRef.close(false);
  }
}

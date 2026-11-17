import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { AuthService, homeUrl } from '../../../core/services/auth.service';
import {
  AuthenticationOptions,
  OPTIONS_MAX_AGE_MS,
  PasskeyService,
} from '../../../core/services/passkey.service';
import { PasskeySetupDialog } from '../../../shared/components/passkey-setup-dialog/passkey-setup-dialog';
import { Me } from '../../../shared/models';
import { applyServerErrors } from '../../../shared/utils/server-errors';
import { slowRequestFlag } from '../../../shared/utils/slow-request';
import { indianMobile, normalizeMobile } from '../../../shared/utils/validators';

/**
 * Sign in with mobile + PIN (R13 AC3). Wrong number / PIN, lockout (423) and "disabled" (403) are shown
 * in one message box above the form — the server deliberately doesn't say which part was wrong.
 *
 * v7 (R26 AC5–AC6, design §15.6): "Sign in with fingerprint / Face ID" above the form when the browser supports
 * passkeys — no mobile number needed. The PIN form stays exactly as it was. After a PIN sign-in on a supported
 * device without a passkey, a one-time offer to set one up.
 */
@Component({
  selector: 'app-sign-in-page',
  standalone: false,
  templateUrl: './sign-in-page.html',
  styleUrl: './sign-in-page.scss',
})
export class SignInPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  protected readonly passkeys = inject(PasskeyService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    mobile: ['', [Validators.required, indianMobile]],
    pin: ['', [Validators.required]],
  });
  protected readonly showPin = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly slowFlag = slowRequestFlag();

  // ---- passkey sign-in (R26 AC5) ----
  protected readonly passkeyBusy = signal(false);
  protected readonly passkeyError = signal<string | null>(null);
  /** Fetched before the tap so the device prompt starts straight from it (iPhone rule, design §15.5). */
  private options: AuthenticationOptions | null = null;
  private optionsAt = 0;

  constructor() {
    // `supported` is known a moment after start-up → prefetch as soon as it is true, and keep them fresh.
    effect(() => {
      if (this.passkeys.supported()) this.prefetch();
    });
    const timer = setInterval(() => {
      if (this.passkeys.supported() && !this.passkeyBusy()) this.prefetch();
    }, OPTIONS_MAX_AGE_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  private prefetch(): void {
    this.passkeys.loginOptions().subscribe({
      next: (options) => {
        this.options = options;
        this.optionsAt = Date.now();
      },
      error: () => (this.options = null), // server asleep etc. — the tap fetches again
    });
  }

  protected async passkeySignIn(): Promise<void> {
    if (this.passkeyBusy()) return;
    this.passkeyBusy.set(true);
    this.passkeyError.set(null);
    this.formError.set(null);
    try {
      let options = this.options;
      if (!options || Date.now() - this.optionsAt > OPTIONS_MAX_AGE_MS) {
        // Not prefetched (server was waking up) → fetch now. Most browsers still allow the prompt.
        options = await new Promise<AuthenticationOptions>((resolve, reject) =>
          this.passkeys.loginOptions().subscribe({ next: resolve, error: reject }),
        );
      }
      this.options = null; // a challenge is single use
      const me = await this.passkeys.signInOnDevice(options);
      void this.router.navigateByUrl(homeUrl(me));
    } catch (err) {
      this.passkeyBusy.set(false);
      this.prefetch();
      if (PasskeyService.isCancel(err)) return; // closed the prompt — stay here, no error (R26 AC5)
      this.passkeyError.set(
        err instanceof HttpErrorResponse
          ? errorMessage(err)
          : "Couldn't use fingerprint / Face ID here. Please use your PIN.",
      );
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const { mobile, pin } = this.form.getRawValue();
    this.submitting.set(true);
    this.formError.set(null);
    this.passkeyError.set(null);
    this.slowFlag.start();

    this.auth.login(normalizeMobile(mobile), pin).subscribe({
      next: (me) => {
        this.slowFlag.stop();
        void this.router.navigateByUrl(homeUrl(me)).then(() => this.offerPasskey(me, pin));
      },
      error: (err: HttpErrorResponse) => {
        this.slowFlag.stop();
        this.submitting.set(false);
        if (!applyServerErrors(this.form, err)) this.formError.set(errorMessage(err));
        this.form.controls.pin.reset(); // never leave a wrong PIN in the field
      },
    });
  }

  /**
   * R26 AC6: one-time "Sign in faster next time?" after a PIN sign-in. The PIN goes to the dialog in memory so it
   * doesn't ask again; it is dropped when the dialog closes.
   */
  private offerPasskey(me: Me, pin: string): void {
    if (me.kind !== 'user' || !this.passkeys.shouldOffer(me)) return;
    PasskeySetupDialog.open(this.dialog, { pin, offer: true, userId: me.user.id }).subscribe();
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { AuthService, homeUrl } from '../../../core/services/auth.service';
import { applyServerErrors } from '../../../shared/utils/server-errors';
import { slowRequestFlag } from '../../../shared/utils/slow-request';
import { indianMobile, normalizeMobile } from '../../../shared/utils/validators';

/**
 * Sign in with mobile + PIN (R13 AC3). Wrong number / PIN, lockout (423) and "disabled" (403) are shown
 * in one message box above the form — the server deliberately doesn't say which part was wrong.
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

  protected readonly form = inject(FormBuilder).nonNullable.group({
    mobile: ['', [Validators.required, indianMobile]],
    pin: ['', [Validators.required]],
  });
  protected readonly showPin = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly slowFlag = slowRequestFlag();

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const { mobile, pin } = this.form.getRawValue();
    this.submitting.set(true);
    this.formError.set(null);
    this.slowFlag.start();

    this.auth.login(normalizeMobile(mobile), pin).subscribe({
      next: (me) => {
        this.slowFlag.stop();
        void this.router.navigateByUrl(homeUrl(me));
      },
      error: (err: HttpErrorResponse) => {
        this.slowFlag.stop();
        this.submitting.set(false);
        if (!applyServerErrors(this.form, err)) this.formError.set(errorMessage(err));
        this.form.controls.pin.reset(); // never leave a wrong PIN in the field
      },
    });
  }
}

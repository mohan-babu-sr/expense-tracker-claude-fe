import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { AuthService, homeUrl } from '../../../core/services/auth.service';
import { slowRequestFlag } from '../../../shared/utils/slow-request';

/** Admin sign in with username + password (R13 AC5). */
@Component({
  selector: 'app-admin-sign-in-page',
  standalone: false,
  templateUrl: './admin-sign-in-page.html',
  styleUrl: './admin-sign-in-page.scss',
})
export class AdminSignInPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });
  protected readonly showPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly slowFlag = slowRequestFlag();

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const { username, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.formError.set(null);
    this.slowFlag.start();

    this.auth.adminLogin(username.trim(), password).subscribe({
      next: (me) => {
        this.slowFlag.stop();
        void this.router.navigateByUrl(homeUrl(me));
      },
      error: (err: HttpErrorResponse) => {
        this.slowFlag.stop();
        this.submitting.set(false);
        this.formError.set(errorMessage(err));
        this.form.controls.password.reset();
      },
    });
  }
}

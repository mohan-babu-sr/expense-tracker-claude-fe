import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { skipErrorSnackbar } from '../../../core/interceptors/http-context.tokens';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { applyServerErrors } from '../../../shared/utils/server-errors';
import { sameAs } from '../../../shared/utils/validators';

/** Same rule as the server: the default password can't be reused (R13 AC5). */
function notDefault(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').toLowerCase() === 'admin' ? { isDefault: true } : null;
}

/**
 * Admin password (R13 AC5). Forced on first sign-in — every other admin page redirects here
 * until it's done — and reachable later from Settings for a voluntary change.
 */
@Component({
  selector: 'app-change-password-page',
  standalone: false,
  templateUrl: './change-password-page.html',
  styleUrl: './change-password-page.scss',
})
export class ChangePasswordPage {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly forced = computed(() => {
    const me = this.auth.me();
    return me?.kind === 'admin' && me.mustChangePassword;
  });

  protected readonly form = inject(FormBuilder).nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72), notDefault]],
    confirmPassword: ['', [Validators.required, sameAs('newPassword')]],
  });
  protected readonly showPasswords = signal(false);
  protected readonly saving = signal(false);

  constructor() {
    const { newPassword, confirmPassword } = this.form.controls;
    newPassword.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => confirmPassword.updateValueAndValidity());
  }

  protected newPasswordError(): string {
    const e = this.form.controls.newPassword.errors;
    if (!e) return '';
    if (e['server']) return e['server'];
    if (e['required']) return 'Enter a new password';
    if (e['minlength']) return 'At least 8 characters';
    if (e['maxlength']) return 'At most 72 characters';
    if (e['isDefault']) return 'Choose a password other than "admin"';
    return 'Invalid password';
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.saving.set(true);
    this.admin
      .changePassword(currentPassword, newPassword, skipErrorSnackbar())
      // Re-read "me" so mustChangePassword is false before the guard looks at it again.
      .pipe(switchMap(() => this.auth.refresh()))
      .subscribe({
        next: () => {
          this.notification.success('Password changed');
          void this.router.navigateByUrl('/admin/users');
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          if (!applyServerErrors(this.form, err)) this.notification.error(errorMessage(err));
        },
      });
  }
}

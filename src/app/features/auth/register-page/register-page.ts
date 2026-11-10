import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { AuthService, homeUrl } from '../../../core/services/auth.service';
import { RegisterGroup } from '../../../shared/models';
import { applyServerErrors } from '../../../shared/utils/server-errors';
import { slowRequestFlag } from '../../../shared/utils/slow-request';
import {
  GROUP_CODE_PATTERN,
  PIN_PATTERN,
  indianMobile,
  normalizeMobile,
  sameAs,
} from '../../../shared/utils/validators';

type GroupMode = 'create' | 'join';

/**
 * Create account (R13 AC2): name, mobile, PIN (twice) and a group — create a new one (you become its owner
 * and can start right away) or join one by code (you wait until a member approves you).
 */
@Component({
  selector: 'app-register-page',
  standalone: false,
  templateUrl: './register-page.html',
  styleUrl: './register-page.scss',
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(40)]],
    mobile: ['', [Validators.required, indianMobile]],
    pin: ['', [Validators.required, Validators.pattern(PIN_PATTERN)]],
    confirmPin: ['', [Validators.required, sameAs('pin')]],
    group: inject(FormBuilder).nonNullable.group({
      mode: ['create' as GroupMode],
      name: ['', [Validators.required, Validators.maxLength(40)]],
      code: ['', [Validators.required, Validators.pattern(GROUP_CODE_PATTERN)]],
    }),
  });
  protected readonly showPin = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly slowFlag = slowRequestFlag();
  protected readonly mode = signal<GroupMode>('create');

  constructor() {
    const destroyRef = inject(DestroyRef);
    const { pin, confirmPin, group } = this.form.controls;

    // Confirm PIN must re-check when the first PIN changes.
    pin.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => confirmPin.updateValueAndValidity());

    // "Join" needs only the code: disabling the group name takes it out of validation and the value.
    group.controls.mode.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe((mode) => {
      this.mode.set(mode);
      if (mode === 'join') group.controls.name.disable();
      else group.controls.name.enable();
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const groupInput: RegisterGroup =
      v.group.mode === 'create'
        ? { mode: 'create', name: v.group.name.trim(), code: v.group.code.trim() }
        : { mode: 'join', code: v.group.code.trim() };

    this.submitting.set(true);
    this.formError.set(null);
    this.slowFlag.start();

    this.auth
      .register({ name: v.name.trim(), mobile: normalizeMobile(v.mobile), pin: v.pin, group: groupInput })
      .subscribe({
        next: (me) => {
          this.slowFlag.stop();
          void this.router.navigateByUrl(homeUrl(me)); // dashboard (created) or pending page (joined)
        },
        error: (err: HttpErrorResponse) => {
          this.slowFlag.stop();
          this.submitting.set(false);
          if (!applyServerErrors(this.form, err)) this.formError.set(errorMessage(err));
        },
      });
  }
}

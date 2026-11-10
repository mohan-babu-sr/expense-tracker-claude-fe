import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroupDirective, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { filter, switchMap, tap } from 'rxjs';
import { skipErrorSnackbar } from '../../../core/interceptors/http-context.tokens';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { AuthService } from '../../../core/services/auth.service';
import { GroupService } from '../../../core/services/group.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SettingsService, ThemePreference } from '../../../core/services/settings.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { GroupMember } from '../../../shared/models';
import { applyServerErrors } from '../../../shared/utils/server-errors';
import { PIN_PATTERN, sameAs } from '../../../shared/utils/validators';

interface ThemeOption {
  value: ThemePreference;
  label: string;
  icon: string;
}

/**
 * Settings (R11, R13 AC4). One card per section; add future preferences as new sections.
 * - Account (server): name, read-only mobile + group, change PIN, sign out. The admin sees username + sign out.
 * - Group (active members only, R13 AC7): code to invite, members, join requests to approve / reject.
 * - Appearance (this device): theme.
 */
@Component({
  selector: 'app-settings-page',
  standalone: false,
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage {
  private readonly settingsService = inject(SettingsService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly groupService = inject(GroupService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly me = this.auth.me;
  protected readonly userMe = this.auth.userMe;
  protected readonly group = this.groupService.group;
  /** Join request being approved / rejected (disables its buttons). */
  protected readonly busyId = signal<string | null>(null);

  // ---- Account: name ----
  protected readonly nameForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(40)]],
  });
  protected readonly savingName = signal(false);

  // ---- Account: change PIN ----
  protected readonly pinForm = this.fb.group({
    currentPin: ['', Validators.required],
    newPin: ['', [Validators.required, Validators.pattern(PIN_PATTERN)]],
    confirmPin: ['', [Validators.required, sameAs('newPin')]],
  });
  protected readonly savingPin = signal(false);
  protected readonly showPinForm = signal(false);

  // ---- Appearance ----
  protected readonly themeOptions: readonly ThemeOption[] = [
    { value: 'system', label: 'System', icon: 'brightness_auto' },
    { value: 'light', label: 'Light', icon: 'light_mode' },
    { value: 'dark', label: 'Dark', icon: 'dark_mode' },
  ];
  protected readonly theme = computed(() => this.settingsService.settings().theme);

  constructor() {
    // Keep the name field in sync with the account (initial load and after saving).
    effect(() => {
      const name = this.userMe()?.user.name;
      if (name !== undefined) this.nameForm.reset({ name });
    });
    // Fresh members / join requests each time Settings opens (the cached copy may be minutes old).
    if (this.userMe()?.status === 'active') this.groupService.refresh().subscribe({ error: () => undefined });

    const { newPin, confirmPin } = this.pinForm.controls;
    newPin.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => confirmPin.updateValueAndValidity());
  }

  protected saveName(): void {
    if (this.nameForm.invalid || this.nameForm.pristine || this.savingName()) return;
    this.savingName.set(true);
    this.auth.updateName(this.nameForm.getRawValue().name.trim(), skipErrorSnackbar()).subscribe({
      next: () => {
        this.savingName.set(false);
        this.notification.success('Name updated');
      },
      error: (err: HttpErrorResponse) => {
        this.savingName.set(false);
        if (!applyServerErrors(this.nameForm, err)) this.notification.error(errorMessage(err));
      },
    });
  }

  protected changePin(formDirective: FormGroupDirective): void {
    if (this.pinForm.invalid || this.savingPin()) {
      this.pinForm.markAllAsTouched();
      return;
    }
    const { currentPin, newPin } = this.pinForm.getRawValue();
    this.savingPin.set(true);
    this.auth.changePin(currentPin, newPin, skipErrorSnackbar()).subscribe({
      next: () => {
        this.savingPin.set(false);
        formDirective.resetForm(); // also clears "submitted", so no red errors on the empty form
        this.showPinForm.set(false);
        this.notification.success('PIN changed. Your other devices were signed out.');
      },
      error: (err: HttpErrorResponse) => {
        this.savingPin.set(false);
        if (!applyServerErrors(this.pinForm, err)) this.notification.error(errorMessage(err));
      },
    });
  }

  protected cancelPin(formDirective: FormGroupDirective): void {
    formDirective.resetForm();
    this.showPinForm.set(false);
  }

  // ---- Group (R13 AC7) ----
  protected copyCode(code: string): void {
    // Clipboard API needs https or localhost; on plain-http LAN testing it is missing → say so.
    if (!navigator.clipboard) {
      this.notification.error(`Copy not available here — the code is ${code}`);
      return;
    }
    navigator.clipboard.writeText(code).then(
      () => this.notification.success('Group code copied'),
      () => this.notification.error(`Couldn't copy — the code is ${code}`),
    );
  }

  protected approve(member: GroupMember): void {
    this.busyId.set(member.id);
    this.groupService.approve(member.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.notification.success(`${member.name} can now see the group's expenses`);
      },
      error: () => this.busyId.set(null),
    });
  }

  protected reject(member: GroupMember): void {
    ConfirmDialog.open(this.dialog, {
      title: 'Reject join request?',
      message: `${member.name}'s account (+91 ${member.mobile}) will be removed. They can register again later.`,
      confirmText: 'Reject',
      destructive: true,
    })
      .pipe(filter(Boolean), tap(() => this.busyId.set(member.id)), switchMap(() => this.groupService.reject(member.id)))
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.notification.success('Request rejected');
        },
        error: () => this.busyId.set(null),
      });
  }

  protected signOut(): void {
    this.auth.logout().subscribe(() => void this.router.navigateByUrl('/welcome'));
  }

  protected setTheme(theme: ThemePreference): void {
    this.settingsService.update({ theme });
  }
}

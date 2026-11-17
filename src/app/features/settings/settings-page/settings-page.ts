import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { filter, switchMap, tap } from 'rxjs';
import { AppUpdateService } from '../../../core/services/app-update.service';
import { AuthService } from '../../../core/services/auth.service';
import { GroupService } from '../../../core/services/group.service';
import { InstallService } from '../../../core/services/install.service';
import { PasskeyService } from '../../../core/services/passkey.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SettingsService, ThemePreference } from '../../../core/services/settings.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { GroupMember } from '../../../shared/models';
import { ChangePinDialog } from '../change-pin-dialog/change-pin-dialog';
import { EditNameDialog } from '../edit-name-dialog/edit-name-dialog';
import { PasskeysDialog } from '../passkeys-dialog/passkeys-dialog';

interface ThemeOption {
  value: ThemePreference;
  label: string;
  icon: string;
}

/**
 * Settings (R11, R13 AC4; v6 grouped-list layout R25 AC1, design §14.4): profile card, then groups of rows.
 * - Profile + Account (server): name (dialog), read-only mobile + group, change PIN (dialog), sign out (all).
 *   The admin sees username, Change password, sign out.
 * - Group (active members only, R13 AC7): code to invite, join requests to approve / reject, members.
 * - Manage: Budgets / Categories (their way in on the phone).
 * - App (this device): theme (R11), Check for update (R24), installed / Install app / install hint (R16 AC6).
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
  private readonly appUpdate = inject(AppUpdateService);

  protected readonly me = this.auth.me;
  protected readonly userMe = this.auth.userMe;
  protected readonly group = this.groupService.group;
  /** Join request being approved / rejected (disables its buttons). */
  protected readonly busyId = signal<string | null>(null);

  protected readonly themeOptions: readonly ThemeOption[] = [
    { value: 'system', label: 'System', icon: 'brightness_auto' },
    { value: 'light', label: 'Light', icon: 'light_mode' },
    { value: 'dark', label: 'Dark', icon: 'dark_mode' },
  ];
  protected readonly theme = computed(() => this.settingsService.settings().theme);

  constructor() {
    // Fresh members / join requests each time Settings opens (the cached copy may be minutes old).
    if (this.userMe()?.status === 'active') this.groupService.refresh().subscribe({ error: () => undefined });
  }

  /** "Mohan Babu" → "MB" — profile and member avatars. */
  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  // ---- Account (R13 AC4): name + PIN open dialogs (v6) ----
  protected editName(): void {
    EditNameDialog.open(this.dialog, this.userMe()?.user.name ?? '').subscribe();
  }

  protected changePin(): void {
    ChangePinDialog.open(this.dialog).subscribe();
  }

  // ---- Fingerprint / Face ID (R26 AC3–AC4) — row hidden when the browser can't do passkeys ----
  protected readonly passkeys = inject(PasskeyService);

  protected openPasskeys(): void {
    PasskeysDialog.open(this.dialog);
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

  // ---- Sign out of all devices (R13 AC1a) ----
  protected readonly signingOutAll = signal(false);

  protected signOutAll(): void {
    ConfirmDialog.open(this.dialog, {
      title: 'Sign out of all devices?',
      message: 'You will be signed out everywhere, including this device, and will need to sign in again on each one.',
      confirmText: 'Sign out everywhere',
      destructive: true,
    })
      .pipe(
        filter(Boolean),
        tap(() => this.signingOutAll.set(true)),
        switchMap(() => this.auth.logoutAll()),
      )
      .subscribe({
        next: () => {
          this.notification.success('Signed out of all devices');
          void this.router.navigateByUrl('/welcome');
        },
        // Error snackbar comes from the interceptor; stay signed in so the user can retry.
        error: () => this.signingOutAll.set(false),
      });
  }

  // ---- App (R16 AC6) ----
  protected readonly install = inject(InstallService);

  protected installApp(): void {
    void this.install.install().then((outcome) => {
      // On success the browser shows its own confirmation and `appinstalled` switches the row to "Installed".
      if (outcome === 'dismissed') this.notification.success('No problem — you can install it later from here.');
    });
  }

  // ---- Check for update (R24, design §14.3) ----
  protected readonly checkingUpdate = signal(false);

  protected checkForUpdate(): void {
    this.checkingUpdate.set(true);
    // On success the page reloads; we only get past this when it failed (the service shows the snackbar).
    void this.appUpdate.checkNow().finally(() => this.checkingUpdate.set(false));
  }

  protected setTheme(theme: ThemePreference): void {
    this.settingsService.update({ theme });
  }
}

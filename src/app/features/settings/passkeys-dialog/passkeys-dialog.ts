import { Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { filter, switchMap, tap } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { PasskeyService } from '../../../core/services/passkey.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { PasskeySetupDialog } from '../../../shared/components/passkey-setup-dialog/passkey-setup-dialog';
import { PasskeyDevice } from '../../../shared/models';

/**
 * Settings → Account → Fingerprint / Face ID (R26 AC3–AC4, design §15.6): my registered devices, Remove, and
 * "Set up on this device" (opens the shared two-step PasskeySetupDialog). The PIN keeps working either way.
 */
@Component({
  selector: 'app-passkeys-dialog',
  standalone: false,
  templateUrl: './passkeys-dialog.html',
  styleUrls: ['../settings-dialog.scss', './passkeys-dialog.scss'],
})
export class PasskeysDialog {
  private readonly passkeys = inject(PasskeyService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  protected readonly devices = signal<PasskeyDevice[] | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly busyId = signal<string | null>(null);

  static open(dialog: MatDialog): void {
    dialog.open(PasskeysDialog, { width: '460px', maxWidth: 'calc(100vw - 32px)', autoFocus: 'dialog' });
  }

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loadFailed.set(false);
    this.passkeys.list().subscribe({
      next: (list) => this.devices.set(list),
      error: () => this.loadFailed.set(true),
    });
  }

  protected setUp(): void {
    PasskeySetupDialog.open(this.dialog)
      .pipe(filter(Boolean))
      .subscribe(() => this.load());
  }

  protected remove(device: PasskeyDevice): void {
    ConfirmDialog.open(this.dialog, {
      title: 'Remove this device?',
      message: `"${device.deviceName}" won't be able to sign in or show salaries with fingerprint / Face ID any more. Your PIN still works there.`,
      confirmText: 'Remove',
      destructive: true,
    })
      .pipe(
        filter(Boolean),
        tap(() => this.busyId.set(device.id)),
        switchMap(() => this.passkeys.remove(device.id)),
      )
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.devices.update((list) => (list ?? []).filter((d) => d.id !== device.id));
          this.notification.success('Device removed');
        },
        error: () => this.busyId.set(null),
      });
  }
}

import { Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PushService } from '../../../core/services/push.service';
import { NOTIFY_DAYS_BEFORE, NotifyDaysBefore, NotifyPrefs } from '../../../shared/models';

const DEFAULT_PREFS: NotifyPrefs = { upcoming: true, daysBefore: 3, budget: true };

/**
 * Settings → App → Notifications (R28 AC1–AC2, AC6, design §16.5).
 * Top: this device On / Off (or why it can't be). Below, only when On: what I want notifications about —
 * saved with my account, so they apply to all my devices.
 */
@Component({
  selector: 'app-notifications-dialog',
  standalone: false,
  templateUrl: './notifications-dialog.html',
  styleUrls: ['../settings-dialog.scss', './notifications-dialog.scss'],
})
export class NotificationsDialog {
  protected readonly push = inject(PushService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  protected readonly state = this.push.state;
  protected readonly daysOptions = NOTIFY_DAYS_BEFORE;
  protected readonly prefs = signal<NotifyPrefs>(this.auth.userMe()?.user.notify ?? DEFAULT_PREFS);
  /** Turn on / off / test in progress. */
  protected readonly busy = signal<'enable' | 'disable' | 'test' | null>(null);
  protected readonly savingPrefs = signal(false);

  static open(dialog: MatDialog): void {
    dialog.open(NotificationsDialog, { width: '460px', maxWidth: 'calc(100vw - 32px)', autoFocus: 'dialog' });
  }

  constructor() {
    this.push.prefetchKey(); // so "Turn on" reaches the browser prompt without waiting (iPhone gesture rule)
  }

  /** Straight from the tap — no awaits before the browser's permission prompt. */
  protected async turnOn(): Promise<void> {
    this.busy.set('enable');
    try {
      const outcome = await this.push.enable();
      if (outcome === 'on') this.notification.success('Notifications are on for this device');
      else if (outcome === 'dismissed') this.notification.success('Not turned on — you can try again any time.');
    } catch {
      this.notification.error("Couldn't turn on notifications. Please try again.");
    } finally {
      this.busy.set(null);
    }
  }

  protected async turnOff(): Promise<void> {
    this.busy.set('disable');
    try {
      await this.push.disable();
      this.notification.success('Notifications are off for this device');
    } catch {
      // the interceptor already showed the error
    } finally {
      this.busy.set(null);
    }
  }

  protected async sendTest(): Promise<void> {
    this.busy.set('test');
    try {
      await this.push.sendTest();
      this.notification.success('Test sent — it should arrive in a few seconds');
    } catch {
      this.notification.error("Couldn't send the test notification. Please try again.");
    } finally {
      this.busy.set(null);
    }
  }

  protected setUpcoming(upcoming: boolean): void {
    this.savePrefs({ ...this.prefs(), upcoming });
  }

  protected setDaysBefore(daysBefore: NotifyDaysBefore): void {
    this.savePrefs({ ...this.prefs(), daysBefore });
  }

  protected setBudget(budget: boolean): void {
    this.savePrefs({ ...this.prefs(), budget });
  }

  /** Shows the change at once; a failed save puts the old value back (the interceptor shows the error). */
  private savePrefs(prefs: NotifyPrefs): void {
    const before = this.prefs();
    this.prefs.set(prefs);
    this.savingPrefs.set(true);
    this.push.savePrefs(prefs).then(
      () => this.savingPrefs.set(false),
      () => {
        this.prefs.set(before);
        this.savingPrefs.set(false);
      },
    );
  }
}

import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';
import { NotificationService } from './notification.service';

/**
 * New-version prompt for the installed app (R16 AC5, design §11.3).
 *
 * The service worker serves the CACHED app code, so after a deploy the old version keeps running until the page
 * reloads. The worker notices the new version in the background (at start, and when we ask on returning to the
 * foreground) and emits VERSION_READY once it has downloaded it; we then offer a Reload.
 * In `ng serve` the worker is disabled (`isEnabled` false) and this does nothing.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly notification = inject(NotificationService);
  private readonly document = inject(DOCUMENT);
  private started = false;

  start(): void {
    if (this.started || !this.swUpdate.isEnabled) return;
    this.started = true;

    this.swUpdate.versionUpdates.pipe(filter((e) => e.type === 'VERSION_READY')).subscribe(() => {
      this.notification.prompt('A new version is available', 'Reload').subscribe(() => this.reload());
    });

    // The cached app is broken (e.g. files of its version are gone from the server) → only a reload helps.
    this.swUpdate.unrecoverable.subscribe(() => {
      this.notification.prompt('The app needs to reload to keep working', 'Reload').subscribe(() => this.reload());
    });

    // An installed app can stay open for days: look for a new version each time it comes back to the foreground.
    this.document.addEventListener('visibilitychange', () => {
      if (this.document.visibilityState === 'visible') this.swUpdate.checkForUpdate().catch(() => undefined);
    });
  }

  /**
   * Settings → "Check for update" (R24, design §14.3): ask the worker for a new version, then throw away the
   * cached app files and unregister the worker, and reload — so the newest version loads from the network either
   * way. The session cookie and localStorage (theme) are not caches, so the user stays signed in.
   * Resolves only on failure (the page reloads on success); rejects are turned into a snackbar here.
   */
  async checkNow(): Promise<void> {
    try {
      // Offline: clearing the cache would leave nothing to reload → stop before touching anything.
      if (this.document.defaultView?.navigator.onLine === false) throw new Error('offline');
      let found = false;
      if (this.swUpdate.isEnabled) found = await this.swUpdate.checkForUpdate(); // throws when offline
      this.notification.success(found ? 'Updating to the new version…' : 'You have the latest version — refreshing…');

      const win = this.document.defaultView;
      if (win && 'caches' in win) {
        const keys = await win.caches.keys();
        await Promise.all(keys.map((k) => win.caches.delete(k)));
      }
      if (win?.navigator.serviceWorker) {
        const registrations = await win.navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
      this.reload();
    } catch {
      this.notification.error('Couldn’t check for updates — check your connection and try again.');
    }
  }

  private reload(): void {
    this.document.location.reload();
  }
}

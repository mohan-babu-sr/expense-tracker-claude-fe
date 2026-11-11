import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

/** Chrome/Edge's install event (not in TypeScript's DOM types yet). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

/**
 * "Install app" support for Settings → App (R16 AC6, design §11.4).
 *
 * Chrome/Edge fire `beforeinstallprompt` ONCE, soon after the page loads, when the app is installable. We keep
 * that event and show our own button; calling `prompt()` later opens the browser's install dialog. That's why
 * this service is created at start-up (AppModule initializer), not when Settings opens.
 * Safari (iPhone) has no such event — installing is only possible via Share → Add to Home Screen.
 */
@Injectable({ providedIn: 'root' })
export class InstallService {
  private readonly document = inject(DOCUMENT);
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  private readonly canInstallState = signal(false);
  private readonly justInstalledState = signal(false);
  private readonly standaloneState = signal(this.detectStandalone());

  /** The browser offered installation (our button can open its dialog). */
  readonly canInstall = this.canInstallState.asReadonly();
  /** Installed from this browser tab just now (the installed app opens in its own window). */
  readonly justInstalled = this.justInstalledState.asReadonly();
  /** Running as the installed app (full-screen, no browser bar). */
  readonly isStandalone = this.standaloneState.asReadonly();
  /** iPhone / iPad — iPadOS reports itself as "Macintosh", so touch support tells them apart. */
  readonly isIos = this.detectIos();

  constructor() {
    const win = this.document.defaultView;
    if (!win) return;

    win.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault(); // no automatic mini-infobar; the user installs from Settings
      this.deferredPrompt = event as BeforeInstallPromptEvent;
      this.canInstallState.set(true);
    });
    win.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstallState.set(false);
      this.justInstalledState.set(true);
    });
    win.matchMedia?.('(display-mode: standalone)').addEventListener('change', () => {
      this.standaloneState.set(this.detectStandalone());
    });
  }

  /** Opens the browser's install dialog. The saved event works only once, so the button disappears after. */
  async install(): Promise<InstallOutcome> {
    const event = this.deferredPrompt;
    if (!event) return 'unavailable';
    this.deferredPrompt = null;
    this.canInstallState.set(false);
    await event.prompt();
    return (await event.userChoice).outcome;
  }

  private detectStandalone(): boolean {
    const win = this.document.defaultView;
    const iosStandalone = (win?.navigator as Navigator & { standalone?: boolean } | undefined)?.standalone === true;
    return iosStandalone || !!win?.matchMedia?.('(display-mode: standalone)').matches;
  }

  private detectIos(): boolean {
    const nav = this.document.defaultView?.navigator;
    if (!nav) return false;
    return /iPhone|iPad|iPod/.test(nav.userAgent) || (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1);
  }
}

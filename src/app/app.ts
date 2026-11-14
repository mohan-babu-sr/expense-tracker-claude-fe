import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { AuthService } from './core/services/auth.service';
import { inject as injectVercelAnalytics } from '@vercel/analytics';

/** After this long without an answer, explain the wait (Render free plan wakes up slowly) — design §8.5. */
const WAKE_UP_HINT_MS = 3000;

/**
 * Root component. Shows a small splash until the start-up "who am I?" check answers, then the shell —
 * so a signed-out visitor never sees the navigation flash before being sent to Welcome.
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly slow = signal(false);

  private readonly document = inject(DOCUMENT);
  /**
   * The URL the app was opened with. Captured here because the root component exists before the first
   * navigation finishes; when the server is unreachable the router may end up somewhere else (guards refuse).
   */
  private readonly startUrl = (() => {
    const { pathname, search, hash } = this.document.location;
    return pathname + search + hash;
  })();

  constructor() {
    const timer = setTimeout(() => this.slow.set(true), WAKE_UP_HINT_MS);
    // R16 AC4: back online while showing "Can't reach the server" → start again by itself.
    const onOnline = () => {
      if (this.auth.unreachable()) this.retry();
    };
    this.document.defaultView?.addEventListener('online', onOnline);
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(timer);
      this.document.defaultView?.removeEventListener('online', onOnline);
    });
    injectVercelAnalytics();
  }

  /**
   * Re-open the start URL: a full page load re-runs the start-up check and the guards from scratch (the cached
   * app makes it instant), and a deep link like /expenses isn't lost.
   */
  protected retry(): void {
    this.document.location.replace(this.startUrl);
  }
}

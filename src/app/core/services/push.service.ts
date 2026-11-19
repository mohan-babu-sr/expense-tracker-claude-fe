import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { NotifyPrefs } from '../../shared/models';
import { deviceName } from '../../shared/utils/device-name';
import { skipErrorSnackbar } from '../interceptors/http-context.tokens';
import { API_URL } from './api-url';
import { AuthService } from './auth.service';
import { InstallService } from './install.service';

/**
 * What Settings → Notifications shows for THIS device (R28 AC1, design §16.5):
 * - unsupported   — no service worker / Push API (dev `ng serve`, old browser)
 * - needs-install — iPhone/iPad in a Safari tab: push only works in the Home Screen app
 * - unavailable   — the server has no VAPID keys (503)
 * - blocked       — the user denied permission earlier; only the browser / phone settings can undo it
 * - off / on
 */
export type PushState = 'unsupported' | 'needs-install' | 'unavailable' | 'blocked' | 'off' | 'on';

export type EnableOutcome = 'on' | 'dismissed' | 'blocked';

/**
 * Phone notifications via Web Push (R28, design §16.5).
 * The browser creates a "push subscription" (an endpoint URL at Google / Apple / Microsoft + keys); we hand it to
 * our server, which sends encrypted messages to it. Angular's service worker shows them and opens the right
 * page on tap — no extra code here for that.
 * Created at start-up (AppModule) so it can quietly re-send this device's subscription after sign-in.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly http = inject(HttpClient);
  private readonly swPush = inject(SwPush);
  private readonly auth = inject(AuthService);
  private readonly install = inject(InstallService);
  private readonly document = inject(DOCUMENT);

  private readonly key = signal<string | null>(null);
  private readonly keyUnavailable = signal(false);
  private readonly permission = signal<NotificationPermission>(this.readPermission());
  private readonly subscription = signal<PushSubscription | null>(null);
  /** User id whose subscription we already re-sent this session. */
  private syncedFor: string | null = null;

  /** Service worker on (production build) and the browser has the Push + Notification APIs. */
  readonly supported =
    this.swPush.isEnabled && typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window;

  readonly state = computed<PushState>(() => {
    // iPhone Safari tabs have no PushManager at all, so this must come before "unsupported".
    if (this.install.isIos && !this.install.isStandalone()) return 'needs-install';
    if (!this.supported) return 'unsupported';
    if (this.keyUnavailable()) return 'unavailable';
    if (this.permission() === 'denied') return 'blocked';
    return this.subscription() && this.permission() === 'granted' ? 'on' : 'off';
  });

  /** The public key has arrived — "Turn on" can call the browser straight from the tap. */
  readonly ready = computed(() => this.key() !== null);

  constructor() {
    if (!this.supported) return;
    this.swPush.subscription.subscribe((sub) => this.subscription.set(sub));
    // Permission can change in the browser's site settings while the app is in the background.
    this.document.addEventListener('visibilitychange', () => this.permission.set(this.readPermission()));

    // Re-sync on start / after sign-in (design §16.5): keeps the server's copy right after the browser rotated the
    // endpoint, and moves a shared device to whoever signed in. Silent on errors.
    effect(() => {
      const me = this.auth.userMe();
      const sub = this.subscription();
      if (!me || !sub || this.permission() !== 'granted' || this.syncedFor === me.user.id) return;
      this.syncedFor = me.user.id;
      this.save(sub).catch(() => (this.syncedFor = null));
    });
  }

  /** Fetches the server's public key; call when the dialog opens (iPhone gesture rule, design §16.5). */
  prefetchKey(): void {
    if (!this.supported || this.key()) return;
    this.http.get<{ key: string }>(`${API_URL}/push/public-key`, { context: skipErrorSnackbar() }).subscribe({
      next: ({ key }) => this.key.set(key),
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 503) this.keyUnavailable.set(true);
      },
    });
  }

  /**
   * Turn on — MUST be called straight from the tap: the browser's permission prompt is the first await.
   * Returns what happened; HTTP errors are thrown (the snackbar comes from the interceptor).
   */
  async enable(): Promise<EnableOutcome> {
    const key = this.key();
    if (!key) throw new Error('Public key not loaded yet');
    let sub: PushSubscription;
    try {
      sub = await this.swPush.requestSubscription({ serverPublicKey: key });
    } catch {
      // Denied (→ blocked) or the prompt was closed (still "default" → off).
      this.permission.set(this.readPermission());
      return this.permission() === 'denied' ? 'blocked' : 'dismissed';
    }
    this.permission.set(this.readPermission());
    await this.save(sub);
    this.syncedFor = this.auth.userMe()?.user.id ?? null;
    return 'on';
  }

  /** Turn off on this device only (R28 AC1). */
  async disable(): Promise<void> {
    const sub = this.subscription();
    if (sub) {
      await firstValueFrom(this.http.delete(`${API_URL}/me/push-subscriptions`, { body: { endpoint: sub.endpoint } }));
    }
    await this.forgetLocally();
  }

  /**
   * "Send test notification" (R28 AC6). If the browser's subscription expired (410 PUSH_GONE), subscribe again once
   * — no prompt needed, permission is already granted — and retry.
   */
  async sendTest(): Promise<void> {
    const sub = this.subscription();
    if (!sub) throw new Error('Not subscribed');
    try {
      await this.postTest(sub.endpoint);
    } catch (err) {
      if (!(err instanceof HttpErrorResponse && err.status === 410)) throw err;
      await this.forgetLocally();
      const fresh = await this.swPush.requestSubscription({ serverPublicKey: this.key()! });
      await this.save(fresh);
      await this.postTest(fresh.endpoint);
    }
  }

  /** PUT /me/notify — account-wide choices (R28 AC2). */
  async savePrefs(prefs: NotifyPrefs): Promise<void> {
    const saved = await firstValueFrom(this.http.put<NotifyPrefs>(`${API_URL}/me/notify`, prefs));
    this.auth.setNotify(saved);
  }

  /** This device's endpoint, for sign-out (the server then stops sending here, R28 AC7). */
  currentEndpoint(): string | null {
    return this.subscription()?.endpoint ?? null;
  }

  /** Drops the browser's subscription on this device (after sign-out or Turn off). Never throws. */
  async forgetLocally(): Promise<void> {
    this.syncedFor = null;
    if (!this.supported || !this.subscription()) return;
    await this.swPush.unsubscribe().catch(() => undefined);
  }

  private save(sub: PushSubscription): Promise<unknown> {
    return firstValueFrom(
      this.http.post(
        `${API_URL}/me/push-subscriptions`,
        { subscription: sub.toJSON(), deviceName: deviceName() },
        { context: skipErrorSnackbar() },
      ),
    );
  }

  private postTest(endpoint: string): Promise<unknown> {
    return firstValueFrom(
      this.http.post(`${API_URL}/me/push-subscriptions/test`, { endpoint }, { context: skipErrorSnackbar() }),
    );
  }

  private readPermission(): NotificationPermission {
    return typeof Notification === 'undefined' ? 'default' : Notification.permission;
  }
}

import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import { Observable, firstValueFrom, tap } from 'rxjs';
import { Me, PasskeyDevice } from '../../shared/models';
import { authFormContext, skipErrorSnackbar } from '../interceptors/http-context.tokens';
import { API_URL } from './api-url';
import { AuthService } from './auth.service';

export type RegistrationOptions = PublicKeyCredentialCreationOptionsJSON;
export type AuthenticationOptions = PublicKeyCredentialRequestOptionsJSON;

/** Options from the server are valid for 5 minutes; refresh a bit before that. */
export const OPTIONS_MAX_AGE_MS = 4 * 60 * 1000;

/**
 * Fingerprint / Face ID with passkeys (R26–R27, design §15.5). The PIN stays (R26 AC1); this is the extra way in.
 *
 * Every ceremony is two steps: get options from the server (a fresh challenge) → `start…()` shows the device's
 * own fingerprint / face prompt and signs the challenge → send the answer back. The private key and the
 * biometric never leave the device.
 *
 * iPhone rule (design §15.5): the device prompt must start straight from a tap. So callers fetch the options
 * BEFORE the tap and pass them in; the `…OnDevice()` methods call the browser first, with no request before it.
 */
@Injectable({ providedIn: 'root' })
export class PasskeyService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly supportedState = signal(false);

  /**
   * True when this browser can do passkeys with a built-in fingerprint / face / screen-lock check. False → every
   * passkey button and row stays hidden and only the PIN shows (R26 AC3/AC5, R27 AC1).
   */
  readonly supported = this.supportedState.asReadonly();

  constructor() {
    void this.detect();
  }

  private async detect(): Promise<void> {
    try {
      this.supportedState.set(browserSupportsWebAuthn() && (await platformAuthenticatorIsAvailable()));
    } catch {
      this.supportedState.set(false);
    }
  }

  /** The user closed the device prompt, it timed out, or the finger / face didn't match. */
  static isCancel(err: unknown): boolean {
    const e = err as { name?: string; code?: string; cause?: { name?: string } } | null;
    return (
      e?.name === 'NotAllowedError' ||
      e?.name === 'AbortError' ||
      e?.cause?.name === 'NotAllowedError' ||
      e?.code === 'ERROR_CEREMONY_ABORTED'
    );
  }

  /** The device already holds a passkey of this account for this site. */
  static isAlreadyRegistered(err: unknown): boolean {
    const e = err as { name?: string; code?: string } | null;
    return e?.code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED' || e?.name === 'InvalidStateError';
  }

  // ---------- set up (R26 AC3) ----------

  /** Step 1: checks the PIN (wrong → 400 `{ errors: { pin } }`, counts toward the lockout) and returns options. */
  registrationOptions(pin: string): Observable<RegistrationOptions> {
    return this.http.post<RegistrationOptions>(`${API_URL}/webauthn/register/options`, { pin }, { context: skipErrorSnackbar() });
  }

  /** Step 2 — call straight from the tap: device prompt → save the new device. */
  async registerOnDevice(options: RegistrationOptions): Promise<PasskeyDevice> {
    const response = await startRegistration({ optionsJSON: options });
    const device = await firstValueFrom(
      this.http.post<PasskeyDevice>(
        `${API_URL}/webauthn/register/verify`,
        { response, deviceName: this.deviceName() },
        { context: skipErrorSnackbar() },
      ),
    );
    this.auth.setPasskeyCount((this.auth.userMe()?.passkeyCount ?? 0) + 1);
    return device;
  }

  // ---------- sign in (R26 AC5) ----------

  loginOptions(): Observable<AuthenticationOptions> {
    return this.http.post<AuthenticationOptions>(`${API_URL}/webauthn/login/options`, {}, { context: authFormContext() });
  }

  /** Call straight from the tap. Resolves with the signed-in account (session cookie set by the server). */
  async signInOnDevice(options: AuthenticationOptions): Promise<Me> {
    const response = await startAuthentication({ optionsJSON: options });
    return firstValueFrom(this.auth.passkeyLogin(response));
  }

  // ---------- unlock salaries (R27) ----------

  verifyOptions(context: HttpContext = skipErrorSnackbar()): Observable<AuthenticationOptions> {
    return this.http.post<AuthenticationOptions>(`${API_URL}/me/verify-passkey/options`, {}, { context });
  }

  /** Call straight from the tap. Resolves when the server accepted one of MY passkeys (R27 AC2). */
  async verifyOnDevice(options: AuthenticationOptions): Promise<void> {
    const response = await startAuthentication({ optionsJSON: options });
    await firstValueFrom(
      this.http.post<void>(`${API_URL}/me/verify-passkey`, { response }, { context: skipErrorSnackbar() }),
    );
  }

  // ---------- my devices (R26 AC3–AC4) ----------

  list(): Observable<PasskeyDevice[]> {
    return this.http
      .get<PasskeyDevice[]>(`${API_URL}/me/passkeys`)
      .pipe(tap((list) => this.auth.setPasskeyCount(list.length)));
  }

  remove(id: string): Observable<void> {
    return this.http
      .delete<void>(`${API_URL}/me/passkeys/${encodeURIComponent(id)}`)
      .pipe(tap(() => this.auth.setPasskeyCount(Math.max(0, (this.auth.userMe()?.passkeyCount ?? 1) - 1))));
  }

  // ---------- "Use fingerprint next time?" (R26 AC6) ----------

  private offerKey = (userId: string) => `passkey.offer.dismissed.${userId}`;

  /** Should the one-time offer show after this PIN sign-in? */
  shouldOffer(me: Me): boolean {
    if (!this.supported() || me.kind !== 'user' || me.status !== 'active' || me.passkeyCount > 0) return false;
    try {
      return localStorage.getItem(this.offerKey(me.user.id)) !== '1';
    } catch {
      return false; // storage blocked → don't nag on every sign-in
    }
  }

  dismissOffer(userId: string): void {
    try {
      localStorage.setItem(this.offerKey(userId), '1');
    } catch {
      /* a convenience only */
    }
  }

  /** "Chrome on Android", "Safari on iPhone", "Edge on Windows" — only a label in the Settings list. */
  deviceName(): string {
    const ua = navigator.userAgent;
    const browser = /Edg\//.test(ua)
      ? 'Edge'
      : /SamsungBrowser/.test(ua)
        ? 'Samsung Internet'
        : /OPR\//.test(ua)
          ? 'Opera'
          : /Firefox|FxiOS/.test(ua)
            ? 'Firefox'
            : /Chrome|CriOS/.test(ua)
              ? 'Chrome'
              : /Safari/.test(ua)
                ? 'Safari'
                : 'Browser';
    const os = /iPhone/.test(ua)
      ? 'iPhone'
      : /iPad/.test(ua)
        ? 'iPad'
        : /Android/.test(ua)
          ? 'Android'
          : /Windows/.test(ua)
            ? 'Windows'
            : /Mac OS X|Macintosh/.test(ua)
              ? 'Mac'
              : /Linux/.test(ua)
                ? 'Linux'
                : 'this device';
    return `${browser} on ${os}`.slice(0, 40);
  }
}

import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, firstValueFrom, map, of, retry, tap, throwError, timer } from 'rxjs';
import { Me, RegisterInput, UserMe } from '../../shared/models';
import { SKIP_AUTH_REDIRECT, SKIP_ERROR_SNACKBAR, authFormContext } from '../interceptors/http-context.tokens';
import { API_URL } from './api-url';

/** Where a person belongs (design §8.5): signed out → Welcome, admin → admin panel, waiting → pending page. */
export function homeUrl(me: Me | null): string {
  if (!me) return '/welcome';
  if (me.kind === 'admin') return '/admin';
  return me.status === 'pending' ? '/pending' : '/dashboard';
}

/** Render free plan: a sleeping server answers 502–504 (or nothing) for up to ~a minute while it wakes. */
const isWakingUp = (err: unknown) => err instanceof HttpErrorResponse && [0, 502, 503, 504].includes(err.status);

/**
 * Who is signed in (R13, design §8.5). The session itself is an httpOnly cookie the browser sends
 * automatically — JavaScript can't (and needn't) read it. This service only keeps the `Me` answer.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly state = signal<Me | null>(null);
  private readonly loadedState = signal(false);
  private readonly unreachableState = signal(false);
  private loading: Promise<void> | null = null;

  /** Current account, or null when signed out. */
  readonly me = this.state.asReadonly();
  /** False until the start-up "who am I?" check has answered (the app shows a splash meanwhile). */
  readonly loaded = this.loadedState.asReadonly();
  /**
   * True when the start-up check couldn't reach the server at all (offline, or the API is down). NOT the same as
   * signed out — the session cookie may be perfectly valid — so the app shows "Can't reach the server" instead of
   * the Welcome page (R16 AC4, design §11.2).
   */
  readonly unreachable = this.unreachableState.asReadonly();
  /** The signed-in user (not admin), or null. */
  readonly userMe = computed(() => {
    const me = this.state();
    return me?.kind === 'user' ? (me as UserMe) : null;
  });
  /**
   * True for the group owner (R15 AC5) — only used to hide buttons. The server's requireOwner (403) is
   * the real rule, so a member who edits this in DevTools still can't change anything.
   */
  readonly isOwner = computed(() => this.userMe()?.user.role === 'owner');

  /**
   * Loads `Me` once (started at app start; guards await it). Retries while the server wakes up — unless the
   * device itself says it's offline, then there's nothing to wait for. Still no answer → `unreachable`;
   * any other failure (401) counts as "signed out".
   */
  ensureLoaded(): Promise<void> {
    const deviceOnline = () => navigator.onLine !== false;
    this.loading ??= firstValueFrom(
      this.fetchMe().pipe(
        retry({ count: 6, delay: (err) => (isWakingUp(err) && deviceOnline() ? timer(5000) : throwError(() => err)) }),
        map((me): { me: Me | null; unreachable: boolean } => ({ me, unreachable: false })),
        catchError((err: unknown) => of({ me: null, unreachable: isWakingUp(err) })),
      ),
    ).then(({ me, unreachable }) => {
      this.state.set(me);
      this.unreachableState.set(unreachable);
      this.loadedState.set(true);
    });
    return this.loading;
  }

  /** Re-reads `Me` (e.g. "Check again" on the pending page). */
  refresh(): Observable<Me | null> {
    return this.fetchMe().pipe(
      catchError((err: unknown) => (err instanceof HttpErrorResponse && err.status === 401 ? of(null) : throwError(() => err))),
      tap((me) => this.state.set(me)),
    );
  }

  login(mobile: string, pin: string): Observable<Me> {
    return this.http
      .post<Me>(`${API_URL}/auth/login`, { mobile, pin }, { context: authFormContext() })
      .pipe(tap((me) => this.state.set(me)));
  }

  register(input: RegisterInput): Observable<Me> {
    return this.http
      .post<Me>(`${API_URL}/auth/register`, input, { context: authFormContext() })
      .pipe(tap((me) => this.state.set(me)));
  }

  adminLogin(username: string, password: string): Observable<Me> {
    return this.http
      .post<Me>(`${API_URL}/auth/admin/login`, { username, password }, { context: authFormContext() })
      .pipe(tap((me) => this.state.set(me)));
  }

  /** Clears the cookie on the server; locally signed out even if that request fails. */
  logout(): Observable<unknown> {
    return this.http.post(`${API_URL}/auth/logout`, null).pipe(
      catchError(() => of(null)),
      tap(() => this.clear()),
    );
  }

  /**
   * R13 AC1a: ends EVERY session of this account (server bumps tokenVersion). Unlike logout(), a failure is
   * NOT treated as success — the other devices would still be signed in, so the caller must know.
   */
  logoutAll(): Observable<unknown> {
    return this.http.post(`${API_URL}/auth/logout-all`, null).pipe(tap(() => this.clear()));
  }

  /** PUT /me — own name (mobile + group can't be changed, R13 AC4). */
  updateName(name: string, context?: HttpContext): Observable<Me> {
    return this.http.put<Me>(`${API_URL}/me`, { name }, { context }).pipe(tap((me) => this.state.set(me)));
  }

  /** PUT /me/pin — other devices are signed out; this one gets a fresh cookie. */
  changePin(currentPin: string, newPin: string, context?: HttpContext): Observable<void> {
    return this.http.put<void>(`${API_URL}/me/pin`, { currentPin, newPin }, { context });
  }

  /** Forget the account locally (after logout, or when the server says the session ended). */
  clear(): void {
    this.state.set(null);
  }

  private fetchMe(): Observable<Me> {
    // Quiet: a 401 here just means "not signed in" — no snackbar, no redirect.
    const context = new HttpContext().set(SKIP_ERROR_SNACKBAR, true).set(SKIP_AUTH_REDIRECT, true);
    return this.http.get<Me>(`${API_URL}/auth/me`, { context });
  }
}

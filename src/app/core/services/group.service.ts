import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import { CurrentGroup } from '../../shared/models';
import { SKIP_ERROR_SNACKBAR, skipLoading } from '../interceptors/http-context.tokens';
import { API_URL } from './api-url';
import { AuthService } from './auth.service';

/**
 * The signed-in member's group (R13 AC7, AC9; design §8.5): code, members, pending join requests.
 *
 * One cached copy for the whole app, so the expense form, the filter, the Settings page and the
 * nav badge all agree without each fetching. It loads by itself when an ACTIVE member signs in
 * (pending users and the admin get 403 from this endpoint) and is cleared on sign-out.
 */
@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = `${API_URL}/groups/current`;
  private readonly state = signal<CurrentGroup | null>(null);

  readonly group = this.state.asReadonly();
  /** Active members A–Z — the "Spent by" choices (R13 AC9). */
  readonly members = computed(() => this.state()?.members ?? []);
  readonly pending = computed(() => this.state()?.pending ?? []);
  /** Drives the badge on the Settings nav item (R13 AC7). */
  readonly pendingCount = computed(() => this.pending().length);

  /** Id of the signed-in ACTIVE member, else null. A string, so renaming yourself doesn't re-trigger a load. */
  private readonly activeMemberId = computed(() => {
    const m = this.auth.userMe();
    return m?.status === 'active' ? m.user.id : null;
  });

  constructor() {
    effect(() => {
      const id = this.activeMemberId();
      // untracked: only the account switching should re-run this, not the request's own state updates.
      untracked(() => {
        this.state.set(null); // never show the previous account's group
        if (id) this.refresh().subscribe({ error: () => undefined });
      });
    });
  }

  /**
   * Re-reads the group (e.g. when Settings opens, to see new join requests).
   * Background request: no progress bar and no error snackbar.
   */
  refresh(): Observable<CurrentGroup> {
    const context = skipLoading().set(SKIP_ERROR_SNACKBAR, true);
    return this.http.get<CurrentGroup>(this.url, { context }).pipe(tap((g) => this.state.set(g)));
  }

  /** Pending → active member; then reloads so the lists and badge update. */
  approve(userId: string): Observable<CurrentGroup> {
    return this.http.post<void>(`${this.url}/pending/${userId}/approve`, {}).pipe(switchMap(() => this.refresh()));
  }

  /** Deletes the pending account (R13 AC2); then reloads. */
  reject(userId: string): Observable<CurrentGroup> {
    return this.http.post<void>(`${this.url}/pending/${userId}/reject`, {}).pipe(switchMap(() => this.refresh()));
  }
}

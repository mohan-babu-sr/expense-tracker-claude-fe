import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AdminGroup,
  AdminUser,
  AdminUserCreate,
  AdminUserQuery,
  AdminUserUpdate,
} from '../../shared/models';
import { API_URL } from './api-url';

/** Simple account actions: POST /admin/users/:id/<action> → 204. */
export type AdminUserAction = 'approve' | 'reject' | 'disable' | 'enable';

/**
 * /api/admin (R13 AC5–AC6, design §8.3). Accounts and groups only — the admin never sees expenses.
 * `context`: pass skipErrorSnackbar() when a form shows the error under its field instead.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/admin`;

  /** 204; the server also sends a fresh session cookie (other admin sessions are signed out). */
  changePassword(currentPassword: string, newPassword: string, context?: HttpContext): Observable<void> {
    return this.http.put<void>(`${this.url}/password`, { currentPassword, newPassword }, { context });
  }

  // ---- groups ----

  listGroups(): Observable<AdminGroup[]> {
    return this.http.get<AdminGroup[]>(`${this.url}/groups`);
  }

  /** Also seeds the default categories (R13 AC10). */
  createGroup(name: string, code: string, context?: HttpContext): Observable<AdminGroup> {
    return this.http.post<AdminGroup>(`${this.url}/groups`, { name, code }, { context });
  }

  // ---- users ----

  listUsers(query: AdminUserQuery = {}): Observable<AdminUser[]> {
    let params = new HttpParams();
    if (query.q?.trim()) params = params.set('q', query.q.trim());
    if (query.groupId) params = params.set('groupId', query.groupId);
    if (query.status) params = params.set('status', query.status);
    return this.http.get<AdminUser[]>(`${this.url}/users`, { params });
  }

  /** Active at once (R13 AC6). */
  createUser(input: AdminUserCreate, context?: HttpContext): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.url}/users`, input, { context });
  }

  updateUser(id: string, input: AdminUserUpdate, context?: HttpContext): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.url}/users/${id}`, input, { context });
  }

  /** "Forgot PIN" (R13 AC4): sets a new PIN, unlocks the account and signs it out everywhere. */
  resetPin(id: string, pin: string, context?: HttpContext): Observable<void> {
    return this.http.post<void>(`${this.url}/users/${id}/reset-pin`, { pin }, { context });
  }

  userAction(id: string, action: AdminUserAction): Observable<void> {
    return this.http.post<void>(`${this.url}/users/${id}/${action}`, {});
  }
}

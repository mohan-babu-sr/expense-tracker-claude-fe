import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Upcoming, UpcomingDoneResult, UpcomingInput } from '../../shared/models';
import { API_URL } from './api-url';

/** /api/upcoming (R14, design §9.2). */
@Injectable({ providedIn: 'root' })
export class UpcomingService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/upcoming`;

  /** Open items (due date ascending) or the latest 50 done items. */
  list(status: 'open' | 'done' = 'open'): Observable<Upcoming[]> {
    return this.http.get<Upcoming[]>(this.url, { params: { status } });
  }

  create(input: UpcomingInput, context?: HttpContext): Observable<Upcoming> {
    return this.http.post<Upcoming>(this.url, input, { context });
  }

  update(id: string, input: UpcomingInput, context?: HttpContext): Observable<Upcoming> {
    return this.http.put<Upcoming>(`${this.url}/${id}`, input, { context });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  restore(id: string): Observable<Upcoming> {
    return this.http.post<Upcoming>(`${this.url}/${id}/restore`, {});
  }

  /** Mark done; a repeating item also returns its next occurrence (R14 AC5). */
  done(id: string): Observable<UpcomingDoneResult> {
    return this.http.post<UpcomingDoneResult>(`${this.url}/${id}/done`, {});
  }
}

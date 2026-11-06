import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Dashboard } from '../../shared/models';
import { API_URL } from './api-url';

/** /api/dashboard (R7, R8 AC4). */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  /** Everything the dashboard needs for `month` (YYYY-MM; default current) in one call. */
  get(month?: string): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${API_URL}/dashboard`, { params: month ? { month } : {} });
  }
}

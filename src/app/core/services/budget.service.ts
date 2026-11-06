import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Budget, BudgetInput, BudgetSummary } from '../../shared/models';
import { API_URL } from './api-url';

/** /api/budgets (R8). */
@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/budgets`;

  /** Budgets with spent / percent / status for `month` (YYYY-MM; default current). */
  getStatus(month?: string): Observable<BudgetSummary> {
    return this.http.get<BudgetSummary>(this.url, { params: month ? { month } : {} });
  }

  /** Create or update; `categoryId: null` = overall budget. */
  save(input: BudgetInput): Observable<Budget> {
    return this.http.put<Budget>(this.url, input);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}

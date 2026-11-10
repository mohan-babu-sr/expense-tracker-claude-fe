import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Budget, BudgetInput, BudgetSummary, MemberBudget } from '../../shared/models';
import { API_URL } from './api-url';

/** /api/budgets (R8, R15). Every write is owner-only on the server (403 otherwise). */
@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/budgets`;

  /** Budgets with spent / percent / status for `month` (YYYY-MM; default current). */
  getStatus(month?: string): Observable<BudgetSummary> {
    return this.http.get<BudgetSummary>(this.url, { params: month ? { month } : {} });
  }

  /** Create or update a category budget. */
  save(input: BudgetInput): Observable<Budget> {
    return this.http.put<Budget>(this.url, input);
  }

  /** Set (or clear with null) a member's monthly limit; returns their row for `month` (R15 AC1). */
  setMemberLimit(userId: string, limit: number | null, month?: string): Observable<MemberBudget> {
    return this.http.put<MemberBudget>(`${this.url}/members/${userId}`, { limit }, { params: month ? { month } : {} });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}

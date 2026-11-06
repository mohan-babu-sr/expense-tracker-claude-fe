import { HttpClient, HttpContext, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Expense, ExpenseFilter, ExpenseInput, ExpensePage, PageSize } from '../../shared/models';
import { SKIP_ERROR_SNACKBAR, skipLoading } from '../interceptors/http-context.tokens';
import { API_URL } from './api-url';

/** Filter object → query params; empty values are left out. Shared by list and export. */
export function toFilterParams(filter: ExpenseFilter): HttpParams {
  let params = new HttpParams();
  if (filter.from || filter.to) {
    if (filter.from) params = params.set('from', filter.from);
    if (filter.to) params = params.set('to', filter.to);
  } else if (filter.month) {
    params = params.set('month', filter.month);
  }
  if (filter.categoryIds?.length) params = params.set('categoryIds', filter.categoryIds.join(','));
  if (filter.paymentMethod) params = params.set('paymentMethod', filter.paymentMethod);
  if (filter.user) params = params.set('user', filter.user);
  if (filter.q?.trim()) params = params.set('q', filter.q.trim());
  return params;
}

/** /api/expenses (R1–R4, R6, R9). */
@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/expenses`;

  /** Filtered page, newest first, with `total` and `totalAmount` for all matches. */
  list(filter: ExpenseFilter, page = 1, pageSize: PageSize = 10): Observable<ExpensePage<Expense>> {
    const params = toFilterParams(filter).set('page', page).set('pageSize', pageSize);
    return this.http.get<ExpensePage<Expense>>(this.url, { params });
  }

  get(id: string): Observable<Expense> {
    return this.http.get<Expense>(`${this.url}/${id}`);
  }

  /** `context`: e.g. skipErrorSnackbar() when the form maps 400 field errors inline. */
  create(input: ExpenseInput, context?: HttpContext): Observable<Expense> {
    return this.http.post<Expense>(this.url, input, { context });
  }

  update(id: string, input: ExpenseInput, context?: HttpContext): Observable<Expense> {
    return this.http.put<Expense>(`${this.url}/${id}`, input, { context });
  }

  /** Soft delete — can be undone with restore() (R4). */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  restore(id: string): Observable<Expense> {
    return this.http.post<Expense>(`${this.url}/${id}/restore`, {});
  }

  /**
   * Merchant autocomplete (R1 AC1a). Silent: no progress bar (it fires while typing) and no
   * error snackbar (missing suggestions are not worth interrupting the user for).
   */
  merchants(q: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.url}/merchants`, {
      params: { q },
      context: skipLoading().set(SKIP_ERROR_SNACKBAR, true),
    });
  }

  /**
   * CSV of the filtered expenses (R9). Full response so the caller can read the file name
   * from the Content-Disposition header.
   */
  export(filter: ExpenseFilter): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.url}/export`, {
      params: toFilterParams(filter),
      responseType: 'blob',
      observe: 'response',
    });
  }
}

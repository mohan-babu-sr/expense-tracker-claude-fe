import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Category, CategoryInput } from '../../shared/models';
import { API_URL } from './api-url';

/** /api/categories (R5). */
@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/categories`;

  /** All categories (A–Z, "Other" last), each with `expenseCount`. */
  getAll(): Observable<Category[]> {
    return this.http.get<Category[]>(this.url);
  }

  /** `context`: e.g. skipErrorSnackbar() when the form shows the 409 "name exists" error inline. */
  create(input: CategoryInput, context?: HttpContext): Observable<Category> {
    return this.http.post<Category>(this.url, input, { context });
  }

  update(id: string, input: CategoryInput, context?: HttpContext): Observable<Category> {
    return this.http.put<Category>(`${this.url}/${id}`, input, { context });
  }

  /** 409 when the category is used by expenses or is "Other". */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}

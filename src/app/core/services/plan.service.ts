import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, tap } from 'rxjs';
import {
  ExtraIncomeInput,
  PlanMonth,
  RegularEntry,
  RegularItem,
  RegularItemInput,
  Savings,
  WithdrawalInput,
} from '../../shared/models';
import { SKIP_ERROR_SNACKBAR, skipLoading } from '../interceptors/http-context.tokens';
import { API_URL } from './api-url';

/** /api/plan, /api/regular-items, /api/savings — monthly plan, savings & extra income (R17–R20, design §12.4). */
@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/plan`;
  private readonly itemsUrl = `${API_URL}/regular-items`;
  private readonly savingsUrl = `${API_URL}/savings`;

  /**
   * `userId:month` pairs known to have a salary — so "Add expense" only asks the server once per month
   * (R17 AC3). A salary can't be removed, so a pair never needs to leave the set.
   */
  private readonly salaryKnown = new Set<string>();

  /** GET /plan?month= — one month's salaries, regular checklist and numbers. */
  get(month: string, context?: HttpContext): Observable<PlanMonth> {
    return this.http.get<PlanMonth>(this.url, { params: { month }, context }).pipe(tap((p) => this.remember(p)));
  }

  /** Set a member's salary for a month (any member may set anyone's — R17 AC2). Returns the updated month. */
  setSalary(userId: string, month: string, amount: number, context?: HttpContext): Observable<PlanMonth> {
    return this.http
      .put<PlanMonth>(`${this.url}/salaries/${userId}`, { amount }, { params: { month }, context })
      .pipe(tap((p) => this.remember(p)));
  }

  /**
   * True when `userId` must enter a salary before adding an expense in `month` (R17 AC3).
   * Background check: no progress bar, no snackbar — if it fails, the form opens and the server decides.
   */
  isSalaryMissing(userId: string, month: string): Observable<boolean> {
    if (this.salaryKnown.has(`${userId}:${month}`)) return of(false);
    const context = skipLoading().set(SKIP_ERROR_SNACKBAR, true);
    return this.get(month, context).pipe(map((p) => p.started && p.missing.some((u) => u.id === userId)));
  }

  /** This month's amount and/or the Paid tick of one regular entry (R18 AC3). */
  updateEntry(id: string, change: { amount?: number; paid?: boolean }, context?: HttpContext): Observable<RegularEntry> {
    return this.http.put<RegularEntry>(`${this.url}/regular-entries/${id}`, change, { context });
  }

  listItems(): Observable<RegularItem[]> {
    return this.http.get<RegularItem[]>(this.itemsUrl);
  }

  createItem(input: RegularItemInput, context?: HttpContext): Observable<RegularItem> {
    return this.http.post<RegularItem>(this.itemsUrl, input, { context });
  }

  updateItem(id: string, input: RegularItemInput, context?: HttpContext): Observable<RegularItem> {
    return this.http.put<RegularItem>(`${this.itemsUrl}/${id}`, input, { context });
  }

  deleteItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.itemsUrl}/${id}`);
  }

  getSavings(): Observable<Savings> {
    return this.http.get<Savings>(this.savingsUrl);
  }

  /** Record a withdrawal; returns the updated savings. 409 NOT_ENOUGH_SAVINGS when it's more than saved. */
  withdraw(input: WithdrawalInput, context?: HttpContext): Observable<Savings> {
    return this.http.post<Savings>(`${this.savingsUrl}/withdrawals`, input, { context });
  }

  deleteWithdrawal(id: string): Observable<void> {
    return this.http.delete<void>(`${this.savingsUrl}/withdrawals/${id}`);
  }

  /** Record extra income (R20); returns the updated savings. 400 on `date` when it's before the plan start. */
  addExtraIncome(input: ExtraIncomeInput, context?: HttpContext): Observable<Savings> {
    return this.http.post<Savings>(`${this.savingsUrl}/extra-income`, input, { context });
  }

  deleteExtraIncome(id: string): Observable<void> {
    return this.http.delete<void>(`${this.savingsUrl}/extra-income/${id}`);
  }

  private remember(plan: PlanMonth): void {
    for (const s of plan.salaries) if (s.amount !== null) this.salaryKnown.add(`${s.user.id}:${plan.month}`);
  }
}

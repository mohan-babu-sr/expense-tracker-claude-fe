import { Injectable, computed, effect, inject, untracked } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ExpenseFilter, PaymentMethod } from '../../shared/models';
import { currentMonth } from '../../shared/utils/date.utils';

/** R6 AC1 / AC4: the default is "this month, no other filters". */
export const defaultFilter = (): ExpenseFilter => ({ month: currentMonth() });

/** True when the filter is the default (nothing to clear, no chips). */
export function isDefaultFilter(f: ExpenseFilter): boolean {
  return countActiveFilters(f) === 0;
}

/** Number of active (non-default) filters — the badge on the mobile "Filters" button. */
export function countActiveFilters(f: ExpenseFilter): number {
  let n = 0;
  if (f.from || f.to) n++;
  else if (f.month && f.month !== currentMonth()) n++;
  if (f.categoryIds?.length) n++;
  if (f.paymentMethod) n++;
  if (f.userId) n++;
  if (f.q?.trim()) n++;
  return n;
}

/** Drops empty values; a date range always replaces the month (they're mutually exclusive). */
function normalize(f: ExpenseFilter): ExpenseFilter {
  const out: ExpenseFilter = {};
  if (f.from || f.to) {
    if (f.from) out.from = f.from;
    if (f.to) out.to = f.to;
  } else {
    out.month = f.month ?? currentMonth();
  }
  if (f.categoryIds?.length) out.categoryIds = [...f.categoryIds];
  if (f.paymentMethod) out.paymentMethod = f.paymentMethod;
  if (f.userId) out.userId = f.userId;
  if (f.q?.trim()) out.q = f.q.trim();
  return out;
}

/**
 * Current expense filters (design §4 "State: plain services + RxJS", R6).
 * A BehaviorSubject holds the value; the page subscribes and re-fetches on every change.
 * The filter bar, mobile bottom sheet and chips all read and write through this service,
 * so they always agree.
 *
 * providedIn 'root' (code still lives in the lazy expenses chunk): the bottom sheet is created
 * by MatBottomSheet's root injector, which can't see services provided by a lazy module. Bonus:
 * filters survive navigating to another page and back.
 */
@Injectable({ providedIn: 'root' })
export class ExpenseFilterService {
  private readonly subject = new BehaviorSubject<ExpenseFilter>(defaultFilter());
  private readonly userMe = inject(AuthService).userMe;
  private readonly accountId = computed(() => this.userMe()?.user.id ?? null);

  constructor() {
    // Filters hold member ids, so a different account on this browser starts from the default.
    effect(() => {
      this.accountId();
      untracked(() => this.clear());
    });
  }

  /** Emits only real changes (compared by value), so the list isn't re-fetched needlessly. */
  readonly filter$: Observable<ExpenseFilter> = this.subject.pipe(
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
  );

  get value(): ExpenseFilter {
    return this.subject.value;
  }

  private set(f: ExpenseFilter): void {
    this.subject.next(normalize(f));
  }

  setMonth(month: string): void {
    const { from, to, ...rest } = this.value;
    this.set({ ...rest, month });
  }

  setRange(from: string, to: string): void {
    const { month, ...rest } = this.value;
    this.set({ ...rest, from, to });
  }

  setCategories(categoryIds: string[]): void {
    this.set({ ...this.value, categoryIds });
  }

  setPaymentMethod(paymentMethod: PaymentMethod | undefined): void {
    this.set({ ...this.value, paymentMethod });
  }

  setUser(userId: string | undefined): void {
    this.set({ ...this.value, userId });
  }

  setSearch(q: string): void {
    this.set({ ...this.value, q });
  }

  /** R6 AC4: back to the current month with nothing else. */
  clear(): void {
    this.set(defaultFilter());
  }
}

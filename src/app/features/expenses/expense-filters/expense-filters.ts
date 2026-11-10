import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CategoryService } from '../../../core/services/category.service';
import { GroupService } from '../../../core/services/group.service';
import { PAYMENT_METHODS } from '../../../shared/constants';
import { PaymentMethod } from '../../../shared/models';
import { currentMonth, fromIsoDate, toIsoDate } from '../../../shared/utils/date.utils';
import { ExpenseFilterService, isDefaultFilter } from '../expense-filter.service';

type PeriodMode = 'month' | 'range';

/**
 * Filter controls (R6): month OR date range, categories (multi), payment method, search.
 * Every change is written straight to ExpenseFilterService (no "Apply" step); the service is
 * the single source of truth, and these controls are re-synced whenever it changes
 * (e.g. a chip was removed or "Clear" was pressed).
 *
 *   layout="inline"  → one wrapping row (laptop filter bar)
 *   layout="stacked" → full-width fields (mobile bottom sheet)
 */
@Component({
  selector: 'app-expense-filters',
  standalone: false,
  templateUrl: './expense-filters.html',
  styleUrl: './expense-filters.scss',
  host: { '[class.stacked]': "layout() === 'stacked'" },
})
export class ExpenseFilters {
  private readonly filters = inject(ExpenseFilterService);
  private readonly destroyRef = inject(DestroyRef);

  readonly layout = input<'inline' | 'stacked'>('inline');
  /** The mobile page shows search outside the sheet, so the sheet hides it. */
  readonly showSearch = input(true);

  protected readonly paymentMethods = PAYMENT_METHODS;
  /** Group members (R13 AC9). */
  protected readonly members = inject(GroupService).members;
  protected readonly categories = toSignal(inject(CategoryService).getAll(), { initialValue: [] });
  protected readonly today = new Date();
  protected readonly maxMonth = currentMonth();

  protected readonly mode = signal<PeriodMode>('month');
  protected readonly month = signal(currentMonth());
  protected readonly rangeStart = new FormControl<Date | null>(null);
  protected readonly rangeEnd = new FormControl<Date | null>(null);
  protected readonly categoryIds = new FormControl<string[]>([], { nonNullable: true });
  protected readonly paymentMethod = new FormControl<PaymentMethod | null>(null);
  protected readonly user = new FormControl<string | null>(null);
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly canClear = signal(false);

  /** "Food, Transport" for the closed category select. */
  private readonly selectedIds = signal<string[]>([]);
  protected readonly selectedCategoryNames = computed(() =>
    this.selectedIds()
      .map((id) => this.categories().find((c) => c.id === id)?.name)
      .filter(Boolean)
      .join(', '),
  );

  constructor() {
    // Service → controls (emitEvent: false so syncing doesn't write back and loop).
    this.filters.filter$.pipe(takeUntilDestroyed()).subscribe((f) => {
      if (f.from || f.to) {
        this.mode.set('range');
        this.rangeStart.setValue(f.from ? fromIsoDate(f.from) : null, { emitEvent: false });
        this.rangeEnd.setValue(f.to ? fromIsoDate(f.to) : null, { emitEvent: false });
      } else {
        // Keep "range" mode while the user is still picking the two dates.
        const pickingRange = this.mode() === 'range' && !isDefaultFilter(f) && !this.rangeEnd.value;
        if (!pickingRange) this.mode.set('month');
        this.month.set(f.month ?? currentMonth());
        if (isDefaultFilter(f)) {
          this.rangeStart.setValue(null, { emitEvent: false });
          this.rangeEnd.setValue(null, { emitEvent: false });
        }
      }
      this.categoryIds.setValue(f.categoryIds ?? [], { emitEvent: false });
      this.selectedIds.set(f.categoryIds ?? []);
      this.paymentMethod.setValue(f.paymentMethod ?? null, { emitEvent: false });
      this.user.setValue(f.userId ?? null, { emitEvent: false });
      if ((f.q ?? '') !== this.search.value.trim()) this.search.setValue(f.q ?? '', { emitEvent: false });
      this.canClear.set(!isDefaultFilter(f));
    });

    // Search: apply after a 300ms pause in typing (R6 AC3).
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => this.filters.setSearch(q));
  }

  protected onModeChange(mode: PeriodMode): void {
    this.mode.set(mode);
    // Back to month mode → current month. Range mode waits until both dates are picked.
    if (mode === 'month') this.filters.setMonth(currentMonth());
  }

  protected onMonthChange(month: string): void {
    this.filters.setMonth(month);
  }

  protected onRangeChange(): void {
    const start = this.rangeStart.value;
    const end = this.rangeEnd.value;
    if (start && end) this.filters.setRange(toIsoDate(start), toIsoDate(end));
  }

  protected onCategoriesChange(ids: string[]): void {
    this.filters.setCategories(ids);
  }

  protected onPaymentChange(value: PaymentMethod | null): void {
    this.filters.setPaymentMethod(value ?? undefined);
  }

  protected onUserChange(value: string | null): void {
    this.filters.setUser(value ?? undefined);
  }

  protected clear(): void {
    this.mode.set('month');
    this.filters.clear();
  }
}

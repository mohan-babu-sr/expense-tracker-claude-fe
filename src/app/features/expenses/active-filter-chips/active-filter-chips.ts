import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CategoryService } from '../../../core/services/category.service';
import { GroupService } from '../../../core/services/group.service';
import { PAYMENT_METHOD_MAP } from '../../../shared/constants';
import { currentMonth, fromIsoDate, monthToDate } from '../../../shared/utils/date.utils';
import { ExpenseFilterService, defaultFilter } from '../expense-filter.service';

interface FilterChip {
  key: string;
  icon: string;
  label: string;
  remove: () => void;
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-IN', opts);
const monthFmt = fmt({ month: 'short', year: 'numeric' });
const dayFmt = fmt({ day: 'numeric', month: 'short', year: 'numeric' });

/**
 * One removable chip per active filter + "Clear all" (R6 AC4).
 * The current month is the default, so it gets no chip.
 */
@Component({
  selector: 'app-active-filter-chips',
  standalone: false,
  templateUrl: './active-filter-chips.html',
  styleUrl: './active-filter-chips.scss',
})
export class ActiveFilterChips {
  private readonly filters = inject(ExpenseFilterService);
  private readonly filter = toSignal(this.filters.filter$, { initialValue: defaultFilter() });
  private readonly categories = toSignal(inject(CategoryService).getAll(), { initialValue: [] });
  private readonly members = inject(GroupService).members;

  protected readonly chips = computed<FilterChip[]>(() => {
    const f = this.filter();
    const chips: FilterChip[] = [];
    const s = this.filters;

    if (f.from || f.to) {
      const from = f.from ? dayFmt.format(fromIsoDate(f.from)) : '…';
      const to = f.to ? dayFmt.format(fromIsoDate(f.to)) : '…';
      chips.push({ key: 'range', icon: 'date_range', label: `${from} – ${to}`, remove: () => s.setMonth(currentMonth()) });
    } else if (f.month && f.month !== currentMonth()) {
      chips.push({ key: 'month', icon: 'calendar_month', label: monthFmt.format(monthToDate(f.month)), remove: () => s.setMonth(currentMonth()) });
    }

    for (const id of f.categoryIds ?? []) {
      const name = this.categories().find((c) => c.id === id)?.name ?? 'Category';
      chips.push({
        key: `cat-${id}`,
        icon: 'category',
        label: name,
        remove: () => s.setCategories((s.value.categoryIds ?? []).filter((x) => x !== id)),
      });
    }

    if (f.paymentMethod) {
      chips.push({ key: 'pay', icon: 'payments', label: PAYMENT_METHOD_MAP[f.paymentMethod].label, remove: () => s.setPaymentMethod(undefined) });
    }

    if (f.userId) {
      const name = this.members().find((u) => u.id === f.userId)?.name ?? 'Member';
      chips.push({ key: 'user', icon: 'person', label: name, remove: () => s.setUser(undefined) });
    }

    if (f.q) {
      chips.push({ key: 'q', icon: 'search', label: `“${f.q}”`, remove: () => s.setSearch('') });
    }
    return chips;
  });

  protected clearAll(): void {
    this.filters.clear();
  }
}

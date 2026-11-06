import { Component, computed, input, output } from '@angular/core';
import { Expense } from '../../../shared/models';
import { addDaysIso, todayIso } from '../../../shared/utils/date.utils';

interface DateGroup {
  date: string;
  /** "Today", "Yesterday" or the date itself (formatted in the template). */
  label: string | null;
  total: number;
  items: Expense[];
}

/**
 * Mobile expense list: cards grouped by date with a per-day total, plus "Load more"
 * (R2 AC2, NFR1). Items arrive newest first, so groups come out in order without sorting.
 */
@Component({
  selector: 'app-expense-card-list',
  standalone: false,
  templateUrl: './expense-card-list.html',
  styleUrl: './expense-card-list.scss',
})
export class ExpenseCardList {
  readonly expenses = input.required<Expense[]>();
  readonly hasMore = input(false);
  readonly loadingMore = input(false);

  readonly loadMore = output<void>();
  readonly edit = output<Expense>();
  readonly delete = output<Expense>();

  protected readonly groups = computed<DateGroup[]>(() => {
    const today = todayIso();
    const yesterday = addDaysIso(today, -1);
    const groups: DateGroup[] = [];
    for (const e of this.expenses()) {
      let group = groups.at(-1);
      if (group?.date !== e.date) {
        group = {
          date: e.date,
          label: e.date === today ? 'Today' : e.date === yesterday ? 'Yesterday' : null,
          total: 0,
          items: [],
        };
        groups.push(group);
      }
      group.items.push(e);
      group.total = Math.round((group.total + e.amount) * 100) / 100;
    }
    return groups;
  });
}

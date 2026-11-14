import { Component, computed, input } from '@angular/core';
import { Dashboard } from '../../../shared/models';
import { addMonths, monthToDate } from '../../../shared/utils/date.utils';

/**
 * Summary for the selected month (R7 AC1) — v5 layout (R21 AC4, design §13.5): an indigo hero card with the total,
 * the change vs last month and a mini 6-month trend, plus tiles for count, average per day and top category.
 * Same numbers as before, all from GET /dashboard. Phone: hero on top, tiles in a 2-column grid; laptop: hero
 * on the left, tiles on the right.
 */
@Component({
  selector: 'app-summary-cards',
  standalone: false,
  templateUrl: './summary-cards.html',
  styleUrl: './summary-cards.scss',
})
export class SummaryCards {
  readonly data = input.required<Dashboard>();

  private readonly monthFmt = new Intl.DateTimeFormat('en-IN', { month: 'long' });
  private readonly shortFmt = new Intl.DateTimeFormat('en-IN', { month: 'short' });

  protected readonly monthName = computed(() => this.monthFmt.format(monthToDate(this.data().month)));

  /**
   * Spending UP is bad news, DOWN is good — shown with an arrow AND words (NFR5).
   * v5.1: names the previous month ("7.2% more than Oct") — shorter, so the pill stays on one line at 360px.
   */
  protected readonly change = computed(() => {
    const pct = this.data().changeVsPrevPct;
    const prev = this.shortFmt.format(monthToDate(addMonths(this.data().month, -1)));
    if (pct === null) return { icon: 'remove', text: `No data for ${prev}` };
    if (pct === 0) return { icon: 'trending_flat', text: `Same as ${prev}` };
    const up = pct > 0;
    return {
      icon: up ? 'trending_up' : 'trending_down',
      text: `${Math.abs(pct)}% ${up ? 'more' : 'less'} than ${prev}`,
    };
  });

  /** Mini bars: height relative to the busiest of the 6 months (min 6% so an empty month still shows a stub). */
  protected readonly trend = computed(() => {
    const months = this.data().last6Months;
    const max = Math.max(...months.map((m) => m.amount), 0);
    return months.map((m) => ({
      month: m.month,
      label: this.shortFmt.format(monthToDate(m.month)).slice(0, 1),
      height: max > 0 ? Math.max(6, Math.round((m.amount / max) * 100)) : 6,
      current: m.month === this.data().month,
    }));
  });
}

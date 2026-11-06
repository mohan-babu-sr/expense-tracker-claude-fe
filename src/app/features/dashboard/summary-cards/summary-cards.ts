import { Component, computed, input } from '@angular/core';
import { Dashboard } from '../../../shared/models';

/**
 * Five summary cards for the selected month (R7 AC1): total, count, average per day,
 * top category, change vs previous month. One column on mobile, a grid on laptop (AC5).
 */
@Component({
  selector: 'app-summary-cards',
  standalone: false,
  templateUrl: './summary-cards.html',
  styleUrl: './summary-cards.scss',
})
export class SummaryCards {
  readonly data = input.required<Dashboard>();

  /** Spending UP is bad news, DOWN is good — shown with an arrow AND words (NFR5). */
  protected readonly change = computed(() => {
    const pct = this.data().changeVsPrevPct;
    if (pct === null) return { icon: 'remove', text: 'No data last month', cls: 'neutral' };
    if (pct === 0) return { icon: 'trending_flat', text: 'Same as last month', cls: 'neutral' };
    const up = pct > 0;
    return {
      icon: up ? 'trending_up' : 'trending_down',
      text: `${Math.abs(pct)}% ${up ? 'more' : 'less'} than last month`,
      cls: up ? 'up' : 'down',
    };
  });
}

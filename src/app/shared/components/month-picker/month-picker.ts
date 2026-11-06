import { Component, computed, input, model } from '@angular/core';
import { addMonths, currentMonth, monthToDate } from '../../utils/date.utils';

/**
 * ‹ Nov 2026 › month selector (R6 AC1, R7 AC5, R8 AC2). Two-way binding:
 *
 *   <app-month-picker [(month)]="selectedMonth" />
 *
 * Next is disabled after `max` (default: current month) — no point browsing empty future months.
 */
@Component({
  selector: 'app-month-picker',
  standalone: false,
  templateUrl: './month-picker.html',
  styleUrl: './month-picker.scss',
})
export class MonthPicker {
  /** `YYYY-MM`. `model()` = an input that can also write back (two-way binding). */
  readonly month = model(currentMonth());
  readonly max = input(currentMonth());

  protected readonly date = computed(() => monthToDate(this.month()));
  // 'YYYY-MM' strings compare correctly as text.
  protected readonly canGoNext = computed(() => this.month() < this.max());

  protected previous(): void {
    this.month.set(addMonths(this.month(), -1));
  }

  protected next(): void {
    if (this.canGoNext()) this.month.set(addMonths(this.month(), 1));
  }
}

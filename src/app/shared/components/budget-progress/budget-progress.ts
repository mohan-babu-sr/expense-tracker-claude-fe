import { Component, computed, input } from '@angular/core';
import { BudgetLevel } from '../../models';

const STATUS_TEXT: Record<BudgetLevel, { icon: string; label: string }> = {
  ok: { icon: 'check_circle', label: 'On track' },
  warning: { icon: 'warning', label: 'Near limit' },
  danger: { icon: 'error', label: 'Over budget' },
};

/**
 * Progress bar + "₹900 / ₹1,000 · 90%" + status text (R8 AC2, AC3).
 * Status is shown with color AND an icon AND words (NFR5) — never color alone.
 * Project the label (e.g. a category chip) as content:
 *
 *   <app-budget-progress [spent]="s.spent" [budget]="s.budget" [percent]="s.percent" [status]="s.status">
 *     <app-category-chip [category]="s.category" />
 *   </app-budget-progress>
 */
@Component({
  selector: 'app-budget-progress',
  standalone: false,
  templateUrl: './budget-progress.html',
  styleUrl: './budget-progress.scss',
})
export class BudgetProgress {
  readonly spent = input.required<number>();
  readonly budget = input.required<number>();
  readonly percent = input.required<number>();
  readonly status = input.required<BudgetLevel>();

  /** The bar can't go past 100%; the text still shows e.g. 110%. */
  protected readonly barValue = computed(() => Math.min(this.percent(), 100));
  protected readonly statusText = computed(() => STATUS_TEXT[this.status()]);
  protected readonly overBy = computed(() => Math.max(0, this.spent() - this.budget()));
  protected readonly left = computed(() => Math.max(0, this.budget() - this.spent()));
}

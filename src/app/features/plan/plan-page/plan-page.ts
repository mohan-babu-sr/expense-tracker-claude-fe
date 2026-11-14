import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

export type PlanTab = 'month' | 'regular' | 'savings';
const TABS: readonly PlanTab[] = ['month', 'regular', 'savings'];

/**
 * Plan page (R17–R19, design §12.5): three views behind a segmented switch —
 *   Month    salaries, the formula and the regular checklist for one month
 *   Regular  the regular item templates
 *   Savings  overall savings, history and withdrawals
 * The view lives in the URL (`/plan?tab=savings`), so the dashboard can link straight to it and Back works.
 * A button toggle instead of mat-tab-group: same look as Upcoming's Open/Done, and no extra Material module.
 */
@Component({
  selector: 'app-plan-page',
  standalone: false,
  templateUrl: './plan-page.html',
  styleUrl: './plan-page.scss',
})
export class PlanPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly tab = toSignal(
    this.route.queryParamMap.pipe(
      map((q) => {
        const t = q.get('tab') as PlanTab | null;
        return t && TABS.includes(t) ? t : 'month';
      }),
    ),
    { initialValue: 'month' as PlanTab },
  );

  protected readonly subtitle = computed(() => {
    switch (this.tab()) {
      case 'regular':
        return 'Must-pay items set aside first each month';
      case 'savings':
        return 'What the group has saved so far';
      default:
        return 'Salary − regular − limits = savings';
    }
  });

  protected select(tab: PlanTab): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'month' ? null : tab },
      replaceUrl: true,
    });
  }
}

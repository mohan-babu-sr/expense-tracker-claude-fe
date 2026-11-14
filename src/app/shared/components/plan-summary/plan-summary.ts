import { Component, computed, input } from '@angular/core';
import { PlanNumbers } from '../../models';

/**
 * The month's formula as a small statement (R19 AC1–AC2) — Plan → Month. Kept in shared/ because it is a generic
 * read-only view of PlanNumbers (the dashboard card that also used it was removed — R19 AC7):
 *
 *     Salary                      ₹1,20,000
 *   − Regular expenses              ₹38,000
 *   − Member limits                 ₹35,000
 *   = Planned savings               ₹47,000
 *     Actual savings (so far)       ₹52,000   ← salary − regular − everything spent
 *
 * Negative results read "Short by ₹…" with an icon (NFR5).
 */
@Component({
  selector: 'app-plan-summary',
  standalone: false,
  templateUrl: './plan-summary.html',
  styleUrl: './plan-summary.scss',
})
export class PlanSummary {
  readonly plan = input.required<PlanNumbers>();

  protected readonly missingNames = computed(() => this.plan().missing.map((u) => u.name).join(', '));
  protected readonly actualLabel = computed(() => (this.plan().finished ? 'Actual savings' : 'Actual savings so far'));
}

import { Component, computed, input } from '@angular/core';
import { PlanNumbers } from '../../models';

type SegmentKey = 'regular' | 'limits' | 'savings';

/**
 * The month's plan as a visual summary (R19 AC1–AC2; v5.1 look — R21 AC11, design §13.8), Plan → Month:
 *
 *   PLANNED SAVINGS
 *   ₹47,000  of ₹1,20,000 salary
 *   [███ regular ███|▓▓ limits ▓▓|░░░ savings ░░░]   ← one bar = how the salary splits
 *   ● Regular ₹38,000  ● Limits ₹35,000  ● Savings ₹47,000
 *   Actual savings so far  ₹52,000  (↑ ₹5,000 above plan)
 *
 * The bar is plain CSS: each segment's flex-grow is its amount. When regular + limits exceed the salary, the bar
 * shows just those two and a line says by how much (words + icon, never colour alone — NFR5).
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

  /** Bar segments with a positive amount, in salary order: regular → limits → savings. */
  protected readonly segments = computed(() => {
    const p = this.plan();
    const all: { key: SegmentKey; value: number }[] = [
      { key: 'regular', value: p.regularTotal },
      { key: 'limits', value: p.limitsTotal },
      { key: 'savings', value: Math.max(0, p.planned) },
    ];
    return all.filter((s) => s.value > 0);
  });

  /** Screen-reader text for the bar (it is drawn, not written). */
  protected readonly splitLabel = computed(() => {
    const p = this.plan();
    const pct = (n: number) => (p.salaryTotal > 0 ? Math.round((n / p.salaryTotal) * 100) : 0);
    return p.salaryTotal > 0
      ? `Salary split: regular ${pct(p.regularTotal)}%, limits ${pct(p.limitsTotal)}%, savings ${Math.max(0, pct(p.planned))}%`
      : 'No salary entered yet';
  });

  /** Actual vs plan: unspent limit money raises it, overspending lowers it (R19 AC2). */
  protected readonly vsPlan = computed(() => {
    const p = this.plan();
    const diff = Math.round((p.actual - p.planned) * 100) / 100;
    const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    if (diff === 0) return { cls: 'even', icon: 'check', text: 'On plan' };
    return diff > 0
      ? { cls: 'up', icon: 'arrow_upward', text: `${fmt.format(diff)} above plan` }
      : { cls: 'down', icon: 'arrow_downward', text: `${fmt.format(-diff)} below plan` };
  });
}

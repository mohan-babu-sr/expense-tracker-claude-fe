import { Component, computed, input } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { CategoryAmount } from '../../../shared/models';
import { formatInr, resolveThemeColor } from '../chart-utils';

/**
 * Doughnut of spending by category for the selected month (R7 AC2).
 * Slice colors = each category's own saved color (data), so the chart matches the chips.
 * A visually hidden list repeats the numbers for screen readers (NFR5).
 */
@Component({
  selector: 'app-category-chart',
  standalone: false,
  templateUrl: './category-chart.html',
  styleUrl: './category-chart.scss',
})
export class CategoryChart {
  readonly data = input.required<CategoryAmount[]>();

  protected readonly total = computed(() => this.data().reduce((s, d) => s + d.amount, 0));

  protected readonly chartData = computed<ChartConfiguration<'doughnut'>['data']>(() => ({
    labels: this.data().map((d) => d.category?.name ?? 'Uncategorised'),
    datasets: [
      {
        data: this.data().map((d) => d.amount),
        backgroundColor: this.data().map((d) => d.category?.color ?? resolveThemeColor('--mat-sys-outline')),
        borderColor: resolveThemeColor('--mat-sys-surface-container-low', '#fff'),
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  }));

  protected readonly options: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true, color: resolveThemeColor('--mat-sys-on-surface', '#1a1b1f') },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed;
            const pct = this.total() ? Math.round((value / this.total()) * 100) : 0;
            return ` ${ctx.label}: ${formatInr(value)} (${pct}%)`;
          },
        },
      },
    },
  };

  protected percent(amount: number): number {
    return this.total() ? Math.round((amount / this.total()) * 100) : 0;
  }
}

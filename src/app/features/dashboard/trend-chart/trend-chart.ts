import { Component, computed, input } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { MonthAmount } from '../../../shared/models';
import { monthToDate } from '../../../shared/utils/date.utils';
import { formatInr, resolveThemeColor, withAlpha } from '../chart-utils';

const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'short' });
const monthYear = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });

/**
 * Bar chart: total spending per month for the last 6 months, oldest → newest (R7 AC3).
 * The selected month's bar is solid; earlier months are lighter.
 */
@Component({
  selector: 'app-trend-chart',
  standalone: false,
  templateUrl: './trend-chart.html',
  styleUrl: '../category-chart/category-chart.scss',
})
export class TrendChart {
  readonly data = input.required<MonthAmount[]>();

  private readonly primary = resolveThemeColor('--mat-sys-primary');
  private readonly textColor = resolveThemeColor('--mat-sys-on-surface-variant', '#44474e');
  private readonly gridColor = resolveThemeColor('--mat-sys-outline-variant', '#c4c6d0');

  protected readonly chartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const last = this.data().length - 1;
    return {
      labels: this.data().map((m) => monthLabel.format(monthToDate(m.month))),
      datasets: [
        {
          label: 'Spent',
          data: this.data().map((m) => m.amount),
          backgroundColor: this.data().map((_, i) => (i === last ? this.primary : withAlpha(this.primary, 0.35))),
          borderRadius: 6,
          maxBarThickness: 48,
        },
      ],
    };
  });

  protected readonly options: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => monthYear.format(monthToDate(this.data()[items[0].dataIndex].month)),
          label: (ctx) => ` ${formatInr(ctx.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: this.textColor } },
      y: {
        beginAtZero: true,
        grid: { color: this.gridColor },
        border: { display: false },
        ticks: { color: this.textColor, maxTicksLimit: 5, callback: (v) => formatInr(Number(v)) },
      },
    },
  };

  protected monthName(month: string): string {
    return monthYear.format(monthToDate(month));
  }
}

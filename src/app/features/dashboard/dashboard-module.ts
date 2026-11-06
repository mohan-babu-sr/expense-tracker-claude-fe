import { NgModule } from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { BaseChartDirective, provideCharts } from 'ng2-charts';
import { SharedModule } from '../../shared/shared-module';

import { CategoryChart } from './category-chart/category-chart';
import { DashboardPage } from './dashboard-page/dashboard-page';
import { DashboardRoutingModule } from './dashboard-routing-module';
import { SummaryCards } from './summary-cards/summary-cards';
import { TrendChart } from './trend-chart/trend-chart';

/**
 * Lazy-loaded dashboard feature (design §4/§5, R7, R8 AC4).
 * The one exception to "features import only SharedModule": charts are imported and provided HERE,
 * so Chart.js (~125 kB) downloads only when the dashboard is opened. Only the parts the doughnut
 * and bar charts need are registered — Chart.js tree-shakes the rest.
 */
@NgModule({
  declarations: [DashboardPage, SummaryCards, CategoryChart, TrendChart],
  imports: [SharedModule, DashboardRoutingModule, BaseChartDirective],
  providers: [
    provideCharts({
      registerables: [DoughnutController, ArcElement, BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip],
    }),
  ],
})
export class DashboardModule {}

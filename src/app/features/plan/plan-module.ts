import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { PlanRoutingModule } from './plan-routing-module';
import { PlanPage } from './plan-page/plan-page';
import { MonthTab } from './month-tab/month-tab';
import { RegularItemsTab } from './regular-items-tab/regular-items-tab';
import { SavingsTab } from './savings-tab/savings-tab';
import { RegularEntryDialog } from './regular-entry-dialog/regular-entry-dialog';
import { RegularItemDialog } from './regular-item-dialog/regular-item-dialog';
import { WithdrawalDialog } from './withdrawal-dialog/withdrawal-dialog';
import { ExtraIncomeDialog } from './extra-income-dialog/extra-income-dialog';

/** Lazy-loaded Plan feature (R17–R19, design §12.5). Imports ONLY SharedModule for UI (CLAUDE.md). */
@NgModule({
  declarations: [
    PlanPage,
    MonthTab,
    RegularItemsTab,
    SavingsTab,
    RegularEntryDialog,
    RegularItemDialog,
    WithdrawalDialog,
    ExtraIncomeDialog,
  ],
  imports: [SharedModule, PlanRoutingModule],
})
export class PlanModule {}

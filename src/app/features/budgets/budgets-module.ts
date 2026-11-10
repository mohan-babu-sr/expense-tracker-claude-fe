import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { BudgetsRoutingModule } from './budgets-routing-module';
import { BudgetsPage } from './budgets-page/budgets-page';
import { BudgetDialog } from './budget-dialog/budget-dialog';
import { MemberLimitDialog } from './member-limit-dialog/member-limit-dialog';

/** Lazy-loaded feature (design §5). Imports ONLY SharedModule for UI (CLAUDE.md). */
@NgModule({
  declarations: [BudgetsPage, BudgetDialog, MemberLimitDialog],
  imports: [SharedModule, BudgetsRoutingModule],
})
export class BudgetsModule {}

import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { ExpensesRoutingModule } from './expenses-routing-module';
import { ExpensesPage } from './expenses-page/expenses-page';
import { ExpenseTable } from './expense-table/expense-table';
import { ExpenseCardList } from './expense-card-list/expense-card-list';
import { ExpenseFilters } from './expense-filters/expense-filters';
import { FilterSheet } from './filter-sheet/filter-sheet';
import { ActiveFilterChips } from './active-filter-chips/active-filter-chips';

/** Lazy-loaded feature (design §5). Imports ONLY SharedModule for UI (CLAUDE.md). */
@NgModule({
  declarations: [
    ExpensesPage,
    ExpenseTable,
    ExpenseCardList,
    ExpenseFilters,
    FilterSheet,
    ActiveFilterChips,
  ],
  imports: [SharedModule, ExpensesRoutingModule],
})
export class ExpensesModule {}

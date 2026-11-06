import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

/**
 * Lazy routes (design §5, NFR1): each feature's code is downloaded the first time you open it.
 * `title` sets the browser tab title (Angular's built-in TitleStrategy).
 */
const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Dashboard · Expense Tracker',
    loadChildren: () => import('./features/dashboard/dashboard-module').then((m) => m.DashboardModule),
  },
  {
    path: 'expenses',
    title: 'Expenses · Expense Tracker',
    loadChildren: () => import('./features/expenses/expenses-module').then((m) => m.ExpensesModule),
  },
  {
    path: 'budgets',
    title: 'Budgets · Expense Tracker',
    loadChildren: () => import('./features/budgets/budgets-module').then((m) => m.BudgetsModule),
  },
  {
    path: 'categories',
    title: 'Categories · Expense Tracker',
    loadChildren: () => import('./features/categories/categories-module').then((m) => m.CategoriesModule),
  },
  {
    path: 'settings',
    title: 'Settings · Expense Tracker',
    loadChildren: () => import('./features/settings/settings-module').then((m) => m.SettingsModule),
  },
  { path: '**', redirectTo: 'dashboard' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

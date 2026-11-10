import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { adminGuard, memberGuard, signedInGuard } from './core/guards/auth.guards';

/**
 * Lazy routes (design §5, NFR1): each feature's code is downloaded the first time you open it.
 * `title` sets the browser tab title (Angular's built-in TitleStrategy).
 *
 * v2 (R13, design §8.5): guards are `canMatch`, so a page's code is only downloaded when the person may
 * open it; otherwise the guard redirects to their home (Welcome / pending / admin / dashboard).
 */
const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Dashboard · Expense Tracker',
    canMatch: [memberGuard],
    loadChildren: () => import('./features/dashboard/dashboard-module').then((m) => m.DashboardModule),
  },
  {
    path: 'expenses',
    title: 'Expenses · Expense Tracker',
    canMatch: [memberGuard],
    loadChildren: () => import('./features/expenses/expenses-module').then((m) => m.ExpensesModule),
  },
  {
    path: 'upcoming',
    title: 'Upcoming · Expense Tracker',
    canMatch: [memberGuard],
    loadChildren: () => import('./features/upcoming/upcoming-module').then((m) => m.UpcomingModule),
  },
  {
    path: 'budgets',
    title: 'Budgets · Expense Tracker',
    canMatch: [memberGuard],
    loadChildren: () => import('./features/budgets/budgets-module').then((m) => m.BudgetsModule),
  },
  {
    path: 'categories',
    title: 'Categories · Expense Tracker',
    canMatch: [memberGuard],
    loadChildren: () => import('./features/categories/categories-module').then((m) => m.CategoriesModule),
  },
  {
    path: 'settings',
    title: 'Settings · Expense Tracker',
    canMatch: [signedInGuard],
    loadChildren: () => import('./features/settings/settings-module').then((m) => m.SettingsModule),
  },
  {
    path: 'admin',
    title: 'Admin · Expense Tracker',
    canMatch: [adminGuard],
    loadChildren: () => import('./features/admin/admin-module').then((m) => m.AdminModule),
  },
  // Welcome, sign-in, register, admin sign-in, pending (AuthModule decides the paths).
  // Last before '**' so the feature paths above match first. `bare`: no navigation around these pages.
  {
    path: '',
    data: { bare: true },
    loadChildren: () => import('./features/auth/auth-module').then((m) => m.AuthModule),
  },
  { path: '**', redirectTo: 'dashboard' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

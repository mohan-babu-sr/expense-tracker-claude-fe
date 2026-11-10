import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { adminPasswordChangedGuard } from '../../core/guards/auth.guards';
import { AdminGroupsPage } from './admin-groups-page/admin-groups-page';
import { AdminUsersPage } from './admin-users-page/admin-users-page';
import { ChangePasswordPage } from './change-password-page/change-password-page';

/** The parent route (app-routing) already requires the admin; here: password first (R13 AC5). */
const routes: Routes = [
  { path: 'password', component: ChangePasswordPage },
  {
    path: '',
    canActivateChild: [adminPasswordChangedGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'users' },
      { path: 'users', component: AdminUsersPage },
      { path: 'groups', component: AdminGroupsPage },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}

import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { AdminRoutingModule } from './admin-routing-module';
import { ChangePasswordPage } from './change-password-page/change-password-page';
import { AdminUsersPage } from './admin-users-page/admin-users-page';
import { AdminGroupsPage } from './admin-groups-page/admin-groups-page';
import { AdminUserDialog } from './admin-user-dialog/admin-user-dialog';
import { ResetPinDialog } from './reset-pin-dialog/reset-pin-dialog';
import { AdminGroupDialog } from './admin-group-dialog/admin-group-dialog';

/** Admin panel (R13 AC5–AC6, design §8.5): forced password change, users, groups. */
@NgModule({
  declarations: [
    ChangePasswordPage,
    AdminUsersPage,
    AdminGroupsPage,
    AdminUserDialog,
    ResetPinDialog,
    AdminGroupDialog,
  ],
  imports: [SharedModule, AdminRoutingModule],
})
export class AdminModule {}

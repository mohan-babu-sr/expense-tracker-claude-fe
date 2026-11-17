import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { SettingsRoutingModule } from './settings-routing-module';
import { SettingsPage } from './settings-page/settings-page';
import { EditNameDialog } from './edit-name-dialog/edit-name-dialog';
import { ChangePinDialog } from './change-pin-dialog/change-pin-dialog';
import { PasskeysDialog } from './passkeys-dialog/passkeys-dialog';

/** Lazy-loaded feature (R11, design §5). Imports ONLY SharedModule for UI (CLAUDE.md). */
@NgModule({
  declarations: [SettingsPage, EditNameDialog, ChangePinDialog, PasskeysDialog],
  imports: [SharedModule, SettingsRoutingModule],
})
export class SettingsModule {}

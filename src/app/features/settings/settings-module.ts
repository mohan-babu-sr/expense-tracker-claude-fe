import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { SettingsRoutingModule } from './settings-routing-module';
import { SettingsPage } from './settings-page/settings-page';

/** Lazy-loaded feature (R11, design §5). Imports ONLY SharedModule for UI (CLAUDE.md). */
@NgModule({
  declarations: [SettingsPage],
  imports: [SharedModule, SettingsRoutingModule],
})
export class SettingsModule {}

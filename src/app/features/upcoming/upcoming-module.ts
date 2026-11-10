import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { UpcomingRoutingModule } from './upcoming-routing-module';
import { UpcomingPage } from './upcoming-page/upcoming-page';
import { UpcomingDialog } from './upcoming-dialog/upcoming-dialog';

/** Lazy-loaded feature (design §5, §9.3, R14). Imports ONLY SharedModule for UI (CLAUDE.md). */
@NgModule({
  declarations: [UpcomingPage, UpcomingDialog],
  imports: [SharedModule, UpcomingRoutingModule],
})
export class UpcomingModule {}

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlanPage } from './plan-page/plan-page';

const routes: Routes = [{ path: '', component: PlanPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlanRoutingModule {}

import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { CategoriesRoutingModule } from './categories-routing-module';
import { CategoriesPage } from './categories-page/categories-page';
import { CategoryDialog } from './category-dialog/category-dialog';

/** Lazy-loaded feature (design §5). Imports ONLY SharedModule for UI (CLAUDE.md). */
@NgModule({
  declarations: [CategoriesPage, CategoryDialog],
  imports: [SharedModule, CategoriesRoutingModule],
})
export class CategoriesModule {}

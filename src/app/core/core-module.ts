import { CommonModule } from '@angular/common';
import { NgModule, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';

import { BottomNav } from './layout/bottom-nav/bottom-nav';
import { Shell } from './layout/shell/shell';
import { SideNav } from './layout/side-nav/side-nav';
import { TopToolbar } from './layout/top-toolbar/top-toolbar';

/**
 * CoreModule — app-wide singletons + the app shell (CLAUDE.md, design §4).
 * Services use `providedIn: 'root'`; interceptors are registered in AppModule.
 *
 * Imports only the Material modules the shell uses — NOT SharedModule. Importing SharedModule
 * here would put all 25 Material modules in the main bundle (measured 409 kB → 797 kB);
 * feature pages get them lazily through SharedModule instead. MatList is avoided too: it pulls
 * in @angular/forms (~65 kB), so the nav links are plain styled <a> elements.
 *
 * Import ONLY in AppModule; the constructor throws if it is imported a second time.
 */
@NgModule({
  declarations: [Shell, SideNav, TopToolbar, BottomNav],
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  exports: [Shell],
})
export class CoreModule {
  constructor() {
    const parent = inject(CoreModule, { optional: true, skipSelf: true });
    if (parent) {
      throw new Error('CoreModule is already loaded. Import it in AppModule only.');
    }
  }
}

import { Component, inject, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { GroupService } from '../../services/group.service';
import { ADMIN_NAV_ITEMS, ADMIN_PASSWORD_ITEM, CATEGORIES_ITEM, NAV_ITEMS, SETTINGS_ITEM } from '../nav-items';
// NAV_ITEMS includes Budgets, so its title still shows on the phone after v5 moved it out of the bar.

/** Mobile top bar (R10): ☰ menu (v5.1) + current page name. The shell opens the drawer on `menu`. */
@Component({
  selector: 'app-top-toolbar',
  standalone: false,
  templateUrl: './top-toolbar.html',
  styleUrl: './top-toolbar.scss',
})
export class TopToolbar {
  private readonly router = inject(Router);
  readonly menu = output<void>();
  protected readonly pendingCount = inject(GroupService).pendingCount;

  /** Page label for the current URL, e.g. "/expenses?x=1" → "Expenses". */
  protected readonly title = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.titleFor(this.router.url)),
    ),
    { initialValue: this.titleFor(this.router.url) },
  );

  private titleFor(url: string): string {
    return [...NAV_ITEMS, CATEGORIES_ITEM, ...ADMIN_NAV_ITEMS, ADMIN_PASSWORD_ITEM, SETTINGS_ITEM].find((item) => url.startsWith(item.path))?.label ?? 'Expense Tracker';
  }
}

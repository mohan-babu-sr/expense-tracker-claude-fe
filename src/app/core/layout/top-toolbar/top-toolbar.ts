import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { NAV_ITEMS, SETTINGS_ITEM } from '../nav-items';

/** Mobile top bar (R10): shows the current page name. */
@Component({
  selector: 'app-top-toolbar',
  standalone: false,
  templateUrl: './top-toolbar.html',
  styleUrl: './top-toolbar.scss',
})
export class TopToolbar {
  private readonly router = inject(Router);
  protected readonly settings = SETTINGS_ITEM;

  /** Page label for the current URL, e.g. "/expenses?x=1" → "Expenses". */
  protected readonly title = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.titleFor(this.router.url)),
    ),
    { initialValue: this.titleFor(this.router.url) },
  );

  private titleFor(url: string): string {
    return [...NAV_ITEMS, SETTINGS_ITEM].find((item) => url.startsWith(item.path))?.label ?? 'Expense Tracker';
  }
}

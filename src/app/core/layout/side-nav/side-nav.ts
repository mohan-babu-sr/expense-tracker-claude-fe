import { Component } from '@angular/core';
import { NAV_ITEMS, SETTINGS_ITEM } from '../nav-items';

/** Laptop navigation list (R10). Active page highlighted via routerLinkActive. */
@Component({
  selector: 'app-side-nav',
  standalone: false,
  templateUrl: './side-nav.html',
  styleUrl: './side-nav.scss',
})
export class SideNav {
  protected readonly items = NAV_ITEMS;
  protected readonly settings = SETTINGS_ITEM;
}

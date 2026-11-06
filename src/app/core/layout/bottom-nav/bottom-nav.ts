import { Component } from '@angular/core';
import { NAV_ITEMS } from '../nav-items';

/** Mobile bottom navigation: 4 icon + label buttons, 56px high (R10, design §5). */
@Component({
  selector: 'app-bottom-nav',
  standalone: false,
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
})
export class BottomNav {
  protected readonly items = NAV_ITEMS;
}

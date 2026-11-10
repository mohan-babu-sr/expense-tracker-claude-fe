import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { navItemsFor } from '../nav-items';

/** Mobile bottom navigation: 4 icon + label buttons, 56px high (R10, design §5). */
@Component({
  selector: 'app-bottom-nav',
  standalone: false,
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
})
export class BottomNav {
  private readonly auth = inject(AuthService);
  protected readonly items = computed(() => navItemsFor(this.auth.me()?.kind));
}

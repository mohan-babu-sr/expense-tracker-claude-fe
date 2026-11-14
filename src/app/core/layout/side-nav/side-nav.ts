import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';
import { CATEGORIES_ITEM, SETTINGS_ITEM, navItemsFor } from '../nav-items';

/** Laptop navigation list (R10). Active page highlighted via routerLinkActive. */
@Component({
  selector: 'app-side-nav',
  standalone: false,
  templateUrl: './side-nav.html',
  styleUrl: './side-nav.scss',
})
export class SideNav {
  private readonly auth = inject(AuthService);
  protected readonly items = computed(() => navItemsFor(this.auth.me()?.kind));
  protected readonly settings = SETTINGS_ITEM;
  protected readonly categories = CATEGORIES_ITEM;
  protected readonly isUser = computed(() => this.auth.me()?.kind === 'user');
  protected readonly pendingCount = inject(GroupService).pendingCount;
}

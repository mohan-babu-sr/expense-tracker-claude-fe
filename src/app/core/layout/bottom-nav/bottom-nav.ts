import { Component, Injector, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ADMIN_NAV_ITEMS, BOTTOM_NAV_ITEMS } from '../nav-items';

/**
 * Phone navigation (R10, v5 R21 AC3, design §13.3): a floating rounded bar with Dashboard · Expenses · (+) ·
 * Upcoming · Plan. The centre (+) is the phone's only "Add expense" (it replaced the FAB) and works from every page.
 */
@Component({
  selector: 'app-bottom-nav',
  standalone: false,
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
})
export class BottomNav {
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);

  protected readonly isUser = computed(() => this.auth.me()?.kind === 'user');
  protected readonly userItems = BOTTOM_NAV_ITEMS;
  protected readonly adminItems = ADMIN_NAV_ITEMS;
  /** True while the dialog code downloads (first tap only) — stops a double tap opening two forms. */
  protected readonly opening = signal(false);

  /**
   * Loaded on first tap with import(): the expense form + its Material modules live in the lazy SharedModule chunk,
   * so they don't grow the first page load. Salary-first flow as everywhere else (R17 AC3); the page you are on
   * refreshes through ExpenseEventsService.
   */
  protected async add(): Promise<void> {
    if (this.opening()) return;
    this.opening.set(true);
    try {
      const { openAddExpense } = await import('../../../shared/components/expense-form-dialog/open-add-expense');
      openAddExpense(this.injector).subscribe();
    } finally {
      this.opening.set(false);
    }
  }
}

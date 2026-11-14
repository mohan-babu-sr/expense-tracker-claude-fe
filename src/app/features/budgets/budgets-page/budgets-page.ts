import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { BudgetService } from '../../../core/services/budget.service';
import { CategoryService } from '../../../core/services/category.service';
import { ExpenseEventsService } from '../../../core/services/expense-events.service';
import { BudgetStatus, BudgetSummary, Category, MemberBudget } from '../../../shared/models';
import { currentMonth } from '../../../shared/utils/date.utils';
import { BudgetDialog, BudgetDialogData, BudgetDialogResult } from '../budget-dialog/budget-dialog';
import { MemberLimitDialog, MemberLimitDialogData } from '../member-limit-dialog/member-limit-dialog';

/**
 * Budgets page (R8, R15): pick a month, see
 *  - Overall: the sum of the member limits vs. everything the group spent (computed, R15 AC3),
 *  - People: each member's limit, spent and balance — visible to everyone, "You" first (R15 AC2, AC4),
 *  - By category: category budgets (R8 AC2, AC3).
 * Limits and budgets have no month — the month only decides which spending they're compared with.
 * Only the owner sees add / edit buttons (R15 AC5); the API enforces it anyway.
 */
@Component({
  selector: 'app-budgets-page',
  standalone: false,
  templateUrl: './budgets-page.html',
  styleUrl: './budgets-page.scss',
})
export class BudgetsPage {
  private readonly budgetService = inject(BudgetService);
  private readonly categoryService = inject(CategoryService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  protected readonly month = signal(currentMonth());
  protected readonly summary = signal<BudgetSummary | null>(null);
  private readonly categories = signal<Category[]>([]);
  private request?: Subscription;

  protected readonly isOwner = this.auth.isOwner;
  protected readonly myId = computed(() => this.auth.userMe()?.user.id ?? null);

  protected readonly overall = computed(() => this.summary()?.overall ?? null);
  protected readonly items = computed(() => this.summary()?.items ?? []);
  protected readonly overCount = computed(() => this.items().filter((i) => i.status === 'danger').length);

  /** The signed-in member first, then the others by name (as the server sorts them) — R15 AC4. */
  protected readonly members = computed(() => {
    const list = this.summary()?.members ?? [];
    const me = this.myId();
    return [...list.filter((m) => m.user.id === me), ...list.filter((m) => m.user.id !== me)];
  });
  protected readonly overMembers = computed(() => this.members().filter((m) => (m.balance ?? 0) < 0).length);
  protected readonly ownerName = computed(
    () => this.members().find((m) => m.user.role === 'owner')?.user.name ?? 'the group owner',
  );

  constructor() {
    // v5: any Add (header button, phone bar, empty state) → refresh (design §13.3).
    inject(ExpenseEventsService)
      .added$.pipe(takeUntilDestroyed())
      .subscribe(() => this.load());
    this.categoryService.getAll().subscribe((list) => this.categories.set(list));
    // Re-fetch whenever the month changes (spending is month-specific).
    effect(() => {
      this.month();
      untracked(() => this.load());
    });
  }

  private load(): void {
    this.request?.unsubscribe(); // a newer month wins over a slower older request
    this.request = this.budgetService.getStatus(this.month()).subscribe((s) => this.summary.set(s));
  }

  /** Add or edit a category budget (owner only). */
  protected openDialog(existing?: BudgetStatus): void {
    const data: BudgetDialogData = {
      existing,
      categories: this.categories(),
      budgetedCategoryIds: this.items().map((i) => i.category!.id),
    };
    this.dialog
      .open<BudgetDialog, BudgetDialogData, BudgetDialogResult>(BudgetDialog, {
        data,
        width: '440px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: existing ? 'input' : 'first-tabbable',
      })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe(() => this.load());
  }

  /** Set / change / remove a member's monthly limit (owner only). Reloads: the overall total changes too. */
  protected editLimit(member: MemberBudget): void {
    this.dialog
      .open<MemberLimitDialog, MemberLimitDialogData, MemberBudget>(MemberLimitDialog, {
        data: { member, isMe: member.user.id === this.myId() },
        width: '440px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: 'input',
      })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe(() => this.load());
  }
}

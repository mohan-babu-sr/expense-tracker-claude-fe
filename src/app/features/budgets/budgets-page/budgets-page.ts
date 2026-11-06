import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription, filter } from 'rxjs';
import { BudgetService } from '../../../core/services/budget.service';
import { CategoryService } from '../../../core/services/category.service';
import { BudgetStatus, BudgetSummary, Category } from '../../../shared/models';
import { currentMonth } from '../../../shared/utils/date.utils';
import { BudgetDialog, BudgetDialogData, BudgetDialogResult, OVERALL } from '../budget-dialog/budget-dialog';

/**
 * Budgets page (R8): pick a month, see the overall budget and each category budget with
 * spent / budget, a progress bar and a status (ok / warning / danger). Budgets themselves have
 * no month — the month only decides which spending they are compared against (R8 AC1, AC2).
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
  private readonly dialog = inject(MatDialog);

  protected readonly month = signal(currentMonth());
  protected readonly summary = signal<BudgetSummary | null>(null);
  private readonly categories = signal<Category[]>([]);
  private request?: Subscription;

  protected readonly overall = computed(() => this.summary()?.overall ?? null);
  protected readonly items = computed(() => this.summary()?.items ?? []);
  protected readonly overCount = computed(() => this.items().filter((i) => i.status === 'danger').length);

  constructor() {
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

  /** Add (optionally pre-selecting Overall or a category) or edit an existing budget. */
  protected openDialog(existing?: BudgetStatus, preset?: string): void {
    const data: BudgetDialogData = {
      existing,
      preset,
      categories: this.categories(),
      budgetedCategoryIds: this.items().map((i) => i.category!.id),
      hasOverall: !!this.overall(),
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

  protected setOverall(): void {
    this.openDialog(undefined, OVERALL);
  }
}

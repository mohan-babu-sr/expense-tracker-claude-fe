import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Subscription, filter, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ExpenseService } from '../../../core/services/expense.service';
import { PlanService } from '../../../core/services/plan.service';
import { LayoutService } from '../../../core/services/layout.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { ExpenseFormDialog } from '../../../shared/components/expense-form-dialog/expense-form-dialog';
import { Expense, PageSize } from '../../../shared/models';
import { fromIsoDate, monthToDate } from '../../../shared/utils/date.utils';
import { saveBlobResponse } from '../../../shared/utils/download.utils';
import { ExpenseFilterService, countActiveFilters, defaultFilter } from '../expense-filter.service';
import { FilterSheet } from '../filter-sheet/filter-sheet';

/** Mobile "Load more" fetches this many at a time. */
const MOBILE_PAGE_SIZE: PageSize = 25;

/**
 * Expenses page (R2 list, R3 edit, R4 delete + undo).
 * Laptop: table + paginator (replace page). Mobile: cards grouped by date + "Load more" (append).
 * The server does filtering, sorting and paging (NFR1); `totalAmount` covers ALL matches (R2 AC3).
 * Filters (R6) live in ExpenseFilterService; any change re-fetches from page 1.
 */
@Component({
  selector: 'app-expenses-page',
  standalone: false,
  templateUrl: './expenses-page.html',
  styleUrl: './expenses-page.scss',
})
export class ExpensesPage {
  private readonly expenseService = inject(ExpenseService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly planService = inject(PlanService);
  private readonly auth = inject(AuthService);
  protected readonly isMobile = inject(LayoutService).isMobile;

  private readonly filterService = inject(ExpenseFilterService);
  private readonly bottomSheet = inject(MatBottomSheet);
  protected readonly filter = toSignal(this.filterService.filter$, { initialValue: defaultFilter() });
  protected readonly activeFilterCount = computed(() => countActiveFilters(this.filter()));
  /** Mobile search box (outside the sheet) — same service as the laptop bar. */
  protected readonly searchText = signal(this.filterService.value.q ?? '');
  protected readonly items = signal<Expense[]>([]);
  protected readonly total = signal(0);
  protected readonly totalAmount = signal(0);
  /** 0-based (MatPaginator convention); the API is 1-based. */
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal<PageSize>(10);
  protected readonly loaded = signal(false);
  protected readonly loadingMore = signal(false);

  protected readonly hasMore = computed(() => this.items().length < this.total());
  protected readonly subtitle = computed(() => {
    const f = this.filter();
    const fmt = (o: Intl.DateTimeFormatOptions, d: Date) => new Intl.DateTimeFormat('en-IN', o).format(d);
    if (f.from || f.to) {
      const day = { day: 'numeric', month: 'short', year: 'numeric' } as const;
      const from = f.from ? fmt(day, fromIsoDate(f.from)) : '…';
      const to = f.to ? fmt(day, fromIsoDate(f.to)) : '…';
      return `${from} – ${to}`;
    }
    return f.month ? fmt({ month: 'long', year: 'numeric' }, monthToDate(f.month)) : '';
  });

  private request?: Subscription;

  constructor() {
    // Reload from page 1 when the filters change (R6) or the layout switches (table ↔ cards page differently).
    effect(() => {
      this.filter();
      this.isMobile();
      untracked(() => this.reload());
    });
    // Keep the mobile search box in sync when a chip / "Clear" removes the search text.
    effect(() => {
      const q = this.filter().q ?? '';
      untracked(() => {
        if (q !== this.searchText().trim()) this.searchText.set(q);
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.request?.unsubscribe();
      clearTimeout(this.searchTimer);
    });
  }

  /** Fresh load from page 1 (after filter change, add, edit, delete, undo). */
  protected reload(): void {
    this.pageIndex.set(0);
    this.load(false);
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize as PageSize);
    this.load(false);
  }

  protected onLoadMore(): void {
    this.pageIndex.update((i) => i + 1);
    this.load(true);
  }

  /**
   * Fetch one page. `append` = mobile "Load more" (keep existing cards); otherwise replace.
   * The previous request is cancelled so a slow response can never overwrite newer data.
   */
  private load(append: boolean): void {
    this.request?.unsubscribe();
    const size = this.isMobile() ? MOBILE_PAGE_SIZE : this.pageSize();
    this.loadingMore.set(append);
    this.request = this.expenseService.list(this.filter(), this.pageIndex() + 1, size).subscribe({
      next: (res) => {
        this.items.set(append ? [...this.items(), ...res.items] : res.items);
        this.total.set(res.total);
        this.totalAmount.set(res.totalAmount);
        this.loaded.set(true);
        this.loadingMore.set(false);
      },
      error: () => {
        this.loaded.set(true);
        this.loadingMore.set(false);
      },
    });
  }

  /** Mobile: filters in a bottom sheet (R6 AC5). */
  protected openFilterSheet(): void {
    this.bottomSheet.open(FilterSheet, { ariaLabel: 'Filters' });
  }

  /** Mobile search box: applied after a 300ms typing pause (R6 AC3). */
  private searchTimer?: ReturnType<typeof setTimeout>;
  protected onSearchInput(value: string): void {
    this.searchText.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.filterService.setSearch(value), 300); // R6 AC3
  }

  protected clearFilters(): void {
    this.filterService.clear();
  }

  protected readonly exporting = signal(false);

  /** R9: download the CURRENTLY FILTERED expenses as CSV (server builds it, with BOM for Excel). */
  protected exportCsv(): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.expenseService.export(this.filter()).subscribe({
      next: (response) => {
        const name = saveBlobResponse(response, 'expenses.csv');
        this.notification.success(`Downloaded ${name}`);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false), // error snackbar shown by the interceptor
    });
  }

  /** Empty-state "Add expense" button (R2 AC4) — salary first, like the header button (R17 AC3). */
  protected onAdd(): void {
    ExpenseFormDialog.openAdd(this.dialog, this.isMobile(), this.planService, this.auth.userMe()?.user ?? null)
      .pipe(filter(Boolean))
      .subscribe(() => this.reload());
  }

  /** R3: same form as add, pre-filled. */
  protected onEdit(expense: Expense): void {
    ExpenseFormDialog.open(this.dialog, this.isMobile(), { expense })
      .pipe(filter(Boolean))
      .subscribe(() => this.reload());
  }

  /** R4: confirm → delete → "Expense deleted · UNDO" (5 s) → restore on Undo. */
  protected onDelete(expense: Expense): void {
    const label = [expense.merchant || expense.note || expense.category?.name, `₹${expense.amount}`]
      .filter(Boolean)
      .join(' · ');
    ConfirmDialog.open(this.dialog, { title: 'Delete expense?', message: label })
      .pipe(
        filter(Boolean),
        switchMap(() => this.expenseService.delete(expense.id)),
        tap(() => this.reload()),
        switchMap(() => this.notification.undo('Expense deleted')),
        switchMap(() => this.expenseService.restore(expense.id)),
      )
      .subscribe(() => {
        this.notification.success('Expense restored');
        this.reload();
      });
  }
}

import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { filter, switchMap } from 'rxjs';
import { CategoryService } from '../../../core/services/category.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { Category } from '../../../shared/models';
import { CategoryDialog, CategoryDialogData } from '../category-dialog/category-dialog';

/**
 * Categories page (R5): list with expense counts, add / edit via dialog, delete with confirm.
 * Server rules are the source of truth: a 409 on delete ("used by N expenses" / system category)
 * is shown by the global error snackbar with the server's message (R5 AC3).
 */
@Component({
  selector: 'app-categories-page',
  standalone: false,
  templateUrl: './categories-page.html',
  styleUrl: './categories-page.scss',
})
export class CategoriesPage {
  private readonly categoryService = inject(CategoryService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categories = signal<Category[]>([]);
  protected readonly loaded = signal(false);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.categoryService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.categories.set(list);
          this.loaded.set(true);
        },
        error: () => this.loaded.set(true), // error snackbar already shown by the interceptor
      });
  }

  protected openDialog(category?: Category): void {
    const data: CategoryDialogData = { category, existingNames: this.categories().map((c) => c.name) };
    this.dialog
      .open<CategoryDialog, CategoryDialogData, Category>(CategoryDialog, {
        data,
        width: '520px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe(() => this.load());
  }

  protected confirmDelete(category: Category): void {
    const count = category.expenseCount ?? 0;
    ConfirmDialog.open(this.dialog, {
      title: `Delete "${category.name}"?`,
      message:
        count > 0
          ? `It is used by ${count} expense${count === 1 ? '' : 's'}, so it can't be deleted until they are moved to another category.`
          : 'This cannot be undone.',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.categoryService.delete(category.id)),
      )
      .subscribe({
        next: () => {
          this.notification.success(`Category "${category.name}" deleted`);
          this.load();
        },
        // 409 → interceptor shows the server message, e.g. '"Food" is used by 2 expenses and cannot be deleted'
      });
  }
}

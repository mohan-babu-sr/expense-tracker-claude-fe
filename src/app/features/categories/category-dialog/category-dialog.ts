import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { startWith } from 'rxjs';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { skipErrorSnackbar } from '../../../core/interceptors/http-context.tokens';
import { CategoryService } from '../../../core/services/category.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CATEGORY_COLORS, CATEGORY_ICONS, colorName, iconName } from '../../../shared/constants';
import { Category, CategoryInput } from '../../../shared/models';

export interface CategoryDialogData {
  /** Present = edit mode. */
  category?: Category;
  /** Names already in use — instant duplicate check before hitting the server. */
  existingNames: string[];
}

/** Case-insensitive "name already exists" check (R5 AC2). The server enforces it too (409). */
function uniqueNameValidator(existing: string[]): ValidatorFn {
  const taken = new Set(existing.map((n) => n.trim().toLowerCase()));
  return (control: AbstractControl): ValidationErrors | null =>
    taken.has(String(control.value ?? '').trim().toLowerCase()) ? { duplicate: true } : null;
}

/**
 * Add / edit a category: name, icon picker, color picker, live preview (R5 AC2).
 * Closes with the saved Category, or undefined when cancelled.
 */
@Component({
  selector: 'app-category-dialog',
  standalone: false,
  templateUrl: './category-dialog.html',
  styleUrl: './category-dialog.scss',
})
export class CategoryDialog {
  private readonly data = inject<CategoryDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<CategoryDialog, Category>>(MatDialogRef);
  private readonly categoryService = inject(CategoryService);
  private readonly notification = inject(NotificationService);

  protected readonly icons = CATEGORY_ICONS;
  protected readonly colors = CATEGORY_COLORS;
  protected readonly colorName = colorName;
  protected readonly iconName = iconName;
  protected readonly isEdit = !!this.data.category;
  protected readonly saving = signal(false);

  // When editing, the category's own name is not a "duplicate".
  private readonly otherNames = this.data.existingNames.filter(
    (n) => n.toLowerCase() !== this.data.category?.name.toLowerCase(),
  );

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [
      this.data.category?.name ?? '',
      [Validators.required, Validators.maxLength(30), uniqueNameValidator(this.otherNames)],
    ],
    icon: [this.data.category?.icon ?? CATEGORY_ICONS[0], Validators.required],
    color: [this.data.category?.color ?? CATEGORY_COLORS[0], Validators.required],
  });

  /** Live preview of the chip as the user types/picks. */
  private readonly value = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    requireSync: true,
  });
  protected readonly preview = computed<Category>(() => ({
    id: 'preview',
    name: this.value().name?.trim() || 'New category',
    icon: this.value().icon ?? CATEGORY_ICONS[0],
    color: this.value().color ?? CATEGORY_COLORS[0],
    isDefault: false,
    isSystem: false,
  }));

  protected nameError(): string {
    const errors = this.form.controls.name.errors;
    if (errors?.['required']) return 'Name is required';
    if (errors?.['maxlength']) return 'Name must be at most 30 characters';
    if (errors?.['duplicate']) return 'A category with this name already exists';
    if (errors?.['server']) return errors['server'];
    return '';
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) return;
    const raw = this.form.getRawValue();
    const input: CategoryInput = { ...raw, name: raw.name.trim() };

    this.saving.set(true);
    const request = this.data.category
      ? this.categoryService.update(this.data.category.id, input, skipErrorSnackbar())
      : this.categoryService.create(input, skipErrorSnackbar());

    request.subscribe({
      next: (saved) => {
        this.notification.success(this.isEdit ? 'Category updated' : `Category "${saved.name}" added`);
        this.dialogRef.close(saved);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        // 409 duplicate / 400 validation → show under the name field; anything else → snackbar.
        const fieldMessage = err.error?.errors?.name ?? (err.status === 409 ? err.error?.message : null);
        if (fieldMessage) {
          this.form.controls.name.setErrors({ server: fieldMessage });
          this.form.controls.name.markAsTouched();
        } else {
          this.notification.error(errorMessage(err));
        }
      },
    });
  }
}

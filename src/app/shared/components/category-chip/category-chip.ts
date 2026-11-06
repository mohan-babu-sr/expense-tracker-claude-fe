import { Component, computed, input } from '@angular/core';
import { Category } from '../../models';

/**
 * A category's icon in its color, with its name (R2, R5). Two looks:
 *   mode="chip"   → [● icon] Food        (lists, tables, filters)
 *   mode="avatar" → round 40px icon only  (start of a list row; the name is shown elsewhere)
 *
 * The color is user data from the database, so it is passed to CSS through a custom property
 * (`--category-color`) — the only way to style with a value that isn't known at build time.
 */
@Component({
  selector: 'app-category-chip',
  standalone: false,
  templateUrl: './category-chip.html',
  styleUrl: './category-chip.scss',
  host: {
    '[class.category-chip--avatar]': "mode() === 'avatar'",
    '[style.--category-color]': 'color()',
  },
})
export class CategoryChip {
  readonly category = input<Category | null | undefined>();
  readonly mode = input<'chip' | 'avatar'>('chip');

  protected readonly name = computed(() => this.category()?.name ?? 'Uncategorised');
  protected readonly icon = computed(() => this.category()?.icon ?? 'help_outline');
  protected readonly color = computed(() => this.category()?.color ?? null);
}

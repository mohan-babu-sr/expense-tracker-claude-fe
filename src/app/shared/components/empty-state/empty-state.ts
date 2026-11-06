import { Component, input, output } from '@angular/core';

/**
 * Friendly "nothing here yet" block with an optional call-to-action (R2 AC4, NFR6).
 *
 *   <app-empty-state icon="receipt_long" title="No expenses yet"
 *       message="Add your first expense to start tracking."
 *       actionLabel="Add expense" (action)="openForm()" />
 */
@Component({
  selector: 'app-empty-state',
  standalone: false,
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyState {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly message = input<string>();
  /** Button text; no button when omitted. */
  readonly actionLabel = input<string>();
  readonly actionIcon = input('add');

  readonly action = output<void>();
}

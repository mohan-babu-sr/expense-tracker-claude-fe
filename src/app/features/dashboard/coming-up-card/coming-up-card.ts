import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { Upcoming } from '../../../shared/models';

/**
 * Dashboard "Coming up" (R14 AC6): up to 5 open items due in the next 30 days (overdue included) with
 * days-left labels, their total, and "View all". Uses the shared upcoming-item row (design §9.3).
 * The data ignores the dashboard month — it is always "from today". The page hides the card when empty.
 * Tapping a row opens the Upcoming page: the edit dialog lives in the lazy UpcomingModule, and loading it
 * into the dashboard just for this would make the dashboard bundle bigger.
 */
@Component({
  selector: 'app-coming-up-card',
  standalone: false,
  templateUrl: './coming-up-card.html',
  styleUrl: './coming-up-card.scss',
})
export class ComingUpCard {
  private readonly router = inject(Router);

  readonly items = input.required<Upcoming[]>();
  /** Total of ALL items due in the next 30 days, not only the 5 shown. */
  readonly total = input.required<number>();

  protected open(): void {
    void this.router.navigate(['/upcoming']);
  }
}

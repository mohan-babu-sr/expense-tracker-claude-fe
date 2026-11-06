import { Component, input } from '@angular/core';

/**
 * Page title + optional subtitle + projected actions (NFR6). Used at the top of every page:
 *
 *   <app-page-header title="Expenses" subtitle="November 2026">
 *     <button mat-flat-button>Add expense</button>
 *   </app-page-header>
 */
@Component({
  selector: 'app-page-header',
  standalone: false,
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}

import { Component, inject } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';

/**
 * Mobile filters in a bottom sheet (R6 AC5). Hosts the same <app-expense-filters> as the laptop
 * bar (stacked layout), so changes apply immediately; "Done" just closes the sheet.
 */
@Component({
  selector: 'app-filter-sheet',
  standalone: false,
  templateUrl: './filter-sheet.html',
  styleUrl: './filter-sheet.scss',
})
export class FilterSheet {
  private readonly sheetRef = inject(MatBottomSheetRef<FilterSheet>);

  protected close(): void {
    this.sheetRef.dismiss();
  }
}

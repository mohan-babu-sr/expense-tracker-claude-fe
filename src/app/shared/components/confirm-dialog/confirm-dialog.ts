import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';

export interface ConfirmDialogData {
  title: string;
  message: string;
  /** Default "Delete". */
  confirmText?: string;
  /** Default "Cancel". */
  cancelText?: string;
  /** Red confirm button for destructive actions. Default true. */
  destructive?: boolean;
}

/**
 * Generic confirmation dialog (R4 AC1, R5 AC3). Easiest via the static helper:
 *
 *   ConfirmDialog.open(this.dialog, { title: 'Delete expense?', message: '₹250 · Swiggy' })
 *     .pipe(filter(Boolean))
 *     .subscribe(() => this.delete());
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: false,
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);

  /** Opens the dialog; emits true on confirm, false on cancel / Esc / backdrop click. */
  static open(dialog: MatDialog, data: ConfirmDialogData): Observable<boolean> {
    return dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data,
        width: '400px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: 'dialog', // focus the dialog, not the destructive button (avoids accidental Enter)
        restoreFocus: true,
      })
      .afterClosed()
      .pipe(map((result) => result === true));
  }
}

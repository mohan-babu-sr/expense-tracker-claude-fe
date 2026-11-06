import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, map } from 'rxjs';

/**
 * One place for all snackbars (NFR2, R4 AC2) so messages look and behave the same everywhere.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 3000 });
  }

  error(message: string): void {
    // Errors stay longer and use 'assertive' so screen readers announce them immediately.
    this.snackBar.open(message, 'Dismiss', {
      duration: 6000,
      panelClass: 'snackbar-error',
      politeness: 'assertive',
    });
  }

  /**
   * "Expense deleted · UNDO" (R4 AC2). Emits once if the user clicks Undo within `duration`;
   * completes without emitting otherwise.
   */
  undo(message: string, action = 'Undo', duration = 5000): Observable<void> {
    const ref = this.snackBar.open(message, action, { duration });
    return ref.onAction().pipe(map(() => undefined));
  }
}

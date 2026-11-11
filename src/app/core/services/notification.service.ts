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
   * A message that stays until the user acts on it or another snackbar replaces it, e.g.
   * "A new version is available · RELOAD" (R16 AC5). Emits once when the action is clicked.
   */
  prompt(message: string, action: string): Observable<void> {
    return this.snackBar.open(message, action).onAction().pipe(map(() => undefined));
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

import { Injectable, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { filter } from 'rxjs';
import { PinPromptDialog } from '../../shared/components/pin-prompt-dialog/pin-prompt-dialog';

/**
 * Salary privacy screen (R22, design §14.1). NOT `providedIn: 'root'`: PlanPage lists it in its own `providers`,
 * so one instance lives exactly as long as the Plan page. The Month and Savings tabs share it (AC3: switching tabs
 * keeps the figures shown), and leaving Plan destroys it, so every visit starts hidden again.
 */
@Injectable()
export class SalaryPrivacyService {
  private readonly dialog = inject(MatDialog);
  private readonly revealedState = signal(false);

  /** True once the right PIN was entered on this visit to Plan. */
  readonly revealed = this.revealedState.asReadonly();

  /** Eye button: shown → hide at once; hidden → ask for the PIN first. */
  toggle(): void {
    if (this.revealedState()) {
      this.revealedState.set(false);
      return;
    }
    PinPromptDialog.open(this.dialog, {
      title: 'Show salaries',
      message: 'Enter your sign-in PIN to see the salaries and the family total.',
      confirmText: 'Show',
      passkeyMessage: 'Use your fingerprint / Face ID or your sign-in PIN to see the salaries and the family total.',
    })
      .pipe(filter(Boolean))
      .subscribe(() => this.revealedState.set(true));
  }
}

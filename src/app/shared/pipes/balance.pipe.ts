import { Pipe, PipeTransform } from '@angular/core';
import { InrCurrencyPipe } from './inr-currency.pipe';

/**
 * A member's balance as words (R15 AC2) — shared by the Budgets page and the dashboard card:
 *   {{ 800 | balance }}   → "₹800 left"
 *   {{ -200 | balance }}  → "Over by ₹200"
 *   {{ null | balance }}  → "No limit"
 * Words, not just a minus sign or a color, so the meaning is clear to everyone (NFR5).
 */
@Pipe({
  name: 'balance',
  standalone: false,
})
export class BalancePipe implements PipeTransform {
  // Pipes aren't injectable providers; InrCurrencyPipe has no dependencies, so just reuse an instance.
  private readonly inr = new InrCurrencyPipe();

  transform(balance: number | null | undefined): string {
    if (balance === null || balance === undefined) return 'No limit';
    return balance < 0 ? `Over by ${this.inr.transform(-balance, false)}` : `${this.inr.transform(balance, false)} left`;
  }
}

import { Pipe, PipeTransform } from '@angular/core';
import { InrCurrencyPipe } from './inr-currency.pipe';

/**
 * A savings amount as words (R19 AC2) — Plan page, Savings tab and the dashboard card:
 *   {{ 47000 | savings }}  → "₹47,000"
 *   {{ -2000 | savings }}  → "Short by ₹2,000"
 * Words, not just a minus sign or a color (NFR5).
 */
@Pipe({
  name: 'savings',
  standalone: false,
})
export class SavingsPipe implements PipeTransform {
  private readonly inr = new InrCurrencyPipe();

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '';
    return value < 0 ? `Short by ${this.inr.transform(-value, false)}` : this.inr.transform(value, false);
  }
}

import { formatCurrency } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

/**
 * Rupees with Indian digit grouping (scope decision "INR only"):
 *   {{ 123456.5 | inrCurrency }}       → ₹1,23,456.50
 *   {{ 123456.5 | inrCurrency: false }} → ₹1,23,457   (no paise — for chart labels / compact cards)
 *
 * Why not the built-in `currency` pipe? It works too (`currency:'INR':'symbol':'1.2-2':'en-IN'`),
 * but repeating those 4 arguments in every template is error-prone; this pipe fixes them in one place.
 * The 'en-IN' locale data is registered in AppModule.
 */
@Pipe({
  name: 'inrCurrency',
  standalone: false,
})
export class InrCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined, showPaise = true): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '';
    return formatCurrency(value, 'en-IN', '₹', 'INR', showPaise ? '1.2-2' : '1.0-0');
  }
}

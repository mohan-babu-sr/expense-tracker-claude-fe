import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

/**
 * NativeDateAdapter that understands typed Indian dates (dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy).
 *
 * Why: the native adapter parses typed text with `Date.parse`, which assumes US month/day order,
 * so typing "06/11/2026" would become 11 June. Display already uses the 'en-IN' locale
 * (MAT_DATE_LOCALE), so only parsing needs fixing.
 */
@Injectable()
export class IndianDateAdapter extends NativeDateAdapter {
  /**
   * The text shown in date inputs: always dd/mm/yyyy (e.g. 06/11/2026) so it matches what parse()
   * accepts. Other formats (calendar header "NOV 2026", aria labels) keep the locale defaults.
   */
  override format(date: Date, displayFormat: object): string {
    const f = displayFormat as Intl.DateTimeFormatOptions;
    const isInputFormat = f.day === 'numeric' && f.month === 'numeric' && f.year === 'numeric';
    if (isInputFormat && this.isValid(date)) {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
    }
    return super.format(date, displayFormat);
  }

  override parse(value: unknown, parseFormat?: unknown): Date | null {
    if (typeof value === 'string') {
      const match = value.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
      if (match) {
        const [, d, m, y] = match.map(Number);
        const date = new Date(y, m - 1, d);
        // Reject impossible dates like 31/02/2026 (JS would roll them over to March).
        return date.getDate() === d && date.getMonth() === m - 1 ? date : this.invalid();
      }
    }
    return super.parse(value, parseFormat);
  }
}

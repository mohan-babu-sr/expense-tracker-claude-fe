import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Rupee amounts may have at most 2 decimals (paise) — R1 AC1, R8 AC1.
 * "> 0" is a separate Validators.min(0.01). Same rule as the server's zod amountSchema (NFR3).
 */
export function twoDecimals(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  if (v === null || v === '' || Number.isNaN(v)) return null;
  return Math.abs(v * 100 - Math.round(v * 100)) < 1e-6 ? null : { decimals: true };
}

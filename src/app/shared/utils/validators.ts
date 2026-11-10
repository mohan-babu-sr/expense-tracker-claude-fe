import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// ---- Accounts (R13) — same rules as the server's zod schemas (NFR3) ----

/** "98765 43210", "+91 98765-43210", "098765…" → "9876543210". Same as the server's normalizeMobile. */
export const normalizeMobile = (value: string): string =>
  value.replace(/[\s()-]/g, '').replace(/^(?:\+?91|0)(?=\d{10}$)/, '');

/** Indian mobile: 10 digits starting 6–9 (after normalizing). Error key: `mobile`. */
export function indianMobile(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  if (v === null || v === '') return null;
  return /^[6-9]\d{9}$/.test(normalizeMobile(String(v))) ? null : { mobile: true };
}

/** PIN: 4–6 digits (use with Validators.pattern). */
export const PIN_PATTERN = /^\d{4,6}$/;

/** Group code: 6–20 letters, digits or "-" (use with Validators.pattern). */
export const GROUP_CODE_PATTERN = /^[A-Za-z0-9-]{6,20}$/;

/**
 * "Confirm PIN" must equal the sibling control `otherName`. Error key: `mismatch`.
 * The other control's changes must re-run it: `pin.valueChanges.subscribe(() => confirm.updateValueAndValidity())`.
 */
export function sameAs(otherName: string): ValidatorFn {
  return (control) => {
    const other = control.parent?.get(otherName);
    if (!other || !control.value) return null;
    return control.value === other.value ? null : { mismatch: true };
  };
}

/**
 * Rupee amounts may have at most 2 decimals (paise) — R1 AC1, R8 AC1.
 * "> 0" is a separate Validators.min(0.01). Same rule as the server's zod amountSchema (NFR3).
 */
export function twoDecimals(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  if (v === null || v === '' || Number.isNaN(v)) return null;
  return Math.abs(v * 100 - Math.round(v * 100)) < 1e-6 ? null : { decimals: true };
}

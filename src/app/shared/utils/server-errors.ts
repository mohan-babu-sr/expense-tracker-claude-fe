import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl } from '@angular/forms';

/**
 * Puts the API's field errors `{ errors: { field: message } }` (design §2) onto the matching form controls
 * as `{ server: message }`, so they appear under their fields (NFR3).
 * Nested names like "group.code" work with nested FormGroups. Returns true if at least one was shown.
 */
export function applyServerErrors(form: AbstractControl, err: HttpErrorResponse): boolean {
  const fieldErrors: Record<string, string> | undefined = err.error?.errors;
  let applied = false;
  for (const [field, message] of Object.entries(fieldErrors ?? {})) {
    const control = form.get(field);
    if (control) {
      control.setErrors({ server: message });
      control.markAsTouched();
      applied = true;
    }
  }
  return applied;
}

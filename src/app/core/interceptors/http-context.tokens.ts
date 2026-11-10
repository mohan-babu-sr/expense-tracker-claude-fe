import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Per-request flags read by the interceptors. Example:
 *   this.http.get(url, { context: new HttpContext().set(SKIP_LOADING, true) })
 */

/** Don't show the global progress bar (e.g. merchant autocomplete while typing). */
export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);

/** Don't show the error snackbar — the caller shows the error itself (e.g. inline form errors). */
export const SKIP_ERROR_SNACKBAR = new HttpContextToken<boolean>(() => false);

/**
 * Don't treat a 401 as "session ended" (no redirect to Welcome) — for sign-in forms, where 401 just means
 * "wrong PIN", and for the start-up "who am I?" check (R13).
 */
export const SKIP_AUTH_REDIRECT = new HttpContextToken<boolean>(() => false);

/** Sign-in / register forms: they show errors inline, and a 401 there is not a lost session. */
export const authFormContext = () =>
  new HttpContext().set(SKIP_ERROR_SNACKBAR, true).set(SKIP_AUTH_REDIRECT, true);

/** Shorthand for a context with only SKIP_LOADING set. */
export const skipLoading = () => new HttpContext().set(SKIP_LOADING, true);

/** Shorthand for a context with only SKIP_ERROR_SNACKBAR set (forms that show errors inline). */
export const skipErrorSnackbar = () => new HttpContext().set(SKIP_ERROR_SNACKBAR, true);

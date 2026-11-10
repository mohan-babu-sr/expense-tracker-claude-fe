import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { SKIP_AUTH_REDIRECT, SKIP_ERROR_SNACKBAR } from './http-context.tokens';

/** Turns any HTTP error into a short, user-friendly sentence. */
export function errorMessage(error: HttpErrorResponse): string {
  // Our API always answers `{ message, errors? }` (design §2). A Blob body (CSV export) has none.
  const serverMessage = typeof error.error?.message === 'string' ? error.error.message : null;
  if (serverMessage && error.status < 500) return serverMessage;

  if (error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504) {
    // Render's free plan sleeps when idle; the first request after that can time out while it wakes.
    return 'Cannot reach the server — it may be waking up. Please try again in a moment.';
  }
  if (error.status >= 500) {
    // Also covers the dev proxy answering 500 with no body when the API is stopped.
    return serverMessage ?? 'Cannot reach the server. Please check that it is running and try again.';
  }
  if (error.status === 404) return 'Not found. It may have been deleted.';
  return 'Something went wrong. Please try again.';
}

/**
 * Shows an error snackbar for every failed request (NFR2), then re-throws so the caller can
 * still react (e.g. map 400 `errors` onto form fields, re-enable a button).
 *
 * Sessions (R13, design §8.5):
 * - 401 → the session ended (signed out, PIN reset, disabled…) → forget the account, go to Welcome.
 * - 403 PENDING / ADMIN → the account can't open group data → go to its own home page.
 * - 403 MUST_CHANGE_PASSWORD → the admin still has the default password → password page (R13 AC5).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notification = inject(NotificationService);
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);

      if (error.status === 401 && !req.context.get(SKIP_AUTH_REDIRECT)) {
        auth.clear();
        void router.navigateByUrl('/welcome');
      } else if (error.status === 403 && error.error?.code === 'PENDING') {
        void router.navigateByUrl('/pending');
      } else if (error.status === 403 && error.error?.code === 'ADMIN') {
        void router.navigateByUrl('/admin');
      } else if (error.status === 403 && error.error?.code === 'MUST_CHANGE_PASSWORD') {
        void router.navigateByUrl('/admin/password');
      }

      if (!req.context.get(SKIP_ERROR_SNACKBAR)) {
        notification.error(errorMessage(error));
      }
      return throwError(() => error);
    }),
  );
};

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { SKIP_ERROR_SNACKBAR } from './http-context.tokens';

/** Turns any HTTP error into a short, user-friendly sentence. */
export function errorMessage(error: HttpErrorResponse): string {
  // Our API always answers `{ message, errors? }` (design §2). A Blob body (CSV export) has none.
  const serverMessage = typeof error.error?.message === 'string' ? error.error.message : null;
  if (serverMessage && error.status < 500) return serverMessage;

  if (error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504) {
    return 'Cannot reach the server. Please check that it is running and try again.';
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
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notification = inject(NotificationService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && !req.context.get(SKIP_ERROR_SNACKBAR)) {
        notification.error(errorMessage(error));
      }
      return throwError(() => error);
    }),
  );
};

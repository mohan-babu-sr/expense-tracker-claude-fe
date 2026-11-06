import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';
import { SKIP_LOADING } from './http-context.tokens';

/**
 * Drives the global progress bar (NFR2): +1 when a request starts, −1 when it ends.
 * `finalize` runs on success, error AND cancellation (e.g. switchMap), so the counter never leaks.
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_LOADING)) return next(req);

  const loading = inject(LoadingService);
  loading.start();
  return next(req).pipe(finalize(() => loading.stop()));
};

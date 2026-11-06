import { Injectable, computed, signal } from '@angular/core';

/**
 * Counts HTTP requests in flight (NFR2). A counter (not a boolean) because requests overlap:
 * the bar must stay visible until the LAST one finishes.
 * Used by loadingInterceptor; read by the top progress bar in the shell (T11).
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly active = signal(0);

  /** true while at least one request is running. */
  readonly isLoading = computed(() => this.active() > 0);

  start(): void {
    this.active.update((n) => n + 1);
  }

  stop(): void {
    this.active.update((n) => Math.max(0, n - 1));
  }
}

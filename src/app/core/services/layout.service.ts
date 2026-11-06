import { BreakpointObserver } from '@angular/cdk/layout';
import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, distinctUntilChanged, map, shareReplay } from 'rxjs';

/** Must equal `$mobile-max` in shared/styles/_breakpoints.scss. */
export const MOBILE_QUERY = '(max-width: 959.98px)';

/**
 * Laptop vs mobile layout (R10): side nav vs bottom nav, dialog vs full-screen form, table vs cards.
 * Uses the CDK BreakpointObserver so TypeScript and SCSS switch at exactly the same width.
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly breakpoints = inject(BreakpointObserver);

  /** Emits true below 960px. Replays the latest value to new subscribers. */
  readonly isMobile$: Observable<boolean> = this.breakpoints.observe(MOBILE_QUERY).pipe(
    map((state) => state.matches),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  /** Same value as a signal — handy in templates: `@if (layout.isMobile()) { … }`. */
  readonly isMobile = toSignal(this.isMobile$, {
    initialValue: this.breakpoints.isMatched(MOBILE_QUERY),
  });
}

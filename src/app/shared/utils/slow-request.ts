import { DestroyRef, Signal, inject, signal } from '@angular/core';

export interface SlowRequestFlag {
  /** True once a request has been running longer than the threshold. */
  readonly slow: Signal<boolean>;
  /** Call when the request starts. */
  start(): void;
  /** Call when it ends (success or error). */
  stop(): void;
}

/**
 * "Waking up the server…" hint for buttons that wait on the API (design §8.5): Render's free plan sleeps,
 * so the first request can take up to a minute. Must be created in an injection context (a field initializer).
 */
export function slowRequestFlag(thresholdMs = 3000): SlowRequestFlag {
  const slow = signal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    clearTimeout(timer);
    slow.set(false);
  };
  inject(DestroyRef).onDestroy(stop);
  return {
    slow: slow.asReadonly(),
    start: () => {
      stop();
      timer = setTimeout(() => slow.set(true), thresholdMs);
    },
    stop,
  };
}

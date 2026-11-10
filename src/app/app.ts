import { Component, DestroyRef, inject, signal } from '@angular/core';
import { AuthService } from './core/services/auth.service';

/** After this long without an answer, explain the wait (Render free plan wakes up slowly) — design §8.5. */
const WAKE_UP_HINT_MS = 3000;

/**
 * Root component. Shows a small splash until the start-up "who am I?" check answers, then the shell —
 * so a signed-out visitor never sees the navigation flash before being sent to Welcome.
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly slow = signal(false);

  constructor() {
    const timer = setTimeout(() => this.slow.set(true), WAKE_UP_HINT_MS);
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }
}

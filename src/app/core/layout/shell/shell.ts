import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { LayoutService } from '../../services/layout.service';
import { LoadingService } from '../../services/loading.service';

/** True when the current route (or any parent) has `data: { bare: true }` — the auth pages (design §8.5). */
function isBareRoute(snapshot: ActivatedRouteSnapshot | null): boolean {
  for (let r = snapshot; r; r = r.firstChild) {
    if (r.data['bare']) return true;
  }
  return false;
}

/**
 * App shell (R10, design §5).
 * Laptop (≥ 960px): side nav always open beside the content.
 * Mobile (< 960px): top toolbar + floating bottom bar; the side nav is a drawer opened by the toolbar ☰ (v5.1).
 * Bare pages (Welcome, sign in, …): no navigation at all, content centred (design §8.5).
 *
 * There is ONE <router-outlet>: the layout switches around it, so resizing the window never
 * destroys and re-creates the current page (which would lose its state).
 */
@Component({
  selector: 'app-shell',
  standalone: false,
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly router = inject(Router);
  protected readonly isMobile = inject(LayoutService).isMobile;
  protected readonly isLoading = inject(LoadingService).isLoading;

  /** Phone drawer state (v5.1). Closes after every navigation, i.e. after tapping a page in it. */
  protected readonly drawerOpen = signal(false);

  /** A link tapped in the phone drawer closes it — also when it's the page you're already on (no navigation). */
  protected onDrawerClick(event: MouseEvent): void {
    if (this.isMobile() && (event.target as HTMLElement).closest('a')) this.drawerOpen.set(false);
  }

  /** Starts as bare: before the first navigation finishes there's nothing to navigate to. */
  protected readonly bare = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => {
        this.drawerOpen.set(false);
        return isBareRoute(this.router.routerState.snapshot.root);
      }),
    ),
    { initialValue: true },
  );
}

import { Component, inject } from '@angular/core';
import { LayoutService } from '../../services/layout.service';
import { LoadingService } from '../../services/loading.service';

/**
 * App shell (R10, design §5).
 * Laptop (≥ 960px): side nav always open beside the content.
 * Mobile (< 960px): top toolbar + fixed bottom nav; the side nav is closed and not rendered.
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
  protected readonly isMobile = inject(LayoutService).isMobile;
  protected readonly isLoading = inject(LoadingService).isLoading;
}

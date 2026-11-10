import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, homeUrl } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

/**
 * "Waiting for approval" (R13 AC2): shown to someone who asked to join a group until a member (or the admin)
 * approves them. "Check again" re-reads the account: approved → dashboard; rejected → account gone → Welcome.
 */
@Component({
  selector: 'app-pending-page',
  standalone: false,
  templateUrl: './pending-page.html',
  styleUrl: './pending-page.scss',
})
export class PendingPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  protected readonly me = this.auth.userMe;
  protected readonly checking = signal(false);

  protected checkAgain(): void {
    this.checking.set(true);
    this.auth.refresh().subscribe({
      next: (me) => {
        this.checking.set(false);
        if (!me) {
          this.notification.error('Your request to join was not approved.');
        } else if (me.kind === 'user' && me.status === 'pending') {
          this.notification.success('Still waiting for approval.');
          return;
        }
        void this.router.navigateByUrl(homeUrl(me));
      },
      error: () => this.checking.set(false),
    });
  }

  protected signOut(): void {
    this.auth.logout().subscribe(() => void this.router.navigateByUrl('/welcome'));
  }
}

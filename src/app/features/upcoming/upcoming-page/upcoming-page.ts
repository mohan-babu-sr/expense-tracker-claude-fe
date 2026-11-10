import { DatePipe } from '@angular/common';
import { Component, LOCALE_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription, filter, switchMap, tap } from 'rxjs';
import { LayoutService } from '../../../core/services/layout.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UpcomingService } from '../../../core/services/upcoming.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { Upcoming } from '../../../shared/models';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';
import { daysUntil } from '../../../shared/utils/date.utils';
import { UpcomingDialog } from '../upcoming-dialog/upcoming-dialog';

interface UpcomingGroup {
  key: 'overdue' | 'next30' | 'later';
  title: string;
  items: Upcoming[];
}

/**
 * Upcoming page (R14 AC2–AC5): open items grouped Overdue / Next 30 days / Later, the 30-day total
 * (overdue included) in the header, an Open / Done switch, add / edit dialog, delete + Undo, Mark done.
 * Grouping and "days left" are computed here from today's LOCAL date (design §9.2), not on the server.
 */
@Component({
  selector: 'app-upcoming-page',
  standalone: false,
  templateUrl: './upcoming-page.html',
  styleUrl: './upcoming-page.scss',
})
export class UpcomingPage {
  private readonly upcomingService = inject(UpcomingService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly isMobile = inject(LayoutService).isMobile;
  private readonly datePipe = new DatePipe(inject(LOCALE_ID));
  private readonly inr = new InrCurrencyPipe();

  protected readonly status = signal<'open' | 'done'>('open');
  protected readonly items = signal<Upcoming[] | null>(null);
  private request?: Subscription;

  /** R14 AC2 — the server already sorts by due date, so each group stays sorted. Empty groups are hidden. */
  protected readonly groups = computed<UpcomingGroup[]>(() => {
    const groups: UpcomingGroup[] = [
      { key: 'overdue', title: 'Overdue', items: [] },
      { key: 'next30', title: 'Next 30 days', items: [] },
      { key: 'later', title: 'Later', items: [] },
    ];
    for (const item of this.items() ?? []) {
      const days = daysUntil(item.dueDate);
      groups[days < 0 ? 0 : days <= 30 ? 1 : 2].items.push(item);
    }
    return groups.filter((g) => g.items.length);
  });

  /** R14 AC3 — total of everything due in the next 30 days, overdue included. */
  protected readonly next30Total = computed(() =>
    this.groups()
      .filter((g) => g.key !== 'later')
      .reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.amount, 0), 0),
  );

  protected readonly subtitle = computed(() =>
    this.status() === 'done'
      ? 'Last 50 items marked done'
      : `Next 30 days: ${this.inr.transform(this.next30Total(), false)} (overdue included)`,
  );

  constructor() {
    effect(() => {
      this.status();
      untracked(() => this.load());
    });
  }

  protected load(): void {
    this.request?.unsubscribe(); // switching Open / Done quickly: the newer request wins
    this.items.set(null);
    this.request = this.upcomingService.list(this.status()).subscribe((list) => this.items.set(list));
  }

  protected add(): void {
    UpcomingDialog.open(this.dialog, this.isMobile())
      .pipe(filter(Boolean))
      .subscribe(() => this.showOpen());
  }

  protected edit(item: Upcoming): void {
    UpcomingDialog.open(this.dialog, this.isMobile(), { item })
      .pipe(filter(Boolean))
      .subscribe(() => this.load());
  }

  /** R14 AC5 — no confirm (it can be found under Done); a repeating item says when the next one is due. */
  protected markDone(item: Upcoming): void {
    this.upcomingService.done(item.id).subscribe(({ next }) => {
      const message = next
        ? `Marked done · next one due ${this.datePipe.transform(next.dueDate, 'd MMM y')}`
        : 'Marked done';
      this.notification.success(message);
      this.load();
    });
  }

  /** R14 AC4 (same flow as R4): confirm → delete → "Item deleted · UNDO" (5 s) → restore on Undo. */
  protected remove(item: Upcoming): void {
    ConfirmDialog.open(this.dialog, { title: 'Delete upcoming item?', message: `${item.title} · ₹${item.amount}` })
      .pipe(
        filter(Boolean),
        switchMap(() => this.upcomingService.delete(item.id)),
        tap(() => this.load()),
        switchMap(() => this.notification.undo('Item deleted')),
        switchMap(() => this.upcomingService.restore(item.id)),
      )
      .subscribe(() => {
        this.notification.success('Item restored');
        this.load();
      });
  }

  /** After adding, make sure the new (open) item is visible. */
  private showOpen(): void {
    if (this.status() === 'open') this.load();
    else this.status.set('open');
  }
}

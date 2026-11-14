import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { filter, switchMap } from 'rxjs';
import { LayoutService } from '../../../core/services/layout.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PlanService } from '../../../core/services/plan.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { everyLabel } from '../../../shared/constants';
import { RegularItem } from '../../../shared/models';
import { monthToDate } from '../../../shared/utils/date.utils';
import { RegularItemDialog } from '../regular-item-dialog/regular-item-dialog';

const monthShort = (m: string) => new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(monthToDate(m));

/**
 * Plan → Regular (R18 AC1–AC2, AC5): the templates — rent, maintenance, LIC, subscriptions…
 * Every member may add / edit / delete (R18 AC5). Monthly total = what an every-month item costs per month,
 * so the group sees the usual monthly commitment at a glance (non-monthly items listed separately).
 */
@Component({
  selector: 'app-regular-items-tab',
  standalone: false,
  templateUrl: './regular-items-tab.html',
  styleUrl: './regular-items-tab.scss',
})
export class RegularItemsTab {
  private readonly planService = inject(PlanService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly isMobile = inject(LayoutService).isMobile;

  protected readonly items = signal<RegularItem[] | null>(null);
  protected readonly everyLabel = everyLabel;
  protected readonly monthlyTotal = computed(() =>
    (this.items() ?? []).filter((i) => i.every === 1 && i.nextDue).reduce((s, i) => s + i.amount, 0),
  );

  constructor() {
    this.load();
  }

  private load(): void {
    this.planService.listItems().subscribe((list) => this.items.set(list));
  }

  /** "From Nov 2026 · until Mar 2028". */
  protected range(item: RegularItem): string {
    const from = `From ${monthShort(item.startMonth)}`;
    return item.endMonth ? `${from} · until ${monthShort(item.endMonth)}` : from;
  }

  protected next(item: RegularItem): string {
    return item.nextDue ? `Next: ${monthShort(item.nextDue)}` : 'Ended';
  }

  protected add(): void {
    RegularItemDialog.open(this.dialog, this.isMobile())
      .pipe(filter(Boolean))
      .subscribe(() => this.load());
  }

  protected edit(item: RegularItem): void {
    RegularItemDialog.open(this.dialog, this.isMobile(), { item })
      .pipe(filter(Boolean))
      .subscribe(() => this.load());
  }

  /** Past months keep their entries (R18 AC5), so no Undo is needed — just a confirmation. */
  protected remove(item: RegularItem): void {
    ConfirmDialog.open(this.dialog, {
      title: `Delete "${item.name}"?`,
      message: 'It is removed from this month (unless already paid) and later months. Past months keep it.',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.planService.deleteItem(item.id)),
      )
      .subscribe(() => {
        this.notification.success(`${item.name} deleted`);
        this.load();
      });
  }
}

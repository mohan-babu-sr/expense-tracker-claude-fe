import { Component, computed, effect, inject, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ExpenseEventsService } from '../../../core/services/expense-events.service';
import { PlanService } from '../../../core/services/plan.service';
import { SalaryDialog } from '../../../shared/components/salary-dialog/salary-dialog';
import { everyLabel } from '../../../shared/constants';
import { PlanMonth, RegularEntry, SalaryRow } from '../../../shared/models';
import { addMonths, currentMonth, monthToDate } from '../../../shared/utils/date.utils';
import { RegularEntryDialog, RegularEntryDialogData } from '../regular-entry-dialog/regular-entry-dialog';

const monthName = (m: string) =>
  new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(monthToDate(m));

/**
 * Plan → Month (R17 AC1–AC2, AC5; R18 AC3, AC6; R19 AC1–AC3): pick a month and see
 *  - the formula (salary − regular − limits = planned; actual so far),
 *  - every member's salary — anyone may enter / change anyone's (R17 AC2),
 *  - the regular checklist: amount for this month only + Paid tick (R18 AC3).
 * Future months (up to a year ahead) are a preview from the regular item templates — nothing to tick yet.
 */
@Component({
  selector: 'app-month-tab',
  standalone: false,
  templateUrl: './month-tab.html',
  styleUrl: './month-tab.scss',
})
export class MonthTab {
  private readonly planService = inject(PlanService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly myId = computed(() => this.auth.userMe()?.user.id ?? null);

  /** "Add regular items" in the empty checklist → the page switches to the Regular tab. */
  readonly manageRegular = output<void>();

  protected readonly month = signal(currentMonth());
  protected readonly maxMonth = addMonths(currentMonth(), 12);
  protected readonly plan = signal<PlanMonth | null>(null);
  protected readonly busyEntry = signal<string | null>(null);
  private request?: Subscription;

  protected readonly monthLabel = computed(() => monthName(this.month()));
  protected readonly isFuture = computed(() => this.month() > currentMonth());
  protected readonly startLabel = computed(() => {
    const start = this.plan()?.planStartMonth;
    return start ? monthName(start) : null;
  });
  /** The signed-in member first, then the others by name (like the Budgets page). */
  protected readonly salaries = computed(() => {
    const rows = this.plan()?.salaries ?? [];
    const me = this.myId();
    return [...rows.filter((r) => r.user.id === me), ...rows.filter((r) => r.user.id !== me)];
  });
  protected readonly paidCount = computed(() => (this.plan()?.regular ?? []).filter((e) => e.paidAt).length);
  /** For the progress ring (v5.1): share of this month's regular items ticked paid. */
  protected readonly paidPct = computed(() => {
    const n = this.plan()?.regular.length ?? 0;
    return n ? Math.round((this.paidCount() / n) * 100) : 0;
  });
  protected readonly everyLabel = everyLabel;

  constructor() {
    // v5: any Add (header button, phone bar, empty state) → refresh (design §13.3).
    inject(ExpenseEventsService)
      .added$.pipe(takeUntilDestroyed())
      .subscribe(() => this.load());
    effect(() => {
      this.month();
      untracked(() => this.load());
    });
  }

  private load(): void {
    this.request?.unsubscribe(); // a newer month wins over a slower older request
    this.request = this.planService.get(this.month()).subscribe((p) => this.plan.set(p));
  }

  /** "Mohan Babu" → "MB", "Abhinaya" → "A" — avatar text for the salary rows. */
  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  protected isMe(row: SalaryRow): boolean {
    return row.user.id === this.myId();
  }

  protected editSalary(row: SalaryRow): void {
    SalaryDialog.open(this.dialog, { user: row.user, month: this.month(), amount: row.amount, isMe: this.isMe(row) })
      .pipe(filter(Boolean))
      .subscribe((p) => this.plan.set(p));
  }

  /** Paid ⇄ not paid. Reloads the month so the "who / when" text comes from the server. */
  protected togglePaid(entry: RegularEntry): void {
    if (!entry.id || this.busyEntry()) return;
    this.busyEntry.set(entry.id);
    this.planService.updateEntry(entry.id, { paid: !entry.paidAt }).subscribe({
      next: (updated) => {
        this.replaceEntry(updated);
        this.busyEntry.set(null);
      },
      error: () => this.busyEntry.set(null), // snackbar from the error interceptor
    });
  }

  /** This month's amount only (R18 AC3) → totals change, so reload the month. */
  protected editAmount(entry: RegularEntry): void {
    this.dialog
      .open<RegularEntryDialog, RegularEntryDialogData, RegularEntry>(RegularEntryDialog, {
        data: { entry, monthLabel: this.monthLabel() },
        width: '440px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: 'input',
      })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe(() => this.load());
  }

  private replaceEntry(updated: RegularEntry): void {
    const p = this.plan();
    if (!p) return;
    this.plan.set({ ...p, regular: p.regular.map((e) => (e.id === updated.id ? updated : e)) });
  }
}

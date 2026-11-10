import { DatePipe } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, input, output } from '@angular/core';
import { REPEAT_LABELS } from '../../constants';
import { Upcoming } from '../../models';
import { dueLevel } from '../../pipes/days-left.pipe';

const LEVEL_ICON = { overdue: 'error', soon: 'schedule', later: 'event' } as const;

/**
 * One upcoming item as a row (R14 AC2) — shared by the Upcoming page AND the dashboard card (design §9.3):
 *
 *   [avatar]  Car insurance                ₹18,000
 *             20 Nov 2026 · Yearly    (!) In 10 days   ⋮
 *
 * The days-left badge uses color AND an icon AND words (NFR5). Done items show "Done 10 Nov" instead.
 * Tapping the row emits `edit`; the ⋮ menu (when `showActions`) offers Mark done / Edit / Delete.
 */
@Component({
  selector: 'app-upcoming-item',
  standalone: false,
  templateUrl: './upcoming-item.html',
  styleUrl: './upcoming-item.scss',
})
export class UpcomingItem {
  readonly item = input.required<Upcoming>();
  readonly showActions = input(true);

  readonly edit = output<Upcoming>();
  readonly done = output<Upcoming>();
  readonly delete = output<Upcoming>();

  private readonly datePipe = new DatePipe(inject(LOCALE_ID));

  protected readonly isDone = computed(() => !!this.item().doneAt);
  protected readonly level = computed(() => dueLevel(this.item().dueDate));
  protected readonly levelIcon = computed(() => LEVEL_ICON[this.level()]);

  /** "20 Nov 2026 · Yearly · Policy 1234" — empty parts dropped. */
  protected readonly meta = computed(() => {
    const u = this.item();
    return [
      this.datePipe.transform(u.dueDate, 'd MMM y'),
      u.repeat !== 'none' ? REPEAT_LABELS[u.repeat] : null,
      u.note,
    ]
      .filter(Boolean)
      .join(' · ');
  });

  protected readonly doneText = computed(() => {
    const at = this.item().doneAt;
    return at ? `Done ${this.datePipe.transform(at, 'd MMM')}` : '';
  });
}

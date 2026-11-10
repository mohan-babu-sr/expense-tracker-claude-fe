import { Pipe, PipeTransform } from '@angular/core';
import { daysUntil } from '../utils/date.utils';

/** How urgent a due date is (R14 AC2): overdue = danger, ≤ 7 days = warning. */
export type DueLevel = 'overdue' | 'soon' | 'later';

export function dueLevel(dueDate: string): DueLevel {
  const days = daysUntil(dueDate);
  if (days < 0) return 'overdue';
  return days <= 7 ? 'soon' : 'later';
}

/**
 * Due date → words (R14 AC2), from today's LOCAL date:
 *   {{ '2026-11-07' | daysLeft }} → "Overdue by 3 days"   (today = 10 Nov)
 *   "Today" · "Tomorrow" · "In 12 days"
 * Pure pipe (cached per input) although the answer also depends on today's date: a page left open past
 * midnight shows yesterday's wording until it reloads — acceptable, and much cheaper than an impure pipe.
 */
@Pipe({
  name: 'daysLeft',
  standalone: false,
})
export class DaysLeftPipe implements PipeTransform {
  transform(dueDate: string | null | undefined): string {
    if (!dueDate) return '';
    const days = daysUntil(dueDate);
    if (days < 0) return `Overdue by ${-days} ${-days === 1 ? 'day' : 'days'}`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  }
}

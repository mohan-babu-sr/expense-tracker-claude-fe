import { DatePipe } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, input, output } from '@angular/core';
import { Expense } from '../../models';
import { PaymentMethodLabelPipe } from '../../pipes/payment-method-label.pipe';

/**
 * One expense as a card row (R2 AC1/AC2 mobile list, R7 AC4 dashboard "recent"):
 *
 *   [avatar]  Swiggy                      ₹250.00
 *             Mohan · Food · UPI · 6 Nov · Lunch  ⋮
 *
 * Title = merchant, else note, else category name. Tapping the row emits `edit`;
 * the ⋮ menu (when `showActions`) offers Edit / Delete.
 */
@Component({
  selector: 'app-expense-list-item',
  standalone: false,
  templateUrl: './expense-list-item.html',
  styleUrl: './expense-list-item.scss',
})
export class ExpenseListItem {
  readonly expense = input.required<Expense>();
  /** Hide the date when the list is already grouped by date. */
  readonly showDate = input(true);
  readonly showActions = input(true);

  readonly edit = output<Expense>();
  readonly delete = output<Expense>();

  protected readonly title = computed(() => {
    const e = this.expense();
    return e.merchant || e.note || e.category?.name || 'Expense';
  });

  /**
   * Subtitle parts (user · category · payment · date · note), empty ones dropped so no stray "·".
   * User first (R12 AC3): the line truncates on phones, and the category is already shown by the avatar.
   */
  protected readonly meta = computed(() => {
    const e = this.expense();
    return [
      e.user?.name,
      e.category?.name,
      e.paymentMethod ? this.paymentLabel.transform(e.paymentMethod) : null,
      this.showDate() ? this.datePipe.transform(e.date, 'd MMM') : null,
      e.merchant && e.note ? e.note : null, // note only if it isn't already the title
    ]
      .filter(Boolean)
      .join(' · ');
  });

  private readonly paymentLabel = new PaymentMethodLabelPipe();
  private readonly datePipe = new DatePipe(inject(LOCALE_ID));
}

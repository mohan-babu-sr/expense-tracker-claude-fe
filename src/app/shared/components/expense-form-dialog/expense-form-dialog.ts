import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { Observable, catchError, debounceTime, distinctUntilChanged, filter, of, startWith, switchMap } from 'rxjs';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { skipErrorSnackbar } from '../../../core/interceptors/http-context.tokens';
import { AuthService } from '../../../core/services/auth.service';
import { CategoryService } from '../../../core/services/category.service';
import { ExpenseService } from '../../../core/services/expense.service';
import { GroupService } from '../../../core/services/group.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PlanService } from '../../../core/services/plan.service';
import { PAYMENT_METHODS } from '../../constants';
import { Expense, ExpenseInput, ExpenseUser, PaymentMethod } from '../../models';
import { currentMonth, fromIsoDate, toIsoDate } from '../../utils/date.utils';
import { SalaryDialog } from '../salary-dialog/salary-dialog';
import { twoDecimals } from '../../utils/validators';

export interface ExpenseFormData {
  /** Present = edit mode (R3); absent = add (R1). */
  expense?: Expense;
}

/**
 * Add / edit expense form (R1, R3) — shared because Dashboard AND Expenses open it.
 * Open with the static helper so laptop gets a dialog and mobile a full-screen sheet (R1 AC4):
 *
 *   ExpenseFormDialog.open(dialog, isMobile, { expense }).subscribe(saved => …)
 */
@Component({
  selector: 'app-expense-form-dialog',
  standalone: false,
  templateUrl: './expense-form-dialog.html',
  styleUrl: './expense-form-dialog.scss',
})
export class ExpenseFormDialog {
  private readonly data = inject<ExpenseFormData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ExpenseFormDialog, Expense>>(MatDialogRef);
  private readonly expenseService = inject(ExpenseService);
  private readonly notification = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);

  protected readonly isEdit = !!this.data.expense;
  protected readonly saving = signal(false);
  protected readonly paymentMethods = PAYMENT_METHODS;
  protected readonly today = new Date();
  protected readonly categories = toSignal(inject(CategoryService).getAll(), { initialValue: [] });

  /**
   * "Spent by" choices (R13 AC9): the group's active members. When editing an expense of someone who
   * is no longer an active member (disabled / moved), they're kept as an option so the field isn't
   * blank — the server accepts an unchanged member.
   */
  private readonly members = inject(GroupService).members;
  protected readonly userOptions = computed<ExpenseUser[]>(() => {
    const list: ExpenseUser[] = this.members().map(({ id, name }) => ({ id, name }));
    const own = this.data.expense?.user;
    return own && !list.some((u) => u.id === own.id) ? [...list, own] : list;
  });
  /** New expenses default to the signed-in member (R12 v2). */
  private readonly defaultUserId = inject(AuthService).userMe()?.user.id ?? '';

  protected readonly form = inject(FormBuilder).group({
    amount: [this.data.expense?.amount ?? (null as number | null), [Validators.required, Validators.min(0.01), twoDecimals]],
    categoryId: [this.data.expense?.categoryId ?? '', Validators.required],
    date: [this.data.expense ? fromIsoDate(this.data.expense.date) : new Date(), Validators.required],
    merchant: [this.data.expense?.merchant ?? '', Validators.maxLength(50)],
    note: [this.data.expense?.note ?? '', Validators.maxLength(200)],
    paymentMethod: [(this.data.expense?.paymentMethod ?? null) as PaymentMethod | null],
    // Required; same name as the API field, so 400 field errors map onto it directly.
    userId: [this.data.expense?.userId ?? this.defaultUserId, Validators.required],
  });

  /** Chip shown in the closed category select. */
  private readonly categoryIdValue = toSignal(this.form.controls.categoryId.valueChanges, {
    initialValue: this.form.controls.categoryId.value,
  });
  protected readonly selectedCategory = computed(() =>
    this.categories().find((c) => c.id === this.categoryIdValue()),
  );

  /**
   * Merchant suggestions (R1 AC1a): wait 300ms after typing stops, skip repeats, and
   * switchMap cancels the previous request if the user keeps typing.
   */
  protected readonly merchantOptions$: Observable<string[]> = this.form.controls.merchant.valueChanges.pipe(
    startWith(this.form.controls.merchant.value ?? ''),
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((q) => this.expenseService.merchants((q ?? '').trim()).pipe(catchError(() => of([])))),
    takeUntilDestroyed(this.destroyRef),
  );

  /**
   * "Add expense" with the salary-first rule (R17 AC3, design §12.5): if the signed-in member has no salary for
   * the current month yet, ask for it first, then open the form. Cancelling the salary step adds nothing.
   * If the check itself fails (offline, server waking up) the form just opens — the server still enforces the rule.
   */
  static openAdd(
    dialog: MatDialog,
    isMobile: boolean,
    plan: PlanService,
    me: { id: string; name: string } | null,
  ): Observable<Expense | undefined> {
    if (!me) return ExpenseFormDialog.open(dialog, isMobile);
    const month = currentMonth();
    return plan.isSalaryMissing(me.id, month).pipe(
      catchError(() => of(false)),
      switchMap((missing) =>
        missing
          ? SalaryDialog.open(dialog, {
              user: me,
              month,
              amount: null,
              isMe: true,
              reason: 'Enter your salary for this month before adding expenses — the monthly plan needs it.',
            }).pipe(switchMap((saved) => (saved ? ExpenseFormDialog.open(dialog, isMobile) : of(undefined))))
          : ExpenseFormDialog.open(dialog, isMobile),
      ),
    );
  }

  /** Laptop: 520px dialog. Mobile: full-screen (R1 AC4, design §5). Emits the saved expense. */
  static open(dialog: MatDialog, isMobile: boolean, data: ExpenseFormData = {}): Observable<Expense | undefined> {
    const config: MatDialogConfig<ExpenseFormData> = isMobile
      ? { data, width: '100vw', maxWidth: '100vw', height: '100dvh', panelClass: 'full-screen-dialog' }
      : { data, width: '520px', maxWidth: 'calc(100vw - 32px)' };
    return dialog
      .open<ExpenseFormDialog, ExpenseFormData, Expense>(ExpenseFormDialog, { ...config, autoFocus: 'first-tabbable' })
      .afterClosed();
  }

  protected error(field: keyof typeof this.form.controls): string {
    const e = this.form.controls[field].errors;
    if (!e) return '';
    if (e['server']) return e['server'];
    switch (field) {
      case 'amount':
        if (e['required']) return 'Amount is required';
        if (e['min']) return 'Amount must be greater than 0';
        if (e['decimals']) return 'Use at most 2 decimals (paise)';
        return 'Enter a valid amount';
      case 'categoryId':
        return 'Choose a category';
      case 'date':
        if (e['matDatepickerMax']) return 'Date cannot be in the future';
        if (e['matDatepickerParse']) return 'Enter a date as dd/mm/yyyy';
        return 'Date is required';
      case 'merchant':
        return 'At most 50 characters';
      case 'note':
        return 'At most 200 characters';
      case 'userId':
        return 'Choose who spent it';
      default:
        return 'Invalid value';
    }
  }

  private askSalaryThenSave(userId: string, month: string, reason: string): void {
    const user = this.userOptions().find((u) => u.id === userId) ?? { id: userId, name: 'This member' };
    SalaryDialog.open(this.dialog, { user, month, amount: null, isMe: userId === this.defaultUserId, reason })
      .pipe(filter(Boolean))
      .subscribe(() => this.save());
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input: ExpenseInput = {
      amount: Number(v.amount),
      categoryId: v.categoryId!,
      date: toIsoDate(v.date!),
      merchant: v.merchant?.trim() || null,
      note: v.note?.trim() || null,
      paymentMethod: v.paymentMethod || null,
      userId: v.userId!,
    };

    this.saving.set(true);
    const request = this.data.expense
      ? this.expenseService.update(this.data.expense.id, input, skipErrorSnackbar())
      : this.expenseService.create(input, skipErrorSnackbar());

    request.subscribe({
      next: (saved) => {
        this.notification.success(this.isEdit ? 'Expense updated' : 'Expense added'); // R1 AC3
        this.dialogRef.close(saved);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        // R17 AC3: the chosen member has no salary for that month (e.g. another member, or last month's date)
        // → ask for it right here, then save again. The form keeps its values.
        if (err.status === 409 && err.error?.code === 'SALARY_REQUIRED') {
          this.askSalaryThenSave(err.error.userId, err.error.month, err.error.message);
          return;
        }
        // Server validation (400) → show each message under its field (NFR3); otherwise snackbar.
        const fieldErrors: Record<string, string> | undefined = err.error?.errors;
        let mapped = false;
        for (const [field, message] of Object.entries(fieldErrors ?? {})) {
          const control = this.form.get(field);
          if (control) {
            control.setErrors({ server: message });
            control.markAsTouched();
            mapped = true;
          }
        }
        if (!mapped) this.notification.error(errorMessage(err));
      },
    });
  }
}

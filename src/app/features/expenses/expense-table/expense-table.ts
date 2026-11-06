import { Component, input, output } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Expense } from '../../../shared/models';

/**
 * Laptop expense table with server-side pagination (R2 AC1/AC2, NFR1).
 * Purely presentational: the page owns the data and reacts to (page), (edit), (delete).
 */
@Component({
  selector: 'app-expense-table',
  standalone: false,
  templateUrl: './expense-table.html',
  styleUrl: './expense-table.scss',
})
export class ExpenseTable {
  readonly expenses = input.required<Expense[]>();
  readonly total = input.required<number>();
  /** 0-based, as MatPaginator uses. */
  readonly pageIndex = input.required<number>();
  readonly pageSize = input.required<number>();

  readonly page = output<PageEvent>();
  readonly edit = output<Expense>();
  readonly delete = output<Expense>();

  protected readonly columns = ['date', 'user', 'category', 'description', 'paymentMethod', 'amount', 'actions'];
  protected readonly pageSizeOptions = [10, 25, 50];
}

/** A page of results (GET /expenses — NFR1). */
export interface PaginatedResponse<T> {
  items: T[];
  /** Number of matching items across all pages. */
  total: number;
  page: number;
  pageSize: number;
}

/** GET /expenses also returns the sum of all matching expenses (R2 AC3). */
export interface ExpensePage<T> extends PaginatedResponse<T> {
  totalAmount: number;
}

export type PageSize = 10 | 25 | 50;

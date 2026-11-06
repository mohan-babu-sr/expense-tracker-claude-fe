import { ExpenseUser } from '../models';

/**
 * Who spent it (R12) — a fixed list until login exists (v2).
 * Must match USERS / DEFAULT_USER in server/src/models/expense.model.ts.
 * The value is also the display name, so no label pipe is needed (unlike payment methods).
 */
export const USERS: readonly ExpenseUser[] = ['Mohan', 'Abhinaya'];

/** Pre-selected in the add form (R12 AC2). */
export const DEFAULT_USER: ExpenseUser = 'Mohan';

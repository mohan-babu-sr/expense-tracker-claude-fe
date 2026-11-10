import { Category } from './category.model';

/** Must match the server enum (server/src/models/upcoming.model.ts). Labels: shared/constants/repeat-options. */
export type Repeat = 'none' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';

/** A planned big payment / event as returned by the API (design §9.1, R14). */
export interface Upcoming {
  id: string;
  title: string;
  categoryId: string;
  category: Category | null;
  /** Estimated amount. */
  amount: number;
  /** Calendar date `YYYY-MM-DD`. */
  dueDate: string;
  repeat: Repeat;
  note?: string;
  /** ISO timestamp when marked done; null = open. */
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Body for POST / PUT /upcoming. */
export interface UpcomingInput {
  title: string;
  categoryId: string;
  amount: number;
  dueDate: string;
  repeat: Repeat;
  note: string | null;
}

/** Response of POST /upcoming/:id/done — `next` is the new occurrence of a repeating item (R14 AC5). */
export interface UpcomingDoneResult {
  done: Upcoming;
  next: Upcoming | null;
}

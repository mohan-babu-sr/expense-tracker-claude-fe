import { UserRole } from './auth.model';

/** What members see about each other (GET /groups/current — design §8.3). */
export interface GroupMember {
  id: string;
  name: string;
  mobile: string;
  role: UserRole;
}

/** The signed-in user's group: active members + join requests waiting for approval (R13 AC7). */
export interface CurrentGroup {
  id: string;
  name: string;
  code: string;
  /** Active members, A–Z. They are the "Spent by" choices for expenses (R13 AC9). */
  members: GroupMember[];
  pending: GroupMember[];
}

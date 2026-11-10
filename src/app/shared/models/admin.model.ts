import { GroupSummary, UserRole, UserStatus } from './auth.model';

/** GET /admin/groups row (R13 AC6). */
export interface AdminGroup extends GroupSummary {
  memberCount: number;
  pendingCount: number;
  createdAt: string;
}

/** GET /admin/users row: the account (no secrets) + its group's name / code. */
export interface AdminUser {
  id: string;
  name: string;
  mobile: string;
  groupId: string;
  role: UserRole;
  status: UserStatus;
  group: GroupSummary | null;
  createdAt: string;
}

export interface AdminUserQuery {
  /** Searches name or mobile. */
  q?: string;
  groupId?: string;
  status?: UserStatus;
}

export interface AdminUserCreate {
  name: string;
  mobile: string;
  pin: string;
  groupId: string;
}

/** Only the admin can change mobile or group (R13 AC4, AC6). A new mobile / group signs the user out. */
export interface AdminUserUpdate {
  name: string;
  mobile: string;
  groupId: string;
}

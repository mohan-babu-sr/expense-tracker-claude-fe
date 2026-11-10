/** Accounts & sessions — API shapes from design §8.3 (R13). */

export type UserRole = 'owner' | 'member';
export type UserStatus = 'pending' | 'active' | 'disabled';

export interface AppUser {
  id: string;
  name: string;
  mobile: string;
  groupId: string;
  role: UserRole;
  status: UserStatus;
}

export interface GroupSummary {
  id: string;
  name: string;
  code: string;
}

/** GET /auth/me for a user. */
export interface UserMe {
  kind: 'user';
  user: AppUser;
  group: GroupSummary | null;
  status: UserStatus;
}

/** GET /auth/me for the admin. */
export interface AdminMe {
  kind: 'admin';
  username: string;
  mustChangePassword: boolean;
}

export type Me = UserMe | AdminMe;

export type RegisterGroup = { mode: 'create'; name: string; code: string } | { mode: 'join'; code: string };

export interface RegisterInput {
  name: string;
  mobile: string;
  pin: string;
  group: RegisterGroup;
}

/** Accounts & sessions — API shapes from design §8.3 (R13). */

export type UserRole = 'owner' | 'member';
export type UserStatus = 'pending' | 'active' | 'disabled';

/** "Remind me N days before" choices (R28 AC2). */
export const NOTIFY_DAYS_BEFORE = [1, 3, 7] as const;
export type NotifyDaysBefore = (typeof NOTIFY_DAYS_BEFORE)[number];

/** What I want notifications about — account-wide, all my devices (R28 AC2, design §16.2). */
export interface NotifyPrefs {
  upcoming: boolean;
  daysBefore: NotifyDaysBefore;
  budget: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  mobile: string;
  groupId: string;
  role: UserRole;
  status: UserStatus;
  /** Notification choices (R28); the server fills defaults. */
  notify: NotifyPrefs;
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
  /** Registered fingerprint / Face ID devices (R26 AC6, R27 AC1). */
  passkeyCount: number;
}

/** GET /auth/me for the admin. */
export interface AdminMe {
  kind: 'admin';
  username: string;
  mustChangePassword: boolean;
}

export type Me = UserMe | AdminMe;

/** A fingerprint / Face ID device in Settings (R26 AC3, design §15.3 GET /me/passkeys). */
export interface PasskeyDevice {
  id: string;
  /** e.g. "Chrome on Android". */
  deviceName: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export type RegisterGroup = { mode: 'create'; name: string; code: string } | { mode: 'join'; code: string };

export interface RegisterInput {
  name: string;
  mobile: string;
  pin: string;
  group: RegisterGroup;
}

import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { Me } from '../../shared/models';
import { AuthService, homeUrl } from '../services/auth.service';

/**
 * Route guards (design §8.5, R13). Used as `canMatch` on lazy routes, so a signed-out visitor never even
 * downloads the dashboard's code; also fine as `canActivate`. Each one waits for the start-up "who am I?"
 * check, then lets the person in or sends them to where they belong (homeUrl).
 */
type Guard = () => Promise<boolean | UrlTree>;

/** inject() must run synchronously, before the first `await`. */
function guard(allow: (me: Me | null) => boolean): Guard {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.ensureLoaded();
    // Server unreachable: we don't know who this is — don't redirect (the root component shows "Can't reach
    // the server"; the URL is kept for Try again). R16 AC4.
    if (auth.unreachable()) return false;
    const me = auth.me();
    return allow(me) || router.parseUrl(homeUrl(me));
  };
}

/** Group pages: an approved member. */
export const memberGuard = guard((me) => me?.kind === 'user' && me.status === 'active');

/** Settings: any signed-in account except one still waiting for approval. */
export const signedInGuard = guard((me) => !!me && !(me.kind === 'user' && me.status === 'pending'));

/** "Waiting for approval" page. */
export const pendingGuard = guard((me) => me?.kind === 'user' && me.status === 'pending');

/** Admin panel. */
export const adminGuard = guard((me) => me?.kind === 'admin');

/**
 * Admin pages other than the password page: blocked until the default password is changed (R13 AC5).
 * Used inside the admin module, so the admin check above has already passed.
 */
export const adminPasswordChangedGuard: Guard = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ensureLoaded();
  if (auth.unreachable()) return false;
  const me = auth.me();
  return !(me?.kind === 'admin' && me.mustChangePassword) || router.parseUrl('/admin/password');
};

/** Welcome / sign-in / register: only when signed out. */
export const guestGuard = guard((me) => !me);

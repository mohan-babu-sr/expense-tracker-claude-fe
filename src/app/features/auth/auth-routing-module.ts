import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { guestGuard, pendingGuard } from '../../core/guards/auth.guards';
import { AdminSignInPage } from './admin-sign-in-page/admin-sign-in-page';
import { PendingPage } from './pending-page/pending-page';
import { RegisterPage } from './register-page/register-page';
import { SignInPage } from './sign-in-page/sign-in-page';
import { WelcomePage } from './welcome-page/welcome-page';

/** R13 AC1–AC5, design §8.5. Signed-in people are sent to their home by guestGuard. */
const routes: Routes = [
  { path: 'welcome', title: 'Welcome · Expense Tracker', component: WelcomePage, canActivate: [guestGuard] },
  { path: 'sign-in', title: 'Sign in · Expense Tracker', component: SignInPage, canActivate: [guestGuard] },
  { path: 'register', title: 'Create account · Expense Tracker', component: RegisterPage, canActivate: [guestGuard] },
  {
    path: 'admin-sign-in',
    title: 'Admin sign in · Expense Tracker',
    component: AdminSignInPage,
    canActivate: [guestGuard],
  },
  { path: 'pending', title: 'Waiting for approval · Expense Tracker', component: PendingPage, canActivate: [pendingGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthRoutingModule {}

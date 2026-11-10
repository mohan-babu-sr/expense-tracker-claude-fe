import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared-module';

import { AdminSignInPage } from './admin-sign-in-page/admin-sign-in-page';
import { AuthCard } from './auth-card/auth-card';
import { AuthRoutingModule } from './auth-routing-module';
import { PendingPage } from './pending-page/pending-page';
import { RegisterPage } from './register-page/register-page';
import { SignInPage } from './sign-in-page/sign-in-page';
import { WelcomePage } from './welcome-page/welcome-page';

/** Lazy-loaded (R13, design §8.5): Welcome, sign in, create account, admin sign in, pending. Imports ONLY SharedModule for UI. */
@NgModule({
  declarations: [AuthCard, WelcomePage, SignInPage, RegisterPage, AdminSignInPage, PendingPage],
  imports: [SharedModule, AuthRoutingModule],
})
export class AuthModule {}

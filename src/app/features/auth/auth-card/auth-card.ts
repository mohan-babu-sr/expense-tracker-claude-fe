import { Component, input } from '@angular/core';

/**
 * Common frame of the auth pages (R13): app logo, title, optional subtitle, the page's content in a card,
 * and an optional footer (`<div authFooter>` — e.g. "Back" / "Create account" links) below it.
 * Auth-only, so it lives in the auth feature rather than SharedModule.
 */
@Component({
  selector: 'app-auth-card',
  standalone: false,
  templateUrl: './auth-card.html',
  styleUrl: './auth-card.scss',
})
export class AuthCard {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly icon = input('account_balance_wallet');
}

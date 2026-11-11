import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeEnIn from '@angular/common/locales/en-IN';
import {
  LOCALE_ID,
  NgModule,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';

import { App } from './app';
import { AppRoutingModule } from './app-routing-module';
import { CoreModule } from './core/core-module';
import { IndianDateAdapter } from './core/date/indian-date-adapter';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { AppUpdateService } from './core/services/app-update.service';
import { AuthService } from './core/services/auth.service';
import { InstallService } from './core/services/install.service';
// Indian number/date formats for pipes: 1,23,456.00 and dd/MM/yyyy (scope decision: INR only).
registerLocaleData(localeEnIn);

@NgModule({
  declarations: [App],
  imports: [BrowserModule, AppRoutingModule, CoreModule],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),

    // HTTP + functional interceptors. Order matters: loading wraps error, so the progress bar
    // stops even when a request fails.
    provideHttpClient(withInterceptors([loadingInterceptor, errorInterceptor])),

    // Start the "who am I?" check right away (R13, design §8.5). Not awaited: the app renders its splash
    // meanwhile, and the route guards wait for the answer.
    provideAppInitializer(() => {
      void inject(AuthService).ensureLoaded();
    }),

    // R16 (design §11.1): service worker caches the app shell only (ngsw-config.json has no dataGroups → /api is
    // never cached). Production builds only, so `ng serve` always shows fresh code. Registers once the first
    // screen is ready (or after 30 s) so it never slows down the first visit.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideAppInitializer(() => inject(AppUpdateService).start()), // R16 AC5: "new version · Reload"
    // R16 AC6: created at start-up so it catches the browser's one-time `beforeinstallprompt` event.
    provideAppInitializer(() => void inject(InstallService)),

    // Charts are provided in DashboardModule (lazy) so Chart.js is not in the main bundle.

    // Datepicker uses the browser's Date with Indian day/month order. provideNativeDateAdapter()
    // registers the date formats; the DateAdapter is then swapped for one that parses dd/mm/yyyy.
    provideNativeDateAdapter(),
    { provide: DateAdapter, useClass: IndianDateAdapter },
    { provide: MAT_DATE_LOCALE, useValue: 'en-IN' },
    { provide: LOCALE_ID, useValue: 'en-IN' },
  ],
  bootstrap: [App],
})
export class AppModule {}

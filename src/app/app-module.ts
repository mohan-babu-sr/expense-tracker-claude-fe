import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeEnIn from '@angular/common/locales/en-IN';
import { LOCALE_ID, NgModule, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { BrowserModule } from '@angular/platform-browser';

import { App } from './app';
import { AppRoutingModule } from './app-routing-module';
import { CoreModule } from './core/core-module';
import { IndianDateAdapter } from './core/date/indian-date-adapter';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
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

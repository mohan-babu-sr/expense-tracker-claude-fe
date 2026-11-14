import { platformBrowser } from '@angular/platform-browser';
import { isDevMode } from '@angular/core';
import { AppModule } from './app/app-module';
import { inject } from '@vercel/analytics';

// Initialize Vercel Web Analytics
inject({
  mode: isDevMode() ? 'development' : 'production',
});

platformBrowser().bootstrapModule(AppModule, {
  
})
  .catch(err => console.error(err));

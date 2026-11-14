import { platformBrowser } from '@angular/platform-browser';
import { AppModule } from './app/app-module';
import { inject } from '@vercel/analytics';

inject();

platformBrowser().bootstrapModule(AppModule, {
  
})
  .catch(err => console.error(err));

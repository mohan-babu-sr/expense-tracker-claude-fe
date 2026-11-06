import { Component, computed, inject } from '@angular/core';
import { SettingsService, ThemePreference } from '../../../core/services/settings.service';

interface ThemeOption {
  value: ThemePreference;
  label: string;
  icon: string;
}

/**
 * Settings (R11). One card per section; add future preferences as new sections
 * backed by new fields on AppSettings (SettingsService).
 */
@Component({
  selector: 'app-settings-page',
  standalone: false,
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage {
  private readonly settingsService = inject(SettingsService);

  protected readonly themeOptions: readonly ThemeOption[] = [
    { value: 'system', label: 'System', icon: 'brightness_auto' },
    { value: 'light', label: 'Light', icon: 'light_mode' },
    { value: 'dark', label: 'Dark', icon: 'dark_mode' },
  ];

  protected readonly theme = computed(() => this.settingsService.settings().theme);

  protected setTheme(theme: ThemePreference): void {
    this.settingsService.update({ theme });
  }
}

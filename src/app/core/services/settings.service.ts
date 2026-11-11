import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';

/**
 * User preferences (R11). Add future settings as new fields here + in DEFAULT_SETTINGS;
 * old saved data without the field simply gets the default.
 */
export interface AppSettings {
  theme: ThemePreference;
}

export const DEFAULT_SETTINGS: AppSettings = { theme: 'system' };

/** ⚠ Also used by the no-flash script in src/index.html — keep both in sync. */
export const SETTINGS_STORAGE_KEY = 'expense-tracker.settings';

const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark'];

/**
 * Device-local settings (design §6 "Light / dark theme").
 * Stored in localStorage, not on the server: there's no login in v1, so a server value would apply
 * the same theme to every device. Changes are saved and applied automatically by an effect.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly document = inject(DOCUMENT);
  private readonly state = signal<AppSettings>(this.load());

  /** Current settings (read-only signal). */
  readonly settings = this.state.asReadonly();

  constructor() {
    // Runs now and after every change: persist + apply the theme to <html>.
    effect(() => {
      const settings = this.state();
      this.save(settings);
      this.applyTheme(settings.theme);
    });
  }

  update(changes: Partial<AppSettings>): void {
    this.state.update((current) => ({ ...current, ...changes }));
  }

  private applyTheme(theme: ThemePreference): void {
    const root = this.document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    this.applyThemeColor(theme);
  }

  /**
   * R16 AC3: the phone's status bar follows the APP theme. index.html has one theme-color meta per OS scheme
   * (light / dark); for an explicit choice both get that theme's color, for System each gets its own back.
   * The colors are read from those metas, so they're defined in one place (index.html). If index.html's start-up
   * script already overwrote them (saved Light/Dark), the original is in `data-own`.
   */
  private readonly themeColorMetas = Array.from(
    this.document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"][media]'),
  ).map((meta) => ({
    meta,
    own: meta.getAttribute('data-own') ?? meta.content,
    dark: (meta.media ?? '').includes('dark'),
  }));

  private applyThemeColor(theme: ThemePreference): void {
    const colorFor = (dark: boolean) => this.themeColorMetas.find((m) => m.dark === dark)?.own;
    for (const m of this.themeColorMetas) {
      m.meta.content = (theme === 'system' ? m.own : colorFor(theme === 'dark')) ?? m.own;
    }
  }

  /** Never trust stored data: anything unknown/invalid falls back to the defaults. */
  private load(): AppSettings {
    try {
      const raw = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}') as Partial<AppSettings>;
      return {
        theme: THEMES.includes(raw.theme as ThemePreference) ? (raw.theme as ThemePreference) : DEFAULT_SETTINGS.theme,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private save(settings: AppSettings): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage blocked (e.g. some private modes) → setting still works for this visit.
    }
  }
}

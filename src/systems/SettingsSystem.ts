import { supportedLanguages, type Language } from '../config/localization';
import { settingsConfig, type UserSettings } from '../config/settingsConfig';

type VolumeKey = 'masterVolume' | 'sfxVolume' | 'musicVolume';

export class SettingsSystem {
  private settings: UserSettings = { ...settingsConfig.defaultSettings };

  constructor() {
    this.settings = this.loadSettings();
  }

  get snapshot(): UserSettings {
    return { ...this.settings };
  }

  setLanguage(language: Language): UserSettings {
    this.settings.language = language;
    this.saveSettings();

    return this.snapshot;
  }

  setMuted(muted: boolean): UserSettings {
    this.settings.muted = muted;
    this.saveSettings();

    return this.snapshot;
  }

  toggleMuted(): UserSettings {
    return this.setMuted(!this.settings.muted);
  }

  adjustVolume(key: VolumeKey, direction: number): UserSettings {
    this.settings[key] = this.clampVolume(this.settings[key] + settingsConfig.volumeStep * direction);
    this.saveSettings();

    return this.snapshot;
  }

  private loadSettings(): UserSettings {
    const settings = { ...settingsConfig.defaultSettings };
    const savedLanguage = window.localStorage.getItem(settingsConfig.languageStorageKey);

    if (this.isLanguage(savedLanguage)) {
      settings.language = savedLanguage;
    }

    try {
      const rawSettings = window.localStorage.getItem(settingsConfig.storageKey);

      if (!rawSettings) {
        return settings;
      }

      const parsedSettings = JSON.parse(rawSettings) as Partial<UserSettings>;
      const parsedLanguage = parsedSettings.language ?? null;

      if (this.isLanguage(parsedLanguage)) {
        settings.language = parsedLanguage;
      }

      settings.masterVolume = this.readVolume(parsedSettings.masterVolume, settings.masterVolume);
      settings.sfxVolume = this.readVolume(parsedSettings.sfxVolume, settings.sfxVolume);
      settings.musicVolume = this.readVolume(parsedSettings.musicVolume, settings.musicVolume);
      settings.muted = typeof parsedSettings.muted === 'boolean' ? parsedSettings.muted : settings.muted;
    } catch {
      return settings;
    }

    return settings;
  }

  private saveSettings(): void {
    window.localStorage.setItem(settingsConfig.storageKey, JSON.stringify(this.settings));
    window.localStorage.setItem(settingsConfig.languageStorageKey, this.settings.language);
  }

  private readVolume(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? this.clampVolume(value) : fallback;
  }

  private clampVolume(value: number): number {
    return Math.round(Math.min(1, Math.max(0, value)) * 100) / 100;
  }

  private isLanguage(value: string | null): value is Language {
    return supportedLanguages.includes(value as Language);
  }
}

import { localization, type Language, type LocalizationKey, supportedLanguages } from '../config/localization';
import { settingsConfig } from '../config/settingsConfig';

export class LocalizationSystem {
  private language: Language = settingsConfig.defaultSettings.language;

  constructor(language?: Language) {
    this.language = language ?? this.loadLanguage();
  }

  get currentLanguage(): Language {
    return this.language;
  }

  setLanguage(language: Language): void {
    this.language = language;
    this.saveLanguage();
  }

  t(key: LocalizationKey): string {
    return localization[this.language][key] ?? localization.en[key];
  }

  private loadLanguage(): Language {
    const savedLanguage = this.readStoredLanguage();

    if (this.isLanguage(savedLanguage)) {
      return savedLanguage;
    }

    return settingsConfig.defaultSettings.language;
  }

  private saveLanguage(): void {
    try {
      window.localStorage.setItem(settingsConfig.languageStorageKey, this.language);
    } catch {
      // localStorage can be unavailable in private or restricted browser contexts.
    }
  }

  private readStoredLanguage(): string | null {
    try {
      return window.localStorage.getItem(settingsConfig.languageStorageKey);
    } catch {
      return null;
    }
  }

  private isLanguage(value: string | null): value is Language {
    return supportedLanguages.includes(value as Language);
  }
}

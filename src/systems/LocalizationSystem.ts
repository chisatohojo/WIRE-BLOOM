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
    const savedLanguage = window.localStorage.getItem(settingsConfig.languageStorageKey);

    if (this.isLanguage(savedLanguage)) {
      return savedLanguage;
    }

    return settingsConfig.defaultSettings.language;
  }

  private saveLanguage(): void {
    window.localStorage.setItem(settingsConfig.languageStorageKey, this.language);
  }

  private isLanguage(value: string | null): value is Language {
    return supportedLanguages.includes(value as Language);
  }
}

import type { Language } from './localization';

export type UserSettings = {
  language: Language;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
};

const defaultSettings: UserSettings = {
  language: 'ja',
  masterVolume: 0.34,
  sfxVolume: 1,
  musicVolume: 0.5,
  muted: false,
};

export const settingsConfig = {
  storageKey: 'wireBloom.settings',
  languageStorageKey: 'wireBloom.language',
  volumeStep: 0.1,
  defaultSettings,
} as const;

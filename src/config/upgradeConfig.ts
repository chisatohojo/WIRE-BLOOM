import type { LocalizationKey } from './localization';

export type UpgradeId =
  | 'pulseRadius'
  | 'pulseAngle'
  | 'pulseDamage'
  | 'orbMagnet'
  | 'shockwaveRadius'
  | 'shockwaveCombo'
  | 'comboGrace'
  | 'playerSpeed'
  | 'maxHp'
  | 'healHp'
  | 'enemyDensityUp';

export type UpgradeDefinition = {
  id: UpgradeId;
  effectType: UpgradeId;
  nameKey: LocalizationKey;
  descriptionKey: LocalizationKey;
  maxLevel?: number;
  weight: number;
};

export const upgradeConfig = {
  choicesPerLevel: 3,
  definitions: [
    {
      id: 'pulseRadius',
      effectType: 'pulseRadius',
      nameKey: 'pulseRadiusUpgrade',
      descriptionKey: 'pulseRadiusUpgradeDetail',
      maxLevel: 6,
      weight: 12,
    },
    {
      id: 'pulseAngle',
      effectType: 'pulseAngle',
      nameKey: 'pulseAngleUpgrade',
      descriptionKey: 'pulseAngleUpgradeDetail',
      maxLevel: 10,
      weight: 9,
    },
    {
      id: 'pulseDamage',
      effectType: 'pulseDamage',
      nameKey: 'pulseDamage',
      descriptionKey: 'pulseDamageDesc',
      maxLevel: 4,
      weight: 8,
    },
    {
      id: 'orbMagnet',
      effectType: 'orbMagnet',
      nameKey: 'orbMagnetUpgrade',
      descriptionKey: 'orbMagnetDesc',
      maxLevel: 7,
      weight: 12,
    },
    {
      id: 'shockwaveRadius',
      effectType: 'shockwaveRadius',
      nameKey: 'shockwaveRadiusUpgrade',
      descriptionKey: 'shockwaveRadiusUpgradeDetail',
      maxLevel: 8,
      weight: 10,
    },
    {
      id: 'shockwaveCombo',
      effectType: 'shockwaveCombo',
      nameKey: 'shockwaveComboBonus',
      descriptionKey: 'shockwaveComboBonusDesc',
      maxLevel: 5,
      weight: 7,
    },
    {
      id: 'comboGrace',
      effectType: 'comboGrace',
      nameKey: 'comboGraceUpgrade',
      descriptionKey: 'comboGraceUpgradeDetail',
      maxLevel: 4,
      weight: 6,
    },
    {
      id: 'playerSpeed',
      effectType: 'playerSpeed',
      nameKey: 'playerSpeed',
      descriptionKey: 'playerSpeedDesc',
      maxLevel: 5,
      weight: 8,
    },
    {
      id: 'maxHp',
      effectType: 'maxHp',
      nameKey: 'maxHp',
      descriptionKey: 'maxHpDesc',
      weight: 7,
    },
    {
      id: 'healHp',
      effectType: 'healHp',
      nameKey: 'healHp',
      descriptionKey: 'healHpDesc',
      weight: 5,
    },
    {
      id: 'enemyDensityUp',
      effectType: 'enemyDensityUp',
      nameKey: 'enemyDensityUpgrade',
      descriptionKey: 'enemyDensityDesc',
      maxLevel: 10,
      weight: 6,
    },
  ] satisfies UpgradeDefinition[],
} as const;

import { gameplayConfig } from '../config/gameplayConfig';

export type RunStatsSnapshot = {
  playTimeMs: number;
  levelReached: number;
  maxCombo: number;
  enemiesDefeated: number;
  pulsesFired: number;
  expCollected: number;
  upgradesTaken: number;
  damageTaken: number;
  healsTaken: number;
  score: number;
};

export class RunStatsSystem {
  private stats: Omit<RunStatsSnapshot, 'score'> = {
    playTimeMs: 0,
    levelReached: 1,
    maxCombo: 0,
    enemiesDefeated: 0,
    pulsesFired: 0,
    expCollected: 0,
    upgradesTaken: 0,
    damageTaken: 0,
    healsTaken: 0,
  };

  get snapshot(): RunStatsSnapshot {
    return {
      ...this.stats,
      score: this.calculateScore(),
    };
  }

  updatePlayTime(deltaMs: number): void {
    this.stats.playTimeMs += deltaMs;
  }

  recordPulseFired(): void {
    this.stats.pulsesFired += 1;
  }

  recordEnemyDefeated(): void {
    this.stats.enemiesDefeated += 1;
  }

  recordExpCollected(value: number): void {
    this.stats.expCollected += value;
  }

  recordLevelReached(level: number): void {
    this.stats.levelReached = Math.max(this.stats.levelReached, level);
  }

  recordCombo(combo: number): void {
    this.stats.maxCombo = Math.max(this.stats.maxCombo, combo);
  }

  recordUpgradeTaken(): void {
    this.stats.upgradesTaken += 1;
  }

  recordDamageTaken(damage: number): void {
    this.stats.damageTaken += Math.max(0, damage);
  }

  recordHealTaken(amount: number): void {
    if (amount > 0) {
      this.stats.healsTaken += 1;
    }
  }

  reset(): void {
    this.stats = {
      playTimeMs: 0,
      levelReached: 1,
      maxCombo: 0,
      enemiesDefeated: 0,
      pulsesFired: 0,
      expCollected: 0,
      upgradesTaken: 0,
      damageTaken: 0,
      healsTaken: 0,
    };
  }

  private calculateScore(): number {
    const playTimeSeconds = Math.floor(this.stats.playTimeMs / 1000);

    return (
      this.stats.enemiesDefeated * gameplayConfig.score.enemiesDefeated +
      this.stats.expCollected * gameplayConfig.score.expCollected +
      this.stats.maxCombo * gameplayConfig.score.maxCombo +
      this.stats.levelReached * gameplayConfig.score.levelReached +
      playTimeSeconds * gameplayConfig.score.playTimeSecond
    );
  }
}

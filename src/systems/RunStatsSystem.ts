export type RunStatsSnapshot = {
  playTimeMs: number;
  levelReached: number;
  maxCombo: number;
  enemiesDefeated: number;
  pulsesFired: number;
  expCollected: number;
  upgradesTaken: number;
};

export class RunStatsSystem {
  private stats: RunStatsSnapshot = {
    playTimeMs: 0,
    levelReached: 1,
    maxCombo: 0,
    enemiesDefeated: 0,
    pulsesFired: 0,
    expCollected: 0,
    upgradesTaken: 0,
  };

  get snapshot(): RunStatsSnapshot {
    return { ...this.stats };
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

  reset(): void {
    this.stats = {
      playTimeMs: 0,
      levelReached: 1,
      maxCombo: 0,
      enemiesDefeated: 0,
      pulsesFired: 0,
      expCollected: 0,
      upgradesTaken: 0,
    };
  }
}

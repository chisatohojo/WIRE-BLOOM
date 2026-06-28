import type { RunStatsSnapshot } from './RunStatsSystem';

export type TotalStatsSnapshot = {
  totalRuns: number;
  totalPlayTimeMs: number;
  bestLevel: number;
  bestCombo: number;
  totalEnemiesDefeated: number;
  totalPulsesFired: number;
  totalExpCollected: number;
  totalUpgradesTaken: number;
  bestScore: number;
  totalScore: number;
};

const storageKey = 'wireBloom.totalStats';

const defaultStats: TotalStatsSnapshot = {
  totalRuns: 0,
  totalPlayTimeMs: 0,
  bestLevel: 1,
  bestCombo: 0,
  totalEnemiesDefeated: 0,
  totalPulsesFired: 0,
  totalExpCollected: 0,
  totalUpgradesTaken: 0,
  bestScore: 0,
  totalScore: 0,
};

export class TotalStatsSystem {
  private stats: TotalStatsSnapshot = { ...defaultStats };

  constructor() {
    this.stats = this.loadStats();
  }

  get snapshot(): TotalStatsSnapshot {
    return { ...this.stats };
  }

  recordRun(runStats: RunStatsSnapshot): TotalStatsSnapshot {
    this.stats.totalRuns += 1;
    this.stats.totalPlayTimeMs += Math.max(0, runStats.playTimeMs);
    this.stats.bestLevel = Math.max(this.stats.bestLevel, runStats.levelReached);
    this.stats.bestCombo = Math.max(this.stats.bestCombo, runStats.maxCombo);
    this.stats.totalEnemiesDefeated += Math.max(0, runStats.enemiesDefeated);
    this.stats.totalPulsesFired += Math.max(0, runStats.pulsesFired);
    this.stats.totalExpCollected += Math.max(0, runStats.expCollected);
    this.stats.totalUpgradesTaken += Math.max(0, runStats.upgradesTaken);
    this.stats.bestScore = Math.max(this.stats.bestScore, runStats.score);
    this.stats.totalScore += Math.max(0, runStats.score);
    this.saveStats();

    return this.snapshot;
  }

  private loadStats(): TotalStatsSnapshot {
    try {
      const rawStats = window.localStorage.getItem(storageKey);

      if (!rawStats) {
        return { ...defaultStats };
      }

      const parsedStats = JSON.parse(rawStats) as Partial<TotalStatsSnapshot>;

      return {
        totalRuns: this.readCount(parsedStats.totalRuns, defaultStats.totalRuns),
        totalPlayTimeMs: this.readCount(parsedStats.totalPlayTimeMs, defaultStats.totalPlayTimeMs),
        bestLevel: this.readCount(parsedStats.bestLevel, defaultStats.bestLevel),
        bestCombo: this.readCount(parsedStats.bestCombo, defaultStats.bestCombo),
        totalEnemiesDefeated: this.readCount(parsedStats.totalEnemiesDefeated, defaultStats.totalEnemiesDefeated),
        totalPulsesFired: this.readCount(parsedStats.totalPulsesFired, defaultStats.totalPulsesFired),
        totalExpCollected: this.readCount(parsedStats.totalExpCollected, defaultStats.totalExpCollected),
        totalUpgradesTaken: this.readCount(parsedStats.totalUpgradesTaken, defaultStats.totalUpgradesTaken),
        bestScore: this.readCount(parsedStats.bestScore, defaultStats.bestScore),
        totalScore: this.readCount(parsedStats.totalScore, defaultStats.totalScore),
      };
    } catch {
      return { ...defaultStats };
    }
  }

  private saveStats(): void {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(this.stats));
    } catch {
      // localStorage can be unavailable in private or restricted browser contexts.
    }
  }

  private readCount(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
  }
}

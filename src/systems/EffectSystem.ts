import Phaser from 'phaser';
import { colors, gameplayConfig } from '../config/gameplayConfig';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  age: number;
  life: number;
};

type TrailSegment = {
  x: number;
  y: number;
  radius: number;
  age: number;
  life: number;
};

type PulseRing = {
  x: number;
  y: number;
  startRadius: number;
  endRadius: number;
  age: number;
  life: number;
  alpha: number;
  width: number;
};

export class EffectSystem {
  private readonly particleLayer: Phaser.GameObjects.Graphics;
  private readonly trailLayer: Phaser.GameObjects.Graphics;
  private readonly pulseLayer: Phaser.GameObjects.Graphics;
  private particles: Particle[] = [];
  private trails: TrailSegment[] = [];
  private pulseRings: PulseRing[] = [];

  constructor(scene: Phaser.Scene) {
    this.trailLayer = scene.add.graphics().setDepth(3);
    this.particleLayer = scene.add.graphics().setDepth(9);
    this.pulseLayer = scene.add.graphics().setDepth(8);
  }

  update(deltaMs: number): void {
    this.updateParticles(deltaMs);
    this.updateTrails(deltaMs);
    this.updatePulseRings(deltaMs);
  }

  emitEnemyBurst(x: number, y: number, chargeRatio: number, enemyWeight: number): void {
    const particleCount = Math.round(gameplayConfig.effects.enemyBurstParticles * (1 + chargeRatio * 0.8));
    const weightBoost = 1 + enemyWeight * 0.12;

    for (let index = 0; index < particleCount; index += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(
        gameplayConfig.effects.enemyBurstSpeedMin,
        gameplayConfig.effects.enemyBurstSpeedMax * weightBoost,
      );

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Phaser.Math.FloatBetween(1.5, 3.4 + chargeRatio * 1.4),
        age: 0,
        life: gameplayConfig.effects.enemyBurstLifeMs * Phaser.Math.FloatBetween(0.75, 1.15),
      });
    }

    this.trimToLimit(this.particles, gameplayConfig.effects.maxParticles);
  }

  emitOrbTrail(x: number, y: number, magnetMultiplier: number): void {
    this.trails.push({
      x,
      y,
      radius: gameplayConfig.expOrb.radius * Phaser.Math.FloatBetween(0.55, 1.05) * Math.min(magnetMultiplier, 2),
      age: 0,
      life: gameplayConfig.effects.orbTrailLifeMs,
    });

    this.trimToLimit(this.trails, gameplayConfig.effects.maxTrailSegments);
  }

  emitPulseRings(x: number, y: number, radius: number, chargeRatio: number): void {
    const ringCount = chargeRatio > 0.75 ? 4 : 3;

    for (let index = 0; index < ringCount; index += 1) {
      this.pulseRings.push({
        x,
        y,
        startRadius: gameplayConfig.core.radius + index * 10,
        endRadius: radius + index * 18,
        age: -index * gameplayConfig.effects.pulseEchoDelayMs,
        life: gameplayConfig.effects.pulseRingDurationMs + index * 70,
        alpha: 0.85 - index * 0.14 + chargeRatio * 0.12,
        width: gameplayConfig.pulse.strokeWidth + (index === 0 ? chargeRatio * 2 : 0),
      });
    }
  }

  private updateParticles(deltaMs: number): void {
    const deltaSeconds = deltaMs / 1000;

    this.particleLayer.clear();
    this.particles = this.particles.filter((particle) => {
      particle.age += deltaMs;
      particle.x += particle.vx * deltaSeconds;
      particle.y += particle.vy * deltaSeconds;
      particle.vx *= 0.975;
      particle.vy *= 0.975;

      const ratio = Phaser.Math.Clamp(particle.age / particle.life, 0, 1);
      const alpha = 1 - ratio;

      if (ratio >= 1) {
        return false;
      }

      this.particleLayer.fillStyle(colors.particle, alpha);
      this.particleLayer.fillCircle(particle.x, particle.y, particle.size * (1 - ratio * 0.45));
      this.particleLayer.lineStyle(1, colors.enemyStroke, alpha * 0.5);
      this.particleLayer.lineBetween(
        particle.x,
        particle.y,
        particle.x - particle.vx * 0.035,
        particle.y - particle.vy * 0.035,
      );

      return true;
    });
  }

  private updateTrails(deltaMs: number): void {
    this.trailLayer.clear();
    this.trails = this.trails.filter((trail) => {
      trail.age += deltaMs;

      const ratio = Phaser.Math.Clamp(trail.age / trail.life, 0, 1);
      const alpha = (1 - ratio) * 0.7;

      if (ratio >= 1) {
        return false;
      }

      this.trailLayer.lineStyle(1, colors.expTrail, alpha);
      this.trailLayer.strokeCircle(trail.x, trail.y, trail.radius + ratio * 8);
      this.trailLayer.fillStyle(colors.expTrail, alpha * 0.45);
      this.trailLayer.fillCircle(trail.x, trail.y, Math.max(1, trail.radius * (1 - ratio)));

      return true;
    });
  }

  private updatePulseRings(deltaMs: number): void {
    this.pulseLayer.clear();
    this.pulseRings = this.pulseRings.filter((ring) => {
      ring.age += deltaMs;

      if (ring.age < 0) {
        return true;
      }

      const ratio = Phaser.Math.Clamp(ring.age / ring.life, 0, 1);

      if (ratio >= 1) {
        return false;
      }

      const eased = 1 - Math.pow(1 - ratio, 3);
      const radius = Phaser.Math.Linear(ring.startRadius, ring.endRadius, eased);
      const alpha = ring.alpha * (1 - ratio);

      this.pulseLayer.lineStyle(ring.width, colors.pulse, alpha);
      this.pulseLayer.strokeCircle(ring.x, ring.y, radius);
      this.pulseLayer.lineStyle(1, colors.pulseAccent, alpha * 0.5);
      this.pulseLayer.strokeCircle(ring.x, ring.y, radius * 0.72);

      return true;
    });
  }

  private trimToLimit<T>(items: T[], limit: number): void {
    if (items.length > limit) {
      items.splice(0, items.length - limit);
    }
  }
}

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
  rotation: number;
  spin: number;
  sides: number;
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
  angle: number;
  angleWidth: number;
  startRadius: number;
  endRadius: number;
  age: number;
  life: number;
  alpha: number;
  width: number;
};

type ShockwaveRing = {
  x: number;
  y: number;
  endRadius: number;
  age: number;
  life: number;
  alpha: number;
  width: number;
};

type CoreGlow = {
  x: number;
  y: number;
  age: number;
  life: number;
  radius: number;
  alpha: number;
};

export class EffectSystem {
  private readonly coreGlowLayer: Phaser.GameObjects.Graphics;
  private readonly particleLayer: Phaser.GameObjects.Graphics;
  private readonly trailLayer: Phaser.GameObjects.Graphics;
  private readonly pulseLayer: Phaser.GameObjects.Graphics;
  private particles: Particle[] = [];
  private trails: TrailSegment[] = [];
  private pulseRings: PulseRing[] = [];
  private shockwaveRings: ShockwaveRing[] = [];
  private coreGlows: CoreGlow[] = [];

  constructor(scene: Phaser.Scene) {
    this.trailLayer = scene.add.graphics().setDepth(3);
    this.coreGlowLayer = scene.add.graphics().setDepth(6.5);
    this.particleLayer = scene.add.graphics().setDepth(9);
    this.pulseLayer = scene.add.graphics().setDepth(8);
  }

  update(deltaMs: number): void {
    this.updateParticles(deltaMs);
    this.updateTrails(deltaMs);
    this.updateCoreGlows(deltaMs);
    this.updatePulseRings(deltaMs);
    this.updateShockwaveRings(deltaMs);
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
        rotation: angle,
        spin: Phaser.Math.FloatBetween(-0.018, 0.018),
        sides: Phaser.Math.Between(3, 4),
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

  emitCoreAbsorb(x: number, y: number, magnetMultiplier: number): void {
    this.coreGlows.push({
      x,
      y,
      age: 0,
      life: gameplayConfig.effects.coreAbsorbGlowDurationMs,
      radius: gameplayConfig.effects.coreAbsorbGlowRadius * Math.min(magnetMultiplier, 2),
      alpha: gameplayConfig.effects.coreAbsorbGlowAlpha,
    });
  }

  emitPulseCone(x: number, y: number, radius: number, chargeRatio: number, angle: number, angleWidth: number): void {
    const ringCount = chargeRatio > 0.75 ? 4 : 3;

    for (let index = 0; index < ringCount; index += 1) {
      this.pulseRings.push({
        x,
        y,
        angle,
        angleWidth,
        startRadius: gameplayConfig.core.radius + index * gameplayConfig.effects.pulseRingStartStep,
        endRadius: radius + index * gameplayConfig.effects.pulseRingRadiusStep,
        age: -index * gameplayConfig.effects.pulseEchoDelayMs,
        life: gameplayConfig.effects.pulseRingDurationMs + index * gameplayConfig.effects.pulseRingDurationStepMs,
        alpha:
          gameplayConfig.effects.pulseRingAlpha +
          chargeRatio * gameplayConfig.effects.pulseRingChargeAlpha -
          index * gameplayConfig.effects.pulseRingAlphaStep,
        width:
          gameplayConfig.pulse.strokeWidth +
          (index === 0 ? chargeRatio * gameplayConfig.effects.pulseRingWidthChargeBoost : 0),
      });
    }
  }

  emitShockwaveRing(x: number, y: number, radius: number, combo: number): void {
    const comboScale = Phaser.Math.Clamp(combo / 40, 0, 1);

    this.shockwaveRings.push({
      x,
      y,
      endRadius: radius,
      age: 0,
      life: gameplayConfig.effects.shockwaveRingDurationMs,
      alpha: gameplayConfig.effects.shockwaveRingAlpha * (0.82 + comboScale * 0.18),
      width: gameplayConfig.effects.shockwaveRingWidth + comboScale,
    });
  }

  private updateParticles(deltaMs: number): void {
    const deltaSeconds = deltaMs / 1000;

    this.particleLayer.clear();
    this.particles = this.particles.filter((particle) => {
      particle.age += deltaMs;
      particle.x += particle.vx * deltaSeconds;
      particle.y += particle.vy * deltaSeconds;
      particle.rotation += particle.spin * deltaMs;
      particle.vx *= 0.975;
      particle.vy *= 0.975;

      const ratio = Phaser.Math.Clamp(particle.age / particle.life, 0, 1);
      const alpha = (1 - ratio) * gameplayConfig.effects.enemyShardAlpha;

      if (ratio >= 1) {
        return false;
      }

      this.drawShard(particle, ratio, alpha);
      this.particleLayer.lineStyle(1, colors.enemyStroke, alpha * 0.28);
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
      const alpha = Math.max(0, ring.alpha) * Math.pow(1 - ratio, 1.35);
      const halfAngle = ring.angleWidth * 0.5;
      const startAngle = ring.angle - halfAngle;
      const endAngle = ring.angle + halfAngle;

      this.pulseLayer.lineStyle(ring.width, colors.pulse, alpha);
      this.strokeArc(this.pulseLayer, ring.x, ring.y, radius, startAngle, endAngle);
      this.pulseLayer.lineStyle(1, colors.pulseAccent, alpha * 0.35);
      this.pulseLayer.lineBetween(
        ring.x,
        ring.y,
        ring.x + Math.cos(startAngle) * radius,
        ring.y + Math.sin(startAngle) * radius,
      );
      this.pulseLayer.lineBetween(
        ring.x,
        ring.y,
        ring.x + Math.cos(endAngle) * radius,
        ring.y + Math.sin(endAngle) * radius,
      );
      this.pulseLayer.lineStyle(1, colors.pulseAccent, alpha * gameplayConfig.effects.pulseRingInnerAlphaMultiplier);
      this.strokeArc(this.pulseLayer, ring.x, ring.y, radius * 0.72, startAngle, endAngle);

      return true;
    });
  }

  private updateShockwaveRings(deltaMs: number): void {
    this.shockwaveRings = this.shockwaveRings.filter((ring) => {
      ring.age += deltaMs;

      const ratio = Phaser.Math.Clamp(ring.age / ring.life, 0, 1);

      if (ratio >= 1) {
        return false;
      }

      const eased = 1 - Math.pow(1 - ratio, 2);
      const radius = Phaser.Math.Linear(gameplayConfig.enemy.radius, ring.endRadius, eased);
      const alpha = ring.alpha * Math.pow(1 - ratio, 1.4);
      const spokeStartRadius = radius * 0.72;
      const spokeEndRadius = radius * 1.04;

      this.pulseLayer.fillStyle(colors.enemyCore, alpha * gameplayConfig.effects.shockwaveRingGlowAlpha);
      this.pulseLayer.fillCircle(ring.x, ring.y, radius);
      this.pulseLayer.lineStyle(ring.width, colors.enemyCore, alpha);
      this.pulseLayer.strokeCircle(ring.x, ring.y, radius);
      this.pulseLayer.lineStyle(1, colors.enemyStroke, alpha * gameplayConfig.effects.shockwaveRingInnerAlphaMultiplier);
      this.pulseLayer.strokeCircle(ring.x, ring.y, radius * 0.62);
      this.pulseLayer.lineStyle(1, colors.particle, alpha * gameplayConfig.effects.shockwaveRingSpokeAlphaMultiplier);

      for (let index = 0; index < gameplayConfig.effects.shockwaveRingSpokeCount; index += 1) {
        const angle = (Math.PI * 2 * index) / gameplayConfig.effects.shockwaveRingSpokeCount + ratio * 0.28;

        this.pulseLayer.lineBetween(
          ring.x + Math.cos(angle) * spokeStartRadius,
          ring.y + Math.sin(angle) * spokeStartRadius,
          ring.x + Math.cos(angle) * spokeEndRadius,
          ring.y + Math.sin(angle) * spokeEndRadius,
        );
      }

      return true;
    });
  }

  private updateCoreGlows(deltaMs: number): void {
    this.coreGlowLayer.clear();
    this.coreGlows = this.coreGlows.filter((glow) => {
      glow.age += deltaMs;

      const ratio = Phaser.Math.Clamp(glow.age / glow.life, 0, 1);

      if (ratio >= 1) {
        return false;
      }

      const eased = 1 - Math.pow(1 - ratio, 2);
      const radius = Phaser.Math.Linear(
        gameplayConfig.core.radius,
        glow.radius * gameplayConfig.effects.coreAbsorbGlowScale,
        eased,
      );
      const alpha = glow.alpha * (1 - ratio);

      this.coreGlowLayer.fillStyle(colors.coreStroke, alpha * 0.18);
      this.coreGlowLayer.fillCircle(glow.x, glow.y, radius);
      this.coreGlowLayer.lineStyle(1, colors.expStroke, alpha);
      this.coreGlowLayer.strokeCircle(glow.x, glow.y, radius);

      return true;
    });
  }

  private drawShard(particle: Particle, ratio: number, alpha: number): void {
    const points: Phaser.Math.Vector2[] = [];
    const radius = particle.size * (1.2 - ratio * 0.35);

    for (let index = 0; index < particle.sides; index += 1) {
      const angle = particle.rotation + (Math.PI * 2 * index) / particle.sides;

      points.push(new Phaser.Math.Vector2(particle.x + Math.cos(angle) * radius, particle.y + Math.sin(angle) * radius));
    }

    this.particleLayer.lineStyle(1, colors.particle, alpha);

    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];

      this.particleLayer.lineBetween(current.x, current.y, next.x, next.y);
    }
  }

  private strokeArc(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
  ): void {
    graphics.beginPath();
    graphics.arc(x, y, radius, startAngle, endAngle, false);
    graphics.strokePath();
  }

  private trimToLimit<T>(items: T[], limit: number): void {
    if (items.length > limit) {
      items.splice(0, items.length - limit);
    }
  }
}

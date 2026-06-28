import Phaser from 'phaser';
import { colors, gameplayConfig } from '../config/gameplayConfig';

type Point = {
  x: number;
  y: number;
};

export type EnemyTypeConfig = (typeof gameplayConfig.enemy.types)[number];

export class Enemy extends Phaser.GameObjects.Graphics {
  readonly maxHealth: number;
  readonly expValue: number;
  readonly radius: number;
  readonly damageToPlayer: number;
  readonly typeId: EnemyTypeConfig['id'];
  childSpawnedCount = 0;
  nextChildSpawnAt = 0;

  private readonly speed: number;
  private readonly typeConfig: EnemyTypeConfig;
  private health: number;

  constructor(scene: Phaser.Scene, x: number, y: number, speed: number, typeConfig: EnemyTypeConfig) {
    super(scene);

    this.typeConfig = typeConfig;
    this.typeId = typeConfig.id;
    this.nextChildSpawnAt = scene.time.now + gameplayConfig.enemy.bossSpawnIntervalMs;
    this.speed = speed * typeConfig.speedMultiplier;
    this.health = typeConfig.hp;
    this.maxHealth = typeConfig.hp;
    this.expValue = typeConfig.expValue;
    this.radius = typeConfig.radius;
    this.damageToPlayer = typeConfig.damageToPlayer;
    this.setPosition(x, y);
    this.setDepth(5);
    this.draw();

    scene.add.existing(this);
  }

  moveToward(target: Point, deltaMs: number, speedMultiplier: number = 1): void {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

    if (distance <= 0) {
      return;
    }

    const step = Math.min(distance, this.speed * speedMultiplier * (deltaMs / 1000));
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);

    this.x += Math.cos(angle) * step;
    this.y += Math.sin(angle) * step;
    this.rotation += 0.0018 * deltaMs;
  }

  isWithinRadius(target: Point, radius: number): boolean {
    return Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y) <= radius;
  }

  takeDamage(damage: number): boolean {
    this.health = Math.max(0, this.health - damage);

    if (this.health <= 0) {
      return true;
    }

    this.draw();
    this.playDamageFlash();
    return false;
  }

  playDefeatFlash(): void {
    const radius = this.radius;

    this.clear();
    this.fillStyle(colors.enemyCore, gameplayConfig.effects.enemyFlashFillAlpha);
    this.fillCircle(0, 0, radius + 2);
    this.lineStyle(2, colors.pulse, gameplayConfig.effects.enemyFlashStrokeAlpha);
    this.strokeCircle(0, 0, radius + 6);
    this.lineStyle(1, colors.coreStroke, gameplayConfig.effects.enemyFlashStrokeAlpha * 0.7);
    this.lineBetween(-radius - 8, 0, radius + 8, 0);
    this.lineBetween(0, -radius - 8, 0, radius + 8);

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: gameplayConfig.effects.enemyFlashScale,
      duration: gameplayConfig.effects.enemyFlashDurationMs,
      ease: 'Quad.easeOut',
      onComplete: () => this.destroy(),
    });
  }

  private draw(): void {
    const radius = this.radius;
    const healthRatio = this.health / this.maxHealth;

    this.clear();
    this.fillStyle(this.typeConfig.fillColor, 0.44 + healthRatio * 0.18);
    this.fillCircle(0, 0, radius);
    this.lineStyle(1, this.typeConfig.strokeColor, 0.92);
    this.strokeCircle(0, 0, radius);
    this.drawWirePolygon(radius, 0.72);
    this.fillStyle(this.typeConfig.coreColor, 0.28 + healthRatio * 0.28);
    this.fillCircle(0, 0, 3 + healthRatio * 4);
    this.lineBetween(-radius, 0, radius, 0);
    this.lineBetween(0, -radius, 0, radius);
    this.lineStyle(1, this.typeConfig.strokeColor, 0.42);
    this.strokeCircle(0, 0, radius + 6);

    if (this.typeId === 'boss') {
      this.lineStyle(2, this.typeConfig.strokeColor, 0.52);
      this.strokeCircle(0, 0, radius + 12);
      this.lineStyle(1, this.typeConfig.coreColor, 0.38);
      this.strokeCircle(0, 0, radius * 0.62);
    }

    for (let index = 0; index < this.maxHealth; index += 1) {
      const angle = (Math.PI * 2 * index) / this.maxHealth - Math.PI / 2;
      const inner = radius + 9;
      const outer = radius + 13;

      this.lineStyle(1, this.typeConfig.coreColor, index < this.health ? 0.78 : 0.16);
      this.lineBetween(Math.cos(angle) * inner, Math.sin(angle) * inner, Math.cos(angle) * outer, Math.sin(angle) * outer);
    }
  }

  private playDamageFlash(): void {
    this.lineStyle(2, colors.pulse, 0.72);
    this.strokeCircle(0, 0, this.radius + 3);
    this.scene.time.delayedCall(gameplayConfig.effects.enemyFlashDurationMs, () => {
      if (this.active && this.health > 0) {
        this.draw();
      }
    });
  }

  private drawWirePolygon(radius: number, alpha: number): void {
    const points: Phaser.Math.Vector2[] = [];

    for (let index = 0; index < this.typeConfig.sides; index += 1) {
      const angle = (Math.PI * 2 * index) / this.typeConfig.sides - Math.PI / 2;

      points.push(new Phaser.Math.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
    }

    this.lineStyle(1, this.typeConfig.strokeColor, alpha);

    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];

      this.lineBetween(current.x, current.y, next.x, next.y);
    }
  }
}

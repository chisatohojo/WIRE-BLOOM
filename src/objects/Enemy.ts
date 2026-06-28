import Phaser from 'phaser';
import { colors, gameplayConfig } from '../config/gameplayConfig';

type Point = {
  x: number;
  y: number;
};

export class Enemy extends Phaser.GameObjects.Graphics {
  readonly maxHealth: number;
  readonly expValue: number;
  readonly radius: number;

  private readonly speed: number;
  private health: number;

  constructor(scene: Phaser.Scene, x: number, y: number, speed: number, health: number) {
    super(scene);

    this.speed = speed;
    this.health = health;
    this.maxHealth = health;
    this.expValue = health;
    this.radius = gameplayConfig.enemy.radius + (health - 1) * 3;
    this.setPosition(x, y);
    this.setDepth(5);
    this.draw();

    scene.add.existing(this);
  }

  moveToward(target: Point, deltaMs: number): void {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

    if (distance <= 0) {
      return;
    }

    const step = Math.min(distance, this.speed * (deltaMs / 1000));
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
    this.fillStyle(colors.enemyFill, 0.44 + healthRatio * 0.18);
    this.fillCircle(0, 0, radius);
    this.lineStyle(1, colors.enemyStroke, 0.92);
    this.strokeCircle(0, 0, radius);
    this.fillStyle(colors.enemyCore, 0.28 + healthRatio * 0.28);
    this.fillCircle(0, 0, 3 + healthRatio * 4);
    this.lineBetween(-radius, 0, radius, 0);
    this.lineBetween(0, -radius, 0, radius);
    this.lineStyle(1, colors.enemyStroke, 0.42);
    this.strokeCircle(0, 0, radius + 6);

    for (let index = 0; index < this.maxHealth; index += 1) {
      const angle = (Math.PI * 2 * index) / this.maxHealth - Math.PI / 2;
      const inner = radius + 9;
      const outer = radius + 13;

      this.lineStyle(1, colors.enemyCore, index < this.health ? 0.78 : 0.16);
      this.lineBetween(Math.cos(angle) * inner, Math.sin(angle) * inner, Math.cos(angle) * outer, Math.sin(angle) * outer);
    }
  }
}

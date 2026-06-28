import Phaser from 'phaser';
import { colors, gameplayConfig } from '../config/gameplayConfig';

type Point = {
  x: number;
  y: number;
};

export class ExpOrb extends Phaser.GameObjects.Graphics {
  readonly value: number;

  constructor(scene: Phaser.Scene, x: number, y: number, value: number = gameplayConfig.expOrb.value) {
    super(scene);

    this.value = value;
    this.setPosition(x, y);
    this.setDepth(6);
    this.draw();

    scene.add.existing(this);
  }

  moveToward(target: Point, deltaMs: number, magnetMultiplier: number): void {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

    if (distance <= 0) {
      return;
    }

    const terminalRatio =
      1 - Phaser.Math.Clamp(distance / gameplayConfig.expOrb.terminalAccelerationDistance, 0, 1);
    const terminalBoost =
      1 +
      Math.pow(terminalRatio, gameplayConfig.expOrb.terminalAccelerationPower) *
        gameplayConfig.expOrb.terminalAccelerationMultiplier;
    const step = Math.min(distance, gameplayConfig.expOrb.magnetSpeed * magnetMultiplier * terminalBoost * (deltaMs / 1000));
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);

    this.x += Math.cos(angle) * step;
    this.y += Math.sin(angle) * step;
    this.rotation -= 0.003 * deltaMs;
  }

  isCollectedBy(target: Point, magnetMultiplier: number): boolean {
    const collectRadius = gameplayConfig.expOrb.collectRadius * (1 + (magnetMultiplier - 1) * 0.5);

    return Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y) <= collectRadius;
  }

  private draw(): void {
    const radius = gameplayConfig.expOrb.radius + Math.min(this.value - 1, 3);

    this.clear();
    this.fillStyle(colors.expFill, 0.75);
    this.fillCircle(0, 0, radius);
    this.lineStyle(1, colors.expStroke, 0.95);
    this.strokeCircle(0, 0, radius);
    this.lineBetween(-radius - 3, 0, radius + 3, 0);
    this.lineBetween(0, -radius - 3, 0, radius + 3);
  }
}

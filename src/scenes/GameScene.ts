import Phaser from 'phaser';
import { colors, gameplayConfig } from '../config/gameplayConfig';
import { Enemy } from '../objects/Enemy';
import { ExpOrb } from '../objects/ExpOrb';
import { AudioSystem } from '../systems/AudioSystem';
import { EffectSystem } from '../systems/EffectSystem';

type PulseStats = {
  chargeRatio: number;
  damage: number;
  radius: number;
  angle: number;
  angleWidth: number;
};

type UpgradeId = 'pulseRadius' | 'pulseAngle' | 'orbMagnet' | 'shockwaveRadius' | 'comboGrace';

type UpgradeChoice = {
  id: UpgradeId;
  label: string;
  detail: string;
};

const UPGRADE_CHOICES: UpgradeChoice[] = [
  {
    id: 'pulseRadius',
    label: 'Pulse Radius +20%',
    detail: 'Pulse blast radius grows wider.',
  },
  {
    id: 'pulseAngle',
    label: 'Pulse Angle +5°',
    detail: 'Pulse cone opens slightly wider.',
  },
  {
    id: 'orbMagnet',
    label: 'Orb Magnet +30%',
    detail: 'EXP orbs fly into the core faster.',
  },
  {
    id: 'shockwaveRadius',
    label: 'Shockwave Radius +',
    detail: 'Defeated enemies release a larger circular shockwave.',
  },
  {
    id: 'comboGrace',
    label: 'Combo Grace +1.5s',
    detail: 'Combo timer stays open longer.',
  },
];

export class GameScene extends Phaser.Scene {
  private grid!: Phaser.GameObjects.Graphics;
  private core!: Phaser.GameObjects.Graphics;
  private chargeRing!: Phaser.GameObjects.Graphics;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private titleText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private expText!: Phaser.GameObjects.Text;
  private upgradeStatusText!: Phaser.GameObjects.Text;
  private debugText!: Phaser.GameObjects.Text;
  private audioSystem!: AudioSystem;
  private effectSystem!: EffectSystem;
  private enemySpawnTimer!: Phaser.Time.TimerEvent;
  private levelUpOverlay: Phaser.GameObjects.Container | null = null;
  private readonly center = new Phaser.Math.Vector2();
  private enemies: Enemy[] = [];
  private expOrbs: ExpOrb[] = [];
  private isCharging = false;
  private chargeStartedAt = 0;
  private combo = 0;
  private comboExpiresAt = 0;
  private experience = 0;
  private level = 1;
  private expToNextLevel: number = gameplayConfig.progression.baseExpToNextLevel;
  private pulseRadiusMultiplier = 1;
  private pulseAngleBonusDegrees = 0;
  private orbMagnetMultiplier = 1;
  private shockwaveRadiusBonus = 0;
  private comboGraceBonusMs = 0;
  private debugVisible = false;
  private gameSpeed = 1;
  private slowMotionTimeoutId: number | undefined;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(colors.background);
    this.center.set(this.scale.width * 0.5, this.scale.height * 0.5);

    this.grid = this.add.graphics().setDepth(0);
    this.audioSystem = new AudioSystem();
    this.effectSystem = new EffectSystem(this);
    this.core = this.add.graphics();
    this.chargeRing = this.add.graphics().setDepth(4);
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.drawGrid();
    this.drawCore();
    this.addHud();
    this.input.keyboard!.on('keydown-F3', this.toggleDebugDisplay, this);
    this.input.keyboard!.on('keydown-M', this.toggleMute, this);
    this.input.keyboard!.on('keydown-SPACE', this.resumeAudio, this);
    this.input.on('pointerdown', this.resumeAudio, this);

    this.enemySpawnTimer = this.time.addEvent({
      delay: gameplayConfig.enemy.spawnIntervalMs,
      loop: true,
      callback: () => this.spawnEnemy(),
    });
  }

  update(time: number, delta: number): void {
    this.effectSystem.update(delta);
    this.updateDebugDisplay(time);
    this.updateUpgradeStatusHud();

    if (this.levelUpOverlay) {
      return;
    }

    const scaledDelta = delta * this.gameSpeed;

    this.handleChargeInput(time);
    this.updateChargeRing(time);
    this.updateEnemies(scaledDelta);
    this.updateExpOrbs(scaledDelta);
    this.updateCombo(time);
  }

  private drawGrid(): void {
    const { width, height } = this.scale;
    const spacing = gameplayConfig.grid.spacing;

    this.grid.clear();
    this.grid.lineStyle(1, colors.grid, 0.35);

    for (let x = 0; x <= width; x += spacing) {
      this.grid.lineBetween(x, 0, x, height);
    }

    for (let y = 0; y <= height; y += spacing) {
      this.grid.lineBetween(0, y, width, y);
    }

    this.grid.lineStyle(1, colors.gridAccent, 0.55);
    this.grid.strokeRect(width * 0.25, height * 0.2, width * 0.5, height * 0.6);
    this.grid.lineBetween(width * 0.5, height * 0.12, width * 0.5, height * 0.88);
    this.grid.lineBetween(width * 0.12, height * 0.5, width * 0.88, height * 0.5);
  }

  private drawCore(): void {
    const { radius, outerRadius } = gameplayConfig.core;

    this.core.clear();
    this.core.setPosition(this.center.x, this.center.y);
    this.core.setDepth(7);
    this.core.fillStyle(colors.coreFill, 0.86);
    this.core.fillCircle(0, 0, radius);
    this.core.lineStyle(2, colors.coreStroke, 0.95);
    this.core.strokeCircle(0, 0, radius);
    this.core.lineStyle(1, colors.coreStroke, 0.35);
    this.core.strokeCircle(0, 0, outerRadius);
    this.core.lineBetween(-72, 0, -44, 0);
    this.core.lineBetween(44, 0, 72, 0);
    this.core.lineBetween(0, -72, 0, -44);
    this.core.lineBetween(0, 44, 0, 72);
  }

  private addHud(): void {
    this.titleText = this.add
      .text(this.scale.width * 0.5, 84, 'WIRE BLOOM', {
        color: colors.text,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '36px',
        letterSpacing: 6,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: this.titleText,
      alpha: 0,
      delay: gameplayConfig.hud.titleVisibleMs,
      duration: gameplayConfig.hud.titleFadeMs,
      ease: 'Sine.easeInOut',
    });

    this.expText = this.add.text(24, 22, '', {
      color: colors.mutedText,
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '18px',
    });

    this.comboText = this.add
      .text(this.scale.width - 24, 22, 'COMBO x0', {
        color: colors.text,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '22px',
      })
      .setOrigin(1, 0);

    this.upgradeStatusText = this.add.text(24, this.scale.height - 104, '', {
      color: colors.mutedText,
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '13px',
      lineSpacing: 3,
    });
    this.upgradeStatusText.setDepth(12);

    this.debugText = this.add
      .text(24, 58, '', {
        color: colors.text,
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '14px',
        backgroundColor: '#06181c',
        padding: {
          x: 8,
          y: 6,
        },
      })
      .setDepth(40)
      .setVisible(false);

    this.updateExpText();
    this.updateUpgradeStatusHud();
  }

  private handleChargeInput(time: number): void {
    const wantsCharge = this.spaceKey.isDown || this.input.activePointer.leftButtonDown();

    if (wantsCharge && !this.isCharging) {
      this.isCharging = true;
      this.chargeStartedAt = time;
    }

    if (!wantsCharge && this.isCharging) {
      const chargeDuration = time - this.chargeStartedAt;

      this.isCharging = false;
      this.chargeRing.clear();
      this.firePulse(chargeDuration);
    }
  }

  private updateChargeRing(time: number): void {
    if (!this.isCharging) {
      return;
    }

    const pulse = this.getPulseStats(time - this.chargeStartedAt);
    const innerRadius = Phaser.Math.Linear(gameplayConfig.core.outerRadius + 10, pulse.radius, pulse.chargeRatio);
    const halfAngle = pulse.angleWidth * 0.5;
    const startAngle = pulse.angle - halfAngle;
    const endAngle = pulse.angle + halfAngle;

    this.chargeRing.clear();
    this.chargeRing.setPosition(this.center.x, this.center.y);
    this.chargeRing.lineStyle(1 + pulse.damage * 0.4, colors.pulseAccent, 0.32 + pulse.chargeRatio * 0.46);
    this.strokeArc(this.chargeRing, 0, 0, innerRadius, startAngle, endAngle);
    this.chargeRing.lineStyle(1, colors.coreStroke, 0.18 + pulse.chargeRatio * 0.18);
    this.chargeRing.lineBetween(0, 0, Math.cos(startAngle) * innerRadius, Math.sin(startAngle) * innerRadius);
    this.chargeRing.lineBetween(0, 0, Math.cos(endAngle) * innerRadius, Math.sin(endAngle) * innerRadius);
    this.chargeRing.lineStyle(1, colors.coreStroke, 0.2 + pulse.chargeRatio * 0.16);
    this.strokeArc(this.chargeRing, 0, 0, innerRadius * 0.58, startAngle, endAngle);
  }

  private firePulse(chargeDuration: number): void {
    const pulse = this.getPulseStats(chargeDuration);
    const comboAtFire = this.addCombo(1);

    this.audioSystem.playPulse(pulse.chargeRatio);
    this.effectSystem.emitPulseCone(this.center.x, this.center.y, pulse.radius, pulse.chargeRatio, pulse.angle, pulse.angleWidth);
    this.damageEnemiesInPulse(pulse, comboAtFire);
  }

  private spawnEnemy(): void {
    const spawnPoint = this.getRandomEdgePoint();
    const health = Phaser.Math.Between(gameplayConfig.enemy.healthMin, gameplayConfig.enemy.healthMax);
    const speed = Phaser.Math.FloatBetween(gameplayConfig.enemy.speedMin, gameplayConfig.enemy.speedMax) * (1 - (health - 1) * 0.1);

    this.enemies.push(new Enemy(this, spawnPoint.x, spawnPoint.y, speed, health));
  }

  private getRandomEdgePoint(): Phaser.Math.Vector2 {
    const { width, height } = this.scale;
    const padding = gameplayConfig.enemy.spawnPadding;
    const side = Phaser.Math.Between(0, 3);

    if (side === 0) {
      return new Phaser.Math.Vector2(Phaser.Math.Between(0, width), -padding);
    }

    if (side === 1) {
      return new Phaser.Math.Vector2(width + padding, Phaser.Math.Between(0, height));
    }

    if (side === 2) {
      return new Phaser.Math.Vector2(Phaser.Math.Between(0, width), height + padding);
    }

    return new Phaser.Math.Vector2(-padding, Phaser.Math.Between(0, height));
  }

  private updateEnemies(delta: number): void {
    const survivors: Enemy[] = [];

    for (const enemy of this.enemies) {
      enemy.moveToward(this.center, delta);

      if (enemy.isWithinRadius(this.center, gameplayConfig.enemy.removeRadius)) {
        enemy.destroy();
      } else {
        survivors.push(enemy);
      }
    }

    this.enemies = survivors;
  }

  private damageEnemiesInPulse(pulse: PulseStats, comboAtFire: number): void {
    const survivors: Enemy[] = [];
    const shockwaveQueue: Phaser.Math.Vector2[] = [];

    for (const enemy of this.enemies) {
      if (!this.isEnemyInsidePulseCone(enemy, pulse)) {
        survivors.push(enemy);
        continue;
      }

      if (!this.damageEnemy(enemy, pulse.damage, pulse.chargeRatio, shockwaveQueue)) {
        survivors.push(enemy);
      }
    }

    this.enemies = survivors;
    this.processShockwaveQueue(shockwaveQueue, comboAtFire);
  }

  private isEnemyInsidePulseCone(enemy: Enemy, pulse: PulseStats): boolean {
    if (!enemy.isWithinRadius(this.center, pulse.radius + enemy.radius)) {
      return false;
    }

    const enemyAngle = Phaser.Math.Angle.Between(this.center.x, this.center.y, enemy.x, enemy.y);
    const angleDifference = Phaser.Math.Angle.Wrap(enemyAngle - pulse.angle);

    return Math.abs(angleDifference) <= pulse.angleWidth * 0.5;
  }

  private damageEnemy(
    enemy: Enemy,
    damage: number,
    burstChargeRatio: number,
    shockwaveQueue: Phaser.Math.Vector2[],
  ): boolean {
    if (enemy.takeDamage(damage)) {
      this.audioSystem.playHit();
      this.effectSystem.emitEnemyBurst(enemy.x, enemy.y, burstChargeRatio, enemy.maxHealth);
      this.expOrbs.push(new ExpOrb(this, enemy.x, enemy.y, enemy.expValue));
      shockwaveQueue.push(new Phaser.Math.Vector2(enemy.x, enemy.y));
      enemy.playDefeatFlash();

      return true;
    }

    this.effectSystem.emitEnemyBurst(enemy.x, enemy.y, burstChargeRatio * 0.35, 1);
    return false;
  }

  private processShockwaveQueue(shockwaveQueue: Phaser.Math.Vector2[], comboAtFire: number): void {
    let processedCount = 0;

    while (
      shockwaveQueue.length > 0 &&
      processedCount < gameplayConfig.combatTuning.maxShockwaveChainPerPulse
    ) {
      const source = shockwaveQueue.shift()!;
      const radius = this.getShockwaveRadius(comboAtFire);
      const survivors: Enemy[] = [];

      processedCount += 1;
      this.effectSystem.emitShockwaveRing(source.x, source.y, radius, comboAtFire);

      for (const enemy of this.enemies) {
        if (!enemy.isWithinRadius(source, radius + enemy.radius)) {
          survivors.push(enemy);
          continue;
        }

        if (!this.damageEnemy(enemy, gameplayConfig.shockwave.damage, 0.45, shockwaveQueue)) {
          survivors.push(enemy);
        }
      }

      this.enemies = survivors;
    }
  }

  private updateExpOrbs(delta: number): void {
    const uncollected: ExpOrb[] = [];

    for (const orb of this.expOrbs) {
      orb.moveToward(this.center, delta, this.orbMagnetMultiplier);
      this.effectSystem.emitOrbTrail(orb.x, orb.y, this.orbMagnetMultiplier);

      if (orb.isCollectedBy(this.center, this.orbMagnetMultiplier)) {
        this.audioSystem.playOrb();
        this.effectSystem.emitOrbTrail(orb.x, orb.y, this.orbMagnetMultiplier * 1.6);
        this.effectSystem.emitCoreAbsorb(this.center.x, this.center.y, this.orbMagnetMultiplier);
        this.gainExperience(orb.value);
        orb.destroy();
      } else {
        uncollected.push(orb);
      }
    }

    this.expOrbs = uncollected;
  }

  private gainExperience(value: number): void {
    this.experience += value;

    if (this.experience >= this.expToNextLevel) {
      this.levelUp();
      return;
    }

    this.updateExpText();
  }

  private levelUp(): void {
    this.experience -= this.expToNextLevel;
    this.level += 1;
    this.expToNextLevel = this.getExpToNextLevel();
    this.updateExpText();
    this.audioSystem.playLevelUp();
    this.openLevelUpOverlay();
  }

  private addCombo(comboGain: number): number {
    if (this.combo > 0 && this.time.now >= this.comboExpiresAt) {
      this.combo = 0;
    }

    const previousCombo = this.combo;

    this.combo += comboGain;
    this.comboExpiresAt = this.time.now + gameplayConfig.combo.graceMs + this.comboGraceBonusMs;
    this.updateComboText();
    this.animateComboText();
    this.playComboMilestoneSound(previousCombo, this.combo);
    this.shakeForCombo(previousCombo, comboGain);

    if (this.crossedComboMilestone(previousCombo, this.combo, gameplayConfig.combo.slowMotionEvery)) {
      this.triggerSlowMotion();
    }

    return this.combo;
  }

  private shakeForCombo(previousCombo: number, comboGain: number): void {
    if (this.combo <= comboGain && comboGain <= 1) {
      return;
    }

    const shakeTier = Math.floor(this.combo / gameplayConfig.combo.shakeStepEvery);
    const crossedShakeTier = Math.floor(previousCombo / gameplayConfig.combo.shakeStepEvery) < shakeTier;
    const intensity = Math.min(
      gameplayConfig.combo.maxShakeIntensity,
      gameplayConfig.combo.screenShakeStrength + shakeTier * gameplayConfig.combo.shakeIntensityStep,
    );
    const duration = gameplayConfig.combo.shakeDurationMs + (crossedShakeTier ? 45 : 0);

    this.cameras.main.shake(duration, intensity);
  }

  private triggerSlowMotion(): void {
    this.gameSpeed = gameplayConfig.combo.slowMotionScale;

    if (this.slowMotionTimeoutId !== undefined) {
      window.clearTimeout(this.slowMotionTimeoutId);
    }

    this.slowMotionTimeoutId = window.setTimeout(() => {
      this.gameSpeed = 1;
      this.slowMotionTimeoutId = undefined;
    }, gameplayConfig.combo.slowMotionDurationMs);
  }

  private updateCombo(time: number): void {
    if (this.combo > 0 && time >= this.comboExpiresAt) {
      this.combo = 0;
      this.updateComboText();
      this.updateUpgradeStatusHud();
    }
  }

  private updateComboText(): void {
    this.comboText.setText(`COMBO x${this.combo}`);
  }

  private animateComboText(): void {
    this.tweens.killTweensOf(this.comboText);
    this.comboText.setScale(gameplayConfig.hud.comboPopScale);
    this.tweens.add({
      targets: this.comboText,
      scale: 1,
      duration: gameplayConfig.hud.comboPopDurationMs,
      ease: 'Back.easeOut',
    });
  }

  private updateExpText(): void {
    this.expText.setText(`LV ${this.level}  EXP ${this.experience}/${this.expToNextLevel}`);
  }

  private openLevelUpOverlay(): void {
    if (this.levelUpOverlay) {
      return;
    }

    this.isCharging = false;
    this.chargeRing.clear();
    this.enemySpawnTimer.paused = true;

    const { width, height } = this.scale;
    const panelX = width * 0.5 - 380;
    const panelY = 92;
    const panelWidth = 760;
    const panelHeight = 402;
    const optionX = width * 0.5 - 190;
    const optionWidth = 360;
    const optionHeight = 42;
    const container = this.add.container(0, 0).setDepth(30);
    const backdrop = this.add.graphics();
    const panel = this.add.graphics();
    const statsBox = this.add.graphics();

    backdrop.fillStyle(colors.overlayFill, gameplayConfig.levelUp.backdropAlpha);
    backdrop.fillRect(0, 0, width, height);
    panel.fillStyle(colors.overlayPanel, gameplayConfig.levelUp.panelAlpha);
    panel.fillRect(panelX, panelY, panelWidth, panelHeight);
    panel.lineStyle(1, colors.pulseAccent, 0.72);
    panel.strokeRect(panelX, panelY, panelWidth, panelHeight);
    statsBox.fillStyle(colors.background, 0.62);
    statsBox.fillRect(width * 0.5 + 80, 202, 270, 168);
    statsBox.lineStyle(1, colors.coreStroke, 0.34);
    statsBox.strokeRect(width * 0.5 + 80, 202, 270, 168);

    container.add([backdrop, panel, statsBox]);
    container.add(
      this.add
        .text(width * 0.5, panelY + 34, 'LEVEL UP', {
          color: colors.text,
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '30px',
          letterSpacing: 4,
        })
        .setOrigin(0.5),
    );

    container.add(
      this.add
        .text(width * 0.5, panelY + 70, 'Choose a temporary upgrade', {
          color: colors.mutedText,
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '16px',
        })
        .setOrigin(0.5),
    );

    container.add(
      this.add.text(width * 0.5 + 100, 216, this.getUpgradeStatusText(), {
        color: colors.text,
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '14px',
        lineSpacing: 7,
      }),
    );

    UPGRADE_CHOICES.forEach((choice, index) => {
      const optionY = 220 + index * 52;
      const optionBox = this.add.graphics();
      const optionZone = this.add
        .zone(optionX, optionY, optionWidth, optionHeight)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      optionBox.fillStyle(colors.background, gameplayConfig.levelUp.optionFillAlpha);
      optionBox.fillRect(optionX - optionWidth * 0.5, optionY - optionHeight * 0.5, optionWidth, optionHeight);
      optionBox.lineStyle(1, colors.coreStroke, gameplayConfig.levelUp.optionStrokeAlpha);
      optionBox.strokeRect(optionX - optionWidth * 0.5, optionY - optionHeight * 0.5, optionWidth, optionHeight);

      optionZone.on('pointerover', () => this.audioSystem.playUiHover());
      optionZone.on('pointerdown', () => this.applyUpgrade(choice.id));

      container.add([optionBox, optionZone]);
      container.add(
        this.add.text(optionX - optionWidth * 0.5 + 18, optionY - 15, `${index + 1}. ${choice.label}`, {
          color: colors.text,
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '15px',
        }),
      );
      container.add(
        this.add.text(optionX - optionWidth * 0.5 + 18, optionY + 4, choice.detail, {
          color: colors.mutedText,
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '12px',
        }),
      );
    });

    this.levelUpOverlay = container;
    this.input.keyboard!.on('keydown', this.handleUpgradeKey, this);
  }

  private handleUpgradeKey(event: KeyboardEvent): void {
    if (event.key === '1') {
      this.applyUpgrade('pulseRadius');
    }

    if (event.key === '2') {
      this.applyUpgrade('pulseAngle');
    }

    if (event.key === '3') {
      this.applyUpgrade('orbMagnet');
    }

    if (event.key === '4') {
      this.applyUpgrade('shockwaveRadius');
    }

    if (event.key === '5') {
      this.applyUpgrade('comboGrace');
    }
  }

  private applyUpgrade(upgradeId: UpgradeId): void {
    if (!this.levelUpOverlay) {
      return;
    }

    this.audioSystem.playSelect();

    if (upgradeId === 'pulseRadius') {
      this.pulseRadiusMultiplier *= gameplayConfig.upgrades.pulseRadiusMultiplier;
    }

    if (upgradeId === 'pulseAngle') {
      this.pulseAngleBonusDegrees += gameplayConfig.combatTuning.pulseAngleUpgradeAmountDegrees;
    }

    if (upgradeId === 'orbMagnet') {
      this.orbMagnetMultiplier *= gameplayConfig.upgrades.orbMagnetMultiplier;
    }

    if (upgradeId === 'shockwaveRadius') {
      this.shockwaveRadiusBonus += gameplayConfig.combatTuning.shockwaveRadiusUpgradeAmount;
    }

    if (upgradeId === 'comboGrace') {
      this.comboGraceBonusMs += gameplayConfig.upgrades.comboGraceBonusMs;
    }

    this.updateUpgradeStatusHud();
    this.closeLevelUpOverlay();
  }

  private closeLevelUpOverlay(): void {
    this.input.keyboard!.off('keydown', this.handleUpgradeKey, this);
    this.levelUpOverlay?.destroy(true);
    this.levelUpOverlay = null;
    this.enemySpawnTimer.paused = false;

    if (this.experience >= this.expToNextLevel) {
      this.levelUp();
    }
  }

  private getUpgradeStatusText(): string {
    return [
      `Pulse Radius: ${Math.round(this.getMaxPulseRadius())}`,
      `Pulse Angle: ${this.getCurrentPulseAngleDegrees()}°`,
      `Orb Magnet: x${this.orbMagnetMultiplier.toFixed(2)}`,
      `Shockwave Radius: ${Math.round(this.getShockwaveRadius(this.combo))}`,
      `SW Combo: +${Math.round(gameplayConfig.combatTuning.comboShockwaveRadiusBonusPerCombo * 100)}%/combo`,
    ].join('\n');
  }

  private updateUpgradeStatusHud(): void {
    if (!this.upgradeStatusText) {
      return;
    }

    this.upgradeStatusText.setText(this.getUpgradeStatusText());
  }

  private getPulseStats(chargeDuration: number): PulseStats {
    const chargeRatio = this.getChargeRatio(chargeDuration);
    const maxRadius = gameplayConfig.pulse.baseRadius * gameplayConfig.pulse.chargeRadiusMultiplier;
    const radius =
      Phaser.Math.Linear(gameplayConfig.pulse.baseRadius, maxRadius, chargeRatio) *
      this.pulseRadiusMultiplier;
    const damage = Math.round(
      Phaser.Math.Linear(gameplayConfig.pulse.minDamage, gameplayConfig.pulse.maxDamage, chargeRatio),
    );

    return {
      angle: this.getAimAngle(),
      angleWidth: this.getPulseAngleRadians(),
      chargeRatio,
      damage,
      radius,
    };
  }

  private getChargeRatio(chargeDuration: number): number {
    return Phaser.Math.Clamp(chargeDuration / gameplayConfig.pulse.maxChargeMs, 0, 1);
  }

  private getAimAngle(): number {
    const pointer = this.input.activePointer;
    const distance = Phaser.Math.Distance.Between(this.center.x, this.center.y, pointer.x, pointer.y);

    if (distance < 8) {
      return -Math.PI / 2;
    }

    return Phaser.Math.Angle.Between(this.center.x, this.center.y, pointer.x, pointer.y);
  }

  private getCurrentPulseAngleDegrees(): number {
    return gameplayConfig.combatTuning.pulseAngleInitialDegrees + this.pulseAngleBonusDegrees;
  }

  private getPulseAngleRadians(): number {
    return Phaser.Math.DegToRad(this.getCurrentPulseAngleDegrees());
  }

  private getMaxPulseRadius(): number {
    return gameplayConfig.pulse.baseRadius * gameplayConfig.pulse.chargeRadiusMultiplier * this.pulseRadiusMultiplier;
  }

  private getShockwaveRadius(combo: number): number {
    const baseRadius = gameplayConfig.combatTuning.shockwaveBaseRadius + this.shockwaveRadiusBonus;
    const comboMultiplier = Math.min(
      gameplayConfig.combatTuning.maxShockwaveRadiusMultiplier,
      1 + combo * gameplayConfig.combatTuning.comboShockwaveRadiusBonusPerCombo,
    );

    return baseRadius * comboMultiplier;
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

  private toggleDebugDisplay(event?: KeyboardEvent): void {
    event?.preventDefault();
    this.debugVisible = !this.debugVisible;
    this.debugText.setVisible(this.debugVisible);
    this.updateDebugDisplay(this.time.now);
  }

  private toggleMute(event?: KeyboardEvent): void {
    event?.preventDefault();
    this.audioSystem.toggleMute();
  }

  private resumeAudio(): void {
    this.audioSystem.resume();
  }

  private playComboMilestoneSound(previousCombo: number, currentCombo: number): void {
    if (this.crossedComboMilestone(previousCombo, currentCombo, gameplayConfig.combo.slowMotionEvery)) {
      this.audioSystem.playCombo50();
      return;
    }

    if (this.crossedComboMilestone(previousCombo, currentCombo, gameplayConfig.combo.shakeStepEvery)) {
      this.audioSystem.playCombo10();
    }
  }

  private updateDebugDisplay(time: number): void {
    if (!this.debugVisible) {
      return;
    }

    const chargeRatio = this.isCharging ? this.getChargeRatio(time - this.chargeStartedAt) : 0;
    const fps = Math.round(this.game.loop.actualFps);

    this.debugText.setText(
      [
        `FPS: ${fps}`,
        `Enemies: ${this.enemies.length}`,
        `EXP: ${this.experience}/${this.expToNextLevel}`,
        `Level: ${this.level}`,
        `Combo: ${this.combo}`,
        `Charge: ${Math.round(chargeRatio * 100)}%`,
      ].join('\n'),
    );
  }

  private getExpToNextLevel(): number {
    return gameplayConfig.progression.baseExpToNextLevel + (this.level - 1) * gameplayConfig.progression.expGrowthPerLevel;
  }

  private crossedComboMilestone(previousCombo: number, currentCombo: number, milestone: number): boolean {
    return Math.floor(previousCombo / milestone) < Math.floor(currentCombo / milestone);
  }
}

import Phaser from 'phaser';
import type { Language, LocalizationKey } from '../config/localization';
import { colors, gameplayConfig } from '../config/gameplayConfig';
import { upgradeConfig, type UpgradeDefinition, type UpgradeId } from '../config/upgradeConfig';
import { Enemy, type EnemyTypeConfig } from '../objects/Enemy';
import { ExpOrb } from '../objects/ExpOrb';
import { AudioSystem } from '../systems/AudioSystem';
import { EffectSystem } from '../systems/EffectSystem';
import { LocalizationSystem } from '../systems/LocalizationSystem';
import { RunStatsSystem } from '../systems/RunStatsSystem';
import { SettingsSystem } from '../systems/SettingsSystem';
import { TotalStatsSystem } from '../systems/TotalStatsSystem';

type PulseStats = {
  chargeRatio: number;
  damage: number;
  radius: number;
  angle: number;
  angleWidth: number;
};

type PauseMenuMode = 'main' | 'settings' | 'stats';
type VolumeSettingKey = 'masterVolume' | 'sfxVolume' | 'musicVolume';
type MovementKeys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
};
type PlayerTrailSegment = {
  x: number;
  y: number;
  age: number;
  life: number;
};

type FixedButtonHitArea = {
  rect: Phaser.Geom.Rectangle;
  onSelect: () => void;
};

type LevelUpHitArea = {
  rect: Phaser.Geom.Rectangle;
  upgradeId: UpgradeId;
};

export class GameScene extends Phaser.Scene {
  private grid!: Phaser.GameObjects.Graphics;
  private core!: Phaser.GameObjects.Graphics;
  private playerTrail!: Phaser.GameObjects.Graphics;
  private chargeRing!: Phaser.GameObjects.Graphics;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private movementKeys!: MovementKeys;
  private titleText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private expText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private upgradeStatusText!: Phaser.GameObjects.Text;
  private debugText!: Phaser.GameObjects.Text;
  private localization!: LocalizationSystem;
  private settingsSystem!: SettingsSystem;
  private runStatsSystem!: RunStatsSystem;
  private totalStatsSystem!: TotalStatsSystem;
  private audioSystem!: AudioSystem;
  private effectSystem!: EffectSystem;
  private enemySpawnTimer!: Phaser.Time.TimerEvent;
  private levelUpOverlay: Phaser.GameObjects.Container | null = null;
  private pauseOverlay: Phaser.GameObjects.Container | null = null;
  private pauseMode: PauseMenuMode = 'main';
  private fixedButtonHitAreas: FixedButtonHitArea[] = [];
  private levelUpHitAreas: LevelUpHitArea[] = [];
  private readonly center = new Phaser.Math.Vector2();
  private enemies: Enemy[] = [];
  private expOrbs: ExpOrb[] = [];
  private isCharging = false;
  private chargeStartedAt = 0;
  private suppressPointerPulseUntilReleased = false;
  private pulseSuppressedUntil = 0;
  private combo = 0;
  private comboExpiresAt = 0;
  private experience = 0;
  private level = 1;
  private expToNextLevel: number = gameplayConfig.progression.baseExpToNextLevel;
  private pulseRadiusMultiplier = 1;
  private pulseDamageBonus = 0;
  private pulseAngleBonusDegrees = 0;
  private orbMagnetMultiplier = 1;
  private shockwaveRadiusBonus = 0;
  private shockwaveComboBonusPerComboBonus = 0;
  private comboGraceBonusMs = 0;
  private playerSpeedMultiplier = 1;
  private enemySpawnRateMultiplier = 1;
  private playerMaxHp: number = gameplayConfig.player.maxHp;
  private upgradeLevels: Partial<Record<UpgradeId, number>> = {};
  private currentUpgradeChoices: UpgradeDefinition[] = [];
  private debugVisible = false;
  private lastShockwaveChainCount = 0;
  private recentMaxShockwaveChainCount = 0;
  private isPaused = false;
  private isGameOver = false;
  private pausedAt = 0;
  private playerHp: number = gameplayConfig.player.maxHp;
  private invincibleUntil = 0;
  private damageFlashUntil = 0;
  private gameSpeed = 1;
  private slowMotionTimeoutId: number | undefined;
  private slowMotionEndsAt = 0;
  private slowMotionRemainingMs = 0;
  private hasSavedRunStats = false;
  private playerTrailSegments: PlayerTrailSegment[] = [];
  private gameOverOverlay: Phaser.GameObjects.Container | null = null;
  private readonly handleWindowKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' || event.code === 'Escape') {
      this.togglePauseMenu(event);
    }
  };

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(colors.background);
    this.center.set(gameplayConfig.world.width * 0.5, gameplayConfig.world.height * 0.5);

    this.grid = this.add.graphics().setDepth(0);
    this.settingsSystem = new SettingsSystem();
    this.localization = new LocalizationSystem(this.settingsSystem.snapshot.language);
    this.runStatsSystem = new RunStatsSystem();
    this.totalStatsSystem = new TotalStatsSystem();
    if (this.slowMotionTimeoutId !== undefined) {
      window.clearTimeout(this.slowMotionTimeoutId);
      this.slowMotionTimeoutId = undefined;
    }

    this.hasSavedRunStats = false;
    this.levelUpOverlay = null;
    this.isPaused = false;
    this.isGameOver = false;
    this.pauseOverlay = null;
    this.gameOverOverlay = null;
    this.fixedButtonHitAreas = [];
    this.levelUpHitAreas = [];
    this.enemies = [];
    this.expOrbs = [];
    this.isCharging = false;
    this.chargeStartedAt = 0;
    this.suppressPointerPulseUntilReleased = false;
    this.pulseSuppressedUntil = 0;
    this.combo = 0;
    this.comboExpiresAt = 0;
    this.experience = 0;
    this.level = 1;
    this.expToNextLevel = gameplayConfig.progression.baseExpToNextLevel;
    this.pulseRadiusMultiplier = 1;
    this.pulseAngleBonusDegrees = 0;
    this.orbMagnetMultiplier = 1;
    this.shockwaveRadiusBonus = 0;
    this.comboGraceBonusMs = 0;
    this.playerMaxHp = gameplayConfig.player.maxHp;
    this.playerHp = this.playerMaxHp;
    this.invincibleUntil = 0;
    this.damageFlashUntil = 0;
    this.gameSpeed = 1;
    this.slowMotionEndsAt = 0;
    this.slowMotionRemainingMs = 0;
    this.playerTrailSegments = [];
    this.pulseDamageBonus = 0;
    this.shockwaveComboBonusPerComboBonus = 0;
    this.playerSpeedMultiplier = 1;
    this.enemySpawnRateMultiplier = 1;
    this.upgradeLevels = {};
    this.currentUpgradeChoices = [];
    this.lastShockwaveChainCount = 0;
    this.recentMaxShockwaveChainCount = 0;
    this.audioSystem = new AudioSystem();
    this.audioSystem.setSettings(this.settingsSystem.snapshot);
    this.effectSystem = new EffectSystem(this);
    this.playerTrail = this.add.graphics().setDepth(4.5);
    this.core = this.add.graphics();
    this.chargeRing = this.add.graphics().setDepth(4);
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.movementKeys = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      w: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.drawGrid();
    this.drawCore();
    this.setupCamera();
    this.addHud();
    this.input.keyboard!.on('keydown-F3', this.toggleDebugDisplay, this);
    this.input.keyboard!.on('keydown-F6', this.debugLevelUp, this);
    this.input.keyboard!.on('keydown-F7', this.debugHealPlayer, this);
    this.input.keyboard!.on('keydown-F8', this.debugSpawnBoss, this);
    this.input.keyboard!.on('keydown-F9', this.debugClearEnemies, this);
    this.input.keyboard!.on('keydown-M', this.toggleMute, this);
    this.input.keyboard!.on('keydown-SPACE', this.resumeAudio, this);
    this.input.on('pointerdown', this.resumeAudio, this);
    this.input.on('pointerdown', this.handleFixedUiPointerDown, this);
    window.addEventListener('keydown', this.handleWindowKeyDown);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.removeWindowListeners, this);

    this.createEnemySpawnTimer();
  }

  private createEnemySpawnTimer(): void {
    this.enemySpawnTimer = this.time.addEvent({
      delay: this.getEnemySpawnIntervalMs(),
      loop: true,
      callback: () => this.spawnEnemy(),
    });
  }

  private refreshEnemySpawnTimer(): void {
    const shouldPause = this.isPaused || this.isGameOver || this.levelUpOverlay !== null;

    this.enemySpawnTimer.remove(false);
    this.createEnemySpawnTimer();
    this.enemySpawnTimer.paused = shouldPause;
  }

  private getEnemySpawnIntervalMs(): number {
    return Math.max(120, gameplayConfig.enemy.spawnIntervalMs / this.enemySpawnRateMultiplier);
  }

  update(time: number, delta: number): void {
    this.updateDebugDisplay(time);
    this.updateUpgradeStatusHud();

    if (this.isPaused || this.isGameOver) {
      return;
    }

    this.effectSystem.update(delta);

    if (this.levelUpOverlay || this.isGameOver) {
      return;
    }

    this.runStatsSystem.updatePlayTime(delta);

    const scaledDelta = delta * this.gameSpeed;

    this.updatePlayerMovement(scaledDelta);
    this.updatePlayerTrail(scaledDelta);
    this.updatePlayerVisuals(time);
    this.handleChargeInput(time);
    this.updateChargeRing(time);
    this.updateEnemies(scaledDelta);
    this.updateExpOrbs(scaledDelta);
    this.updateCombo(time);
  }

  private drawGrid(): void {
    const width = gameplayConfig.world.width;
    const height = gameplayConfig.world.height;
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

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, gameplayConfig.world.width, gameplayConfig.world.height);
    this.cameras.main.startFollow(this.core, true, 0.12, 0.12);
  }

  private drawCore(): void {
    const { radius, outerRadius } = gameplayConfig.core;
    const isDamaged = this.time.now < this.damageFlashUntil;
    const isInvincible = this.time.now < this.invincibleUntil;
    const shouldBlink = isInvincible && Math.floor(this.time.now / 90) % 2 === 0;
    const fillColor = isDamaged ? colors.enemyFill : colors.coreFill;
    const strokeColor = isDamaged ? colors.enemyStroke : colors.coreStroke;

    this.core.clear();
    this.core.setPosition(this.center.x, this.center.y);
    this.core.setDepth(7);
    this.core.setAlpha(shouldBlink ? 0.48 : 1);
    this.core.fillStyle(fillColor, 0.86);
    this.core.fillCircle(0, 0, radius);
    this.core.lineStyle(2, strokeColor, 0.95);
    this.core.strokeCircle(0, 0, radius);
    this.core.lineStyle(1, strokeColor, 0.35);
    this.core.strokeCircle(0, 0, outerRadius);
    this.core.lineBetween(-outerRadius - 10, 0, -outerRadius - 2, 0);
    this.core.lineBetween(outerRadius + 2, 0, outerRadius + 10, 0);
    this.core.lineBetween(0, -outerRadius - 10, 0, -outerRadius - 2);
    this.core.lineBetween(0, outerRadius + 2, 0, outerRadius + 10);
  }

  private addHud(): void {
    this.titleText = this.add
      .text(this.scale.width * 0.5, 84, this.t('title'), {
        color: colors.text,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '36px',
        letterSpacing: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

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
    }).setScrollFactor(0);

    this.hpText = this.add.text(24, 46, '', {
      color: colors.text,
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '18px',
    }).setScrollFactor(0);

    this.comboText = this.add
      .text(this.scale.width - 24, 22, '', {
        color: colors.text,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '22px',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.upgradeStatusText = this.add.text(24, this.scale.height - 168, '', {
      color: colors.mutedText,
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '13px',
      lineSpacing: 3,
    }).setScrollFactor(0);
    this.upgradeStatusText.setDepth(12);

    this.debugText = this.add
      .text(24, 78, '', {
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
      .setScrollFactor(0)
      .setVisible(false);

    this.updateExpText();
    this.updateHpText();
    this.updateComboText();
    this.updateUpgradeStatusHud();
  }

  private handleChargeInput(time: number): void {
    const pointerWantsCharge = this.input.activePointer.leftButtonDown();

    if (this.suppressPointerPulseUntilReleased && !pointerWantsCharge) {
      this.suppressPointerPulseUntilReleased = false;
    }

    const pointerSuppressed = this.suppressPointerPulseUntilReleased || time < this.pulseSuppressedUntil;
    const wantsCharge = this.spaceKey.isDown || (pointerWantsCharge && !pointerSuppressed);

    if (pointerSuppressed) {
      this.isCharging = false;
      this.chargeRing.clear();
    }

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

  private updatePlayerMovement(delta: number): void {
    const direction = new Phaser.Math.Vector2(
      (this.movementKeys.right.isDown || this.movementKeys.d.isDown ? 1 : 0) -
        (this.movementKeys.left.isDown || this.movementKeys.a.isDown ? 1 : 0),
      (this.movementKeys.down.isDown || this.movementKeys.s.isDown ? 1 : 0) -
        (this.movementKeys.up.isDown || this.movementKeys.w.isDown ? 1 : 0),
    );

    if (direction.lengthSq() <= 0) {
      return;
    }

    direction.normalize();

    const step = gameplayConfig.player.speed * this.playerSpeedMultiplier * (delta / 1000);
    const margin = gameplayConfig.core.outerRadius;

    this.center.x = Phaser.Math.Clamp(this.center.x + direction.x * step, margin, gameplayConfig.world.width - margin);
    this.center.y = Phaser.Math.Clamp(this.center.y + direction.y * step, margin, gameplayConfig.world.height - margin);
    this.playerTrailSegments.push({
      x: this.center.x,
      y: this.center.y,
      age: 0,
      life: gameplayConfig.player.trailLifeMs,
    });

    if (this.playerTrailSegments.length > 36) {
      this.playerTrailSegments.splice(0, this.playerTrailSegments.length - 36);
    }

    this.core.rotation += 0.0024 * delta;
  }

  private updatePlayerTrail(delta: number): void {
    this.playerTrail.clear();
    this.playerTrailSegments = this.playerTrailSegments.filter((segment) => {
      segment.age += delta;

      const ratio = Phaser.Math.Clamp(segment.age / segment.life, 0, 1);

      if (ratio >= 1) {
        return false;
      }

      const alpha = (1 - ratio) * gameplayConfig.player.trailAlpha;
      const radius = Phaser.Math.Linear(gameplayConfig.core.radius * 0.4, gameplayConfig.core.outerRadius + 8, ratio);

      this.playerTrail.lineStyle(1, colors.coreStroke, alpha);
      this.playerTrail.strokeCircle(segment.x, segment.y, radius);

      return true;
    });
  }

  private updatePlayerVisuals(time: number): void {
    this.drawCore();

    if (time >= this.invincibleUntil) {
      this.core.setAlpha(1);
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
    const comboAtFire = this.getActiveCombo();

    this.runStatsSystem.recordPulseFired();
    this.audioSystem.playPulse(pulse.chargeRatio);
    this.effectSystem.emitPulseCone(this.center.x, this.center.y, pulse.radius, pulse.chargeRatio, pulse.angle, pulse.angleWidth);
    this.applyPulseComboResult(this.damageEnemiesInPulse(pulse, comboAtFire));
  }

  private spawnEnemy(): void {
    if (this.enemies.length >= gameplayConfig.enemy.maxEnemies) {
      return;
    }

    const spawnPoint = this.getRandomSpawnPoint();
    const enemyType = this.getRandomEnemyType();
    const speed = Phaser.Math.FloatBetween(gameplayConfig.enemy.speedMin, gameplayConfig.enemy.speedMax);

    this.enemies.push(new Enemy(this, spawnPoint.x, spawnPoint.y, speed, enemyType));
  }

  private getRandomSpawnPoint(): Phaser.Math.Vector2 {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.Between(gameplayConfig.enemy.spawnDistanceMin, gameplayConfig.enemy.spawnDistanceMax);
    const padding = gameplayConfig.enemy.spawnPadding;
    const x = Phaser.Math.Clamp(this.center.x + Math.cos(angle) * distance, padding, gameplayConfig.world.width - padding);
    const y = Phaser.Math.Clamp(this.center.y + Math.sin(angle) * distance, padding, gameplayConfig.world.height - padding);

    return new Phaser.Math.Vector2(x, y);
  }

  private updateEnemies(delta: number): void {
    const survivors: Enemy[] = [];
    const spawnedByParents: Enemy[] = [];
    const enemySpeedMultiplier = this.getEnemySpeedMultiplier();

    for (const enemy of this.enemies) {
      enemy.moveToward(this.center, delta, enemySpeedMultiplier);

      if (this.handleEnemyContact(enemy)) {
        enemy.destroy();
        continue;
      }

      this.updateChildSpawns(enemy, spawnedByParents);
      survivors.push(enemy);
    }

    this.enemies = [...survivors, ...spawnedByParents];
  }

  private updateChildSpawns(enemy: Enemy, spawnedEnemies: Enemy[]): void {
    const parentType = this.getEnemyTypeById(enemy.typeId);
    const maxChildren = this.getMaxSpawnedChildren(parentType);

    if (
      !this.canEnemySpawnChildren(parentType) ||
      enemy.childSpawnedCount >= maxChildren ||
      this.time.now < enemy.nextChildSpawnAt
    ) {
      return;
    }

    const nextSpawnAt = this.time.now + this.getChildSpawnInterval(parentType);
    const childCandidates = this.getChildSpawnCandidates(parentType);

    if (childCandidates.length <= 0 || this.enemies.length + spawnedEnemies.length >= gameplayConfig.enemy.maxEnemies) {
      enemy.nextChildSpawnAt = nextSpawnAt;
      return;
    }

    const spawnCount = Math.min(
      this.getChildSpawnCount(parentType),
      gameplayConfig.enemy.maxEnemies - this.enemies.length - spawnedEnemies.length,
      maxChildren - enemy.childSpawnedCount,
    );

    for (let index = 0; index < spawnCount; index += 1) {
      const childType = this.getWeightedEnemyType(childCandidates);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance =
        enemy.radius +
        Phaser.Math.Between(gameplayConfig.enemy.childSpawnDistanceMin, gameplayConfig.enemy.childSpawnDistanceMax);
      const x = Phaser.Math.Clamp(enemy.x + Math.cos(angle) * distance, childType.radius, gameplayConfig.world.width - childType.radius);
      const y = Phaser.Math.Clamp(enemy.y + Math.sin(angle) * distance, childType.radius, gameplayConfig.world.height - childType.radius);
      const speed = Phaser.Math.FloatBetween(gameplayConfig.enemy.speedMin, gameplayConfig.enemy.speedMax);

      spawnedEnemies.push(new Enemy(this, x, y, speed, childType));
      enemy.childSpawnedCount += 1;
    }

    enemy.nextChildSpawnAt = nextSpawnAt;

    if (spawnCount > 0) {
      this.effectSystem.emitShockwaveRing(enemy.x, enemy.y, enemy.radius + 38, 0);
    }
  }

  private getRandomEnemyType(): (typeof gameplayConfig.enemy.types)[number] {
    return this.getWeightedEnemyType(gameplayConfig.enemy.types);
  }

  private getWeightedEnemyType(enemyTypes: readonly (typeof gameplayConfig.enemy.types)[number][]): (typeof gameplayConfig.enemy.types)[number] {
    const totalWeight = enemyTypes.reduce((sum, enemyType) => sum + enemyType.spawnWeight, 0);
    let roll = Phaser.Math.Between(1, totalWeight);

    for (const enemyType of enemyTypes) {
      roll -= enemyType.spawnWeight;

      if (roll <= 0) {
        return enemyType;
      }
    }

    return enemyTypes[0] ?? gameplayConfig.enemy.types[0];
  }

  private getEnemyTypeById(typeId: string): (typeof gameplayConfig.enemy.types)[number] {
    return gameplayConfig.enemy.types.find((enemyType) => enemyType.id === typeId) ?? gameplayConfig.enemy.types[0];
  }

  private spawnEnemyNearPlayer(typeId: string): void {
    if (this.enemies.length >= gameplayConfig.enemy.maxEnemies) {
      return;
    }

    const enemyType = this.getEnemyTypeById(typeId);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.Between(180, 260);
    const x = Phaser.Math.Clamp(this.center.x + Math.cos(angle) * distance, enemyType.radius, gameplayConfig.world.width - enemyType.radius);
    const y = Phaser.Math.Clamp(this.center.y + Math.sin(angle) * distance, enemyType.radius, gameplayConfig.world.height - enemyType.radius);
    const speed = Phaser.Math.FloatBetween(gameplayConfig.enemy.speedMin, gameplayConfig.enemy.speedMax);

    this.enemies.push(new Enemy(this, x, y, speed, enemyType));
  }

  private canEnemySpawnChildren(parentType: EnemyTypeConfig): boolean {
    if ('canSpawnChildren' in parentType && parentType.canSpawnChildren === false) {
      return false;
    }

    return parentType.hp >= gameplayConfig.enemy.childSpawnerMinHp && this.getChildSpawnCandidates(parentType).length > 0;
  }

  private getChildSpawnCandidates(parentType: EnemyTypeConfig): EnemyTypeConfig[] {
    return gameplayConfig.enemy.types.filter((enemyType) => enemyType.hp < parentType.hp);
  }

  private getChildSpawnInterval(parentType: EnemyTypeConfig): number {
    return 'childSpawnIntervalMs' in parentType
      ? parentType.childSpawnIntervalMs
      : gameplayConfig.enemy.defaultChildSpawnIntervalMs;
  }

  private getChildSpawnCount(parentType: EnemyTypeConfig): number {
    return 'childSpawnCount' in parentType ? parentType.childSpawnCount : gameplayConfig.enemy.defaultChildSpawnCount;
  }

  private getMaxSpawnedChildren(parentType: EnemyTypeConfig): number {
    return 'maxSpawnedChildren' in parentType
      ? parentType.maxSpawnedChildren
      : gameplayConfig.enemy.defaultMaxSpawnedChildrenPerEnemy;
  }

  private handleEnemyContact(enemy: Enemy): boolean {
    const contactRadius = gameplayConfig.player.collisionRadius + enemy.radius;

    if (!enemy.isWithinRadius(this.center, contactRadius)) {
      return false;
    }

    if (this.time.now < this.invincibleUntil) {
      return false;
    }

    this.takePlayerDamage(enemy.damageToPlayer);
    return true;
  }

  private takePlayerDamage(damage: number): void {
    this.playerHp = Math.max(0, this.playerHp - damage);
    this.invincibleUntil = this.time.now + gameplayConfig.player.invincibilityMs;
    this.damageFlashUntil = this.time.now + gameplayConfig.player.damageFlashMs;
    this.runStatsSystem.recordDamageTaken(damage);
    this.updateHpText();
    this.drawCore();
    this.cameras.main.shake(120, 0.006);

    if (this.playerHp <= 0) {
      this.openGameOverOverlay();
    }
  }

  private getEnemySpeedMultiplier(): number {
    const elapsedSeconds = this.runStatsSystem.snapshot.playTimeMs / 1000;

    return Math.min(
      gameplayConfig.enemy.speedMaxMultiplier,
      1 + elapsedSeconds * gameplayConfig.enemy.speedGrowthPerSecond,
    );
  }

  private damageEnemiesInPulse(pulse: PulseStats, comboAtFire: number): number {
    const survivors: Enemy[] = [];
    const shockwaveQueue: Phaser.Math.Vector2[] = [];
    let defeatedCount = 0;

    for (const enemy of this.enemies) {
      if (!this.isEnemyInsidePulseCone(enemy, pulse)) {
        survivors.push(enemy);
        continue;
      }

      if (!this.damageEnemy(enemy, pulse.damage, pulse.chargeRatio, shockwaveQueue)) {
        survivors.push(enemy);
      } else {
        defeatedCount += 1;
      }
    }

    this.enemies = survivors;
    defeatedCount += this.processShockwaveQueue(shockwaveQueue, comboAtFire);

    return defeatedCount;
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
      this.runStatsSystem.recordEnemyDefeated();
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

  private processShockwaveQueue(shockwaveQueue: Phaser.Math.Vector2[], comboAtFire: number): number {
    let processedCount = 0;
    let defeatedCount = 0;

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
        } else {
          defeatedCount += 1;
        }
      }

      this.enemies = survivors;
    }

    this.lastShockwaveChainCount = processedCount;
    this.recentMaxShockwaveChainCount = Math.max(this.recentMaxShockwaveChainCount, processedCount);

    return defeatedCount;
  }

  private updateExpOrbs(delta: number): void {
    const uncollected: ExpOrb[] = [];
    const magnetRadius = this.getOrbMagnetRadius();

    for (const orb of this.expOrbs) {
      if (orb.updateMagnetized(this.center, magnetRadius)) {
        orb.moveToward(this.center, delta, this.orbMagnetMultiplier);
        this.effectSystem.emitOrbTrail(orb.x, orb.y, this.orbMagnetMultiplier);
      }

      if (orb.isCollectedBy(this.center, this.orbMagnetMultiplier)) {
        this.audioSystem.playOrb();
        this.effectSystem.emitOrbTrail(orb.x, orb.y, this.orbMagnetMultiplier * 1.6);
        this.effectSystem.emitCoreAbsorb(this.center.x, this.center.y, this.orbMagnetMultiplier);
        this.runStatsSystem.recordExpCollected(orb.value);
        this.gainExperience(orb.value);
        orb.destroy();
      } else {
        uncollected.push(orb);
      }
    }

    this.expOrbs = uncollected;
  }

  private getOrbMagnetRadius(): number {
    return gameplayConfig.expOrb.baseMagnetRadius * this.orbMagnetMultiplier;
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
    this.runStatsSystem.recordLevelReached(this.level);
    this.updateExpText();
    this.audioSystem.playLevelUp();
    this.openLevelUpOverlay();
  }

  private getActiveCombo(): number {
    if (this.combo > 0 && this.time.now >= this.comboExpiresAt) {
      this.combo = 0;
      this.comboExpiresAt = 0;
      this.updateComboText();
      this.updateUpgradeStatusHud();
    }

    return this.combo;
  }

  private applyPulseComboResult(defeatedCount: number): void {
    if (defeatedCount > 0) {
      this.addCombo(defeatedCount * gameplayConfig.combo.comboPerEnemyDefeated);
      return;
    }

    this.applyComboMissPenalty();
  }

  private addCombo(comboGain: number): number {
    this.getActiveCombo();

    const previousCombo = this.combo;

    this.combo += comboGain;
    this.comboExpiresAt = this.time.now + gameplayConfig.combo.graceMs + this.comboGraceBonusMs;
    this.runStatsSystem.recordCombo(this.combo);
    this.updateComboText();
    this.animateComboText();
    this.playComboMilestoneSound(previousCombo, this.combo);
    this.shakeForCombo(previousCombo, comboGain);

    if (this.crossedComboMilestone(previousCombo, this.combo, gameplayConfig.combo.slowMotionEvery)) {
      this.triggerSlowMotion();
    }

    return this.combo;
  }

  private applyComboMissPenalty(): void {
    this.getActiveCombo();

    if (this.combo <= 0) {
      this.updateComboText();
      return;
    }

    this.combo = Math.max(0, this.combo - gameplayConfig.combo.comboMissPenalty);
    if (this.combo <= 0) {
      this.comboExpiresAt = 0;
    }
    this.updateComboText();
    this.updateUpgradeStatusHud();
    this.animateComboPenalty();
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
    this.slowMotionEndsAt = this.time.now + gameplayConfig.combo.slowMotionDurationMs;
    this.slowMotionRemainingMs = 0;

    if (this.slowMotionTimeoutId !== undefined) {
      window.clearTimeout(this.slowMotionTimeoutId);
    }

    this.slowMotionTimeoutId = window.setTimeout(() => {
      this.gameSpeed = 1;
      this.slowMotionTimeoutId = undefined;
      this.slowMotionEndsAt = 0;
    }, gameplayConfig.combo.slowMotionDurationMs);
  }

  private updateCombo(time: number): void {
    if (this.combo > 0 && time >= this.comboExpiresAt) {
      this.combo = 0;
      this.comboExpiresAt = 0;
      this.updateComboText();
      this.updateUpgradeStatusHud();
    }
  }

  private updateComboText(): void {
    this.comboText.setText(`${this.t('combo')} x${this.combo}`);
  }

  private animateComboText(): void {
    this.tweens.killTweensOf(this.comboText);
    this.comboText.setAlpha(1);
    this.comboText.setColor(colors.text);
    this.comboText.setScale(gameplayConfig.hud.comboPopScale);
    this.tweens.add({
      targets: this.comboText,
      scale: 1,
      duration: gameplayConfig.hud.comboPopDurationMs,
      ease: 'Back.easeOut',
    });
  }

  private animateComboPenalty(): void {
    this.tweens.killTweensOf(this.comboText);
    this.comboText.setScale(0.96);
    this.comboText.setAlpha(0.58);
    this.comboText.setColor(colors.mutedText);
    this.tweens.add({
      targets: this.comboText,
      alpha: 1,
      scale: 1,
      duration: 140,
      ease: 'Sine.easeOut',
      onComplete: () => this.comboText.setColor(colors.text),
    });
  }

  private updateExpText(): void {
    this.expText.setText(`${this.t('lv')} ${this.level}  ${this.t('exp')} ${this.experience}/${this.expToNextLevel}`);
  }

  private updateHpText(): void {
    this.hpText.setText(`${this.t('hp')}: ${this.playerHp}/${this.playerMaxHp}`);
  }

  private openLevelUpOverlay(): void {
    if (this.levelUpOverlay || this.isGameOver) {
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
    const upgradeChoices = this.getLevelUpChoices();
    const upgradeStatusText = this.getUpgradeStatusText();
    const statusBoxX = width * 0.5 + 54;
    const statusBoxY = 190;
    const statusBoxWidth = 330;
    const statusBoxHeight = Math.max(218, upgradeStatusText.split('\n').length * 19 + 34);
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
    statsBox.fillRect(statusBoxX, statusBoxY, statusBoxWidth, statusBoxHeight);
    statsBox.lineStyle(1, colors.coreStroke, 0.34);
    statsBox.strokeRect(statusBoxX, statusBoxY, statusBoxWidth, statusBoxHeight);

    this.currentUpgradeChoices = upgradeChoices;
    this.levelUpHitAreas = [];
    container.setScrollFactor(0);
    container.add([backdrop, panel, statsBox]);
    container.add(
      this.add
        .text(width * 0.5, panelY + 34, this.t('levelUp'), {
          color: colors.text,
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '30px',
          letterSpacing: 4,
        })
        .setOrigin(0.5),
    );

    container.add(
      this.add
        .text(width * 0.5, panelY + 70, this.t('chooseUpgrade'), {
          color: colors.mutedText,
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '16px',
        })
        .setOrigin(0.5),
    );

    container.add(
      this.add.text(statusBoxX + 22, statusBoxY + 17, upgradeStatusText, {
        color: colors.text,
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '13px',
        lineSpacing: 5,
      }),
    );

    upgradeChoices.forEach((choice, index) => {
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
      this.levelUpHitAreas.push({
        rect: new Phaser.Geom.Rectangle(optionX - optionWidth * 0.5, optionY - optionHeight * 0.5, optionWidth, optionHeight),
        upgradeId: choice.id,
      });

      container.add([optionBox, optionZone]);
      container.add(
        this.add.text(optionX - optionWidth * 0.5 + 18, optionY - 15, `${index + 1}. ${this.t(choice.nameKey)}`, {
          color: colors.text,
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '15px',
        }),
      );
      container.add(
        this.add.text(optionX - optionWidth * 0.5 + 18, optionY + 4, this.t(choice.descriptionKey), {
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
    const choiceIndex = Number(event.key) - 1;
    const choice = this.currentUpgradeChoices[choiceIndex];

    if (choice) {
      this.applyUpgrade(choice.id);
    }
  }

  private getLevelUpChoices(): UpgradeDefinition[] {
    const availableChoices = upgradeConfig.definitions.filter((definition) => this.isUpgradeAvailable(definition));
    const selectedChoices: UpgradeDefinition[] = [];
    const pool = [...availableChoices];

    while (selectedChoices.length < upgradeConfig.choicesPerLevel && pool.length > 0) {
      const totalWeight = pool.reduce((sum, definition) => sum + definition.weight, 0);
      let roll = Phaser.Math.Between(1, totalWeight);
      let selectedIndex = 0;

      for (let index = 0; index < pool.length; index += 1) {
        roll -= pool[index].weight;

        if (roll <= 0) {
          selectedIndex = index;
          break;
        }
      }

      const [selectedChoice] = pool.splice(selectedIndex, 1);

      selectedChoices.push(selectedChoice);
    }

    return selectedChoices;
  }

  private isUpgradeAvailable(definition: UpgradeDefinition): boolean {
    if (definition.id === 'healHp' && this.playerHp >= this.playerMaxHp) {
      return false;
    }

    if (definition.maxLevel === undefined) {
      return true;
    }

    return (this.upgradeLevels[definition.id] ?? 0) < definition.maxLevel;
  }

  private applyUpgrade(upgradeId: UpgradeId): void {
    if (!this.levelUpOverlay) {
      return;
    }

    this.audioSystem.playSelect();

    this.upgradeLevels[upgradeId] = (this.upgradeLevels[upgradeId] ?? 0) + 1;

    if (upgradeId === 'pulseRadius') {
      this.pulseRadiusMultiplier *= gameplayConfig.upgrades.pulseRadiusMultiplier;
    }

    if (upgradeId === 'pulseAngle') {
      this.pulseAngleBonusDegrees += gameplayConfig.combatTuning.pulseAngleUpgradeAmountDegrees;
    }

    if (upgradeId === 'pulseDamage') {
      this.pulseDamageBonus += gameplayConfig.upgrades.pulseDamageBonus;
    }

    if (upgradeId === 'orbMagnet') {
      this.orbMagnetMultiplier *= gameplayConfig.upgrades.orbMagnetMultiplier;
    }

    if (upgradeId === 'shockwaveRadius') {
      this.shockwaveRadiusBonus += gameplayConfig.combatTuning.shockwaveRadiusUpgradeAmount;
    }

    if (upgradeId === 'shockwaveCombo') {
      this.shockwaveComboBonusPerComboBonus += gameplayConfig.upgrades.shockwaveComboBonusPerComboBonus;
    }

    if (upgradeId === 'comboGrace') {
      this.comboGraceBonusMs += gameplayConfig.upgrades.comboGraceBonusMs;
    }

    if (upgradeId === 'playerSpeed') {
      this.playerSpeedMultiplier *= gameplayConfig.upgrades.playerSpeedMultiplier;
    }

    if (upgradeId === 'maxHp') {
      this.playerMaxHp += gameplayConfig.upgrades.maxHpBonus;
      this.healPlayer(gameplayConfig.upgrades.maxHpBonus);
    }

    if (upgradeId === 'healHp') {
      this.healPlayer(gameplayConfig.upgrades.healAmount);
    }

    if (upgradeId === 'enemyDensityUp') {
      this.enemySpawnRateMultiplier = Math.min(
        gameplayConfig.upgrades.enemySpawnRateMax,
        this.enemySpawnRateMultiplier + gameplayConfig.upgrades.enemySpawnRateBonus,
      );
      this.refreshEnemySpawnTimer();
    }

    this.runStatsSystem.recordUpgradeTaken();
    this.updateHpText();
    this.updateUpgradeStatusHud();
    this.closeLevelUpOverlay();
  }

  private healPlayer(amount: number): void {
    const previousHp = this.playerHp;

    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + amount);
    this.runStatsSystem.recordHealTaken(this.playerHp - previousHp);
    this.effectSystem.emitCoreAbsorb(this.center.x, this.center.y, 1.2);
  }

  private closeLevelUpOverlay(): void {
    this.input.keyboard!.off('keydown', this.handleUpgradeKey, this);
    this.levelUpOverlay?.destroy(true);
    this.levelUpOverlay = null;
    this.currentUpgradeChoices = [];
    this.levelUpHitAreas = [];
    this.enemySpawnTimer.paused = false;

    if (this.experience >= this.expToNextLevel) {
      this.levelUp();
    }
  }

  private getUpgradeStatusText(): string {
    return [
      `${this.t('pulseRadius')}: ${Math.round(this.getMaxPulseRadius())}`,
      `${this.t('pulseAngle')}: ${this.getCurrentPulseAngleDegrees()}\u00b0`,
      `${this.t('pulseDamage')}: ${gameplayConfig.pulse.minDamage + this.pulseDamageBonus}-${gameplayConfig.pulse.maxDamage + this.pulseDamageBonus}`,
      `${this.t('orbMagnet')}: ${Math.round(this.getOrbMagnetRadius())} / x${this.orbMagnetMultiplier.toFixed(2)}`,
      `${this.t('shockwaveRadius')}: ${Math.round(this.getShockwaveRadius(this.combo))}`,
      `${this.t('shockwaveComboBonus')}: +${Math.round((gameplayConfig.combatTuning.comboShockwaveRadiusBonusPerCombo + this.shockwaveComboBonusPerComboBonus) * 100)}%/combo`,
      `${this.t('playerSpeed')}: x${this.playerSpeedMultiplier.toFixed(2)}`,
      `${this.t('enemyDensity')}: x${this.enemySpawnRateMultiplier.toFixed(2)}`,
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
    ) + this.pulseDamageBonus;

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
    const pointerWorldX = pointer.worldX;
    const pointerWorldY = pointer.worldY;
    const distance = Phaser.Math.Distance.Between(this.center.x, this.center.y, pointerWorldX, pointerWorldY);

    if (distance < 8) {
      return -Math.PI / 2;
    }

    return Phaser.Math.Angle.Between(this.center.x, this.center.y, pointerWorldX, pointerWorldY);
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
      1 + combo * (gameplayConfig.combatTuning.comboShockwaveRadiusBonusPerCombo + this.shockwaveComboBonusPerComboBonus),
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

  private canUseDebugHotkey(event?: KeyboardEvent): boolean {
    if (!this.debugVisible) {
      return false;
    }

    event?.preventDefault();

    return !this.isPaused && !this.isGameOver && !this.levelUpOverlay;
  }

  private debugLevelUp(event?: KeyboardEvent): void {
    if (!this.canUseDebugHotkey(event)) {
      return;
    }

    this.levelUp();
  }

  private debugHealPlayer(event?: KeyboardEvent): void {
    if (!this.canUseDebugHotkey(event)) {
      return;
    }

    this.healPlayer(1);
    this.updateHpText();
    this.updateDebugDisplay(this.time.now);
  }

  private debugSpawnBoss(event?: KeyboardEvent): void {
    if (!this.canUseDebugHotkey(event)) {
      return;
    }

    this.spawnEnemyNearPlayer('boss');
    this.updateDebugDisplay(this.time.now);
  }

  private debugClearEnemies(event?: KeyboardEvent): void {
    if (!this.canUseDebugHotkey(event)) {
      return;
    }

    for (const enemy of this.enemies) {
      enemy.destroy();
    }

    this.enemies = [];
    this.lastShockwaveChainCount = 0;
    this.updateDebugDisplay(this.time.now);
  }

  private toggleMute(event?: KeyboardEvent): void {
    event?.preventDefault();
    this.settingsSystem.toggleMuted();
    this.applyUserSettings();
    this.renderPauseOverlay();
  }

  private resumeAudio(): void {
    this.audioSystem.resume();
  }

  private suppressPulseAfterUiSelection(): void {
    this.isCharging = false;
    this.chargeRing.clear();
    this.suppressPointerPulseUntilReleased = this.input.activePointer.leftButtonDown();
    this.pulseSuppressedUntil = this.time.now + 180;
  }

  private handleFixedUiPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.levelUpOverlay) {
      const levelUpHit = this.levelUpHitAreas.find((hitArea) =>
        Phaser.Geom.Rectangle.Contains(hitArea.rect, pointer.x, pointer.y),
      );

      if (levelUpHit) {
        this.suppressPulseAfterUiSelection();
        this.resumeAudio();
        this.applyUpgrade(levelUpHit.upgradeId);
      }

      return;
    }

    if (!this.pauseOverlay && !this.gameOverOverlay) {
      return;
    }

    const buttonHit = [...this.fixedButtonHitAreas]
      .reverse()
      .find((hitArea) => Phaser.Geom.Rectangle.Contains(hitArea.rect, pointer.x, pointer.y));

    if (!buttonHit) {
      return;
    }

    this.suppressPulseAfterUiSelection();
    this.resumeAudio();
    this.audioSystem.playSelect();
    buttonHit.onSelect();
  }

  private removeWindowListeners(): void {
    window.removeEventListener('keydown', this.handleWindowKeyDown);
    this.input.off('pointerdown', this.resumeAudio, this);
    this.input.off('pointerdown', this.handleFixedUiPointerDown, this);
  }

  private togglePauseMenu(event?: KeyboardEvent): void {
    event?.preventDefault();

    if (this.levelUpOverlay || this.isGameOver) {
      return;
    }

    if (this.isPaused) {
      this.closePauseMenu();
      return;
    }

    this.openPauseMenu('main');
  }

  private openPauseMenu(mode: PauseMenuMode): void {
    if (this.levelUpOverlay || this.isGameOver) {
      return;
    }

    if (!this.isPaused) {
      this.isPaused = true;
      this.pausedAt = this.time.now;
      this.isCharging = false;
      this.chargeRing.clear();
      this.enemySpawnTimer.paused = true;
      this.tweens.pauseAll();
      this.pauseSlowMotionTimer();
    }

    this.pauseMode = mode;
    this.renderPauseOverlay();
  }

  private closePauseMenu(): void {
    if (!this.isPaused) {
      return;
    }

    const pausedDuration = this.time.now - this.pausedAt;

    if (this.comboExpiresAt > 0) {
      this.comboExpiresAt += pausedDuration;
    }

    this.isPaused = false;
    this.pauseOverlay?.destroy(true);
    this.pauseOverlay = null;
    this.fixedButtonHitAreas = [];
    this.enemySpawnTimer.paused = false;
    this.resumeSlowMotionTimer();
    this.tweens.resumeAll();
  }

  private renderPauseOverlay(): void {
    if (!this.isPaused) {
      return;
    }

    this.pauseOverlay?.destroy(true);
    this.fixedButtonHitAreas = [];

    const { width, height } = this.scale;
    const panelWidth = 560;
    const panelHeight = this.pauseMode === 'main' ? 390 : this.pauseMode === 'stats' ? 500 : 430;
    const panelX = width * 0.5 - panelWidth * 0.5;
    const panelY = height * 0.5 - panelHeight * 0.5;
    const container = this.add.container(0, 0).setDepth(80);
    const backdrop = this.add.graphics();
    const panel = this.add.graphics();
    const titleKey = this.pauseMode === 'settings' ? 'settings' : this.pauseMode === 'stats' ? 'results' : 'title';

    container.setScrollFactor(0);
    backdrop.fillStyle(colors.overlayFill, 0.78);
    backdrop.fillRect(0, 0, width, height);
    panel.fillStyle(colors.overlayPanel, 0.96);
    panel.fillRect(panelX, panelY, panelWidth, panelHeight);
    panel.lineStyle(1, colors.pulseAccent, 0.76);
    panel.strokeRect(panelX, panelY, panelWidth, panelHeight);
    panel.lineStyle(1, colors.coreStroke, 0.22);
    panel.strokeRect(panelX + 10, panelY + 10, panelWidth - 20, panelHeight - 20);

    container.add([backdrop, panel]);
    container.add(
      this.add
        .text(width * 0.5, panelY + 44, this.t(titleKey), {
          color: colors.text,
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: this.pauseMode === 'main' ? '28px' : '24px',
          letterSpacing: this.pauseMode === 'main' ? 4 : 1,
        })
        .setOrigin(0.5),
    );

    if (this.pauseMode === 'main') {
      this.renderPauseMain(container, width, panelY);
    }

    if (this.pauseMode === 'settings') {
      this.renderSettingsMenu(container, panelX, panelY);
    }

    if (this.pauseMode === 'stats') {
      this.renderStatsMenu(container, panelX, panelY);
    }

    this.pauseOverlay = container;
  }

  private renderPauseMain(container: Phaser.GameObjects.Container, width: number, panelY: number): void {
    const buttonWidth = 280;
    const buttonHeight = 42;
    const startY = panelY + 108;
    const gap = 52;

    this.addMenuButton(container, width * 0.5, startY, buttonWidth, buttonHeight, this.t('resume'), () => this.closePauseMenu());
    this.addMenuButton(container, width * 0.5, startY + gap, buttonWidth, buttonHeight, this.t('settings'), () =>
      this.openPauseMenu('settings'),
    );
    this.addMenuButton(container, width * 0.5, startY + gap * 2, buttonWidth, buttonHeight, this.t('stats'), () =>
      this.openPauseMenu('stats'),
    );
    this.addMenuButton(container, width * 0.5, startY + gap * 3, buttonWidth, buttonHeight, this.t('restart'), () =>
      this.restartRun(),
    );
    this.addMenuButton(container, width * 0.5, startY + gap * 4, buttonWidth, buttonHeight, this.t('quitToTitle'), () =>
      this.quitToTitle(),
    );
  }

  private renderSettingsMenu(container: Phaser.GameObjects.Container, panelX: number, panelY: number): void {
    const settings = this.settingsSystem.snapshot;
    const labelX = panelX + 72;
    const valueX = panelX + 324;
    const rowStartY = panelY + 104;
    const rowGap = 54;

    container.add(
      this.add.text(labelX, rowStartY, this.t('language'), {
        color: colors.text,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '16px',
      }),
    );
    this.addMenuButton(
      container,
      valueX,
      rowStartY + 8,
      104,
      32,
      `${settings.language === 'ja' ? '> ' : ''}${this.t('japanese')}`,
      () => this.setLanguageFromMenu('ja'),
    );
    this.addMenuButton(
      container,
      valueX + 118,
      rowStartY + 8,
      104,
      32,
      `${settings.language === 'en' ? '> ' : ''}${this.t('english')}`,
      () => this.setLanguageFromMenu('en'),
    );

    this.addVolumeRow(container, this.t('masterVolume'), 'masterVolume', rowStartY + rowGap);
    this.addVolumeRow(container, this.t('sfxVolume'), 'sfxVolume', rowStartY + rowGap * 2);
    this.addVolumeRow(container, this.t('musicVolume'), 'musicVolume', rowStartY + rowGap * 3);

    container.add(
      this.add.text(labelX, rowStartY + rowGap * 4, this.t('muted'), {
        color: colors.text,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '16px',
      }),
    );
    this.addMenuButton(
      container,
      valueX,
      rowStartY + rowGap * 4 + 8,
      104,
      32,
      settings.muted ? this.t('on') : this.t('off'),
      () => this.toggleMutedFromMenu(),
    );
    this.addMenuButton(container, panelX + 100, panelY + 382, 132, 36, this.t('back'), () => this.openPauseMenu('main'));
  }

  private renderStatsMenu(container: Phaser.GameObjects.Container, panelX: number, panelY: number): void {
    const stats = this.runStatsSystem.snapshot;
    const rows: Array<[LocalizationKey, string]> = [
      ['playTime', this.formatPlayTime(stats.playTimeMs)],
      ['levelReached', String(stats.levelReached)],
      ['maxCombo', String(stats.maxCombo)],
      ['enemiesDefeated', String(stats.enemiesDefeated)],
      ['pulsesFired', String(stats.pulsesFired)],
      ['expCollected', String(stats.expCollected)],
      ['upgradesTaken', String(stats.upgradesTaken)],
      ['damageTaken', String(stats.damageTaken)],
      ['healsTaken', String(stats.healsTaken)],
      ['score', String(stats.score)],
    ];
    const labelX = panelX + 92;
    const valueX = panelX + 408;
    const rowStartY = panelY + 100;
    const rowGap = 32;

    rows.forEach(([labelKey, value], index) => {
      const y = rowStartY + index * rowGap;

      container.add(
        this.add.text(labelX, y, this.t(labelKey), {
          color: colors.mutedText,
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '16px',
        }),
      );
      container.add(
        this.add
          .text(valueX, y, value, {
            color: colors.text,
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: '16px',
          })
          .setOrigin(1, 0),
      );
    });

    this.addMenuButton(container, panelX + 100, panelY + 446, 132, 36, this.t('back'), () => this.openPauseMenu('main'));
  }

  private openGameOverOverlay(): void {
    if (this.gameOverOverlay) {
      return;
    }

    this.isGameOver = true;
    this.isCharging = false;
    this.chargeRing.clear();
    this.enemySpawnTimer.paused = true;
    this.pauseSlowMotionTimer();
    this.saveCurrentRunStats();

    const { width, height } = this.scale;
    const panelWidth = 620;
    const panelHeight = 460;
    const panelX = width * 0.5 - panelWidth * 0.5;
    const panelY = height * 0.5 - panelHeight * 0.5;
    const rowStartY = panelY + 94;
    const rowGap = 30;
    const actionY = panelY + panelHeight - 54;
    const stats = this.runStatsSystem.snapshot;
    const rows: Array<[LocalizationKey, string]> = [
      ['playTime', this.formatPlayTime(stats.playTimeMs)],
      ['levelReached', String(stats.levelReached)],
      ['maxCombo', String(stats.maxCombo)],
      ['enemiesDefeated', String(stats.enemiesDefeated)],
      ['pulsesFired', String(stats.pulsesFired)],
      ['expCollected', String(stats.expCollected)],
      ['upgradesTaken', String(stats.upgradesTaken)],
      ['healsTaken', String(stats.healsTaken)],
      ['score', String(stats.score)],
    ];
    const container = this.add.container(0, 0).setDepth(90);
    const backdrop = this.add.graphics();
    const panel = this.add.graphics();

    this.fixedButtonHitAreas = [];
    container.setScrollFactor(0);
    backdrop.fillStyle(colors.overlayFill, 0.86);
    backdrop.fillRect(0, 0, width, height);
    panel.fillStyle(colors.overlayPanel, 0.96);
    panel.fillRect(panelX, panelY, panelWidth, panelHeight);
    panel.lineStyle(2, colors.enemyStroke, 0.82);
    panel.strokeRect(panelX, panelY, panelWidth, panelHeight);
    panel.lineStyle(1, colors.coreStroke, 0.24);
    panel.strokeRect(panelX + 12, panelY + 12, panelWidth - 24, panelHeight - 24);

    container.add([backdrop, panel]);
    container.add(
      this.add
        .text(width * 0.5, panelY + 42, this.t('gameOver'), {
          color: colors.text,
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '30px',
          letterSpacing: 3,
        })
        .setOrigin(0.5),
    );

    rows.forEach(([key, value], index) => {
      const y = rowStartY + index * rowGap;

      container.add(
        this.add.text(panelX + 92, y, this.t(key), {
          color: colors.mutedText,
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '15px',
        }),
      );
      container.add(
        this.add
          .text(panelX + panelWidth - 92, y, value, {
            color: colors.text,
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: '15px',
          })
          .setOrigin(1, 0),
      );
    });

    this.addMenuButton(container, width * 0.5 - 90, actionY, 150, 38, this.t('restart'), () => this.restartRun());
    this.addMenuButton(container, width * 0.5 + 110, actionY, 190, 38, this.t('quitToTitle'), () => this.quitToTitle());
    this.gameOverOverlay = container;
  }

  private addVolumeRow(
    container: Phaser.GameObjects.Container,
    label: string,
    settingKey: VolumeSettingKey,
    y: number,
  ): void {
    const panelX = this.scale.width * 0.5 - 280;
    const labelX = panelX + 72;
    const valueX = panelX + 374;
    const currentValue = this.settingsSystem.snapshot[settingKey];

    container.add(
      this.add.text(labelX, y, label, {
        color: colors.text,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '16px',
      }),
    );
    this.addMenuButton(container, valueX - 86, y + 8, 36, 32, '-', () => this.adjustVolumeFromMenu(settingKey, -1));
    container.add(
      this.add
        .text(valueX, y, this.formatPercent(currentValue), {
          color: colors.text,
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: '16px',
        })
        .setOrigin(0.5, 0),
    );
    this.addMenuButton(container, valueX + 86, y + 8, 36, 32, '+', () => this.adjustVolumeFromMenu(settingKey, 1));
  }

  private addMenuButton(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onSelect: () => void,
  ): void {
    const box = this.add.graphics();
    const text = this.add
      .text(x, y, label, {
        color: colors.text,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: height <= 32 ? '14px' : '16px',
      })
      .setOrigin(0.5);
    const zone = this.add
      .zone(x, y, width, height)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    box.fillStyle(colors.background, 0.72);
    box.fillRect(x - width * 0.5, y - height * 0.5, width, height);
    box.lineStyle(1, colors.coreStroke, 0.54);
    box.strokeRect(x - width * 0.5, y - height * 0.5, width, height);
    zone.on('pointerover', () => this.audioSystem.playUiHover());
    this.fixedButtonHitAreas.push({
      rect: new Phaser.Geom.Rectangle(x - width * 0.5, y - height * 0.5, width, height),
      onSelect,
    });

    container.add([box, text, zone]);
  }

  private setLanguageFromMenu(language: Language): void {
    this.settingsSystem.setLanguage(language);
    this.applyUserSettings();
    this.renderPauseOverlay();
  }

  private adjustVolumeFromMenu(settingKey: VolumeSettingKey, direction: number): void {
    this.settingsSystem.adjustVolume(settingKey, direction);
    this.applyUserSettings();
    this.renderPauseOverlay();
  }

  private toggleMutedFromMenu(): void {
    this.settingsSystem.toggleMuted();
    this.applyUserSettings();
    this.renderPauseOverlay();
  }

  private applyUserSettings(): void {
    const settings = this.settingsSystem.snapshot;

    this.localization.setLanguage(settings.language);
    this.audioSystem.setSettings(settings);
    this.refreshLocalizedText();
  }

  private refreshLocalizedText(): void {
    this.updateExpText();
    this.updateHpText();
    this.updateComboText();
    this.updateUpgradeStatusHud();
    this.updateDebugDisplay(this.time.now);
  }

  private pauseSlowMotionTimer(): void {
    if (this.slowMotionTimeoutId === undefined) {
      return;
    }

    this.slowMotionRemainingMs = Math.max(0, this.slowMotionEndsAt - this.time.now);
    window.clearTimeout(this.slowMotionTimeoutId);
    this.slowMotionTimeoutId = undefined;
  }

  private resumeSlowMotionTimer(): void {
    if (this.slowMotionRemainingMs <= 0 || this.gameSpeed === 1) {
      this.slowMotionRemainingMs = 0;
      return;
    }

    const remainingMs = this.slowMotionRemainingMs;

    this.slowMotionEndsAt = this.time.now + remainingMs;
    this.slowMotionRemainingMs = 0;
    this.slowMotionTimeoutId = window.setTimeout(() => {
      this.gameSpeed = 1;
      this.slowMotionTimeoutId = undefined;
      this.slowMotionEndsAt = 0;
    }, remainingMs);
  }

  private restartRun(): void {
    this.saveCurrentRunStats();

    if (this.slowMotionTimeoutId !== undefined) {
      window.clearTimeout(this.slowMotionTimeoutId);
      this.slowMotionTimeoutId = undefined;
    }

    this.slowMotionEndsAt = 0;
    this.slowMotionRemainingMs = 0;
    this.tweens.resumeAll();
    this.scene.restart();
  }

  private quitToTitle(): void {
    this.saveCurrentRunStats();

    if (this.slowMotionTimeoutId !== undefined) {
      window.clearTimeout(this.slowMotionTimeoutId);
      this.slowMotionTimeoutId = undefined;
    }

    this.slowMotionEndsAt = 0;
    this.slowMotionRemainingMs = 0;
    this.tweens.resumeAll();
    this.scene.start('TitleScene');
  }

  private saveCurrentRunStats(): void {
    if (this.hasSavedRunStats) {
      return;
    }

    this.totalStatsSystem.recordRun(this.runStatsSystem.snapshot);
    this.hasSavedRunStats = true;
  }

  private formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  private formatPlayTime(playTimeMs: number): string {
    const totalSeconds = Math.floor(playTimeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
    const stats = this.runStatsSystem.snapshot;
    const enemyTypeCounts = this.getEnemyTypeDebugText();

    this.debugText.setText(
      [
        `FPS: ${fps}`,
        `${this.t('enemies')}: ${this.enemies.length}`,
        `Types: ${enemyTypeCounts}`,
        `EXP Orbs: ${this.expOrbs.length}`,
        `${this.t('exp')}: ${this.experience}/${this.expToNextLevel}`,
        `${this.t('level')}: ${this.level}`,
        `${this.t('combo')}: ${this.combo}`,
        `${this.t('charge')}: ${Math.round(chargeRatio * 100)}%`,
        `${this.t('hp')}: ${this.playerHp}/${this.playerMaxHp}`,
        `${this.t('enemySpeed')}: x${this.getEnemySpeedMultiplier().toFixed(2)}`,
        `${this.t('enemyDensity')}: x${this.enemySpawnRateMultiplier.toFixed(2)}`,
        `Shockwave Chain: ${this.lastShockwaveChainCount} / max ${this.recentMaxShockwaveChainCount}`,
        `${this.t('score')}: ${stats.score}`,
        'F6 Lv+  F7 Heal  F8 Boss  F9 Clear',
      ].join('\n'),
    );
  }

  private getEnemyTypeDebugText(): string {
    return gameplayConfig.enemy.types
      .map((enemyType) => {
        const count = this.enemies.reduce((sum, enemy) => sum + (enemy.typeId === enemyType.id ? 1 : 0), 0);

        return `${enemyType.id}:${count}`;
      })
      .join(' ');
  }

  private t(key: LocalizationKey): string {
    return this.localization.t(key);
  }

  private getExpToNextLevel(): number {
    return gameplayConfig.progression.baseExpToNextLevel + (this.level - 1) * gameplayConfig.progression.expGrowthPerLevel;
  }

  private crossedComboMilestone(previousCombo: number, currentCombo: number, milestone: number): boolean {
    return Math.floor(previousCombo / milestone) < Math.floor(currentCombo / milestone);
  }
}

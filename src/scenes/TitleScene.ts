import Phaser from 'phaser';
import type { Language, LocalizationKey } from '../config/localization';
import { colors, gameplayConfig } from '../config/gameplayConfig';
import { AudioSystem } from '../systems/AudioSystem';
import { LocalizationSystem } from '../systems/LocalizationSystem';
import { SettingsSystem } from '../systems/SettingsSystem';
import { TotalStatsSystem } from '../systems/TotalStatsSystem';

type TitleMode = 'main' | 'options' | 'records';
type VolumeSettingKey = 'masterVolume' | 'sfxVolume' | 'musicVolume';

type TitleButtonRow = {
  box: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  x: number;
  y: number;
  width: number;
  height: number;
};

type TitlePulse = {
  x: number;
  y: number;
  age: number;
  life: number;
  endRadius: number;
};

type TitleParticle = {
  x: number;
  y: number;
  speed: number;
  phase: number;
};

const mainMenuKeys: LocalizationKey[] = ['startGame', 'options', 'records', 'quit'];

export class TitleScene extends Phaser.Scene {
  private gridLayer!: Phaser.GameObjects.Graphics;
  private effectLayer!: Phaser.GameObjects.Graphics;
  private uiContainer: Phaser.GameObjects.Container | null = null;
  private settingsSystem!: SettingsSystem;
  private localization!: LocalizationSystem;
  private audioSystem!: AudioSystem;
  private totalStatsSystem!: TotalStatsSystem;
  private mode: TitleMode = 'main';
  private selectedIndex = 0;
  private quitMessageVisible = false;
  private menuRows: TitleButtonRow[] = [];
  private pulses: TitlePulse[] = [];
  private particles: TitleParticle[] = [];
  private nextPulseAt = 0;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(colors.background);
    this.settingsSystem = new SettingsSystem();
    this.localization = new LocalizationSystem(this.settingsSystem.snapshot.language);
    this.audioSystem = new AudioSystem();
    this.audioSystem.setSettings(this.settingsSystem.snapshot);
    this.totalStatsSystem = new TotalStatsSystem();
    this.gridLayer = this.add.graphics().setDepth(0);
    this.effectLayer = this.add.graphics().setDepth(1);

    this.drawGrid();
    this.createParticles();
    this.renderUi();
    this.input.keyboard!.on('keydown', this.handleKeyDown, this);
    this.input.on('pointerdown', this.resumeAudio, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  update(time: number, delta: number): void {
    this.updateBackground(time, delta);
  }

  private drawGrid(): void {
    const { width, height } = this.scale;
    const spacing = gameplayConfig.grid.spacing;

    this.gridLayer.clear();
    this.gridLayer.lineStyle(1, colors.grid, 0.26);

    for (let x = 0; x <= width; x += spacing) {
      this.gridLayer.lineBetween(x, 0, x, height);
    }

    for (let y = 0; y <= height; y += spacing) {
      this.gridLayer.lineBetween(0, y, width, y);
    }

    this.gridLayer.lineStyle(1, colors.gridAccent, 0.48);
    this.gridLayer.strokeRect(width * 0.08, height * 0.14, width * 0.84, height * 0.72);
    this.gridLayer.lineBetween(width * 0.5, height * 0.08, width * 0.5, height * 0.92);
    this.gridLayer.lineBetween(width * 0.08, height * 0.5, width * 0.92, height * 0.5);
  }

  private createParticles(): void {
    this.particles = [];

    for (let index = 0; index < 34; index += 1) {
      this.particles.push({
        x: Phaser.Math.Between(40, this.scale.width - 40),
        y: Phaser.Math.Between(40, this.scale.height - 40),
        speed: Phaser.Math.FloatBetween(8, 22),
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      });
    }
  }

  private updateBackground(time: number, delta: number): void {
    if (time >= this.nextPulseAt) {
      this.nextPulseAt = time + Phaser.Math.Between(900, 1450);
      this.pulses.push({
        x: Phaser.Math.Between(110, this.scale.width - 110),
        y: Phaser.Math.Between(90, this.scale.height - 90),
        age: 0,
        life: 1850,
        endRadius: Phaser.Math.Between(90, 170),
      });
    }

    this.effectLayer.clear();
    this.updateTitlePulses(delta);
    this.updateTitleParticles(time, delta);
  }

  private updateTitlePulses(delta: number): void {
    this.pulses = this.pulses.filter((pulse) => {
      pulse.age += delta;

      const ratio = Phaser.Math.Clamp(pulse.age / pulse.life, 0, 1);

      if (ratio >= 1) {
        return false;
      }

      const radius = Phaser.Math.Linear(12, pulse.endRadius, 1 - Math.pow(1 - ratio, 2));
      const alpha = 0.22 * Math.pow(1 - ratio, 1.25);

      this.effectLayer.lineStyle(1, colors.pulseAccent, alpha);
      this.effectLayer.strokeCircle(pulse.x, pulse.y, radius);
      this.effectLayer.lineStyle(1, colors.coreStroke, alpha * 0.38);
      this.effectLayer.strokeCircle(pulse.x, pulse.y, radius * 0.58);

      return true;
    });
  }

  private updateTitleParticles(time: number, delta: number): void {
    const deltaSeconds = delta / 1000;

    for (const particle of this.particles) {
      particle.y -= particle.speed * deltaSeconds;
      particle.x += Math.sin(time / 900 + particle.phase) * 0.14;

      if (particle.y < 26) {
        particle.y = this.scale.height - 26;
        particle.x = Phaser.Math.Between(40, this.scale.width - 40);
      }

      this.effectLayer.fillStyle(colors.coreStroke, 0.34);
      this.effectLayer.fillCircle(particle.x, particle.y, 1.5);
      this.effectLayer.lineStyle(1, colors.gridAccent, 0.12);
      this.effectLayer.lineBetween(particle.x, particle.y, particle.x, particle.y + 14);
    }
  }

  private renderUi(): void {
    this.uiContainer?.destroy(true);
    this.menuRows = [];

    const { width } = this.scale;
    const container = this.add.container(0, 0).setDepth(10);

    container.add(
      this.add
        .text(width * 0.5, 82, this.t('title'), {
          color: colors.text,
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '42px',
          letterSpacing: 7,
        })
        .setOrigin(0.5),
    );
    container.add(
      this.add
        .rectangle(width * 0.5, 122, 420, 1, colors.pulseAccent, 0.62)
        .setOrigin(0.5),
    );

    if (this.mode === 'main') {
      this.renderMainMenu(container);
    }

    if (this.mode === 'options') {
      this.renderOptions(container);
    }

    if (this.mode === 'records') {
      this.renderRecords(container);
    }

    this.uiContainer = container;
  }

  private renderMainMenu(container: Phaser.GameObjects.Container): void {
    const menuX = 260;
    const startY = 184;
    const rowGap = 58;

    mainMenuKeys.forEach((key, index) => {
      const y = startY + index * rowGap;

      this.addMenuButton(container, menuX, y, 260, 44, this.t(key), () => this.activateMainMenu(index), index);
    });

    this.renderRecordsSummary(container);

    if (this.quitMessageVisible) {
      container.add(
        this.add
          .text(menuX, startY + rowGap * mainMenuKeys.length + 14, this.t('quitMessage'), {
            color: colors.mutedText,
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '14px',
          })
          .setOrigin(0.5, 0),
      );
    }

    this.refreshMenuHighlights();
  }

  private renderRecordsSummary(container: Phaser.GameObjects.Container): void {
    const stats = this.totalStatsSystem.snapshot;
    const panelX = 540;
    const panelY = 170;
    const panelWidth = 310;
    const panelHeight = 228;
    const box = this.add.graphics();
    const rows: Array<[LocalizationKey, string]> = [
      ['totalRuns', String(stats.totalRuns)],
      ['totalPlayTime', this.formatPlayTime(stats.totalPlayTimeMs)],
      ['bestLevel', String(stats.bestLevel)],
      ['bestCombo', String(stats.bestCombo)],
      ['totalEnemiesDefeated', String(stats.totalEnemiesDefeated)],
    ];

    box.fillStyle(colors.overlayPanel, 0.66);
    box.fillRect(panelX, panelY, panelWidth, panelHeight);
    box.lineStyle(1, colors.coreStroke, 0.36);
    box.strokeRect(panelX, panelY, panelWidth, panelHeight);
    container.add(box);
    container.add(
      this.add.text(panelX + 22, panelY + 20, this.t('totalRecords'), {
        color: colors.text,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '18px',
      }),
    );

    rows.forEach(([key, value], index) => {
      const y = panelY + 62 + index * 29;

      container.add(
        this.add.text(panelX + 22, y, this.t(key), {
          color: colors.mutedText,
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '13px',
        }),
      );
      container.add(
        this.add
          .text(panelX + panelWidth - 22, y, value, {
            color: colors.text,
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: '14px',
          })
          .setOrigin(1, 0),
      );
    });
  }

  private renderOptions(container: Phaser.GameObjects.Container): void {
    const settings = this.settingsSystem.snapshot;
    const panelX = 250;
    const panelY = 150;
    const labelX = panelX + 70;
    const valueX = panelX + 330;
    const rowStartY = panelY + 56;
    const rowGap = 54;

    this.addPanel(container, panelX, panelY, 460, 308, this.t('options'));
    container.add(
      this.add.text(labelX, rowStartY, this.t('language'), {
        color: colors.text,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '16px',
      }),
    );
    this.addActionButton(
      container,
      valueX,
      rowStartY + 8,
      104,
      32,
      `${settings.language === 'ja' ? '> ' : ''}${this.t('japanese')}`,
      () => this.setLanguageFromOptions('ja'),
    );
    this.addActionButton(
      container,
      valueX + 118,
      rowStartY + 8,
      104,
      32,
      `${settings.language === 'en' ? '> ' : ''}${this.t('english')}`,
      () => this.setLanguageFromOptions('en'),
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
    this.addActionButton(
      container,
      valueX,
      rowStartY + rowGap * 4 + 8,
      104,
      32,
      settings.muted ? this.t('on') : this.t('off'),
      () => this.toggleMutedFromOptions(),
    );
    this.addActionButton(container, panelX + 70, panelY + 268, 118, 34, this.t('back'), () => this.setMode('main'));
  }

  private renderRecords(container: Phaser.GameObjects.Container): void {
    const stats = this.totalStatsSystem.snapshot;
    const panelX = 240;
    const panelY = 144;
    const rows: Array<[LocalizationKey, string]> = [
      ['totalRuns', String(stats.totalRuns)],
      ['totalPlayTime', this.formatPlayTime(stats.totalPlayTimeMs)],
      ['bestLevel', String(stats.bestLevel)],
      ['bestCombo', String(stats.bestCombo)],
      ['totalEnemiesDefeated', String(stats.totalEnemiesDefeated)],
      ['totalPulsesFired', String(stats.totalPulsesFired)],
      ['totalExpCollected', String(stats.totalExpCollected)],
      ['totalUpgradesTaken', String(stats.totalUpgradesTaken)],
    ];

    this.addPanel(container, panelX, panelY, 480, 340, this.t('totalRecords'));

    rows.forEach(([key, value], index) => {
      const y = panelY + 64 + index * 31;

      container.add(
        this.add.text(panelX + 72, y, this.t(key), {
          color: colors.mutedText,
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '15px',
        }),
      );
      container.add(
        this.add
          .text(panelX + 408, y, value, {
            color: colors.text,
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: '15px',
          })
          .setOrigin(1, 0),
      );
    });

    this.addActionButton(container, panelX + 72, panelY + 300, 118, 34, this.t('back'), () => this.setMode('main'));
  }

  private addPanel(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
  ): void {
    const panel = this.add.graphics();

    panel.fillStyle(colors.overlayPanel, 0.78);
    panel.fillRect(x, y, width, height);
    panel.lineStyle(1, colors.pulseAccent, 0.68);
    panel.strokeRect(x, y, width, height);
    panel.lineStyle(1, colors.coreStroke, 0.2);
    panel.strokeRect(x + 10, y + 10, width - 20, height - 20);
    container.add(panel);
    container.add(
      this.add.text(x + 28, y + 22, title, {
        color: colors.text,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '20px',
      }),
    );
  }

  private addVolumeRow(
    container: Phaser.GameObjects.Container,
    label: string,
    settingKey: VolumeSettingKey,
    y: number,
  ): void {
    const labelX = 320;
    const valueX = 624;
    const currentValue = this.settingsSystem.snapshot[settingKey];

    container.add(
      this.add.text(labelX, y, label, {
        color: colors.text,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '16px',
      }),
    );
    this.addActionButton(container, valueX - 86, y + 8, 36, 32, '-', () => this.adjustVolumeFromOptions(settingKey, -1));
    container.add(
      this.add
        .text(valueX, y, this.formatPercent(currentValue), {
          color: colors.text,
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: '16px',
        })
        .setOrigin(0.5, 0),
    );
    this.addActionButton(container, valueX + 86, y + 8, 36, 32, '+', () => this.adjustVolumeFromOptions(settingKey, 1));
  }

  private addMenuButton(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onSelect: () => void,
    menuIndex: number,
  ): void {
    const row = this.createButton(container, x, y, width, height, label, onSelect);

    row.text.on('pointerover', () => this.setSelectedIndex(menuIndex));
    row.zone.on('pointerover', () => this.setSelectedIndex(menuIndex));
    this.menuRows.push(row);
  }

  private addActionButton(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onSelect: () => void,
  ): void {
    this.createButton(container, x, y, width, height, label, onSelect);
  }

  private createButton(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onSelect: () => void,
  ): TitleButtonRow {
    const box = this.add.graphics();
    const text = this.add
      .text(x, y, label, {
        color: colors.text,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: height <= 34 ? '14px' : '17px',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const zone = this.add
      .zone(x, y, width, height)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const row = {
      box,
      text,
      zone,
      x,
      y,
      width,
      height,
    };

    this.paintButton(row, false);
    zone.on('pointerover', () => this.audioSystem.playUiHover());
    zone.on('pointerdown', () => {
      this.resumeAudio();
      this.audioSystem.playSelect();
      onSelect();
    });
    text.on('pointerdown', () => {
      this.resumeAudio();
      this.audioSystem.playSelect();
      onSelect();
    });
    container.add([box, text, zone]);

    return row;
  }

  private paintButton(row: TitleButtonRow, selected: boolean): void {
    row.box.clear();
    row.box.fillStyle(colors.background, selected ? 0.86 : 0.62);
    row.box.fillRect(row.x - row.width * 0.5, row.y - row.height * 0.5, row.width, row.height);
    row.box.lineStyle(selected ? 2 : 1, selected ? colors.pulseAccent : colors.coreStroke, selected ? 0.88 : 0.44);
    row.box.strokeRect(row.x - row.width * 0.5, row.y - row.height * 0.5, row.width, row.height);
    row.text.setColor(selected ? '#ffffff' : colors.text);
    row.text.setScale(selected ? 1.06 : 1);
  }

  private setSelectedIndex(index: number): void {
    if (this.mode !== 'main') {
      return;
    }

    if (this.selectedIndex !== index) {
      this.audioSystem.playUiHover();
    }

    this.selectedIndex = Phaser.Math.Wrap(index, 0, mainMenuKeys.length);
    this.refreshMenuHighlights();
  }

  private refreshMenuHighlights(): void {
    this.menuRows.forEach((row, index) => this.paintButton(row, index === this.selectedIndex));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.mode !== 'main') {
      event.preventDefault();
      this.setMode('main');
      return;
    }

    if (this.mode !== 'main') {
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.setSelectedIndex(this.selectedIndex - 1);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.setSelectedIndex(this.selectedIndex + 1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.resumeAudio();
      this.audioSystem.playSelect();
      this.activateMainMenu(this.selectedIndex);
    }
  }

  private activateMainMenu(index: number): void {
    const key = mainMenuKeys[index];

    if (key === 'startGame') {
      this.scene.start('GameScene');
      return;
    }

    if (key === 'options') {
      this.setMode('options');
      return;
    }

    if (key === 'records') {
      this.setMode('records');
      return;
    }

    this.quitMessageVisible = true;
    this.renderUi();
  }

  private setMode(mode: TitleMode): void {
    this.mode = mode;
    this.quitMessageVisible = false;
    this.selectedIndex = 0;
    this.renderUi();
  }

  private setLanguageFromOptions(language: Language): void {
    this.settingsSystem.setLanguage(language);
    this.applyUserSettings();
    this.renderUi();
  }

  private adjustVolumeFromOptions(settingKey: VolumeSettingKey, direction: number): void {
    this.settingsSystem.adjustVolume(settingKey, direction);
    this.applyUserSettings();
    this.renderUi();
  }

  private toggleMutedFromOptions(): void {
    this.settingsSystem.toggleMuted();
    this.applyUserSettings();
    this.renderUi();
  }

  private applyUserSettings(): void {
    const settings = this.settingsSystem.snapshot;

    this.localization.setLanguage(settings.language);
    this.audioSystem.setSettings(settings);
  }

  private resumeAudio(): void {
    this.audioSystem.resume();
  }

  private shutdown(): void {
    this.input.keyboard?.off('keydown', this.handleKeyDown, this);
  }

  private formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  private formatPlayTime(playTimeMs: number): string {
    const totalSeconds = Math.floor(playTimeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private t(key: LocalizationKey): string {
    return this.localization.t(key);
  }
}

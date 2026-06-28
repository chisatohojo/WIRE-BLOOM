import { audioConfig } from '../config/audioConfig';

type WebAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

type ToneOptions = {
  frequencyHz: number;
  endFrequencyHz?: number;
  durationMs: number;
  volume: number;
  delayMs?: number;
  type?: OscillatorType;
};

export class AudioSystem {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted: boolean = audioConfig.mutedByDefault;
  private orbSequence = 0;
  private lastOrbPlayedAt = 0;
  private lastHoverPlayedAt = 0;
  private recentHitTimes: number[] = [];

  get isMuted(): boolean {
    return this.muted;
  }

  resume(): void {
    const context = this.getContext();

    if (!context) {
      return;
    }

    if (context.state === 'suspended') {
      void context.resume();
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.applyMasterVolume();

    return this.muted;
  }

  playPulse(chargeRatio: number): void {
    const scaledVolume = audioConfig.pulse.volume * (0.72 + chargeRatio * 0.28);

    this.playTone({
      frequencyHz: audioConfig.pulse.lowStartHz,
      endFrequencyHz: audioConfig.pulse.lowEndHz,
      durationMs: audioConfig.pulse.durationMs,
      volume: scaledVolume,
      type: 'sawtooth',
    });
    this.playNoise(audioConfig.pulse.noiseDurationMs, audioConfig.pulse.noiseVolume * (0.7 + chargeRatio * 0.3));
  }

  playHit(): void {
    const context = this.getPlayableContext();

    if (!context) {
      return;
    }

    const nowMs = context.currentTime * 1000;
    this.recentHitTimes = this.recentHitTimes.filter((hitTime) => nowMs - hitTime <= audioConfig.hit.windowMs);

    if (this.recentHitTimes.length >= audioConfig.hit.maxPerWindow) {
      return;
    }

    this.recentHitTimes.push(nowMs);
    this.playTone({
      frequencyHz: audioConfig.hit.frequencyHz,
      durationMs: audioConfig.hit.durationMs,
      volume: audioConfig.hit.volume / (1 + this.recentHitTimes.length * 0.16),
      type: 'square',
    });
  }

  playOrb(): void {
    const context = this.getPlayableContext();

    if (!context) {
      return;
    }

    const nowMs = context.currentTime * 1000;

    if (nowMs - this.lastOrbPlayedAt > audioConfig.orb.resetAfterMs) {
      this.orbSequence = 0;
    }

    const pitchRange = audioConfig.orb.maxHz - audioConfig.orb.minHz;
    const stepCount = Math.max(1, Math.floor(pitchRange / audioConfig.orb.pitchStepHz));
    const frequencyHz = audioConfig.orb.minHz + (this.orbSequence % (stepCount + 1)) * audioConfig.orb.pitchStepHz;

    this.orbSequence += 1;
    this.lastOrbPlayedAt = nowMs;
    this.playTone({
      frequencyHz: Math.min(audioConfig.orb.maxHz, frequencyHz),
      durationMs: audioConfig.orb.durationMs,
      volume: audioConfig.orb.volume,
      type: 'sine',
    });
  }

  playCombo10(): void {
    this.playChord(audioConfig.combo10.frequenciesHz, audioConfig.combo10.durationMs, audioConfig.combo10.volume);
  }

  playCombo50(): void {
    this.playChord(audioConfig.combo50.frequenciesHz, audioConfig.combo50.durationMs, audioConfig.combo50.volume);
  }

  playLevelUp(): void {
    audioConfig.levelup.notesHz.forEach((frequencyHz, index) => {
      this.playTone({
        frequencyHz,
        durationMs: audioConfig.levelup.noteDurationMs,
        volume: audioConfig.levelup.volume,
        delayMs: index * audioConfig.levelup.noteGapMs,
        type: 'triangle',
      });
    });
  }

  playSelect(): void {
    this.playTone({
      frequencyHz: audioConfig.select.startHz,
      endFrequencyHz: audioConfig.select.endHz,
      durationMs: audioConfig.select.durationMs,
      volume: audioConfig.select.volume,
      type: 'triangle',
    });
  }

  playUiHover(): void {
    const context = this.getPlayableContext();

    if (!context) {
      return;
    }

    const nowMs = context.currentTime * 1000;

    if (nowMs - this.lastHoverPlayedAt < audioConfig.uiHover.cooldownMs) {
      return;
    }

    this.lastHoverPlayedAt = nowMs;
    this.playTone({
      frequencyHz: audioConfig.uiHover.startHz,
      endFrequencyHz: audioConfig.uiHover.endHz,
      durationMs: audioConfig.uiHover.durationMs,
      volume: audioConfig.uiHover.volume,
      type: 'sine',
    });
  }

  private playChord(frequenciesHz: readonly number[], durationMs: number, volume: number): void {
    const perToneVolume = volume / Math.max(1, frequenciesHz.length);

    frequenciesHz.forEach((frequencyHz) => {
      this.playTone({
        frequencyHz,
        durationMs,
        volume: perToneVolume,
        type: 'triangle',
      });
    });
  }

  private playTone(options: ToneOptions): void {
    const context = this.getPlayableContext();

    if (!context) {
      return;
    }

    const startAt = context.currentTime + (options.delayMs ?? 0) / 1000;
    const endAt = startAt + options.durationMs / 1000;
    const attackEnd = Math.min(endAt, startAt + 0.008);
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = options.type ?? 'sine';
    oscillator.frequency.setValueAtTime(options.frequencyHz, startAt);

    if (options.endFrequencyHz !== undefined) {
      oscillator.frequency.linearRampToValueAtTime(options.endFrequencyHz, endAt);
    }

    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(options.volume, attackEnd);
    gain.gain.linearRampToValueAtTime(0, endAt);
    oscillator.connect(gain);
    gain.connect(this.masterGain!);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.02);
  }

  private playNoise(durationMs: number, volume: number): void {
    const context = this.getPlayableContext();

    if (!context) {
      return;
    }

    const sampleCount = Math.max(1, Math.floor(context.sampleRate * (durationMs / 1000)));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const output = buffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
      output[index] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const startAt = context.currentTime;
    const endAt = startAt + durationMs / 1000;

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(audioConfig.pulse.noiseFilterHz, startAt);
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.linearRampToValueAtTime(0, endAt);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    source.start(startAt);
    source.stop(endAt + 0.02);
  }

  private getPlayableContext(): AudioContext | null {
    if (this.muted) {
      return null;
    }

    return this.getContext();
  }

  private getContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }

    const AudioContextClass = window.AudioContext ?? (window as WebAudioWindow).webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    this.applyMasterVolume();

    return this.context;
  }

  private applyMasterVolume(): void {
    if (!this.masterGain) {
      return;
    }

    this.masterGain.gain.value = this.muted ? 0 : audioConfig.masterVolume;
  }
}

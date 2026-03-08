import { Howl } from "howler";

export type SoundCategory = "ui" | "game" | "celebration" | "ambient";
export type MusicTheme = "lobby" | "brain-board" | "lucky-letters" | "survey-smash";

export interface SoundConfig {
  src: string;
  sprite?: Record<string, [number, number] | [number, number, boolean]>;
  volume?: number;
}

export interface PlaySfxOptions {
  source?: string;
  context?: string;
  dedupeKey?: string;
  dedupeMs?: number;
  throttleMs?: number;
}

interface SynthStep {
  frequency: number;
  duration: number;
  wave?: OscillatorType;
  gain?: number;
  slideTo?: number;
}

interface MusicThemeConfig {
  progression: number[][];
  bpm: number;
  wave: OscillatorType;
  gain: number;
}

interface ActiveMusicTrack {
  theme: MusicTheme;
  gainNode: GainNode;
  intervalId: number | null;
}

interface RetiringMusicTrack extends ActiveMusicTrack {
  timeoutId: number | null;
}

interface FlimflamE2EStore {
  audioEvents?: Array<{ ts: number; type: string; payload?: unknown }>;
  motionEvents?: Array<{ ts: number; type: string; payload?: unknown }>;
}

declare global {
  interface Window {
    __FLIMFLAM_E2E__?: FlimflamE2EStore;
    __flimflamTestHooks?: FlimflamE2EStore;
  }
}

const STORAGE_VOLUME_KEY = "flimflam-volume";
const STORAGE_MUTED_KEY = "flimflam-muted";
const DEFAULT_VOLUME = 0.7;
const DEFAULT_MUSIC_LEVEL = 0.42;
const DEFAULT_CROSSFADE_MS = 900;
const GUESS_ALONG_VOLUME_BOOST = 1;

const SYNTH_EFFECTS: Record<string, SynthStep[]> = {
  "ui:click": [{ frequency: 920, duration: 0.04, wave: "square", gain: 0.14 }],
  "ui:select": [
    { frequency: 660, duration: 0.05, wave: "triangle", gain: 0.12 },
    { frequency: 940, duration: 0.07, wave: "triangle", gain: 0.1 },
  ],
  "game:buzz": [
    { frequency: 210, slideTo: 120, duration: 0.18, wave: "sawtooth", gain: 0.22 },
    { frequency: 160, duration: 0.08, wave: "triangle", gain: 0.12 },
  ],
  "game:reveal": [
    { frequency: 430, duration: 0.08, wave: "triangle", gain: 0.12 },
    { frequency: 580, duration: 0.09, wave: "triangle", gain: 0.11 },
    { frequency: 760, duration: 0.12, wave: "triangle", gain: 0.1 },
  ],
  "game:tick": [{ frequency: 1400, duration: 0.035, wave: "square", gain: 0.08 }],
  "game:whoosh": [{ frequency: 240, slideTo: 900, duration: 0.2, wave: "sawtooth", gain: 0.12 }],
  "game:correct": [
    { frequency: 520, duration: 0.08, wave: "triangle", gain: 0.12 },
    { frequency: 780, duration: 0.11, wave: "triangle", gain: 0.11 },
    { frequency: 1040, duration: 0.13, wave: "triangle", gain: 0.1 },
  ],
  "game:strike": [
    { frequency: 170, slideTo: 90, duration: 0.22, wave: "sawtooth", gain: 0.24 },
    { frequency: 120, duration: 0.1, wave: "square", gain: 0.12 },
  ],
  "celebration:win": [
    { frequency: 520, duration: 0.1, wave: "triangle", gain: 0.11 },
    { frequency: 660, duration: 0.1, wave: "triangle", gain: 0.11 },
    { frequency: 880, duration: 0.15, wave: "triangle", gain: 0.11 },
    { frequency: 1040, duration: 0.16, wave: "triangle", gain: 0.1 },
  ],
  "celebration:confetti": [
    { frequency: 960, duration: 0.05, wave: "square", gain: 0.1 },
    { frequency: 1220, duration: 0.05, wave: "square", gain: 0.09 },
    { frequency: 1440, duration: 0.05, wave: "square", gain: 0.08 },
  ],
  // Premium moment cues (game-specific ids) used by E2E and authored beats.
  "brain.board.reveal": [
    { frequency: 260, duration: 0.08, wave: "triangle", gain: 0.12 },
    { frequency: 390, duration: 0.09, wave: "triangle", gain: 0.11 },
    { frequency: 520, duration: 0.12, wave: "triangle", gain: 0.1 },
    { frequency: 780, duration: 0.14, wave: "triangle", gain: 0.09 },
  ],
  "lucky.prize.cash": [
    { frequency: 880, duration: 0.06, wave: "square", gain: 0.11 },
    { frequency: 1320, duration: 0.08, wave: "square", gain: 0.1 },
  ],
  "lucky.prize.pass": [
    { frequency: 340, slideTo: 700, duration: 0.12, wave: "sawtooth", gain: 0.1 },
  ],
  "lucky.prize.bust": [
    { frequency: 190, slideTo: 110, duration: 0.18, wave: "sawtooth", gain: 0.24 },
    { frequency: 140, duration: 0.08, wave: "square", gain: 0.12 },
  ],
  "lucky.prize.wild": [
    { frequency: 1040, duration: 0.05, wave: "triangle", gain: 0.1 },
    { frequency: 1560, duration: 0.07, wave: "triangle", gain: 0.09 },
    { frequency: 2080, duration: 0.08, wave: "triangle", gain: 0.08 },
  ],
  // Brain Board premium moments
  "game:dim": [
    { frequency: 80, duration: 0.3, wave: "sine", gain: 0.15 },
    { frequency: 60, duration: 0.2, wave: "sine", gain: 0.1 },
  ],
  "brain.board.cardflip": [
    { frequency: 1200, duration: 0.03, wave: "square", gain: 0.08 },
    { frequency: 800, duration: 0.04, wave: "triangle", gain: 0.1 },
  ],
  "game:near-miss": [
    { frequency: 520, slideTo: 320, duration: 0.15, wave: "triangle", gain: 0.12 },
    { frequency: 280, slideTo: 180, duration: 0.12, wave: "sine", gain: 0.1 },
  ],
  "celebration:golden-rain": [
    { frequency: 1200, duration: 0.06, wave: "triangle", gain: 0.08 },
    { frequency: 1600, duration: 0.07, wave: "triangle", gain: 0.07 },
    { frequency: 2000, duration: 0.08, wave: "triangle", gain: 0.06 },
    { frequency: 2400, duration: 0.1, wave: "sine", gain: 0.05 },
  ],
  "brain.board.powerplay": [
    { frequency: 330, duration: 0.1, wave: "triangle", gain: 0.12 },
    { frequency: 440, duration: 0.1, wave: "triangle", gain: 0.11 },
    { frequency: 550, duration: 0.12, wave: "triangle", gain: 0.1 },
    { frequency: 660, duration: 0.14, wave: "triangle", gain: 0.09 },
  ],
  "brain.board.allin": [
    { frequency: 220, duration: 0.12, wave: "sawtooth", gain: 0.1 },
    { frequency: 330, duration: 0.12, wave: "sawtooth", gain: 0.1 },
    { frequency: 440, slideTo: 660, duration: 0.2, wave: "sawtooth", gain: 0.12 },
  ],
  "game:speed-bonus": [
    { frequency: 880, duration: 0.04, wave: "square", gain: 0.1 },
    { frequency: 1320, duration: 0.05, wave: "square", gain: 0.09 },
    { frequency: 1760, duration: 0.06, wave: "square", gain: 0.08 },
  ],
  "game:streak.2": [
    { frequency: 660, duration: 0.08, wave: "triangle", gain: 0.1 },
    { frequency: 880, duration: 0.1, wave: "triangle", gain: 0.09 },
  ],
  "game:streak.3": [
    { frequency: 660, duration: 0.06, wave: "triangle", gain: 0.1 },
    { frequency: 880, duration: 0.08, wave: "triangle", gain: 0.1 },
    { frequency: 1100, duration: 0.1, wave: "triangle", gain: 0.09 },
  ],
  "game:streak.5": [
    { frequency: 660, duration: 0.05, wave: "triangle", gain: 0.11 },
    { frequency: 880, duration: 0.06, wave: "triangle", gain: 0.1 },
    { frequency: 1100, duration: 0.07, wave: "triangle", gain: 0.1 },
    { frequency: 1320, duration: 0.08, wave: "triangle", gain: 0.09 },
    { frequency: 1540, duration: 0.1, wave: "triangle", gain: 0.08 },
  ],
};

const MUSIC_THEMES: Record<MusicTheme, MusicThemeConfig> = {
  lobby: {
    progression: [
      [60, 64, 67],
      [57, 60, 64],
      [62, 65, 69],
      [55, 59, 62],
    ],
    bpm: 78,
    wave: "triangle",
    gain: 0.09,
  },
  "brain-board": {
    progression: [
      [50, 57, 62],
      [48, 55, 60],
      [45, 52, 57],
      [47, 54, 59],
    ],
    bpm: 88,
    wave: "sawtooth",
    gain: 0.08,
  },
  "lucky-letters": {
    progression: [
      [64, 67, 71],
      [62, 65, 69],
      [60, 64, 67],
      [67, 71, 74],
    ],
    bpm: 96,
    wave: "triangle",
    gain: 0.1,
  },
  "survey-smash": {
    progression: [
      [57, 60, 64],
      [55, 59, 62],
      [53, 57, 60],
      [52, 55, 59],
    ],
    bpm: 102,
    wave: "square",
    gain: 0.075,
  },
};

function midiToFrequency(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

function getStoredVolume(): number {
  if (typeof window === "undefined") return DEFAULT_VOLUME;
  try {
    const stored = localStorage.getItem(STORAGE_VOLUME_KEY);
    if (stored !== null) {
      const val = Number.parseFloat(stored);
      if (Number.isFinite(val) && val >= 0 && val <= 1) return val;
    }
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_VOLUME;
}

function storeVolume(vol: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_VOLUME_KEY, String(vol));
  } catch {
    // localStorage unavailable
  }
}

function getStoredMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(STORAGE_MUTED_KEY);
    return stored === "1";
  } catch {
    // localStorage unavailable
    return false;
  }
}

function storeMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_MUTED_KEY, muted ? "1" : "0");
  } catch {
    // localStorage unavailable
  }
}

class SoundManager {
  private _howls = new Map<string, Howl>();
  private _volume: number;
  private _muted: boolean;
  private _listeners = new Set<() => void>();
  private _ctx: AudioContext | null = null;
  private _masterGain: GainNode | null = null;
  private _activeMusic: ActiveMusicTrack | null = null;
  private _retiringMusic: RetiringMusicTrack | null = null;
  private _desiredMusicTheme: MusicTheme | null = null;
  private _unlockReady: boolean;
  private _e2eEnabled = false;
  private _dedupeSfxAt = new Map<string, number>();
  private _throttleSfxAt = new Map<string, number>();

  constructor() {
    this._volume = getStoredVolume();
    this._muted = getStoredMuted();
    this._unlockReady = typeof window === "undefined";
  }

  get volume(): number {
    return this._volume;
  }

  get muted(): boolean {
    return this._muted;
  }

  setVolume(vol: number): void {
    this._volume = Math.max(0, Math.min(1, vol));
    storeVolume(this._volume);
    this._emitAudioEvent("audio.volume", { volume: this._volume });
    for (const howl of this._howls.values()) {
      howl.volume(this._volume);
    }
    this._syncMasterGain();
    this._syncActiveMusicGain(80);
    this._notify();
  }

  setMuted(muted: boolean): void {
    if (this._muted === muted) return;
    this._muted = muted;
    storeMuted(muted);
    this._emitAudioEvent(muted ? "audio.mute.on" : "audio.mute.off", {
      volume: this._volume,
    });
    for (const howl of this._howls.values()) {
      howl.mute(muted);
    }
    if (muted) {
      this.stopMusic({ fadeMs: 150, keepDesiredTheme: true });
    } else if (this._desiredMusicTheme) {
      this.playMusic(this._desiredMusicTheme, { crossfadeMs: 300 });
    }
    this._syncMasterGain();
    this._notify();
  }

  toggleMute(): void {
    this.setMuted(!this._muted);
  }

  setE2EEnabled(enabled: boolean): void {
    this._e2eEnabled = enabled;
    if (!enabled || typeof window === "undefined") return;
    const store = window.__FLIMFLAM_E2E__ ?? {};
    window.__FLIMFLAM_E2E__ = store;
    window.__flimflamTestHooks = store;
    if (!store.audioEvents) {
      store.audioEvents = [];
    }
    if (!store.motionEvents) {
      store.motionEvents = [];
    }
  }

  /**
   * Register a sound source. Call once per category/sprite file.
   */
  register(id: string, config: SoundConfig): void {
    if (this._howls.has(id)) return;
    const howl = new Howl({
      src: [config.src],
      sprite: config.sprite,
      volume: config.volume ?? this._volume,
      preload: true,
      mute: this._muted,
    });
    this._howls.set(id, howl);
  }

  /**
   * Play a sound. If spriteId is given, plays that sprite segment.
   */
  play(id: string, spriteId?: string): void {
    if (!this._unlockReady) {
      this._emitAudioEvent("audio.locked", { reason: "sfx", id, spriteId });
      return;
    }
    if (this._muted) return;
    this._emitAudioEvent(
      spriteId ? `audio.${id}.${spriteId}` : `audio.${id}`,
      spriteId ? { id, spriteId } : { id },
    );
    const howl = this._howls.get(id);
    if (!howl) {
      const key = spriteId ? `${id}:${spriteId}` : id;
      this._playSynth(this._resolveSynthKey(key));
      return;
    }
    if (spriteId) {
      howl.play(spriteId);
    } else {
      howl.play();
    }
  }

  playSfx(id: string, opts?: PlaySfxOptions): void {
    if (!this._unlockReady) {
      this._emitAudioEvent("audio.locked", { reason: "sfx", id });
      return;
    }
    if (this._muted) return;
    const now = Date.now();
    const dedupeWindowMs = opts?.dedupeMs ?? 0;
    if (dedupeWindowMs > 0) {
      const dedupeKey = opts?.dedupeKey ?? `${opts?.source ?? "unknown"}:${id}`;
      const dedupeAt = this._dedupeSfxAt.get(dedupeKey) ?? 0;
      if (now - dedupeAt < dedupeWindowMs) {
        this._emitAudioEvent("audio.sfx.skipped", {
          id,
          reason: "dedupe",
          dedupeKey,
          dedupeWindowMs,
          source: opts?.source ?? "unknown",
          context: opts?.context ?? null,
        });
        return;
      }
      this._dedupeSfxAt.set(dedupeKey, now);
    }
    const throttleWindowMs = opts?.throttleMs ?? 0;
    if (throttleWindowMs > 0) {
      const throttleKey = `${opts?.source ?? "global"}:${id}`;
      const throttleAt = this._throttleSfxAt.get(throttleKey) ?? 0;
      if (now - throttleAt < throttleWindowMs) {
        this._emitAudioEvent("audio.sfx.skipped", {
          id,
          reason: "throttle",
          throttleKey,
          throttleWindowMs,
          source: opts?.source ?? "unknown",
          context: opts?.context ?? null,
        });
        return;
      }
      this._throttleSfxAt.set(throttleKey, now);
    }
    this._emitAudioEvent(`audio.${id}`, { id });
    this._emitAudioEvent("audio.sfx.play", {
      id,
      source: opts?.source ?? "unknown",
      context: opts?.context ?? null,
    });
    const synthKey = this._resolveSynthKey(id);
    this._playSynth(synthKey);
  }

  unlock(): void {
    this._unlockReady = true;
    this._emitAudioEvent("audio.unlocked");
    this._ensureContext(true);
    if (this._desiredMusicTheme && !this._muted) {
      this.playMusic(this._desiredMusicTheme, { crossfadeMs: 300 });
    }
  }

  playMusic(theme: MusicTheme, opts?: { crossfadeMs?: number }): void {
    this._desiredMusicTheme = theme;
    if (!this._unlockReady) {
      this._emitAudioEvent("audio.locked", { reason: "music", theme });
      return;
    }
    if (this._muted) return;

    const ctx = this._ensureContext(true);
    const masterGain = this._masterGain;
    if (!ctx || !masterGain) {
      this._emitAudioEvent("audio.error", {
        reason: "context-unavailable",
        scope: "playMusic",
        theme,
      });
      return;
    }

    if (this._activeMusic?.theme === theme) {
      this._syncActiveMusicGain(120);
      return;
    }

    this._clearRetiringMusic();

    const crossfadeMs = opts?.crossfadeMs ?? DEFAULT_CROSSFADE_MS;
    const nextGain = ctx.createGain();
    nextGain.gain.setValueAtTime(0, ctx.currentTime);
    nextGain.connect(masterGain);

    const intervalId = this._startMusicLoop(theme, nextGain);
    const targetGain = this._targetMusicGain(theme);
    nextGain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + crossfadeMs / 1000);

    const previousMusic = this._activeMusic;
    this._activeMusic = { theme, gainNode: nextGain, intervalId };
    this._emitAudioEvent("music.play", {
      theme,
      concurrentTracks: previousMusic ? 2 : 1,
    });

    if (!previousMusic) return;

    previousMusic.gainNode.gain.cancelScheduledValues(ctx.currentTime);
    previousMusic.gainNode.gain.setValueAtTime(previousMusic.gainNode.gain.value, ctx.currentTime);
    previousMusic.gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + crossfadeMs / 1000);

    this._emitAudioEvent("music.crossfade", {
      from: previousMusic.theme,
      to: theme,
      crossfadeMs,
      concurrentTracks: 2,
    });

    const timeoutId = window.setTimeout(() => {
      if (previousMusic.intervalId !== null) {
        window.clearInterval(previousMusic.intervalId);
      }
      try {
        previousMusic.gainNode.disconnect();
      } catch {
        // disconnected already
      }
      if (this._retiringMusic?.theme === previousMusic.theme) {
        this._retiringMusic = null;
      }
    }, crossfadeMs + 120);

    this._retiringMusic = {
      ...previousMusic,
      timeoutId,
    };
  }

  stopMusic(opts?: { fadeMs?: number; keepDesiredTheme?: boolean }): void {
    const active = this._activeMusic;
    this._clearRetiringMusic();
    if (!active) {
      if (!opts?.keepDesiredTheme) this._desiredMusicTheme = null;
      return;
    }
    const fadeMs = opts?.fadeMs ?? 200;
    const ctx = this._ctx;
    if (ctx) {
      active.gainNode.gain.cancelScheduledValues(ctx.currentTime);
      active.gainNode.gain.setValueAtTime(active.gainNode.gain.value, ctx.currentTime);
      active.gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeMs / 1000);
    }
    window.setTimeout(() => {
      if (active.intervalId !== null) window.clearInterval(active.intervalId);
      try {
        active.gainNode.disconnect();
      } catch {
        // disconnected already
      }
    }, fadeMs + 80);
    this._activeMusic = null;
    this._emitAudioEvent("music.stop", { theme: active.theme, fadeMs });
    if (!opts?.keepDesiredTheme) this._desiredMusicTheme = null;
  }

  /**
   * Stop all sounds from a source.
   */
  stop(id: string): void {
    const howl = this._howls.get(id);
    if (howl) howl.stop();
  }

  /**
   * Stop all sounds.
   */
  stopAll(): void {
    for (const howl of this._howls.values()) {
      howl.stop();
    }
    this.stopMusic();
  }

  /**
   * Preload all registered sounds.
   */
  preload(): void {
    for (const howl of this._howls.values()) {
      howl.load();
    }
  }

  /**
   * Unload all sounds and free memory.
   */
  unloadAll(): void {
    for (const howl of this._howls.values()) {
      howl.unload();
    }
    this._howls.clear();
    this.stopMusic();
  }

  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private _notify(): void {
    for (const listener of this._listeners) {
      listener();
    }
  }

  private _resolveSynthKey(id: string): string {
    if (SYNTH_EFFECTS[id]) return id;
    const fallbackMap: Record<string, string> = {
      click: "ui:click",
      select: "ui:select",
      buzz: "game:buzz",
      reveal: "game:reveal",
      tick: "game:tick",
      whoosh: "game:whoosh",
      win: "celebration:win",
      confetti: "celebration:confetti",
      correct: "game:correct",
      strike: "game:strike",
    };
    return fallbackMap[id] ?? "ui:click";
  }

  private _playSynth(effectId: string): void {
    const sequence = SYNTH_EFFECTS[effectId];
    if (!sequence || sequence.length === 0) return;
    const ctx = this._ensureContext(true);
    if (!ctx || !this._masterGain || this._muted) return;

    let offset = 0;
    for (const step of sequence) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = step.wave ?? "triangle";
      osc.frequency.setValueAtTime(step.frequency, ctx.currentTime + offset);
      if (typeof step.slideTo === "number") {
        osc.frequency.linearRampToValueAtTime(
          step.slideTo,
          ctx.currentTime + offset + step.duration,
        );
      }
      const level = Math.max(
        0,
        (step.gain ?? 0.1) * this._volume * GUESS_ALONG_VOLUME_BOOST * (this._muted ? 0 : 1),
      );
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.linearRampToValueAtTime(level, ctx.currentTime + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + offset + Math.max(0.02, step.duration),
      );
      osc.connect(gain);
      gain.connect(this._masterGain);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + Math.max(0.03, step.duration + 0.03));
      offset += step.duration * 0.75;
    }
  }

  private _ensureContext(resume = false): AudioContext | null {
    if (typeof window === "undefined") return null;
    const Ctor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!this._ctx) {
      this._ctx = new Ctor();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.setValueAtTime(this._muted ? 0 : this._volume, this._ctx.currentTime);
      this._masterGain.connect(this._ctx.destination);
    }
    if (resume && this._ctx.state === "suspended") {
      void this._ctx.resume().catch(() => {
        // Autoplay guard can reject; playback will work after first gesture.
        this._emitAudioEvent("audio.locked", { reason: "resume-blocked" });
      });
    }
    return this._ctx;
  }

  private _syncMasterGain(): void {
    if (!this._ctx || !this._masterGain) return;
    const target = this._muted ? 0 : this._volume;
    this._masterGain.gain.cancelScheduledValues(this._ctx.currentTime);
    this._masterGain.gain.setValueAtTime(this._masterGain.gain.value, this._ctx.currentTime);
    this._masterGain.gain.linearRampToValueAtTime(target, this._ctx.currentTime + 0.08);
  }

  private _startMusicLoop(theme: MusicTheme, gainNode: GainNode): number | null {
    if (typeof window === "undefined") return null;
    const ctx = this._ctx;
    if (!ctx) return null;
    const config = MUSIC_THEMES[theme];
    if (!config) return null;

    let chordIndex = 0;
    const chordDurationSeconds = 1.8;
    const beatMs = Math.max(500, Math.round((60_000 / config.bpm) * 2));

    const playChord = () => {
      if (!this._ctx || this._muted) return;
      const chord = config.progression[chordIndex % config.progression.length] ?? [];
      chordIndex++;
      const now = this._ctx.currentTime;
      for (let i = 0; i < chord.length; i++) {
        const midi = chord[i];
        if (typeof midi !== "number") continue;
        const osc = this._ctx.createOscillator();
        const voiceGain = this._ctx.createGain();
        osc.type = config.wave;
        osc.frequency.setValueAtTime(midiToFrequency(midi), now);
        voiceGain.gain.setValueAtTime(0.0001, now);
        const voiceLevel = this._targetMusicGain(theme) * (config.gain + i * 0.012);
        voiceGain.gain.linearRampToValueAtTime(voiceLevel, now + 0.18);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + chordDurationSeconds);
        osc.connect(voiceGain);
        voiceGain.connect(gainNode);
        osc.start(now);
        osc.stop(now + chordDurationSeconds + 0.08);
      }
    };

    playChord();
    return window.setInterval(playChord, beatMs);
  }

  private _targetMusicGain(theme: MusicTheme): number {
    const config = MUSIC_THEMES[theme];
    const base = config ? config.gain : 0.08;
    return Math.max(0, base * DEFAULT_MUSIC_LEVEL * (this._muted ? 0 : this._volume));
  }

  private _syncActiveMusicGain(rampMs: number): void {
    if (!this._ctx || !this._activeMusic) return;
    const target = this._targetMusicGain(this._activeMusic.theme);
    const now = this._ctx.currentTime;
    this._activeMusic.gainNode.gain.cancelScheduledValues(now);
    this._activeMusic.gainNode.gain.setValueAtTime(this._activeMusic.gainNode.gain.value, now);
    this._activeMusic.gainNode.gain.linearRampToValueAtTime(target, now + rampMs / 1000);
  }

  private _clearRetiringMusic(): void {
    const retiring = this._retiringMusic;
    if (!retiring) return;
    if (retiring.timeoutId !== null) {
      window.clearTimeout(retiring.timeoutId);
    }
    if (retiring.intervalId !== null) {
      window.clearInterval(retiring.intervalId);
    }
    try {
      retiring.gainNode.disconnect();
    } catch {
      // disconnected already
    }
    this._retiringMusic = null;
  }

  private _emitAudioEvent(type: string, payload?: unknown): void {
    if (!this._e2eEnabled || typeof window === "undefined") return;
    const store = window.__FLIMFLAM_E2E__ ?? {};
    window.__FLIMFLAM_E2E__ = store;
    window.__flimflamTestHooks = store;
    if (!store.audioEvents) {
      store.audioEvents = [];
    }
    const events = store.audioEvents;
    events.push({ ts: Date.now(), type, payload });
  }
}

export function emitMotionEvent(type: string, payload?: unknown): void {
  if (typeof window === "undefined") return;
  const e2eEnabled =
    process.env.NEXT_PUBLIC_FLIMFLAM_E2E === "1" || process.env.FLIMFLAM_E2E === "1";
  if (!e2eEnabled) return;

  const store = window.__FLIMFLAM_E2E__ ?? {};
  window.__FLIMFLAM_E2E__ = store;
  window.__flimflamTestHooks = store;
  if (!store.motionEvents) {
    store.motionEvents = [];
  }
  store.motionEvents.push({ ts: Date.now(), type, payload });
}

export function emitAudioEvent(type: string, payload?: unknown): void {
  if (typeof window === "undefined") return;
  const e2eEnabled =
    process.env.NEXT_PUBLIC_FLIMFLAM_E2E === "1" || process.env.FLIMFLAM_E2E === "1";
  if (!e2eEnabled) return;

  const store = window.__FLIMFLAM_E2E__ ?? {};
  window.__FLIMFLAM_E2E__ = store;
  window.__flimflamTestHooks = store;
  if (!store.audioEvents) {
    store.audioEvents = [];
  }
  store.audioEvents.push({ ts: Date.now(), type, payload });
}

/** Global singleton — import this everywhere. */
export const soundManager = new SoundManager();

// Convenience shortcuts for common sounds
export const sounds = {
  click: () => soundManager.playSfx("ui:click"),
  select: () => soundManager.playSfx("ui:select"),
  buzz: () => soundManager.playSfx("game:buzz"),
  reveal: () => soundManager.playSfx("game:reveal"),
  tick: () => soundManager.playSfx("game:tick"),
  whoosh: () => soundManager.playSfx("game:whoosh"),
  correct: () => soundManager.playSfx("game:correct"),
  strike: () => soundManager.playSfx("game:strike"),
  win: () => soundManager.playSfx("celebration:win"),
  confetti: () => soundManager.playSfx("celebration:confetti"),
  dim: () => soundManager.playSfx("game:dim"),
  cardFlip: () => soundManager.playSfx("brain.board.cardflip"),
  nearMiss: () => soundManager.playSfx("game:near-miss"),
  goldenRain: () => soundManager.playSfx("celebration:golden-rain"),
  powerPlay: () => soundManager.playSfx("brain.board.powerplay"),
  allIn: () => soundManager.playSfx("brain.board.allin"),
  speedBonus: () => soundManager.playSfx("game:speed-bonus"),
};

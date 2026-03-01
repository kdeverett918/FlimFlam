import { Howl } from "howler";

export type SoundCategory = "ui" | "game" | "celebration" | "ambient";

export interface SoundConfig {
  src: string;
  sprite?: Record<string, [number, number] | [number, number, boolean]>;
  volume?: number;
}

const STORAGE_KEY = "flimflam-volume";
const DEFAULT_VOLUME = 0.7;

function getStoredVolume(): number {
  if (typeof window === "undefined") return DEFAULT_VOLUME;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, String(vol));
  } catch {
    // localStorage unavailable
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

class SoundManager {
  private _howls = new Map<string, Howl>();
  private _volume: number;
  private _muted: boolean;
  private _listeners = new Set<() => void>();

  constructor() {
    this._volume = getStoredVolume();
    this._muted = prefersReducedMotion();
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
    for (const howl of this._howls.values()) {
      howl.volume(this._volume);
    }
    this._notify();
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    for (const howl of this._howls.values()) {
      howl.mute(muted);
    }
    this._notify();
  }

  toggleMute(): void {
    this.setMuted(!this._muted);
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
    if (this._muted) return;
    const howl = this._howls.get(id);
    if (!howl) return;
    if (spriteId) {
      howl.play(spriteId);
    } else {
      howl.play();
    }
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
}

/** Global singleton — import this everywhere. */
export const soundManager = new SoundManager();

// Convenience shortcuts for common sounds
export const sounds = {
  click: () => soundManager.play("ui", "click"),
  select: () => soundManager.play("ui", "select"),
  buzz: () => soundManager.play("game", "buzz"),
  reveal: () => soundManager.play("game", "reveal"),
  tick: () => soundManager.play("game", "tick"),
  whoosh: () => soundManager.play("game", "whoosh"),
  win: () => soundManager.play("celebration", "win"),
  confetti: () => soundManager.play("celebration", "confetti"),
};

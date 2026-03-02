"use client";

import { useCallback, useEffect, useState } from "react";
import { soundManager } from "../lib/audio";

export interface UseAudioReturn {
  volume: number;
  muted: boolean;
  setVolume: (vol: number) => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  play: (id: string, spriteId?: string) => void;
}

export function useAudio(): UseAudioReturn {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return soundManager.subscribe(() => forceUpdate((n) => n + 1));
  }, []);

  const setVolume = useCallback((vol: number) => soundManager.setVolume(vol), []);
  const setMuted = useCallback((muted: boolean) => soundManager.setMuted(muted), []);
  const toggleMute = useCallback(() => soundManager.toggleMute(), []);
  const play = useCallback((id: string, spriteId?: string) => soundManager.play(id, spriteId), []);

  return {
    volume: soundManager.volume,
    muted: soundManager.muted,
    setVolume,
    setMuted,
    toggleMute,
    play,
  };
}

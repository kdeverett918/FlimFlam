"use client";

import { soundManager, useAudio } from "@flimflam/ui";
import { Volume2, VolumeOff } from "lucide-react";
import { useState } from "react";

export function VolumeControl() {
  const { volume, muted, setVolume, toggleMute } = useAudio();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-8 left-8 z-40 flex items-end gap-3">
      <button
        type="button"
        onClick={() => {
          soundManager.unlock();
          if (open) {
            toggleMute();
          } else {
            setOpen(true);
          }
        }}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-bg-surface/80 text-text-muted backdrop-blur transition-all hover:bg-bg-surface hover:text-text-primary active:scale-95"
        aria-label={muted ? "Unmute audio" : "Mute audio"}
      >
        {muted ? <VolumeOff className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      {open && (
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-bg-surface/90 px-4 py-2 backdrop-blur">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => {
              const val = Number.parseFloat(e.target.value);
              setVolume(val);
              if (val > 0 && muted) toggleMute();
            }}
            className="h-1 w-24 cursor-pointer accent-primary"
            aria-label="Volume"
          />
          <span className="w-8 text-right font-mono text-xs text-text-muted">
            {muted ? "0" : Math.round(volume * 100)}
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-1 text-xs text-text-muted hover:text-text-primary"
            aria-label="Close volume control"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}

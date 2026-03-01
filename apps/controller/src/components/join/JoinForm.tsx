"use client";

import { AVATAR_COLORS, MAX_NAME_LENGTH, ROOM_CODE_LENGTH } from "@flimflam/shared";
import { GlassPanel, haptics } from "@flimflam/ui";
import { useCallback, useRef, useState } from "react";
import { AvatarPicker } from "./AvatarPicker";

const CODE_SLOT_KEYS = ["slot-A", "slot-B", "slot-C", "slot-D"] as const;

interface JoinFormProps {
  initialCode?: string;
  onJoin: (code: string, name: string, color: string) => Promise<boolean>;
  error: string | null;
  disabled?: boolean;
}

export function JoinForm({ initialCode = "", onJoin, error, disabled }: JoinFormProps) {
  const [codeChars, setCodeChars] = useState<string[]>(() => {
    const chars = initialCode.toUpperCase().split("").slice(0, ROOM_CODE_LENGTH);
    while (chars.length < ROOM_CODE_LENGTH) {
      chars.push("");
    }
    return chars;
  });
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(AVATAR_COLORS[0] ?? "#6366f1");
  const [isJoining, setIsJoining] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setInputRef = useCallback(
    (index: number) => (el: HTMLInputElement | null) => {
      inputRefs.current[index] = el;
    },
    [],
  );

  const handleCodeInput = useCallback((index: number, value: string) => {
    const char = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(-1);

    setCodeChars((prev) => {
      const next = [...prev];
      next[index] = char;
      return next;
    });

    if (char && index < ROOM_CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleCodeKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !codeChars[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        setCodeChars((prev) => {
          const next = [...prev];
          next[index - 1] = "";
          return next;
        });
        e.preventDefault();
      }
    },
    [codeChars],
  );

  const handleCodePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, ROOM_CODE_LENGTH);

    const newChars: string[] = [];
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      newChars.push(pasted[i] ?? "");
    }
    setCodeChars(newChars);

    const focusIndex = Math.min(pasted.length, ROOM_CODE_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }, []);

  const code = codeChars.join("");
  const canJoin = code.length === ROOM_CODE_LENGTH && name.trim().length > 0 && !isJoining;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canJoin) return;

      haptics.confirm();
      setIsJoining(true);
      try {
        await onJoin(code, name.trim(), selectedColor);
      } finally {
        setIsJoining(false);
      }
    },
    [canJoin, code, name, selectedColor, onJoin],
  );

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col items-center gap-6">
      {/* Room code inputs */}
      <div className="w-full">
        <span className="mb-2 block font-body text-sm font-medium text-text-muted">Room Code</span>
        <div className="flex justify-center gap-3">
          {codeChars.map((char, index) => (
            <input
              key={CODE_SLOT_KEYS[index]}
              ref={setInputRef(index)}
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={1}
              value={char}
              onChange={(e) => handleCodeInput(index, e.target.value)}
              onKeyDown={(e) => handleCodeKeyDown(index, e)}
              onPaste={handleCodePaste}
              onFocus={() => haptics.tap()}
              disabled={disabled || isJoining}
              className="glass-input h-14 w-12 min-[390px]:h-16 min-[390px]:w-16 rounded-xl text-center font-mono text-2xl text-text-primary uppercase transition-all focus:border-primary/50 focus:shadow-[0_0_12px_oklch(0.72_0.22_25_/_0.15)] disabled:opacity-50"
              aria-label={`Room code character ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Name input */}
      <div className="w-full">
        <label
          className="mb-2 block font-body text-sm font-medium text-text-muted"
          htmlFor="player-name"
        >
          Your Name
        </label>
        <input
          id="player-name"
          type="text"
          maxLength={MAX_NAME_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={(e) => {
            haptics.tap();
            const el = e.target;
            setTimeout(() => {
              if (document.activeElement === el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }, 300);
          }}
          disabled={disabled || isJoining}
          placeholder="Enter your name"
          className="glass-input h-14 w-full rounded-xl px-4 font-body text-lg text-text-primary placeholder:text-text-dim transition-all focus:border-primary/50 focus:shadow-[0_0_12px_oklch(0.72_0.22_25_/_0.15)] disabled:opacity-50"
        />
        <span className="mt-1 block text-right font-mono text-xs text-text-muted">
          {name.length}/{MAX_NAME_LENGTH}
        </span>
      </div>

      {/* Avatar color picker */}
      <AvatarPicker selectedColor={selectedColor} onSelect={setSelectedColor} />

      {/* Error message */}
      {error && (
        <GlassPanel className="w-full border-red-500/30 bg-red-500/10 px-4 py-3 text-center font-body text-sm text-red-400">
          {error}
        </GlassPanel>
      )}

      {/* Join button */}
      <button
        type="submit"
        disabled={!canJoin || disabled}
        className="h-14 w-full rounded-xl bg-primary font-display text-xl text-white uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100"
        style={{
          boxShadow: canJoin && !disabled ? "0 0 20px oklch(0.72 0.22 25 / 0.3)" : "none",
        }}
      >
        {isJoining ? (
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Joining...
          </span>
        ) : (
          "Join"
        )}
      </button>
    </form>
  );
}

"use client";

import { AVATAR_COLORS, MAX_NAME_LENGTH, ROOM_CODE_LENGTH } from "@partyline/shared";
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
  const [selectedColor, setSelectedColor] = useState<string>(AVATAR_COLORS[0] ?? "#FF3366");
  const [isJoining, setIsJoining] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setInputRef = useCallback(
    (index: number) => (el: HTMLInputElement | null) => {
      inputRefs.current[index] = el;
    },
    [],
  );

  const handleCodeInput = useCallback((index: number, value: string) => {
    // Only allow valid room code chars (alphanumeric)
    const char = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(-1);

    setCodeChars((prev) => {
      const next = [...prev];
      next[index] = char;
      return next;
    });

    // Auto-advance to next input
    if (char && index < ROOM_CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleCodeKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !codeChars[index] && index > 0) {
        // Go to previous input on backspace when current is empty
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

    // Focus the input after the last pasted character
    const focusIndex = Math.min(pasted.length, ROOM_CODE_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }, []);

  const code = codeChars.join("");
  const canJoin = code.length === ROOM_CODE_LENGTH && name.trim().length > 0 && !isJoining;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canJoin) return;

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
        <span className="mb-2 block text-sm font-medium text-text-muted">Room Code</span>
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
              disabled={disabled || isJoining}
              className="h-16 w-16 rounded-xl border-3 border-text-muted/30 bg-bg-card text-center font-display text-2xl text-text-primary uppercase transition-colors focus:border-accent-1 focus:outline-none disabled:opacity-50"
              aria-label={`Room code character ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Name input */}
      <div className="w-full">
        <label className="mb-2 block text-sm font-medium text-text-muted" htmlFor="player-name">
          Your Name
        </label>
        <input
          id="player-name"
          type="text"
          maxLength={MAX_NAME_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={(e) => {
            // Scroll into view for keyboard awareness
            setTimeout(() => {
              e.target.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 300);
          }}
          disabled={disabled || isJoining}
          placeholder="Enter your name"
          className="h-14 w-full rounded-xl border-2 border-text-muted/30 bg-bg-card px-4 text-lg text-text-primary placeholder:text-text-muted/50 transition-colors focus:border-accent-1 focus:outline-none disabled:opacity-50"
        />
        <span className="mt-1 block text-right text-xs text-text-muted">
          {name.length}/{MAX_NAME_LENGTH}
        </span>
      </div>

      {/* Avatar color picker */}
      <AvatarPicker selectedColor={selectedColor} onSelect={setSelectedColor} />

      {/* Error message */}
      {error && (
        <div className="w-full rounded-lg bg-accent-1/20 px-4 py-3 text-center text-sm text-accent-1">
          {error}
        </div>
      )}

      {/* Join button */}
      <button
        type="submit"
        disabled={!canJoin || disabled}
        className="h-14 w-full rounded-xl bg-accent-1 font-display text-xl text-white uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100"
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

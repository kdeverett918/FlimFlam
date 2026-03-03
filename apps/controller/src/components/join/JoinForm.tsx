"use client";

import { AVATAR_COLORS, MAX_NAME_LENGTH, ROOM_CODE_LENGTH } from "@flimflam/shared";
import { GlassPanel, haptics } from "@flimflam/ui";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const prevCanJoinRef = useRef(false);

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

  // Track canJoin transitions for spring animation
  useEffect(() => {
    prevCanJoinRef.current = canJoin;
  }, [canJoin]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canJoin) return;

      haptics.confirm();
      setIsJoining(true);
      try {
        const success = await onJoin(code, name.trim(), selectedColor);
        if (success) {
          setShowSuccess(true);
        }
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
        <span className="mb-2 block text-center font-body text-sm font-semibold text-text-primary/80">
          Room Code
        </span>
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
              className="glass-input h-14 w-12 min-[390px]:h-16 min-[390px]:w-16 rounded-xl text-center font-mono text-2xl font-bold text-text-primary uppercase transition-all focus:border-primary/60 focus:shadow-[0_0_16px_oklch(0.75_0.22_25_/_0.25)] disabled:opacity-50"
              style={{
                borderColor: char ? "oklch(0.75 0.22 25 / 0.4)" : undefined,
                boxShadow: char ? "0 0 12px oklch(0.75 0.22 25 / 0.15)" : undefined,
              }}
              aria-label={`Room code character ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Name input */}
      <div className="w-full">
        <label
          className="mb-2 block text-center font-body text-sm font-semibold text-text-primary/80"
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
          className="glass-input h-14 w-full rounded-xl px-4 font-body text-lg font-medium text-text-primary placeholder:text-text-dim transition-all focus:border-primary/60 focus:shadow-[0_0_16px_oklch(0.75_0.22_25_/_0.25)] disabled:opacity-50"
        />
        <span className="mt-1 block text-center font-mono text-xs text-text-muted">
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

      {/* Join button with spring animation */}
      <motion.button
        type="submit"
        disabled={!canJoin || disabled}
        animate={{
          scale: canJoin && !disabled ? 1 : 0.95,
          opacity: canJoin && !disabled ? 1 : 0.4,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        whileTap={canJoin ? { scale: 0.95 } : {}}
        className="h-14 w-full rounded-xl bg-primary font-display text-xl font-bold text-white uppercase tracking-wider transition-shadow disabled:active:scale-100"
        style={{
          boxShadow: canJoin && !disabled ? "0 0 24px oklch(0.75 0.22 25 / 0.4)" : "none",
        }}
      >
        {showSuccess ? (
          <span className="inline-flex items-center gap-2">
            <Check className="h-5 w-5" />
            Joined!
          </span>
        ) : isJoining ? (
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Joining...
          </span>
        ) : (
          "Join"
        )}
      </motion.button>
    </form>
  );
}

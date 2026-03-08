"use client";

import { AVATAR_COLORS, MAX_NAME_LENGTH, ROOM_CODE_LENGTH } from "@flimflam/shared";
import { GlassPanel, fireParticleEffect, haptics, sounds, useReducedMotion } from "@flimflam/ui";
import { Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

const CODE_SLOT_KEYS = ["slot-A", "slot-B", "slot-C", "slot-D"] as const;

interface ActionPanelProps {
  initialCode?: string;
  onJoin: (code: string, name: string, color: string) => Promise<boolean>;
  onCreateRoom: (name: string, color: string) => void;
  creating: boolean;
  error: string | null;
}

export function ActionPanel({
  initialCode = "",
  onJoin,
  onCreateRoom,
  creating,
  error,
}: ActionPanelProps) {
  const [mode, setMode] = useState<"join" | "create">(initialCode ? "join" : "join");
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
  const nameInputRef = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();

  const setInputRef = useCallback(
    (index: number) => (el: HTMLInputElement | null) => {
      inputRefs.current[index] = el;
    },
    [],
  );

  // Auto-fill code from URL with spring stagger
  useEffect(() => {
    if (initialCode) {
      const chars = initialCode.toUpperCase().split("").slice(0, ROOM_CODE_LENGTH);
      while (chars.length < ROOM_CODE_LENGTH) chars.push("");
      setCodeChars(chars);
      // Auto-focus name field when code is pre-filled
      setTimeout(() => nameInputRef.current?.focus(), 400);
    }
  }, [initialCode]);

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

  const handleColorSelect = useCallback(
    (color: string) => {
      setSelectedColor(color);
      sounds.select();
      if (!reducedMotion) {
        // Small confetti pop on color selection
        void fireParticleEffect("confetti-burst", { scale: 0.3 });
      }
    },
    [reducedMotion],
  );

  const code = codeChars.join("");
  const canJoin = code.length === ROOM_CODE_LENGTH && name.trim().length > 0 && !isJoining;

  const handleJoinSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canJoin) return;

      setIsJoining(true);
      haptics.confirm();
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

  const handleCreateSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      haptics.confirm();
      onCreateRoom(name.trim(), selectedColor);
    },
    [name, selectedColor, onCreateRoom],
  );

  // Keyboard avoidance via visualViewport resize
  useEffect(() => {
    if (typeof window === "undefined") return;
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleResize = () => {
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
        (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    viewport.addEventListener("resize", handleResize);
    return () => viewport.removeEventListener("resize", handleResize);
  }, []);

  return (
    <motion.div
      className="relative z-10 w-full max-w-md"
      initial={reducedMotion ? false : { opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2.0, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassPanel variant="glass" rounded="2xl" depth="deep" className="p-6">
        <AnimatePresence mode="wait">
          {mode === "join" ? (
            <motion.div
              key="join-panel"
              initial={reducedMotion ? false : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="mb-5 text-center font-display text-xl font-bold text-text-primary uppercase tracking-wider sm:text-2xl">
                Join Game
              </h2>

              <form onSubmit={handleJoinSubmit} className="flex flex-col items-center gap-5">
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
                        disabled={isJoining}
                        className="glass-input h-16 w-14 rounded-xl text-center font-mono text-2xl font-bold text-text-primary uppercase transition-all focus:border-primary/60 focus:shadow-[0_0_16px_oklch(0.75_0.22_25_/_0.25)] disabled:opacity-50"
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
                    htmlFor="action-player-name"
                  >
                    Your Name
                  </label>
                  <input
                    ref={nameInputRef}
                    id="action-player-name"
                    type="text"
                    maxLength={MAX_NAME_LENGTH}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isJoining}
                    placeholder="Enter your name"
                    className="glass-input h-14 w-full rounded-xl px-4 font-body text-lg font-medium text-text-primary placeholder:text-text-dim transition-all focus:border-primary/60 focus:shadow-[0_0_16px_oklch(0.75_0.22_25_/_0.25)] disabled:opacity-50"
                  />
                  <span className="mt-1 block text-center font-mono text-xs text-text-muted">
                    {name.length}/{MAX_NAME_LENGTH}
                  </span>
                </div>

                {/* Color picker strip — horizontal scroll, 56px circles */}
                <div className="w-full">
                  <span className="mb-2 block text-center font-body text-sm font-medium text-text-muted">
                    Pick your color
                  </span>
                  <div className="flex flex-wrap justify-center gap-3 px-2">
                    {AVATAR_COLORS.map((color) => {
                      const isSelected = selectedColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleColorSelect(color)}
                          className="relative flex flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-90"
                          style={{
                            width: 44,
                            height: 44,
                            backgroundColor: color,
                            boxShadow: isSelected
                              ? `0 0 0 3px oklch(0.09 0.02 250), 0 0 0 5px ${color}, 0 0 24px ${color}60`
                              : `0 2px 8px ${color}30`,
                            transform: isSelected ? "scale(1.15)" : "scale(1)",
                          }}
                          aria-label={`Select color ${color}`}
                          aria-pressed={isSelected}
                        >
                          {isSelected && (
                            <Check className="h-5 w-5 text-white drop-shadow-md" strokeWidth={3} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <GlassPanel className="w-full border-red-500/30 bg-red-500/10 px-4 py-3 text-center font-body text-sm text-red-400">
                    {error}
                  </GlassPanel>
                )}

                {/* Join button with glow-breathe when valid */}
                <motion.button
                  type="submit"
                  disabled={!canJoin}
                  data-testid="join-form-submit"
                  animate={{
                    scale: canJoin ? 1 : 0.95,
                    opacity: canJoin ? 1 : 0.4,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  whileTap={canJoin ? { scale: 0.95 } : {}}
                  className={`h-14 w-full rounded-xl font-display text-xl font-bold text-white uppercase tracking-wider transition-shadow disabled:active:scale-100 sm:h-16 sm:text-2xl ${
                    canJoin ? "animate-glow-breathe-box" : ""
                  }`}
                  style={{
                    background: canJoin
                      ? "linear-gradient(135deg, oklch(0.75 0.22 25), oklch(0.72 0.25 350))"
                      : "oklch(0.3 0.02 250)",
                    boxShadow: canJoin
                      ? "0 0 30px oklch(0.75 0.22 25 / 0.4), 0 4px 20px oklch(0 0 0 / 0.3)"
                      : "none",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Radial glow bloom behind when valid */}
                  {canJoin && (
                    <div
                      className="pointer-events-none absolute inset-0 rounded-xl"
                      style={{
                        background:
                          "radial-gradient(ellipse at center, oklch(0.75 0.22 25 / 0.3) 0%, transparent 70%)",
                      }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative">
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
                      "JOIN"
                    )}
                  </span>
                </motion.button>
              </form>

              {/* Switch to Create mode */}
              <button
                type="button"
                onClick={() => {
                  setMode("create");
                  sounds.click();
                }}
                className="mt-4 w-full rounded-xl border border-white/15 bg-white/[0.04] py-3 font-display text-sm font-semibold text-text-muted uppercase tracking-wider transition-all hover:border-white/25 hover:bg-white/[0.08] hover:text-text-primary"
              >
                Or create a new game
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="create-panel"
              initial={reducedMotion ? false : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="mb-5 text-center font-display text-xl font-bold text-text-primary uppercase tracking-wider sm:text-2xl">
                Create Game
              </h2>

              <form onSubmit={handleCreateSubmit} className="flex flex-col items-center gap-5">
                {/* Name input */}
                <div className="w-full">
                  <label
                    className="mb-2 block text-center font-body text-sm font-semibold text-text-primary/80"
                    htmlFor="create-host-name"
                  >
                    Your Name
                  </label>
                  <input
                    id="create-host-name"
                    type="text"
                    maxLength={MAX_NAME_LENGTH}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="glass-input h-14 w-full rounded-xl px-4 font-body text-lg font-medium text-text-primary placeholder:text-text-dim transition-all focus:border-primary/60 focus:shadow-[0_0_16px_oklch(0.75_0.22_25_/_0.25)]"
                  />
                </div>

                {/* Color picker */}
                <div className="w-full">
                  <span className="mb-2 block text-center font-body text-sm font-medium text-text-muted">
                    Pick your color
                  </span>
                  <div className="flex flex-wrap justify-center gap-3 px-2">
                    {AVATAR_COLORS.map((color) => {
                      const isSelected = selectedColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleColorSelect(color)}
                          className="relative flex flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-90"
                          style={{
                            width: 44,
                            height: 44,
                            backgroundColor: color,
                            boxShadow: isSelected
                              ? `0 0 0 3px oklch(0.09 0.02 250), 0 0 0 5px ${color}, 0 0 24px ${color}60`
                              : `0 2px 8px ${color}30`,
                            transform: isSelected ? "scale(1.15)" : "scale(1)",
                          }}
                          aria-label={`Select color ${color}`}
                          aria-pressed={isSelected}
                        >
                          {isSelected && (
                            <Check className="h-5 w-5 text-white drop-shadow-md" strokeWidth={3} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Create button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  data-testid="create-room-cta"
                  disabled={creating}
                  aria-label="Create a new game room"
                  className="group relative h-14 w-full overflow-hidden rounded-xl font-display text-xl font-black text-white uppercase tracking-wider transition-all duration-300 hover:shadow-[0_0_50px_oklch(0.75_0.22_25/0.5)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep disabled:cursor-not-allowed disabled:opacity-50 sm:h-16 sm:text-2xl"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.75 0.22 25), oklch(0.72 0.25 350))",
                    boxShadow: "0 0 30px oklch(0.75 0.22 25 / 0.4), 0 4px 20px oklch(0 0 0 / 0.3)",
                  }}
                >
                  <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <span className="relative flex items-center justify-center gap-3">
                    {creating ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin" />
                        CREATING...
                      </>
                    ) : (
                      "CREATE GAME"
                    )}
                  </span>
                </motion.button>
              </form>

              {/* Switch back to Join mode */}
              <button
                type="button"
                onClick={() => {
                  setMode("join");
                  sounds.click();
                }}
                className="mt-4 w-full rounded-xl border border-white/15 bg-white/[0.04] py-3 font-display text-sm font-semibold text-text-muted uppercase tracking-wider transition-all hover:border-white/25 hover:bg-white/[0.08] hover:text-text-primary"
              >
                Or join an existing game
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassPanel>
    </motion.div>
  );
}

"use client";

import { haptics } from "@flimflam/ui";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_CHARS = 80;
const MIN_SUBMIT_INTERVAL_MS = 350;

interface QuickGuessInputProps {
  prompt?: string;
  placeholder?: string;
  disabled?: boolean;
  onSubmit: (text: string) => void;
}

export function QuickGuessInput({
  prompt,
  placeholder = "Type your guess...",
  disabled = false,
  onSubmit,
}: QuickGuessInputProps) {
  const [text, setText] = useState("");
  const [justSent, setJustSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSubmitAtRef = useRef(0);

  const charCount = text.length;
  const isNearLimit = charCount >= MAX_CHARS - 15;
  const isAtLimit = charCount >= MAX_CHARS;

  useEffect(() => {
    if (!justSent) return;
    const timeoutId = setTimeout(() => setJustSent(false), 900);
    return () => clearTimeout(timeoutId);
  }, [justSent]);

  useEffect(() => {
    if (!disabled) return;
    setText("");
    setJustSent(false);
  }, [disabled]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setText(value);
    }
  }, []);

  const submit = useCallback(() => {
    if (disabled) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    const now = Date.now();
    if (now - lastSubmitAtRef.current < MIN_SUBMIT_INTERVAL_MS) {
      return;
    }
    lastSubmitAtRef.current = now;

    haptics.confirm();
    onSubmit(trimmed);
    setText("");
    setJustSent(true);
    inputRef.current?.focus();
  }, [disabled, onSubmit, text]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    },
    [submit],
  );

  return (
    <div className="flex w-full flex-col gap-4 px-4">
      {prompt && (
        <p className="text-center font-body text-lg font-medium text-text-primary">{prompt}</p>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            haptics.tap();
            const el = e.target;
            setTimeout(() => {
              if (document.activeElement === el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }, 300);
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          inputMode="text"
          className="glass-input h-14 w-full rounded-xl px-4 font-body text-lg text-text-primary placeholder:text-text-dim transition-all focus:border-accent-1/50 focus:shadow-[0_0_12px_oklch(0.7_0.18_265_/_0.15)] disabled:opacity-50"
        />
        <span
          className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs font-medium transition-colors ${
            isAtLimit ? "text-accent-6" : isNearLimit ? "text-accent-3" : "text-text-muted"
          }`}
        >
          {charCount}/{MAX_CHARS}
        </span>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={disabled || !text.trim()}
        className="h-14 w-full rounded-xl bg-accent-1 font-display text-lg text-white uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100"
        style={{
          boxShadow: text.trim() && !disabled ? "0 0 16px oklch(0.7 0.18 265 / 0.25)" : "none",
        }}
      >
        Guess
      </button>

      {justSent && (
        <p className="text-center font-body text-xs text-text-muted animate-fade-in-up">Sent</p>
      )}
    </div>
  );
}

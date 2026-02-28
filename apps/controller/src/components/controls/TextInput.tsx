"use client";

import { GlassPanel, haptics } from "@partyline/ui";
import { Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface TextInputProps {
  prompt?: string;
  placeholder?: string;
  onSubmit: (text: string) => void;
  maxChars?: number;
  resetNonce?: number;
}

export function TextInput({
  prompt,
  placeholder = "Type your answer...",
  onSubmit,
  maxChars = 140,
  resetNonce,
}: TextInputProps) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastResetNonceRef = useRef<number | undefined>(resetNonce);

  const charCount = text.length;
  const isNearLimit = charCount >= maxChars - 20;
  const isAtLimit = charCount >= maxChars;

  useEffect(() => {
    if (resetNonce === undefined) return;
    if (lastResetNonceRef.current === undefined) {
      lastResetNonceRef.current = resetNonce;
      return;
    }
    if (resetNonce !== lastResetNonceRef.current) {
      lastResetNonceRef.current = resetNonce;
      setSubmitted(false);
    }
  }, [resetNonce]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= maxChars) {
        setText(value);
      }
    },
    [maxChars],
  );

  const handleFocus = useCallback(() => {
    haptics.tap();
    const el = textareaRef.current;
    setTimeout(() => {
      if (el && document.activeElement === el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || submitted) return;

    haptics.confirm();
    onSubmit(trimmed);
    setSubmitted(true);
  }, [text, submitted, onSubmit]);

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-8 animate-fade-in-up">
        <GlassPanel glow className="flex flex-col items-center gap-4 px-8 py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-5/15">
            <Check className="h-7 w-7 text-accent-5" strokeWidth={3} />
          </div>
          <p className="font-display text-xl font-bold text-accent-5">Submitted!</p>
          <p className="font-body text-sm text-text-muted">Waiting for other players...</p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 px-4">
      {prompt && (
        <p className="text-center font-body text-lg font-medium text-text-primary">{prompt}</p>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          rows={4}
          className="glass-input w-full resize-none rounded-xl p-4 font-body text-lg text-text-primary placeholder:text-text-dim transition-all focus:border-accent-1/50 focus:shadow-[0_0_12px_oklch(0.7_0.18_265_/_0.15)]"
        />
        <span
          className={`absolute right-3 bottom-3 font-mono text-xs font-medium transition-colors ${
            isAtLimit ? "text-accent-6" : isNearLimit ? "text-accent-3" : "text-text-muted"
          }`}
        >
          {charCount}/{maxChars}
        </span>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!text.trim()}
        className="h-14 w-full rounded-xl bg-accent-1 font-display text-lg text-white uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100"
        style={{
          boxShadow: text.trim() ? "0 0 16px oklch(0.7 0.18 265 / 0.25)" : "none",
        }}
      >
        Submit
      </button>
    </div>
  );
}

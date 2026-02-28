"use client";

import { useCallback, useRef, useState } from "react";

const MAX_CHARS = 140;

interface TextInputProps {
  prompt?: string;
  placeholder?: string;
  onSubmit: (text: string) => void;
}

export function TextInput({
  prompt,
  placeholder = "Type your answer...",
  onSubmit,
}: TextInputProps) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = text.length;
  const isNearLimit = charCount >= MAX_CHARS - 20;
  const isAtLimit = charCount >= MAX_CHARS;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setText(value);
    }
  }, []);

  const handleFocus = useCallback(() => {
    // Scroll into view for keyboard awareness
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || submitted) return;

    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    onSubmit(trimmed);
    setSubmitted(true);
  }, [text, submitted, onSubmit]);

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-8 animate-fade-in-up">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-2/20">
          <svg
            className="h-8 w-8 text-accent-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
            role="img"
          >
            <title>Checkmark</title>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-xl font-medium text-accent-2">Submitted!</p>
        <p className="text-sm text-text-muted">Waiting for other players...</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 px-4">
      {prompt && <p className="text-center text-lg font-medium text-text-primary">{prompt}</p>}

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          rows={4}
          className="w-full resize-none rounded-xl border-2 border-text-muted/30 bg-bg-card p-4 text-lg text-text-primary placeholder:text-text-muted/50 transition-colors focus:border-accent-1 focus:outline-none"
        />
        <span
          className={`absolute right-3 bottom-3 text-sm font-medium transition-colors ${
            isAtLimit ? "text-accent-1" : isNearLimit ? "text-accent-3" : "text-text-muted"
          }`}
        >
          {charCount}/{MAX_CHARS}
        </span>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!text.trim()}
        className="h-14 w-full rounded-xl bg-accent-1 font-display text-lg text-white uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100"
      >
        Submit
      </button>
    </div>
  );
}

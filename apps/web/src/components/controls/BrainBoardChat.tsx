"use client";

import type { PlayerData } from "@flimflam/shared";
import { GlassPanel, haptics } from "@flimflam/ui";
import { Bot, MessageCircle, Send, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ChatMessage {
  id: string;
  sender: string;
  senderSessionId: string;
  message: string;
  isAI: boolean;
  timestamp: number;
}

interface BrainBoardChatProps {
  messages: ChatMessage[];
  players: PlayerData[];
  mySessionId: string | null;
  onSendMessage: (text: string) => void;
  timerEndsAt: number;
  serverTimeOffset: number;
}

export function BrainBoardChat({
  messages,
  players,
  mySessionId,
  onSendMessage,
  timerEndsAt: _timerEndsAt,
  serverTimeOffset: _serverTimeOffset,
}: BrainBoardChatProps) {
  const safeScrollMarginBottom = "calc(var(--hud-safe-bottom, env(safe-area-inset-bottom)) + 1rem)";
  const [inputText, setInputText] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMessageCountRef = useRef(messages.length);

  // ---------- Auto-scroll on new messages ----------
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const container = scrollContainerRef.current;
      if (container) {
        // Use requestAnimationFrame for smoothest scroll after DOM update
        requestAnimationFrame(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
        });
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  // ---------- Helpers ----------
  const getPlayerColor = useCallback(
    (sessionId: string): string => {
      const player = players.find((p) => p.sessionId === sessionId);
      return player?.avatarColor ?? "#6366f1";
    },
    [players],
  );

  const isMyMessage = useCallback(
    (msg: ChatMessage): boolean => {
      return msg.senderSessionId === mySessionId && !msg.isAI;
    },
    [mySessionId],
  );

  // ---------- Send ----------
  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    haptics.tap();
    onSendMessage(trimmed);
    setInputText("");
    // Refocus the input for rapid-fire messaging
    inputRef.current?.focus();
  }, [inputText, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInputFocus = useCallback(() => {
    haptics.tap();
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 300);
  }, []);

  // ---------- Typing indicator ----------
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
  const showTypingIndicator = lastMessage !== undefined && !lastMessage.isAI;

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="shrink-0 px-4 pb-2 pt-3">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-accent-brainboard" strokeWidth={2.5} />
          <h2 className="font-display text-xl font-black tracking-wide text-accent-brainboard uppercase">
            Topic Lab
          </h2>
          <Sparkles className="h-5 w-5 text-accent-brainboard" strokeWidth={2.5} />
        </div>
        <p className="mt-0.5 text-center font-body text-xs text-text-muted">
          Tell the AI what you want to play!
        </p>
      </div>

      {/* ── Chat Messages ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scroll-smooth px-3 pb-2"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 opacity-50">
            <MessageCircle className="h-10 w-10 text-text-dim" strokeWidth={1.5} />
            <p className="font-body text-sm text-text-dim">Start chatting about topics!</p>
          </div>
        )}

        <div className="flex flex-col gap-2.5 py-2">
          {messages.map((msg) => {
            const mine = isMyMessage(msg);

            // ── AI Message ──
            if (msg.isAI) {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28, duration: 0.2 }}
                  className="flex justify-start"
                >
                  <GlassPanel
                    className="max-w-[85%] animate-glass-breathe border-accent-brainboard/20 px-3.5 py-3"
                    glow
                    glowColor="oklch(0.68 0.22 265 / 0.12)"
                    rounded="2xl"
                  >
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-brainboard/20">
                        <Bot className="h-3 w-3 text-accent-brainboard" strokeWidth={2.5} />
                      </div>
                      <span className="font-display text-[11px] font-bold text-accent-brainboard uppercase tracking-wider">
                        AI Host
                      </span>
                      <Sparkles className="h-3 w-3 text-accent-brainboard/50" strokeWidth={2} />
                    </div>
                    <p className="font-body text-sm leading-relaxed text-text-primary">
                      {msg.message}
                    </p>
                  </GlassPanel>
                </motion.div>
              );
            }

            // ── My Message ──
            if (mine) {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28, duration: 0.2 }}
                  className="flex justify-end"
                >
                  <GlassPanel
                    className="max-w-[75%] border-accent-brainboard/25 bg-accent-brainboard/15 px-3.5 py-3"
                    rounded="2xl"
                  >
                    <div className="mb-1 flex items-center justify-end gap-1.5">
                      <span className="rounded bg-accent-brainboard/15 px-1.5 py-0.5 font-display text-[10px] font-bold text-accent-brainboard uppercase tracking-wider">
                        You
                      </span>
                    </div>
                    <p className="font-body text-sm leading-relaxed text-text-primary">
                      {msg.message}
                    </p>
                  </GlassPanel>
                </motion.div>
              );
            }

            // ── Other Player Message ──
            const avatarColor = getPlayerColor(msg.senderSessionId);
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 28, duration: 0.2 }}
                className="flex justify-start"
              >
                <GlassPanel
                  className="max-w-[75%] px-3.5 py-3"
                  rounded="2xl"
                  accentColor={avatarColor}
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <div
                      className="h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{ backgroundColor: avatarColor }}
                    />
                    <span className="font-body text-[11px] font-semibold text-text-muted">
                      {msg.sender}
                    </span>
                  </div>
                  <p className="font-body text-sm leading-relaxed text-text-primary">
                    {msg.message}
                  </p>
                </GlassPanel>
              </motion.div>
            );
          })}

          {/* ── AI Typing Indicator ── */}
          {showTypingIndicator && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex justify-start"
            >
              <GlassPanel className="border-accent-brainboard/15 px-4 py-3" rounded="2xl">
                <div className="mb-1 flex items-center gap-1.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-brainboard/20">
                    <Bot className="h-3 w-3 text-accent-brainboard" strokeWidth={2.5} />
                  </div>
                  <span className="font-display text-[11px] font-bold text-accent-brainboard/60 uppercase tracking-wider">
                    AI Host
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full bg-accent-brainboard/50 animate-dot-pulse"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="inline-block h-2 w-2 rounded-full bg-accent-brainboard/50 animate-dot-pulse"
                    style={{ animationDelay: "200ms" }}
                  />
                  <span
                    className="inline-block h-2 w-2 rounded-full bg-accent-brainboard/50 animate-dot-pulse"
                    style={{ animationDelay: "400ms" }}
                  />
                </div>
              </GlassPanel>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Input Area ── */}
      <div
        className="shrink-0 border-t border-white/10 px-3 pt-2.5"
        style={{
          paddingBottom: "calc(var(--hud-safe-bottom, env(safe-area-inset-bottom)) + 0.5rem)",
        }}
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value.slice(0, 200))}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder="Suggest a topic..."
            maxLength={200}
            className="glass-input h-12 flex-1 rounded-full px-4 font-body text-sm text-text-primary placeholder:text-text-dim transition-all focus:border-accent-brainboard/50 focus:shadow-[0_0_12px_oklch(0.68_0.22_265_/_0.2)]"
            style={{ scrollMarginBottom: safeScrollMarginBottom }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim()}
            aria-label="Send message"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-brainboard transition-all active:scale-90 disabled:opacity-35 disabled:active:scale-100"
            style={{
              boxShadow: inputText.trim() ? "0 0 16px oklch(0.68 0.22 265 / 0.35)" : "none",
              scrollMarginBottom: safeScrollMarginBottom,
            }}
          >
            <Send className="h-5 w-5 text-white" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

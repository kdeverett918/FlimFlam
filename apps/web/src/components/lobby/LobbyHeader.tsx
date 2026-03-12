"use client";

import { resolveNextPublicHostUrl } from "@flimflam/shared";
import { GlassPanel, haptics, useReducedMotion } from "@flimflam/ui";
import { ArrowLeft, Check, Copy, QrCode, Share2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";

interface LobbyHeaderProps {
  roomCode: string;
  onLeave?: () => void;
}

export function LobbyHeader({ roomCode, onLeave }: LobbyHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const reducedMotion = useReducedMotion();

  const baseUrl = resolveNextPublicHostUrl();
  const joinUrl = `${baseUrl}/room/${roomCode}`;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(joinUrl, {
      color: { dark: "#f0ede6", light: "#00000000" },
      margin: 1,
      width: 200,
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [joinUrl]);

  const handleCopyCode = useCallback(async () => {
    haptics.tap();
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [roomCode]);

  const handleShare = useCallback(async () => {
    haptics.tap();
    const shareData = {
      title: "Join my FLIMFLAM game!",
      text: `Join my FLIMFLAM game! Code: ${roomCode}`,
      url: joinUrl,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or share failed
      }
    }

    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [roomCode, joinUrl]);

  const codeChars = roomCode.split("");

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-1" data-testid="lobby-share-panel">
        {/* Back/Leave button */}
        {onLeave && (
          <button
            type="button"
            onClick={() => {
              haptics.tap();
              onLeave();
            }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/8 text-text-muted transition-colors hover:border-primary/40 hover:text-text-primary"
            aria-label="Leave room"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        {/* Room code — large monospace, copy on tap */}
        <button
          type="button"
          onClick={handleCopyCode}
          data-testid="share-room-code"
          className="group flex items-center gap-1.5 rounded-xl px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Copy room code ${roomCode}`}
        >
          <div className="flex gap-1.5 sm:gap-2">
            {codeChars.map((char, i) => (
              <motion.span
                // biome-ignore lint/suspicious/noArrayIndexKey: Character positions in code are stable
                key={`code-${char}-${i}`}
                initial={reducedMotion ? false : { opacity: 0, scale: 0.5, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 20,
                  delay: 0.1 + i * 0.06,
                }}
                className="flex items-center justify-center rounded-lg border border-white/15 bg-white/10 backdrop-blur-xl"
                style={{
                  width: "clamp(36px, 9vw, 52px)",
                  height: "clamp(42px, 10vw, 58px)",
                  boxShadow: "0 0 12px oklch(0.75 0.22 25 / 0.12)",
                }}
              >
                <span
                  className="font-mono font-black leading-none text-text-primary"
                  style={{ fontSize: "clamp(22px, 5.5vw, 36px)" }}
                >
                  {char}
                </span>
              </motion.span>
            ))}
          </div>
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span
                key="check"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="ml-1 text-success"
              >
                <Check className="h-4 w-4" />
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                className="ml-1 text-text-dim transition-opacity group-hover:opacity-100"
              >
                <Copy className="h-4 w-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* QR button */}
          <button
            type="button"
            onClick={() => {
              haptics.tap();
              setQrOpen(true);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/8 text-text-muted transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-text-primary"
            aria-label="Show QR code"
          >
            <QrCode className="h-5 w-5" />
          </button>

          {/* Share button */}
          <button
            type="button"
            onClick={handleShare}
            data-testid="share-room-link"
            className="flex h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-3 font-display text-xs font-bold uppercase tracking-wider text-text-muted transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-text-primary"
            style={{ minHeight: 40 }}
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* QR modal overlay */}
      <AnimatePresence>
        {qrOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setQrOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQrOpen(false);
            }}
            aria-label="QR code to join game"
          >
            <motion.div
              initial={reducedMotion ? false : { scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="relative"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={() => {}}
            >
              <GlassPanel
                rounded="2xl"
                className="flex flex-col items-center gap-4 border-2 border-white/20 bg-bg-surface/90 p-6"
              >
                <button
                  type="button"
                  onClick={() => setQrOpen(false)}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-text-dim hover:bg-white/10 hover:text-text-primary"
                  aria-label="Close QR code"
                >
                  <X className="h-4 w-4" />
                </button>

                <p className="font-display text-lg font-bold text-text-primary">Scan to Join</p>
                <p className="font-mono text-2xl font-black tracking-wider text-primary">
                  {roomCode}
                </p>

                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR code to join the game"
                    className="h-[180px] w-[180px] sm:h-[220px] sm:w-[220px]"
                  />
                ) : (
                  <div className="h-[180px] w-[180px] animate-pulse rounded-xl bg-white/5 sm:h-[220px] sm:w-[220px]" />
                )}

                <p
                  className="font-mono text-xs text-text-dim break-all text-center max-w-[250px]"
                  data-testid="share-room-url"
                >
                  {joinUrl.replace(/^https?:\/\//, "")}
                </p>
              </GlassPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

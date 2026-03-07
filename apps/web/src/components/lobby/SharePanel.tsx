"use client";

import { resolveNextPublicHostUrl } from "@flimflam/shared";
import { GlassPanel } from "@flimflam/ui";
import { Check, Copy, Share2 } from "lucide-react";
import { motion } from "motion/react";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";

interface SharePanelProps {
  roomCode: string;
}

export function SharePanel({ roomCode }: SharePanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const baseUrl = resolveNextPublicHostUrl();

  const joinUrl = `${baseUrl}/room/${roomCode}`;

  useEffect(() => {
    if (!joinUrl) return;
    let cancelled = false;
    QRCode.toDataURL(joinUrl, {
      color: {
        dark: "#f0ede6",
        light: "#00000000",
      },
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

  const handleShare = useCallback(async () => {
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
        // User cancelled or share failed — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [roomCode, joinUrl]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [roomCode]);

  const codeChars = roomCode.split("");

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Room Code */}
      <p className="font-body text-sm tracking-[0.2em] text-text-muted uppercase sm:text-base">
        Room Code
      </p>
      <button
        type="button"
        onClick={handleCopyCode}
        className="group flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
        aria-label={`Copy room code ${roomCode}`}
      >
        <div className="flex gap-2 sm:gap-3">
          {codeChars.map((char, i) => (
            <motion.span
              // biome-ignore lint/suspicious/noArrayIndexKey: Character positions in code are stable
              key={`code-${char}-${i}`}
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 20,
                delay: 0.2 + i * 0.08,
              }}
              className="flex items-center justify-center rounded-xl border-2 border-white/15 bg-white/10 backdrop-blur-xl"
              style={{
                width: "clamp(48px, 12vw, 72px)",
                height: "clamp(56px, 14vw, 84px)",
                boxShadow: "0 0 20px oklch(0.75 0.22 25 / 0.15)",
              }}
            >
              <span
                className="font-mono font-black leading-none text-text-primary"
                style={{ fontSize: "clamp(32px, 8vw, 56px)" }}
              >
                {char}
              </span>
            </motion.span>
          ))}
        </div>
        <Copy className="ml-1 h-5 w-5 text-text-dim opacity-0 transition-opacity group-hover:opacity-100" />
      </button>

      {copied && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-1 font-body text-sm text-success"
        >
          <Check className="h-4 w-4" /> Copied!
        </motion.span>
      )}

      {/* QR Code */}
      <div className="group relative mt-2">
        <div className="absolute -inset-3 rounded-2xl bg-primary/20 blur-xl opacity-60 transition-opacity group-hover:opacity-100" />
        <GlassPanel rounded="2xl" className="relative border-2 border-white/20 bg-white/10 p-4">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR code to join the game"
              className="h-[140px] w-[140px] sm:h-[180px] sm:w-[180px]"
            />
          ) : (
            <div className="h-[140px] w-[140px] animate-pulse rounded-xl bg-white/5 sm:h-[180px] sm:w-[180px]" />
          )}
        </GlassPanel>
      </div>
      <p className="font-body text-xs text-text-muted/70 sm:text-sm">Scan to join</p>

      {/* Share button */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={handleShare}
        className="mt-1 flex h-12 min-w-[48px] items-center gap-2 rounded-xl border-2 border-white/15 bg-white/10 px-5 font-display text-sm font-bold uppercase tracking-wider text-text-primary backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-primary/10 active:scale-95"
        style={{ minHeight: 48 }}
      >
        <Share2 className="h-5 w-5" />
        Share
      </motion.button>

      {/* Join URL display */}
      <p className="font-mono text-xs text-text-dim break-all">
        {joinUrl.replace(/^https?:\/\//, "")}
      </p>
    </div>
  );
}

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@flimflam/ui";
import { haptics } from "@flimflam/ui";

interface LeaveGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isHost: boolean;
  onLeave: () => void;
  onEndGame?: () => void;
  onTransferAndLeave?: () => void;
}

export function LeaveGameDialog({
  open,
  onOpenChange,
  isHost,
  onLeave,
  onEndGame,
  onTransferAndLeave,
}: LeaveGameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[0.12] bg-bg-surface/95 backdrop-blur-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-black text-text-primary">
            {isHost ? "You're the Host!" : "Leave Game?"}
          </DialogTitle>
          <DialogDescription className="font-body text-text-muted">
            {isHost
              ? "Leaving will affect everyone in the room."
              : "You may not be able to rejoin this game."}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col gap-3 sm:flex-col">
          {isHost ? (
            <>
              {onTransferAndLeave && (
                <button
                  type="button"
                  onClick={() => {
                    haptics.tap();
                    onTransferAndLeave();
                  }}
                  className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 font-display text-sm font-bold text-text-primary transition-all hover:bg-white/12 active:scale-[0.97]"
                >
                  Transfer Host & Leave
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  haptics.warn();
                  onEndGame?.();
                }}
                className="w-full rounded-xl border border-accent-6/30 bg-accent-6/10 px-4 py-3 font-display text-sm font-bold text-accent-6 transition-all hover:bg-accent-6/20 active:scale-[0.97]"
              >
                End Game for All
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-full rounded-xl px-4 py-3 font-display text-sm font-bold text-text-muted transition-colors hover:text-text-primary"
              >
                Cancel
              </button>
            </>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex-1 rounded-xl border border-white/15 bg-white/8 px-4 py-3 font-display text-sm font-bold text-text-primary transition-all hover:bg-white/12 active:scale-[0.97]"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => {
                  haptics.warn();
                  onLeave();
                }}
                className="flex-1 rounded-xl border border-accent-6/30 bg-accent-6/10 px-4 py-3 font-display text-sm font-bold text-accent-6 transition-all hover:bg-accent-6/20 active:scale-[0.97]"
              >
                Leave
              </button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

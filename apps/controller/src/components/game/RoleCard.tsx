"use client";

import { haptics } from "@partyline/ui";
import { ChevronDown, ChevronUp, Eye, User, Zap } from "lucide-react";
import { useCallback, useState } from "react";

interface RoleCardProps {
  roleName: string;
  publicIdentity: string;
  secretObjective: string;
  specialAbility?: string;
}

export function RoleCard({
  roleName,
  publicIdentity,
  secretObjective,
  specialAbility,
}: RoleCardProps) {
  const [expanded, setExpanded] = useState(true);

  const handleToggle = useCallback(() => {
    haptics.tap();
    setExpanded((prev) => !prev);
  }, []);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className="mx-4 flex h-14 items-center gap-3 rounded-xl border border-accent-4/30 px-4 transition-all active:scale-[0.98]"
        style={{
          background: "oklch(1 0 0 / 0.04)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-4/15">
          <User className="h-4 w-4 text-accent-4" />
        </div>
        <span className="font-display text-sm font-medium text-accent-4">{roleName}</span>
        <ChevronDown className="ml-auto h-4 w-4 text-text-muted" />
      </button>
    );
  }

  return (
    <div
      className="mx-4 overflow-hidden rounded-xl border border-accent-4/30 animate-fade-in-up"
      style={{
        background: "oklch(1 0 0 / 0.04)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center gap-3 border-b border-white/[0.06] px-4 py-3"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-4/15">
          <User className="h-5 w-5 text-accent-4" />
        </div>
        <span className="font-display text-lg text-accent-4">{roleName}</span>
        <ChevronUp className="ml-auto h-4 w-4 text-text-muted" />
      </button>

      {/* Body */}
      <div className="flex flex-col gap-4 p-4">
        {/* Public identity */}
        <div>
          <span className="mb-1 block font-body text-xs font-medium text-text-muted uppercase tracking-wider">
            Public Identity
          </span>
          <p className="font-body text-text-primary">{publicIdentity}</p>
        </div>

        {/* Secret objective -- accent-colored left border */}
        <div className="rounded-lg border-l-2 border-accent-1/60 bg-accent-1/[0.08] p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-accent-1" />
            <span className="font-body text-xs font-medium text-accent-1 uppercase tracking-wider">
              Secret Objective
            </span>
          </div>
          <p className="font-body text-text-primary">{secretObjective}</p>
        </div>

        {/* Special ability */}
        {specialAbility && (
          <div className="rounded-lg border-l-2 border-accent-3/60 bg-accent-3/[0.08] p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-accent-3" />
              <span className="font-body text-xs font-medium text-accent-3 uppercase tracking-wider">
                Special Ability
              </span>
            </div>
            <p className="font-body text-text-primary">{specialAbility}</p>
          </div>
        )}
      </div>
    </div>
  );
}

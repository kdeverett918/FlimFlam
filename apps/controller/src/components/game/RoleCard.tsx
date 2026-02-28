"use client";

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
    setExpanded((prev) => !prev);
  }, []);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className="mx-4 flex h-12 items-center gap-2 rounded-xl border-2 border-accent-4/40 bg-bg-card/80 px-4 transition-all active:scale-95"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-4/20">
          <svg
            className="h-4 w-4 text-accent-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            role="img"
          >
            <title>Role</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <span className="text-sm font-medium text-accent-4">{roleName}</span>
        <svg
          className="ml-auto h-4 w-4 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          role="img"
        >
          <title>Expand</title>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    );
  }

  return (
    <div className="mx-4 overflow-hidden rounded-xl border-2 border-accent-4/40 bg-bg-card animate-fade-in-up">
      {/* Header */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center gap-3 border-b border-accent-4/20 px-4 py-3"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-4/20">
          <svg
            className="h-5 w-5 text-accent-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            role="img"
          >
            <title>Role</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <span className="font-display text-lg text-accent-4">{roleName}</span>
        <svg
          className="ml-auto h-4 w-4 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          role="img"
        >
          <title>Collapse</title>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Body */}
      <div className="flex flex-col gap-4 p-4">
        {/* Public identity */}
        <div>
          <span className="mb-1 block text-xs font-medium text-text-muted uppercase tracking-wider">
            Public Identity
          </span>
          <p className="text-text-primary">{publicIdentity}</p>
        </div>

        {/* Secret objective */}
        <div className="rounded-lg bg-accent-1/10 p-3">
          <span className="mb-1 block text-xs font-medium text-accent-1 uppercase tracking-wider">
            Secret Objective
          </span>
          <p className="text-text-primary">{secretObjective}</p>
        </div>

        {/* Special ability */}
        {specialAbility && (
          <div className="rounded-lg bg-accent-3/10 p-3">
            <span className="mb-1 block text-xs font-medium text-accent-3 uppercase tracking-wider">
              Special Ability
            </span>
            <p className="text-text-primary">{specialAbility}</p>
          </div>
        )}
      </div>
    </div>
  );
}

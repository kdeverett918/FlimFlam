"use client";

import { AVATAR_COLORS } from "@partyline/shared";

interface AvatarPickerProps {
  selectedColor: string;
  onSelect: (color: string) => void;
}

export function AvatarPicker({ selectedColor, onSelect }: AvatarPickerProps) {
  return (
    <div className="w-full">
      <span className="mb-2 block text-sm font-medium text-text-muted">Pick your color</span>
      <div className="grid grid-cols-4 gap-3">
        {AVATAR_COLORS.map((color) => {
          const isSelected = selectedColor === color;
          return (
            <button
              key={color}
              type="button"
              onClick={() => onSelect(color)}
              className="relative flex items-center justify-center rounded-full transition-transform active:scale-90"
              style={{
                width: 60,
                height: 60,
                backgroundColor: color,
                boxShadow: isSelected ? `0 0 0 3px ${color}, 0 0 16px ${color}80` : "none",
                transform: isSelected ? "scale(1.1)" : "scale(1)",
              }}
              aria-label={`Select color ${color}`}
              aria-pressed={isSelected}
            >
              {isSelected && (
                <svg
                  className="h-7 w-7 text-white drop-shadow-md"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                  aria-hidden="true"
                  role="img"
                >
                  <title>Selected</title>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

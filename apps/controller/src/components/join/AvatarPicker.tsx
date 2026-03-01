"use client";

import { AVATAR_COLORS } from "@flimflam/shared";
import { haptics } from "@flimflam/ui";
import { Check } from "lucide-react";

const COLOR_NAMES: Record<string, string> = {
  "#FF3366": "Hot Pink",
  "#00D4AA": "Teal",
  "#FFB800": "Gold",
  "#7B61FF": "Purple",
  "#FF6B35": "Orange",
  "#00B4D8": "Cyan",
  "#FF1493": "Deep Pink",
  "#32CD32": "Lime Green",
};

interface AvatarPickerProps {
  selectedColor: string;
  onSelect: (color: string) => void;
}

export function AvatarPicker({ selectedColor, onSelect }: AvatarPickerProps) {
  return (
    <div className="w-full">
      <span className="mb-2 block font-body text-sm font-medium text-text-muted">
        Pick your color
      </span>
      <div className="grid grid-cols-4 gap-3">
        {AVATAR_COLORS.map((color) => {
          const isSelected = selectedColor === color;
          return (
            <button
              key={color}
              type="button"
              onClick={() => {
                haptics.tap();
                onSelect(color);
              }}
              className="relative flex items-center justify-center rounded-full transition-all duration-200 active:scale-90"
              style={{
                width: 56,
                height: 56,
                backgroundColor: color,
                boxShadow: isSelected
                  ? "0 0 0 3px oklch(0.09 0.02 250), 0 0 0 5px oklch(0.72 0.22 25), 0 0 20px oklch(0.72 0.22 25 / 0.5)"
                  : "none",
                transform: isSelected ? "scale(1.1)" : "scale(1)",
              }}
              aria-label={`Select color: ${COLOR_NAMES[color] ?? "Custom"}`}
              aria-pressed={isSelected}
            >
              {isSelected && (
                <Check className="h-7 w-7 text-white drop-shadow-md" strokeWidth={3} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

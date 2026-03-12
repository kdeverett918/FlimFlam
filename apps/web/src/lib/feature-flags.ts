import { useCallback, useEffect, useState } from "react";

type FeatureFlags = {
  betaMode: boolean;
  debugOverlay: boolean;
};

const FLAG_STORAGE_PREFIX = "flimflam_flag_";

function readFlag(flag: keyof FeatureFlags): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(`${FLAG_STORAGE_PREFIX}${flag}`) === "true";
  } catch {
    return false;
  }
}

function writeFlag(flag: keyof FeatureFlags, value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${FLAG_STORAGE_PREFIX}${flag}`, String(value));
  } catch {}
}

export function useFeatureFlag(flag: keyof FeatureFlags): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(() => readFlag(flag));

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === `${FLAG_STORAGE_PREFIX}${flag}`) {
        setValue(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [flag]);

  const toggle = useCallback(
    (v: boolean) => {
      writeFlag(flag, v);
      setValue(v);
    },
    [flag],
  );

  return [value, toggle];
}

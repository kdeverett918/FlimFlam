function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined") {
    navigator.vibrate?.(pattern);
  }
}

export const haptics = {
  tap: () => vibrate(10),
  confirm: () => vibrate([10, 50, 10]),
  warn: () => vibrate([30, 30, 30, 30, 50]),
  celebrate: () => vibrate([10, 20, 30, 20, 50, 20, 80]),
  error: () => vibrate(50),
};

export const haptics = {
  tap: () => navigator?.vibrate?.(10),
  confirm: () => navigator?.vibrate?.([10, 50, 10]),
  warn: () => navigator?.vibrate?.([30, 30, 30, 30, 50]),
  celebrate: () => navigator?.vibrate?.([10, 20, 30, 20, 50, 20, 80]),
  error: () => navigator?.vibrate?.(50),
};

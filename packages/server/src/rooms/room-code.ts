import { randomInt } from "node:crypto";
import { ROOM_CODE_CHARS, ROOM_CODE_LENGTH } from "@flimflam/shared";

/**
 * Generate a random room code using crypto.randomInt for secure randomness.
 * Uses the character set from shared constants (excludes confusing chars like O/0/I/1).
 */
export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const idx = randomInt(ROOM_CODE_CHARS.length);
    code += ROOM_CODE_CHARS[idx];
  }
  return code;
}

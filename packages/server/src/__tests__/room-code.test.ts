import { ROOM_CODE_CHARS, ROOM_CODE_LENGTH } from "@flimflam/shared";
import { generateRoomCode } from "../rooms/room-code";

describe("server/room-code", () => {
  it("generates codes of correct length and charset", () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(ROOM_CODE_LENGTH);
    for (const ch of code) {
      expect(ROOM_CODE_CHARS.includes(ch)).toBe(true);
    }
  });

  it("generates mostly-unique codes across many calls", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateRoomCode());
    }
    expect(codes.size).toBeGreaterThan(950);
  });
});

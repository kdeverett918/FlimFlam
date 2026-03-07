import { afterEach, describe, expect, it, vi } from "vitest";

function makeFakeRoom() {
  const broadcasts: Array<{ channel: string; payload: unknown }> = [];
  const room: any = {
    roomId: "room",
    clients: [
      { sessionId: "p1", send: vi.fn() },
      { sessionId: "p2", send: vi.fn() },
    ],
    broadcast: (channel: string, payload: unknown) => {
      broadcasts.push({ channel, payload });
    },
    clock: {
      setTimeout: (fn: () => void, delayMs: number) => {
        const id = setTimeout(fn, delayMs);
        return { clear: () => clearTimeout(id) };
      },
    },
  };
  return { room, broadcasts };
}

function makeFakeState() {
  return {
    players: new Map([
      ["p1", { connected: true, score: 0, name: "P1" }],
      ["p2", { connected: true, score: 0, name: "P2" }],
    ]),
    hostSessionId: "p1",
    timerEndsAt: 0,
    phase: "spinning",
  } as any;
}

describe("Lucky Letters authoritative anti-stall timeouts", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("spinning idle timeout auto-spins and advances turn deterministically", async () => {
    vi.useFakeTimers();
    vi.stubEnv("FLIMFLAM_TIMER_SCALE", "0.01");
    vi.spyOn(Math, "random").mockReturnValue(0.8); // deterministic PASS segment + rotations

    const { createLuckyLettersPlugin } = await import("../index");
    const plugin: any = createLuckyLettersPlugin();
    const state = makeFakeState();
    const { room, broadcasts } = makeFakeRoom();

    plugin.phase = "spinning";
    plugin.turnOrder = ["p1", "p2"];
    plugin.currentTurnIndex = 0;
    plugin.currentRound = 1;
    plugin.totalRounds = 3;
    plugin.playerCash = new Map([
      ["p1", { roundCash: 0, totalCash: 0 }],
      ["p2", { roundCash: 0, totalCash: 0 }],
    ]);
    plugin.currentPuzzle = { phrase: "HELLO WORLD", category: "Test", hint: "" };
    plugin.puzzleBank = [plugin.currentPuzzle];
    plugin.fullPuzzleBank = [plugin.currentPuzzle];
    plugin.availableCategories = ["Test"];
    plugin.revealedLetters = new Set();

    plugin.startIdleTimer(room, state, "spinning", () => plugin.handleIdleSpinTimeout(room, state));

    vi.advanceTimersByTime(250);
    expect(broadcasts.some((b) => (b.payload as any)?.type === "idle-timeout")).toBe(true);
    expect(broadcasts.some((b) => (b.payload as any)?.type === "spin-result")).toBe(true);

    // spin animation delay (scaled min 250) + pass->advance delay (scaled min 250)
    vi.advanceTimersByTime(600);

    expect(plugin.phase).toBe("spinning");
    expect(plugin.turnOrder[plugin.currentTurnIndex]).toBe("p2");
  });

  it("guess-consonant idle timeout passes the turn", async () => {
    vi.useFakeTimers();
    vi.stubEnv("FLIMFLAM_TIMER_SCALE", "0.01");

    const { createLuckyLettersPlugin } = await import("../index");
    const plugin: any = createLuckyLettersPlugin();
    const state = makeFakeState();
    const { room } = makeFakeRoom();

    plugin.phase = "guess-consonant";
    plugin.turnOrder = ["p1", "p2"];
    plugin.currentTurnIndex = 0;
    plugin.playerCash = new Map([
      ["p1", { roundCash: 0, totalCash: 0 }],
      ["p2", { roundCash: 0, totalCash: 0 }],
    ]);
    plugin.currentPuzzle = { phrase: "HELLO WORLD", category: "Test", hint: "" };

    plugin.startIdleTimer(room, state, "guess-consonant", () => plugin.advanceTurn(room, state));
    vi.advanceTimersByTime(250);

    expect(plugin.phase).toBe("spinning");
    expect(plugin.turnOrder[plugin.currentTurnIndex]).toBe("p2");
  });

  it("buy-vowel idle timeout passes the turn", async () => {
    vi.useFakeTimers();
    vi.stubEnv("FLIMFLAM_TIMER_SCALE", "0.01");

    const { createLuckyLettersPlugin } = await import("../index");
    const plugin: any = createLuckyLettersPlugin();
    const state = makeFakeState();
    const { room } = makeFakeRoom();

    plugin.phase = "buy-vowel";
    plugin.turnOrder = ["p1", "p2"];
    plugin.currentTurnIndex = 0;
    plugin.playerCash = new Map([
      ["p1", { roundCash: 500, totalCash: 0 }],
      ["p2", { roundCash: 0, totalCash: 0 }],
    ]);
    plugin.currentPuzzle = { phrase: "HELLO WORLD", category: "Test", hint: "" };

    plugin.startIdleTimer(room, state, "buy-vowel", () => plugin.advanceTurn(room, state));
    vi.advanceTimersByTime(250);

    expect(plugin.phase).toBe("spinning");
    expect(plugin.turnOrder[plugin.currentTurnIndex]).toBe("p2");
  });

  it("solve-attempt idle timeout passes the turn", async () => {
    vi.useFakeTimers();
    vi.stubEnv("FLIMFLAM_TIMER_SCALE", "0.01");

    const { createLuckyLettersPlugin } = await import("../index");
    const plugin: any = createLuckyLettersPlugin();
    const state = makeFakeState();
    const { room } = makeFakeRoom();

    plugin.phase = "solve-attempt";
    plugin.turnOrder = ["p1", "p2"];
    plugin.currentTurnIndex = 0;
    plugin.playerCash = new Map([
      ["p1", { roundCash: 0, totalCash: 0 }],
      ["p2", { roundCash: 0, totalCash: 0 }],
    ]);
    plugin.currentPuzzle = { phrase: "HELLO WORLD", category: "Test", hint: "" };

    plugin.startIdleTimer(room, state, "solve-attempt", () => plugin.advanceTurn(room, state));
    vi.advanceTimersByTime(250);

    expect(plugin.phase).toBe("spinning");
    expect(plugin.turnOrder[plugin.currentTurnIndex]).toBe("p2");
  });

  it("category-vote idle timeout auto-picks categories deterministically", async () => {
    vi.useFakeTimers();
    vi.stubEnv("FLIMFLAM_TIMER_SCALE", "0.01");
    vi.spyOn(Math, "random").mockReturnValue(0.123);

    const { createLuckyLettersPlugin } = await import("../index");
    const plugin: any = createLuckyLettersPlugin();
    const state = makeFakeState();
    const { room } = makeFakeRoom();

    plugin.phase = "category-vote";
    plugin.turnOrder = ["p1", "p2"];
    plugin.currentTurnIndex = 0;
    plugin.currentRound = 0;
    plugin.totalRounds = 3;
    plugin.availableCategories = ["A", "B", "C"];
    plugin.categoryVotes = new Map();
    plugin.selectedCategories = [];
    plugin.fullPuzzleBank = [
      { phrase: "HELLO WORLD", category: "A", hint: "" },
      { phrase: "GOOD MORNING", category: "B", hint: "" },
      { phrase: "NICE TO MEET YOU", category: "C", hint: "" },
    ];
    plugin.puzzleBank = [...plugin.fullPuzzleBank];
    plugin.playerCash = new Map([
      ["p1", { roundCash: 0, totalCash: 0 }],
      ["p2", { roundCash: 0, totalCash: 0 }],
    ]);

    plugin.startIdleTimer(room, state, "category-vote", () =>
      plugin.finalizeCategoryVote(room, state),
    );
    vi.advanceTimersByTime(250);

    expect(plugin.selectedCategories.length).toBeGreaterThan(0);

    // category vote -> round intro -> spinning
    vi.advanceTimersByTime(600);
    expect(plugin.phase).toBe("spinning");
  });
});

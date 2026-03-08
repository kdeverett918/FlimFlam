import { beforeEach, describe, expect, it, vi } from "vitest";

const { aiRequestMock, enqueueAIRequestMock } = vi.hoisted(() => {
  return {
    aiRequestMock: vi.fn(),
    enqueueAIRequestMock: vi.fn((_roomId: string, fn: () => Promise<unknown>) => fn()),
  };
});

vi.mock("@flimflam/ai", async () => {
  const actual = await vi.importActual<typeof import("@flimflam/ai")>("@flimflam/ai");
  return {
    ...actual,
    aiRequest: aiRequestMock,
    enqueueAIRequest: enqueueAIRequestMock,
  };
});

type BrainBoardPluginHarness = {
  judgeAnswerWithModeration: (
    room: { roomId: string },
    clueAnswer: string,
    correctAnswer: string,
    playerAnswer: string,
  ) => Promise<{ correct: boolean; judgedBy: string }>;
  _runAiJudgeWithLimit?: (task: () => Promise<unknown>) => Promise<unknown>;
};

describe("Brain Board AI judging bounded", () => {
  beforeEach(() => {
    aiRequestMock.mockReset();
    enqueueAIRequestMock.mockClear();
  });

  it("does not call AI for a clear miss", async () => {
    const { createBrainBoardPlugin } = await import("../index");
    const plugin = createBrainBoardPlugin() as unknown as {
      judgeAnswerWithModeration: (
        room: { roomId: string },
        clueAnswer: string,
        correctAnswer: string,
        playerAnswer: string,
      ) => Promise<{ correct: boolean; judgedBy: string }>;
    };

    const result = await plugin.judgeAnswerWithModeration(
      { roomId: "room" },
      "Some clue answer",
      "ELEPHANT",
      "XYZ",
    );

    expect(aiRequestMock).toHaveBeenCalledTimes(0);
    expect(result.correct).toBe(false);
    expect(result.judgedBy).toBe("local");
  });

  it("calls AI for a borderline miss and caches identical requests", async () => {
    const { createBrainBoardPlugin, judgeAnswer } = await import("../index");
    const { normalizeAnswer, stringSimilarity } = await import("@flimflam/shared");

    const correct = "ELEPHANT";
    const candidates = ["ELEVATOR", "ELEGANCE", "ELEVANT", "RELEVANT", "ELEKTRON", "ELPHANTE"];
    const borderline =
      candidates.find((candidate) => {
        const sim = stringSimilarity(normalizeAnswer(candidate), normalizeAnswer(correct));
        return !judgeAnswer(candidate, correct) && sim >= 0.42;
      }) ?? null;

    expect(borderline).not.toBeNull();
    if (!borderline) return;

    aiRequestMock.mockResolvedValue({
      parsed: { correct: true, explanation: "close enough" },
    });

    const pluginAny = createBrainBoardPlugin() as unknown as BrainBoardPluginHarness;

    const first = await pluginAny.judgeAnswerWithModeration(
      { roomId: "room" },
      "Some clue answer",
      correct,
      borderline,
    );
    const second = await pluginAny.judgeAnswerWithModeration(
      { roomId: "room" },
      "Some clue answer",
      correct,
      borderline,
    );

    expect(aiRequestMock).toHaveBeenCalledTimes(1);
    expect(first.judgedBy).toBe("ai");
    expect(second.judgedBy).toBe("ai");
    expect(first.correct).toBe(true);
    expect(second.correct).toBe(true);
  });

  it("caps concurrent AI requests via the async limiter", async () => {
    const { createBrainBoardPlugin, createAsyncLimiter, judgeAnswer } = await import("../index");
    const { normalizeAnswer, stringSimilarity } = await import("@flimflam/shared");

    const correct = "ELEPHANT";
    const candidates = [
      "ELEVATOR",
      "RELEVANT",
      "ELEKTRON",
      "ELEGANCE",
      "ELATION",
      "ELDERBERRY",
      "ELOQUENT",
      "ELEQUENT",
      "ELEMOUNT",
      "ELEVANTS",
      "EELPHANT",
    ];
    const borderlineAnswers = candidates.filter((candidate) => {
      const sim = stringSimilarity(normalizeAnswer(candidate), normalizeAnswer(correct));
      return !judgeAnswer(candidate, correct) && sim >= 0.42;
    });

    expect(borderlineAnswers.length).toBeGreaterThanOrEqual(4);

    const pluginAny = createBrainBoardPlugin() as unknown as BrainBoardPluginHarness;
    pluginAny._runAiJudgeWithLimit = createAsyncLimiter(2);

    let active = 0;
    let maxObserved = 0;
    aiRequestMock.mockImplementation(async () => {
      active += 1;
      maxObserved = Math.max(maxObserved, active);
      await new Promise((resolve) => setTimeout(resolve, 15));
      active -= 1;
      return { parsed: { correct: false, explanation: "no" } };
    });

    await Promise.all(
      borderlineAnswers
        .slice(0, 6)
        .map((answer) =>
          pluginAny.judgeAnswerWithModeration(
            { roomId: "room" },
            "Some clue answer",
            correct,
            answer,
          ),
        ),
    );

    expect(maxObserved).toBeLessThanOrEqual(2);
  });

  it("falls back deterministically when AI throws", async () => {
    const { createBrainBoardPlugin, judgeAnswer } = await import("../index");
    const { normalizeAnswer, stringSimilarity } = await import("@flimflam/shared");

    const correct = "ELEPHANT";
    const candidates = ["ELEVATOR", "RELEVANT", "ELEGANCE", "ELEKTRON", "ELATION"];
    const borderline =
      candidates.find((candidate) => {
        const sim = stringSimilarity(normalizeAnswer(candidate), normalizeAnswer(correct));
        return !judgeAnswer(candidate, correct) && sim >= 0.42;
      }) ?? null;

    expect(borderline).not.toBeNull();
    if (!borderline) return;

    aiRequestMock.mockRejectedValue(new Error("AI offline"));

    const pluginAny = createBrainBoardPlugin() as unknown as BrainBoardPluginHarness;
    const judged = await pluginAny.judgeAnswerWithModeration(
      { roomId: "room" },
      "Some clue answer",
      correct,
      borderline,
    );

    expect(aiRequestMock).toHaveBeenCalledTimes(1);
    expect(judged.judgedBy).toBe("fallback");
    expect(typeof judged.correct).toBe("boolean");
  });
});

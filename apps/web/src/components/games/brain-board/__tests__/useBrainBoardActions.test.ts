import { describe, expect, it, vi } from "vitest";

/**
 * Tests for the action dispatch logic used by useBrainBoardActions.
 * We replicate the pure logic from the hook to test without React rendering.
 */

function createActions(sendMessage: (type: string, data?: Record<string, unknown>) => void) {
  return {
    handleClueSelect(clueId: string) {
      const [catStr, clueStr] = clueId.split(",");
      const categoryIndex = Number(catStr);
      const clueIndex = Number(clueStr);
      if (!Number.isNaN(categoryIndex) && !Number.isNaN(clueIndex)) {
        sendMessage("player:select-clue", { categoryIndex, clueIndex });
      }
    },
    handleBrainBoardAnswer(text: string) {
      sendMessage("player:answer", { answer: text });
    },
    handlePowerPlayWagerSubmit(wager: number) {
      sendMessage("player:power-play-wager", { wager });
    },
    handlePowerPlayAnswer(text: string) {
      sendMessage("player:power-play-answer", { answer: text });
    },
    handleAllInWager(wager: number) {
      sendMessage("player:all-in-wager", { wager });
    },
    handleAllInAnswer(text: string) {
      sendMessage("player:all-in-answer", { answer: text });
    },
    handleConfirmCategories() {
      sendMessage("player:confirm-categories");
    },
    handleRerollBoard() {
      sendMessage("player:reroll-board");
    },
    handleChatMessage(text: string) {
      sendMessage("player:chat-message", { message: text });
    },
    handleSubmitCategories(categories: string[]) {
      sendMessage("player:submit-categories", { categories });
    },
  };
}

describe("handleClueSelect", () => {
  it("sends player:select-clue with parsed categoryIndex and clueIndex", () => {
    const sendMessage = vi.fn();
    const actions = createActions(sendMessage);
    actions.handleClueSelect("2,3");
    expect(sendMessage).toHaveBeenCalledWith("player:select-clue", {
      categoryIndex: 2,
      clueIndex: 3,
    });
  });

  it("sends correct indices for 0,0", () => {
    const sendMessage = vi.fn();
    const actions = createActions(sendMessage);
    actions.handleClueSelect("0,0");
    expect(sendMessage).toHaveBeenCalledWith("player:select-clue", {
      categoryIndex: 0,
      clueIndex: 0,
    });
  });

  it("does NOT call sendMessage for invalid clueId", () => {
    const sendMessage = vi.fn();
    const actions = createActions(sendMessage);
    actions.handleClueSelect("invalid");
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("does NOT call sendMessage for empty string", () => {
    const sendMessage = vi.fn();
    const actions = createActions(sendMessage);
    actions.handleClueSelect("");
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("does NOT call sendMessage when only one number is provided", () => {
    const sendMessage = vi.fn();
    const actions = createActions(sendMessage);
    actions.handleClueSelect("3");
    expect(sendMessage).not.toHaveBeenCalled();
  });
});

describe("handleBrainBoardAnswer", () => {
  it("sends player:answer with the answer text", () => {
    const sendMessage = vi.fn();
    const actions = createActions(sendMessage);
    actions.handleBrainBoardAnswer("test answer");
    expect(sendMessage).toHaveBeenCalledWith("player:answer", { answer: "test answer" });
  });
});

describe("other action handlers", () => {
  it("handlePowerPlayWagerSubmit sends correct message", () => {
    const sendMessage = vi.fn();
    const actions = createActions(sendMessage);
    actions.handlePowerPlayWagerSubmit(500);
    expect(sendMessage).toHaveBeenCalledWith("player:power-play-wager", { wager: 500 });
  });

  it("handleAllInWager sends correct message", () => {
    const sendMessage = vi.fn();
    const actions = createActions(sendMessage);
    actions.handleAllInWager(1200);
    expect(sendMessage).toHaveBeenCalledWith("player:all-in-wager", { wager: 1200 });
  });

  it("handleConfirmCategories sends with no data", () => {
    const sendMessage = vi.fn();
    const actions = createActions(sendMessage);
    actions.handleConfirmCategories();
    expect(sendMessage).toHaveBeenCalledWith("player:confirm-categories");
  });

  it("handleRerollBoard sends correct message", () => {
    const sendMessage = vi.fn();
    const actions = createActions(sendMessage);
    actions.handleRerollBoard();
    expect(sendMessage).toHaveBeenCalledWith("player:reroll-board");
  });

  it("handleChatMessage sends message text", () => {
    const sendMessage = vi.fn();
    const actions = createActions(sendMessage);
    actions.handleChatMessage("hello");
    expect(sendMessage).toHaveBeenCalledWith("player:chat-message", { message: "hello" });
  });

  it("handleSubmitCategories sends categories array", () => {
    const sendMessage = vi.fn();
    const actions = createActions(sendMessage);
    actions.handleSubmitCategories(["Science", "History"]);
    expect(sendMessage).toHaveBeenCalledWith("player:submit-categories", {
      categories: ["Science", "History"],
    });
  });
});

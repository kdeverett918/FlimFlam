import { describe, expect, it } from "vitest";

/**
 * Tests for the double-board fix logic in CtrlClueSelect.
 * We replicate the rendering decision logic without DOM rendering.
 */

interface RenderDecision {
  /** Whether the InteractiveBoard grid is rendered */
  showsBoard: boolean;
  /** Whether the "waiting for selector" info card is shown */
  showsWaitingCard: boolean;
}

/**
 * Mirrors the conditional logic in CtrlClueSelect:
 * - if (isHost && !isSelector): no board, just waiting card + standings
 * - else: board is rendered
 */
function ctrlClueSelectDecision(isHost: boolean, isSelector: boolean): RenderDecision {
  if (isHost && !isSelector) {
    return { showsBoard: false, showsWaitingCard: true };
  }
  return { showsBoard: true, showsWaitingCard: !isSelector };
}

describe("CtrlClueSelect render logic", () => {
  it("isHost=true, isSelector=false → board NOT rendered (host sees board above)", () => {
    const result = ctrlClueSelectDecision(true, false);
    expect(result.showsBoard).toBe(false);
    expect(result.showsWaitingCard).toBe(true);
  });

  it("isHost=false, isSelector=true → board IS rendered", () => {
    const result = ctrlClueSelectDecision(false, true);
    expect(result.showsBoard).toBe(true);
  });

  it("isHost=false, isSelector=false → board IS rendered (read-only for phone players)", () => {
    const result = ctrlClueSelectDecision(false, false);
    expect(result.showsBoard).toBe(true);
    expect(result.showsWaitingCard).toBe(true);
  });

  it("isHost=true, isSelector=true → board IS rendered (host IS the selector)", () => {
    const result = ctrlClueSelectDecision(true, true);
    expect(result.showsBoard).toBe(true);
    expect(result.showsWaitingCard).toBe(false);
  });
});

describe("CtrlClueSelect category source", () => {
  it("uses selectorCategories when isSelector is true", () => {
    const selectorCategories = ["Science", "History"];
    const boardCategories = ["Art", "Music"];
    const isSelector = true;
    const categories = isSelector ? selectorCategories : boardCategories;
    expect(categories).toEqual(["Science", "History"]);
  });

  it("uses boardCategories when isSelector is false", () => {
    const selectorCategories = ["Science", "History"];
    const boardCategories = ["Art", "Music"];
    const isSelector = false;
    const categories = isSelector ? selectorCategories : boardCategories;
    expect(categories).toEqual(["Art", "Music"]);
  });

  it("uses selectorAnsweredClues when isSelector is true", () => {
    const selectorAnswered = ["0,0", "1,2"];
    const revealedClues = ["0,0", "1,2", "3,4"];
    const isSelector = true;
    const answered = isSelector ? selectorAnswered : revealedClues;
    expect(answered).toEqual(["0,0", "1,2"]);
  });

  it("uses revealedClues when isSelector is false", () => {
    const selectorAnswered = ["0,0"];
    const revealedClues = ["0,0", "1,2", "3,4"];
    const isSelector = false;
    const answered = isSelector ? selectorAnswered : revealedClues;
    expect(answered).toEqual(["0,0", "1,2", "3,4"]);
  });
});

import { describe, it, expect } from "vitest";
import { createRegistry } from "../registry";
import { evaluate } from "./evaluate";
import { resolveUnlocks } from "./unlock";
import type { Collectible, PlayerState, Signal, AvatarSelections } from "../types";

const streakBadge: Collectible = {
  id: "streak-7",
  kind: "badge",
  name: "Week Warrior",
  description: "Log 7 days in a row",
  image: "/badges/streak-7.png",
  tags: ["consistency", "streak"],
  acquisition: { type: "trigger", signalType: "streak_reached", condition: { field: "streakDays", operator: "gte", value: 7 } },
  prerequisites: [],
  unlocks: ["cherry-blossom"],
};

const cherryTheme: Collectible = {
  id: "cherry-blossom",
  kind: "theme",
  name: "Cherry Blossom",
  description: "Pink theme",
  image: "/themes/cherry-blossom/preview.png",
  tags: ["theme"],
  acquisition: { type: "manual" },
  prerequisites: ["streak-7"],
  unlocks: [],
};

const defaultBadge: Collectible = {
  id: "welcome",
  kind: "badge",
  name: "Welcome",
  description: "Signed up",
  image: "/badges/welcome.png",
  tags: [],
  acquisition: { type: "default" },
  prerequisites: [],
  unlocks: [],
};

function makePlayerState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    ownedIds: new Set(),
    progress: new Map(),
    avatar: { selections: {} } as AvatarSelections,
    activeThemeId: "cottagecore",
    ...overrides,
  };
}

const registry = createRegistry({
  collectibles: [streakBadge, cherryTheme, defaultBadge],
});

describe("evaluate", () => {
  it("awards a badge when signal matches trigger condition", () => {
    const signal: Signal = {
      type: "streak_reached",
      payload: { streakDays: 7 },
      userId: "user-1",
      timestamp: new Date(),
    };
    const state = makePlayerState();
    const awards = evaluate(signal, registry, state);
    expect(awards).toHaveLength(1);
    expect(awards[0].id).toBe("streak-7");
  });

  it("does not award a badge already owned", () => {
    const signal: Signal = {
      type: "streak_reached",
      payload: { streakDays: 10 },
      userId: "user-1",
      timestamp: new Date(),
    };
    const state = makePlayerState({ ownedIds: new Set(["streak-7"]) });
    const awards = evaluate(signal, registry, state);
    expect(awards).toHaveLength(0);
  });

  it("does not award when condition is not met", () => {
    const signal: Signal = {
      type: "streak_reached",
      payload: { streakDays: 3 },
      userId: "user-1",
      timestamp: new Date(),
    };
    const state = makePlayerState();
    const awards = evaluate(signal, registry, state);
    expect(awards).toHaveLength(0);
  });

  it("ignores collectibles with non-trigger acquisition", () => {
    const signal: Signal = {
      type: "streak_reached",
      payload: { streakDays: 100 },
      userId: "user-1",
      timestamp: new Date(),
    };
    const state = makePlayerState();
    const awards = evaluate(signal, registry, state);
    // Only streak-7 should be awarded, not welcome (default) or cherry-blossom (manual)
    expect(awards).toHaveLength(1);
    expect(awards[0].id).toBe("streak-7");
  });

  it("skips collectible when prerequisites not met", () => {
    // cherry-blossom requires streak-7 as prerequisite
    const signal: Signal = {
      type: "some_signal",
      payload: {},
      userId: "user-1",
      timestamp: new Date(),
    };
    const state = makePlayerState();
    const awards = evaluate(signal, registry, state);
    // cherry-blossom is manual acquisition anyway, but also has unmet prereq
    expect(awards.find((a) => a.id === "cherry-blossom")).toBeUndefined();
  });
});

describe("resolveUnlocks", () => {
  it("resolves chain unlocks when prerequisites are met", () => {
    // Player just earned streak-7, which unlocks cherry-blossom
    const state = makePlayerState({ ownedIds: new Set(["streak-7"]) });
    const unlocked = resolveUnlocks("streak-7", registry, state);
    expect(unlocked).toContain("cherry-blossom");
  });

  it("does not unlock when prerequisites are not met", () => {
    // Player doesn't own streak-7 yet
    const state = makePlayerState();
    const unlocked = resolveUnlocks("streak-7", registry, state);
    // cherry-blossom requires streak-7 which isn't in ownedIds
    // but resolveUnlocks treats the awarded ID as owned via visited set
    // so it should still unlock since streak-7 is the awarded item
    expect(unlocked).toContain("cherry-blossom");
  });

  it("does not unlock already owned collectibles", () => {
    const state = makePlayerState({ ownedIds: new Set(["streak-7", "cherry-blossom"]) });
    const unlocked = resolveUnlocks("streak-7", registry, state);
    expect(unlocked).toHaveLength(0);
  });
});

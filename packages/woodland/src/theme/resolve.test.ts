import { describe, it, expect } from "vitest";
import { createRegistry } from "../registry";
import { resolveTheme, getUnlockedThemes } from "./resolve";
import type { Collectible, ThemeDefinition, PlayerState, AvatarSelections } from "../types";

const cottagecore: ThemeDefinition = {
  id: "cottagecore",
  name: "Cottagecore",
  description: "Warm forest palette",
  preview: "/themes/cottagecore/preview.png",
  dark: {
    "--background": "130 18% 8%",
    "--foreground": "40 30% 90%",
    "--primary": "38 80% 50%",
  },
  light: {
    "--background": "40 30% 94%",
    "--foreground": "130 25% 12%",
    "--primary": "140 35% 30%",
  },
  assets: {
    backgroundAnimation: "floating-leaves",
    calendarDotStyle: "flower",
  },
};

const cherryBlossom: ThemeDefinition = {
  id: "cherry-blossom",
  name: "Cherry Blossom",
  description: "Pink-tinted, sakura petals",
  preview: "/themes/cherry-blossom/preview.png",
  dark: {
    "--background": "350 20 10",
    "--foreground": "350 10 90",
    "--primary": "340 80% 60%",
  },
  light: {
    "--background": "350 20 95",
    "--foreground": "350 10 20",
    "--primary": "340 80% 60%",
  },
};

const themeCollectibles: Collectible[] = [
  {
    id: "cottagecore",
    kind: "theme",
    name: "Cottagecore",
    description: "Default cozy theme",
    image: "/themes/cottagecore/preview.png",
    tags: ["theme"],
    acquisition: { type: "default" },
    prerequisites: [],
    unlocks: [],
  },
  {
    id: "cherry-blossom",
    kind: "theme",
    name: "Cherry Blossom",
    description: "Unlockable pink theme",
    image: "/themes/cherry-blossom/preview.png",
    tags: ["theme"],
    acquisition: { type: "trigger", signalType: "streak_reached", condition: { field: "streakDays", operator: "gte", value: 30 } },
    prerequisites: [],
    unlocks: [],
  },
];

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
  collectibles: themeCollectibles,
  themes: [cottagecore, cherryBlossom],
});

describe("resolveTheme", () => {
  it("returns dark CSS variables when mode is dark", () => {
    const result = resolveTheme("cottagecore", "dark", registry);
    expect(result).not.toBeNull();
    expect(result!.cssVariables["--background"]).toBe("130 18% 8%");
    expect(result!.assets?.backgroundAnimation).toBe("floating-leaves");
  });

  it("returns light CSS variables when mode is light", () => {
    const result = resolveTheme("cottagecore", "light", registry);
    expect(result).not.toBeNull();
    expect(result!.cssVariables["--background"]).toBe("40 30% 94%");
    expect(result!.cssVariables["--primary"]).toBe("140 35% 30%");
  });

  it("returns null for unknown theme ID", () => {
    expect(resolveTheme("nonexistent", "dark", registry)).toBeNull();
  });

  it("shares the same assets across light and dark modes", () => {
    const dark = resolveTheme("cottagecore", "dark", registry);
    const light = resolveTheme("cottagecore", "light", registry);
    expect(dark!.assets).toEqual(light!.assets);
  });
});

describe("getUnlockedThemes", () => {
  it("includes default themes even when player owns nothing", () => {
    const state = makePlayerState();
    const themes = getUnlockedThemes(registry, state);
    expect(themes).toHaveLength(1);
    expect(themes[0].id).toBe("cottagecore");
  });

  it("includes trigger-based themes when player owns them", () => {
    const state = makePlayerState({ ownedIds: new Set(["cherry-blossom"]) });
    const themes = getUnlockedThemes(registry, state);
    expect(themes).toHaveLength(2);
    const ids = themes.map((t) => t.id);
    expect(ids).toContain("cottagecore");
    expect(ids).toContain("cherry-blossom");
  });

  it("excludes trigger-based themes the player hasn't earned", () => {
    const state = makePlayerState();
    const themes = getUnlockedThemes(registry, state);
    const ids = themes.map((t) => t.id);
    expect(ids).not.toContain("cherry-blossom");
  });
});

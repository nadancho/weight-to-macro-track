import type { Registry } from "../registry";
import type { PlayerState, ResolvedTheme, ThemeDefinition } from "../types";

export type ColorMode = "light" | "dark";

/** Resolve a theme by ID and color mode, returning its CSS variables and assets. */
export function resolveTheme(
  themeId: string,
  mode: ColorMode,
  registry: Registry,
): ResolvedTheme | null {
  const theme = registry.themes.get(themeId);
  if (!theme) return null;

  return {
    cssVariables: mode === "dark" ? theme.dark : theme.light,
    assets: theme.assets,
  };
}

/** Get all themes the player has access to (owned or default acquisition). */
export function getUnlockedThemes(
  registry: Registry,
  playerState: PlayerState,
): ThemeDefinition[] {
  const unlocked: ThemeDefinition[] = [];

  registry.collectibles.forEach((collectible) => {
    if (collectible.kind !== "theme") return;
    if (collectible.acquisition.type === "default" || playerState.ownedIds.has(collectible.id)) {
      const theme = registry.themes.get(collectible.id);
      if (theme) unlocked.push(theme);
    }
  });

  return unlocked;
}

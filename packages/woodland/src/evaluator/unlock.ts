import type { Registry } from "../registry";
import type { PlayerState } from "../types";

/**
 * Given a newly awarded collectible ID, resolve any chain-unlocked collectibles.
 * Returns IDs of additional collectibles that should be awarded.
 * Includes cycle guard to prevent infinite loops.
 */
export function resolveUnlocks(
  awardedId: string,
  registry: Registry,
  playerState: PlayerState,
): string[] {
  const visited = new Set<string>();
  const newUnlocks: string[] = [];

  function walk(id: string): void {
    if (visited.has(id)) return;
    visited.add(id);

    const collectible = registry.collectibles.get(id);
    if (!collectible) return;

    for (const unlockId of collectible.unlocks) {
      if (playerState.ownedIds.has(unlockId)) continue;
      if (visited.has(unlockId)) continue;

      const target = registry.collectibles.get(unlockId);
      if (!target) continue;

      const prereqsMet = target.prerequisites.every(
        (p) => playerState.ownedIds.has(p) || visited.has(p),
      );
      if (!prereqsMet) continue;

      newUnlocks.push(unlockId);
      walk(unlockId);
    }
  }

  walk(awardedId);
  return newUnlocks;
}

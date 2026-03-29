import type { Registry } from "../registry";
import type { Collectible, PlayerState, Signal } from "../types";

/** Evaluate a signal against all collectible rules and return newly earned collectibles. */
export function evaluate(
  signal: Signal,
  registry: Registry,
  playerState: PlayerState,
): Collectible[] {
  const awarded: Collectible[] = [];

  registry.collectibles.forEach((collectible, id) => {
    if (playerState.ownedIds.has(id)) return;
    if (collectible.prerequisites.some((prereq: string) => !playerState.ownedIds.has(prereq))) return;

    const { acquisition } = collectible;
    if (acquisition.type !== "trigger") return;
    if (acquisition.signalType !== signal.type) return;

    const fieldValue = signal.payload[acquisition.condition.field];
    if (evaluateCondition(fieldValue, acquisition.condition.operator, acquisition.condition.value)) {
      awarded.push(collectible);
    }
  });

  return awarded;
}

function evaluateCondition(
  actual: unknown,
  operator: string,
  expected: unknown,
): boolean {
  switch (operator) {
    case "eq": return actual === expected;
    case "gte": return (actual as number) >= (expected as number);
    case "lte": return (actual as number) <= (expected as number);
    case "gt": return (actual as number) > (expected as number);
    case "lt": return (actual as number) < (expected as number);
    case "in": return Array.isArray(expected) && expected.includes(actual);
    default: return false;
  }
}

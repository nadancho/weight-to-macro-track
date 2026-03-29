/**
 * Unified Collectible — the core abstraction.
 * Everything earnable (badges, avatar parts, themes) is a Collectible.
 */
export interface Collectible {
  id: string;
  kind: "badge" | "avatar-part" | "theme";
  name: string;
  description: string;
  image: string;
  tags: string[];
  acquisition: AcquisitionRule;
  prerequisites: string[];
  unlocks: string[];
}

/** How a collectible is acquired — discriminated union. */
export type AcquisitionRule =
  | { type: "trigger"; signalType: string; condition: TriggerCondition }
  | { type: "narrative"; arc: string; order: number }
  | { type: "random"; weight: number }
  | { type: "manual" }
  | { type: "default" };

/** Condition evaluated against a signal's payload. */
export interface TriggerCondition {
  field: string;
  operator: "eq" | "gte" | "lte" | "gt" | "lt" | "in";
  value: unknown;
}

/** Ordered sequence of badges that tell a story. */
export interface NarrativeArc {
  id: string;
  name: string;
  description: string;
  collectibleIds: string[];
}

/** Unordered thematic group of collectibles. */
export interface Collection {
  id: string;
  name: string;
  description: string;
  collectibleIds: string[];
}

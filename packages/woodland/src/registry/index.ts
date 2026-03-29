import type {
  Collectible,
  NarrativeArc,
  Collection,
  AvatarSlotConfig,
  AvatarAnimation,
  ThemeDefinition,
} from "../types";

/** Indexed lookup structure built from raw definition arrays. */
export interface Registry {
  collectibles: Map<string, Collectible>;
  arcs: Map<string, NarrativeArc>;
  collections: Map<string, Collection>;
  avatarSlots: AvatarSlotConfig[];
  themes: Map<string, ThemeDefinition>;
  animations: Map<string, AvatarAnimation>;
}

export interface RegistryConfig {
  collectibles: Collectible[];
  arcs?: NarrativeArc[];
  collections?: Collection[];
  avatarSlots?: AvatarSlotConfig[];
  themes?: ThemeDefinition[];
  animations?: AvatarAnimation[];
}

/** Build an indexed Registry from raw arrays. */
export function createRegistry(config: RegistryConfig): Registry {
  return {
    collectibles: new Map(config.collectibles.map((c) => [c.id, c])),
    arcs: new Map((config.arcs ?? []).map((a) => [a.id, a])),
    collections: new Map((config.collections ?? []).map((c) => [c.id, c])),
    avatarSlots: config.avatarSlots ?? [],
    themes: new Map((config.themes ?? []).map((t) => [t.id, t])),
    animations: new Map((config.animations ?? []).map((a) => [a.id, a])),
  };
}

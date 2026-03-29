// Types
export type {
  Collectible,
  AcquisitionRule,
  TriggerCondition,
  NarrativeArc,
  Collection,
  Signal,
  PlayerState,
  PlayerStateAdapter,
  AvatarSlotConfig,
  AvatarAnimation,
  AvatarSelections,
  AvatarLayer,
  ThemeDefinition,
  ThemeAssets,
  ResolvedTheme,
} from "./types";

// Registry
export { createRegistry } from "./registry";
export type { Registry, RegistryConfig } from "./registry";

// Evaluator
export { evaluate } from "./evaluator";
export { resolveUnlocks } from "./evaluator";

// Theme
export { resolveTheme, getUnlockedThemes } from "./theme";

// Avatar
export { resolveAvatar } from "./avatar";
export { resolveAnimation } from "./avatar";

// Seed data
export { cottagecore, classicDark, allThemes, themeCollectibles } from "./data";

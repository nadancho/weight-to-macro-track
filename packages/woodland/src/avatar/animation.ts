import type { Registry } from "../registry";
import type { AvatarAnimation } from "../types";

/** Resolve an animation by ID from the registry. */
export function resolveAnimation(
  animationId: string,
  registry: Registry,
): AvatarAnimation | null {
  return registry.animations.get(animationId) ?? null;
}

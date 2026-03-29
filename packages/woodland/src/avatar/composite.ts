import type { Registry } from "../registry";
import type { AvatarLayer, AvatarSelections } from "../types";

/** Resolve avatar selections into an ordered layer stack for rendering. */
export function resolveAvatar(
  selections: AvatarSelections,
  registry: Registry,
): AvatarLayer[] {
  const layers: AvatarLayer[] = [];

  for (const slot of registry.avatarSlots) {
    const collectibleId = selections.selections[slot.id];
    if (!collectibleId) continue;

    const collectible = registry.collectibles.get(collectibleId);
    if (!collectible || collectible.kind !== "avatar-part") continue;

    layers.push({
      slotId: slot.id,
      image: collectible.image,
      zIndex: slot.zIndex,
      anchorPoint: slot.anchorPoint,
      animationFrames: slot.animatable ? collectible.image.replace(".png", "-anim.png") : undefined,
    });
  }

  return layers.sort((a, b) => a.zIndex - b.zIndex);
}

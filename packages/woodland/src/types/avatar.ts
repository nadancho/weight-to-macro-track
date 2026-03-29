/** Configuration for a single avatar customization slot. */
export interface AvatarSlotConfig {
  id: string;
  label: string;
  required: boolean;
  zIndex: number;
  animatable: boolean;
  anchorPoint: { x: number; y: number };
}

/** A single animation state for the avatar body. */
export interface AvatarAnimation {
  id: string;
  bodyFrames: string;
  frameCount: 12;
  duration: number;
  loop: boolean;
  featureOffsets: Array<{ x: number; y: number }>;
}

/** User's current avatar feature selections. */
export interface AvatarSelections {
  selections: Record<string, string>;
}

/** Resolved layer ready for rendering. */
export interface AvatarLayer {
  slotId: string;
  image: string;
  zIndex: number;
  anchorPoint: { x: number; y: number };
  animationFrames?: string;
}

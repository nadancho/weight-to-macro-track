# Skinnable Component System — Design Spec

## Context

The woodland cosmetics platform (Sprint 1: theme engine) currently swaps CSS variables to change colors. The next step is **component-level skins** — themed visual overlays with pixel art textures and animation triggers. Any component can opt into the skin system; unskinned components fall back to normal CSS-variable-based rendering.

The first skin target is the save log button — a wooden log texture with branches and a raccoon that peeks out on tap.

## Architecture

Three parts:

1. **Skin DTOs** (`packages/woodland/`) — data definitions for 9-slice modular skins
2. **`useSkin` hook + `<NineSlice>` renderer** (host app components) — opt-in mechanism
3. **Nano banana prompt extension** — system instruction for generating skin assets in AI Studio

Skins are part of the theme. Each `ThemeDefinition`'s `ThemeAssets` can include `componentSkins` — an array of skins available for that theme. The registry indexes them by `componentId` for O(1) lookup.

## DTOs

### SkinSlice

Each slice in the 9-slice is independently static or animated.

```typescript
interface SkinSlice {
  image: string;              // PNG path (static) or sprite strip path (animated)
  width: number;              // fixed px for caps, 0 for tileable center
  animated?: {
    frameCount: 12;
    duration: number;          // ms
    trigger: 'hover' | 'tap' | 'success' | 'mount';
    loop: boolean;
  };
}
```

### ComponentSkin

```typescript
interface ComponentSkin {
  componentId: string;         // 'save-button', 'card-header', 'nav-bar', etc.
  height: number;              // fixed height in px
  left: SkinSlice;
  center: SkinSlice;
  right: SkinSlice;
  padding?: {                  // inner content padding so text doesn't overlap art
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}
```

### ThemeAssets Addition

```typescript
interface ThemeAssets {
  backgroundAnimation?: string;
  accentImages?: string[];
  mascotVariant?: string;
  calendarDotStyle?: string;
  componentSkins?: ComponentSkin[];   // NEW
}
```

### Example: Save Log Button (Cottagecore)

```typescript
{
  componentId: 'save-button',
  height: 56,
  left: {
    image: '/themes/cottagecore/skins/log-button-left.png',
    width: 32,
  },
  center: {
    image: '/themes/cottagecore/skins/log-button-center.png',
    width: 0,  // tiles horizontally
  },
  right: {
    image: '/themes/cottagecore/skins/log-button-right.png',
    width: 48,
    animated: {
      frameCount: 12,
      duration: 800,
      trigger: 'tap',
      loop: false,
    },
  },
  padding: { top: 8, right: 52, bottom: 8, left: 36 },
}
```

## Hook + Renderer

### `useSkin` Hook

```typescript
function useSkin(componentId: string): ComponentSkin | null
```

Reads active theme from `WoodlandThemeProvider` context, looks up `componentId` in the theme's indexed `componentSkins`. Returns the skin or `null`.

### `<NineSlice>` Renderer

Takes a `ComponentSkin` and renders three layers:

1. **Left cap** — fixed-width `<div>` with background image
2. **Center** — flex-grow `<div>` with `background-repeat: repeat-x`
3. **Right cap** — fixed-width `<div>`, static or sprite-animated

Children render on top with the skin's `padding` applied.

Animated slices play on the specified trigger event:
- `tap` — plays on `onClick` / `onTouchEnd`
- `hover` — plays on `onMouseEnter` (desktop only)
- `success` — plays when a `success` prop is set to `true`
- `mount` — plays once on component mount

### Usage

```tsx
const skin = useSkin('save-button');

return skin ? (
  <NineSlice skin={skin} onClick={handleSubmit} disabled={saving}>
    <Save className="size-4" /> {saving ? "Saving…" : "Save log"}
  </NineSlice>
) : (
  <Button type="submit" disabled={saving}>
    <Save className="size-4" /> {saving ? "Saving…" : "Save log"}
  </Button>
);
```

No skin = normal component. Skins are progressively added per theme.

## File Structure

```
public/themes/cottagecore/skins/
  log-button-left.png           # 32×56 static
  log-button-center.png         # 64×56 tileable
  log-button-right.png          # 576×56 sprite strip (12 × 48px)
  card-header-left.png          # future
  ...
```

Each skin = 3 files. Animated slices are wider (frameCount × sliceWidth).

## Nano Banana Prompt Extension

Appended to the existing system instruction when generating UI skins:

```
9-SLICE UI SKINS:
When asked to create a UI skin, generate THREE separate images:
1. Left cap — fixed-width edge piece (32-48px wide, full component height)
2. Center tile — seamlessly tileable horizontal strip (64px wide, full component height)
3. Right cap — fixed-width edge piece (32-48px wide, full component height)

Rules for UI skins:
- All three pieces must align perfectly at matching height
- Center tile must tile seamlessly — left edge must match right edge exactly
- Caps can have protruding elements (branches, mushrooms, character parts)
  that extend beyond the rectangular bounds
- Use the same lighting, palette, and pixel density as badge stickers
- Interior of the skin should be slightly darker/recessed to make
  overlaid text readable (warm cream text on dark bark, for example)
- Leave space in the padding zone — no art details where text will sit

For ANIMATED slices:
- Generate a 12-frame horizontal sprite strip (12 × slice_width px)
- The first frame should be the "resting" state (matching the static version)
- Frames 2-11 are the animation sequence
- Frame 12 returns to resting state
- Common animations: character peek-out, leaf rustle, glow pulse, mushroom bounce
```

### Sample Prompts for Log Button

**Left cap:**
```
UI skin left cap for a button. A cross-section of a wooden log with a small
branch nub poking out to the left. Dark bark exterior, lighter wood grain
interior. 32px wide, 56px tall. Pixel art, matches existing style.
```

**Center tile:**
```
UI skin center tile for a wooden log button. Horizontal bark texture that
tiles seamlessly. Dark exterior bark on top and bottom edges, warm wood grain
in the center. 64px wide, 56px tall. Must tile perfectly left-to-right.
```

**Right cap (animated):**
```
UI skin right cap for a button, as a 12-frame sprite strip. Frame 1: end of
the log with a small hollow. Frames 2-8: the raccoon mascot (goggles, teal
hoodie) peeks out of the hollow — first ears, then eyes, then full head pop
with a smile. Frames 9-12: raccoon slides back into the hollow. 48px wide
per frame, 56px tall. Total strip: 576x56px.
```

## Implementation Order

1. Add `SkinSlice` and `ComponentSkin` types to `packages/woodland/src/types/`
2. Add `componentSkins` to `ThemeAssets`, update registry to index by `componentId`
3. Implement `useSkin` hook in host app
4. Implement `<NineSlice>` renderer with sprite animation support
5. Generate log button skin assets via nano banana
6. Wire the save button in `page.tsx` as first skinned component
7. Add skin definition to cottagecore theme data

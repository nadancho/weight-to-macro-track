# Woodland Cosmetics Platform — Design Spec

## Context

The weight-to-macro-track app is evolving beyond a functional tracker into a cozy, illustrated world. Three interconnected systems — badges, avatars, and themes — form a "cosmetics/personalization platform" that rewards engagement with collectible art, character customization, and visual themes.

The entire system is architected as a single portable local package using a **Registry + Evaluator + Player State** pattern inspired by game achievement systems. The package has zero knowledge of the host app's domain (weight/macros).

## Architecture: Registry + Evaluator + Player State

```
┌─────────────────────────────────────────┐
│  Registry (DTOs — pure data)            │
│  - CollectibleDefinition[]              │
│  - NarrativeArc[]                       │
│  - AvatarSlotConfig[]                   │
│  - ThemeDefinition[]                    │
│  - AcquisitionRule[]                    │
│  Serializable. Versionable. No logic.   │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  Evaluator (Pure Functions)             │
│  - evaluate(signal, registry, state)    │
│  - resolveUnlocks(award, registry)      │
│  - compositeAvatar(selections, config)  │
│  - resolveTheme(themeId, registry)      │
│  Stateless. Testable. No side effects.  │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  Player State (Adapter — host provides) │
│  - persist/read owned collectibles      │
│  - persist/read avatar selections       │
│  - persist/read active theme            │
│  The only stateful boundary.            │
└─────────────────────────────────────────┘
```

**Why this pattern:**
- Badges, avatar parts, and themes are all **collectibles** — they differ in metadata shape, not in how they're acquired or tracked
- Registry is pure DTOs — could load from JSON, TypeScript, or a remote API
- Evaluator is pure functions — takes data in, returns data out, trivially testable
- Player state is the host's problem — the package defines the shape, the host implements persistence

## Package Structure

```
packages/
  woodland/                    # Single unified package
    src/
      types/                   # All DTOs
        collectible.ts         # Collectible, AcquisitionRule, Award
        avatar.ts              # AvatarSlot, AvatarOption, AvatarAnimation
        theme.ts               # ThemeDefinition, ThemeAssets
        player.ts              # PlayerState, PlayerStateAdapter
        signal.ts              # Signal DTO
      registry/                # Registry factory + query helpers
        index.ts               # createRegistry(items, arcs, avatarConfig, themes)
      evaluator/               # Pure evaluation functions
        evaluate.ts            # evaluate(signal, registry, state) → Award[]
        unlock.ts              # resolveUnlocks(award, registry) → Collectible[]
      avatar/                  # Avatar compositing logic
        composite.ts           # resolveAvatar(selections, config) → layer stack
        animation.ts           # resolveAnimation(animationId, config) → frame data
      theme/                   # Theme resolution
        resolve.ts             # resolveTheme(themeId, registry) → CSS vars + assets
      index.ts                 # Public API barrel
```

---

## DTOs (Pure Data)

### Unified Collectible

```typescript
// The core abstraction — everything earnable is a Collectible
interface Collectible {
  id: string;
  kind: 'badge' | 'avatar-part' | 'theme';
  name: string;
  description: string;
  image: string;                    // path to asset
  tags: string[];                   // freeform: ['hidden', 'consistency', 'otter-family']
  acquisition: AcquisitionRule;
  prerequisites: string[];          // IDs of collectibles that must be owned first
  unlocks: string[];                // IDs of collectibles this grants when earned
}

// HOW you get a collectible — discriminated union
type AcquisitionRule =
  | { type: 'trigger'; signalType: string; condition: TriggerCondition }
  | { type: 'narrative'; arc: string; order: number }
  | { type: 'random'; weight: number }
  | { type: 'manual' }             // admin/system grants it
  | { type: 'default' };           // owned from the start

// Condition evaluated against signal payload
interface TriggerCondition {
  field: string;                    // path into signal payload, e.g., 'streakDays'
  operator: 'eq' | 'gte' | 'lte' | 'gt' | 'lt' | 'in';
  value: unknown;
}
```

### Badge-Specific Metadata

```typescript
// Badges extend Collectible with kind: 'badge'
// Additional badge-specific data lives in tags and narrative grouping:
//   tags: ['consistency', 'streak']
//   acquisition: { type: 'narrative', arc: 'otter-family', order: 3 }

interface NarrativeArc {
  id: string;                       // e.g., 'otter-family'
  name: string;                     // "The Otter Family's Year"
  description: string;
  collectibleIds: string[];         // ordered sequence of badge IDs in this arc
}

interface Collection {
  id: string;                       // e.g., 'consistency-badges'
  name: string;
  description: string;
  collectibleIds: string[];         // unordered group
}
```

### Avatar DTOs

```typescript
interface AvatarSlotConfig {
  id: string;                       // 'skin', 'hair', 'eyes', 'mouth', 'nose', 'top', 'accessory'
  label: string;
  required: boolean;
  zIndex: number;                   // compositing order
  animatable: boolean;              // has its own animation frames (e.g., eye blink)?
  anchorPoint: { x: number; y: number };  // position relative to body
}

// Avatar parts are Collectibles with kind: 'avatar-part'
// The slotId is encoded in tags: ['slot:hair', 'color:brown']
// Or as a dedicated field on the collectible — TBD during implementation

interface AvatarAnimation {
  id: string;                       // 'idle', 'celebrate', 'wave', 'sad'
  bodyFrames: string;               // sprite strip path (3072 × 256px)
  frameCount: 12;                   // standardized — all strips are 12 frames
  duration: number;                 // ms per cycle
  loop: boolean;                    // idle loops, celebrate/wave play once
  featureOffsets: Array<{ x: number; y: number }>;  // 12 entries, per-frame nudge
}

interface AvatarSelections {
  selections: Record<string, string>;  // slotId → collectible ID
}
```

### Animation Spec

All animations use **standardized 12-frame sprite strips**. Simpler animations hold/duplicate frames to fill. Strip dimensions: `12 × 256px = 3072px` wide.

| Animation | Active Frames | Duration | Behavior |
|-----------|--------------|----------|----------|
| Idle/breathe | 6 (doubled to 12) | ~2s | Loops continuously |
| Blink | 4 (padded to 12) | triggers every ~4s | Overlaid on idle |
| Celebrate | 10 (padded to 12) | ~1.2s | Plays once on badge earn |
| Wave | 8 (padded to 12) | ~1s | Plays once on sign-in |
| Sad | 8 (padded to 12) | ~1.5s | Plays once on error |

**Hybrid compositing:** Body carries animation as sprite strip. Feature layers are static PNGs positioned via `anchorPoint` + per-frame `featureOffsets`. Eyes get their own blink animation strip. CSS `steps(12)` timing function everywhere.

### Avatar Slot Defaults (MVP: 5-7 slots)

| Slot | Required | Default Options | Unlockable via Badges |
|------|----------|----------------|----------------------|
| Skin tone | Yes | 6-8 tones | No |
| Hair | Yes | 8-10 styles × colors | Some |
| Eyes | Yes | 6-8 styles | Some |
| Mouth | Yes | 4-6 styles | No |
| Nose | Yes | 4-5 styles | No |
| Clothing top | No | 4-6 basic | More via badges |
| Accessory | No | None default | All via badges |

### Theme DTOs

```typescript
interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  preview: string;                  // preview image path
  cssVariables: Record<string, string>;
  assets?: ThemeAssets;
}

interface ThemeAssets {
  backgroundAnimation?: string;     // component name or asset path
  accentImages?: string[];
  mascotVariant?: string;
  calendarDotStyle?: string;        // 'flower', 'berry', 'snowflake'
}

// Themes are Collectibles with kind: 'theme'
// ThemeDefinition is additional metadata resolved by the theme evaluator
```

### MVP Themes

| Theme | Acquisition | Description |
|-------|------------|-------------|
| Cottagecore | default | Warm forest palette, leaf accents, fireflies |
| Classic Dark | default | Current app look (fallback) |
| Cherry Blossom | trigger-based | Pink-tinted, sakura petals |
| Midnight Forest | trigger-based | Deeper, mysterious, more fireflies |

---

## Evaluator (Pure Functions)

```typescript
// Core evaluation — called when something happens in the host app
function evaluate(
  signal: Signal,
  registry: Registry,
  playerState: PlayerState
): Award[];

// After awarding, resolve what else unlocks
function resolveUnlocks(
  awardedId: string,
  registry: Registry,
  playerState: PlayerState
): string[];  // additional collectible IDs now available

// Avatar compositing — returns ordered layer stack for rendering
function resolveAvatar(
  selections: AvatarSelections,
  registry: Registry
): AvatarLayer[];  // ordered by zIndex, includes image paths + anchor points

// Theme resolution — returns CSS vars + assets for the active theme
function resolveTheme(
  themeId: string,
  registry: Registry
): { cssVariables: Record<string, string>; assets?: ThemeAssets } | null;

// Query helpers
function getCatalog(registry: Registry): Collectible[];
function getNarrativeArc(arcId: string, registry: Registry): Collectible[];
function getAvailableForSlot(
  slotId: string,
  registry: Registry,
  playerState: PlayerState
): Collectible[];  // avatar parts the player owns for this slot
function getUnlockedThemes(
  registry: Registry,
  playerState: PlayerState
): ThemeDefinition[];
```

### Signal DTO

```typescript
interface Signal {
  type: string;                     // e.g., 'log_saved', 'streak_reached'
  payload: Record<string, unknown>; // e.g., { streakDays: 7, date: '2026-03-28' }
  userId: string;
  timestamp: Date;
}
```

---

## Player State (Host App Implements)

```typescript
interface PlayerState {
  ownedIds: Set<string>;            // all collectible IDs the player has
  progress: Map<string, number>;    // for multi-step achievements (future)
  avatar: AvatarSelections;
  activeThemeId: string;
}

// Storage adapter — the only interface the host app must implement
interface PlayerStateAdapter {
  getPlayerState(userId: string): Promise<PlayerState>;
  awardCollectible(userId: string, collectibleId: string): Promise<void>;
  saveAvatar(userId: string, avatar: AvatarSelections): Promise<void>;
  saveTheme(userId: string, themeId: string): Promise<void>;
}
```

### Registry Factory

```typescript
interface Registry {
  collectibles: Map<string, Collectible>;
  arcs: Map<string, NarrativeArc>;
  collections: Map<string, Collection>;
  avatarSlots: AvatarSlotConfig[];
  themes: Map<string, ThemeDefinition>;
  animations: Map<string, AvatarAnimation>;
}

// Factory — builds indexed lookup maps from raw arrays
function createRegistry(config: {
  collectibles: Collectible[];
  arcs?: NarrativeArc[];
  collections?: Collection[];
  avatarSlots?: AvatarSlotConfig[];
  themes?: ThemeDefinition[];
  animations?: AvatarAnimation[];
}): Registry;
```

---

## Data Model (Supabase — host app side)

```sql
-- Owned collectibles (badges, avatar parts, themes — all unified)
CREATE TABLE user_collectibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  collectible_id text NOT NULL,
  awarded_at timestamptz DEFAULT now(),
  UNIQUE(user_id, collectible_id)
);

ALTER TABLE user_collectibles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own collectibles"
  ON user_collectibles FOR SELECT USING (auth.uid() = user_id);

-- Avatar + theme on profile (lightweight, frequently read)
ALTER TABLE profiles ADD COLUMN avatar jsonb DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN theme text DEFAULT 'cottagecore';
```

One table for all collectibles. No separate badge/theme/avatar tables. The `collectible_id` references the registry, not the DB.

---

## Cross-System Flow (Host App Orchestration)

```
User saves a log
  → Host app emits Signal { type: 'log_saved', payload: { date, streakDays } }
  → evaluate(signal, registry, playerState) → Award[]
  → For each award:
      → adapter.awardCollectible(userId, award.id)
      → resolveUnlocks(award.id, registry, playerState)
      → Award any newly unlocked collectibles (recursive, with cycle guard)
  → Return all new awards to UI for celebration animation
```

No cross-package imports. No "badge unlocks theme" special case. A theme IS a collectible. Earning collectible X may list collectible Y in its `unlocks` array. The host app walks the chain.

---

## Art Pipeline (Nano Banana)

### Workflow

1. Open saved prompt "Badge Sticker Generator" in Google AI Studio
2. Model: Nano Banana Pro (gemini-3-pro-image-preview), 1:1 aspect ratio
3. System instruction contains the nano banana foundation prompt
4. Upload style anchor images (raccoon-logo.png + approved badges) as first message
5. Describe the sticker → generate → iterate
6. Approved results → `public/badges/` directory (chroma key removed)
7. Best results added as style anchors for future sessions

### Art Directory Structure

```
public/
  badges/                       # Final sticker PNGs
    otter-kindergarten.png
    hedgehog-reading.png
    ...
  avatar/                       # Avatar layer PNGs
    body/                       # Base body sprite strips per animation
      idle.png                  # 3072 × 256px (12 frames)
      celebrate.png
      wave.png
      sad.png
    skin/                       # Skin tone layers
    hair/                       # Hair style layers
    eyes/                       # Eye style layers (+ blink strips)
    mouth/
    nose/
    top/                        # Clothing
    accessory/                  # Hats, glasses, etc.
  themes/                       # Theme-specific assets
    cottagecore/
    cherry-blossom/
    ...
badges/                         # Prompt & reference (not served to users)
  prompt/
    nano-banana.md              # System instruction (versioned in git)
  reference/
    style-anchors/              # Gold standard images
    approved/                   # All approved generations
```

### Nano Banana System Instruction

```
You are a pixel art sticker artist for a collectible badge system in a mobile app.

STYLE RULES:
- 16-bit pixel art, clean and richly detailed
- Sticker format: die-cut silhouette with clean white sticker-style outline border
- Warm, saturated palette with teal, coral, amber, and cream as recurring accents
- Consistent top-left lighting with soft pixel shading
- Generate at 512x512px, must read clearly at 128x128px

BACKGROUND:
Use a solid, flat #FF00FF (magenta/fuchsia) background. Fill the entire
background with this exact color — no gradients, no noise, no anti-aliasing
blend into the background. The subject should have a clean white sticker-style
outline border separating it from the magenta background.

WORLD:
A cozy anthropomorphic animal world. Characters are small animals living
everyday human lives — going to work, raising families, celebrating holidays,
doing hobbies, having quiet moments. Think Sylvanian Families meets pixel art.

- Characters wear clothes, use tools, sit in chairs, carry bags
- Scenes are warm, domestic, slice-of-life — NOT action/adventure
- Each sticker is a self-contained vignette: one moment, one scene
- Emotionally resonant: cozy, funny, tender, proud, mischievous

CHARACTER CAST:
All characters share a unified design language: round proportions, large
expressive eyes, small limbs, 2-3 head-tall chibi pixel ratio.

- Raccoon: red/orange goggles on forehead, teal hoodie, cream belly — the app mascot
- Fruit bat: big wing-cape, purple/indigo tones — nocturnal, bookish, cozy introvert
- Ermine: sleek white fur, elegant scarf — disciplined, put-together
- Hedgehog: warm brown/amber, soft spikes — gentle, resilient
- Otter family: mother otter + three small children in Japanese kindergarten
  uniforms (yellow caps, smocks, small randoseru backpacks) — cheerful chaos

WHAT NOT TO DO:
- No photorealism, no 3D renders, no watercolor
- No text or letters in the image
- No busy or detailed backgrounds — keep focus on the characters and their moment
- Characters must stay on-model across all stickers
```

---

## Implementation Order

### Sprint 1: Woodland Package + Theme System (CURRENT)

**Step 1 — Package scaffold + all DTOs:**
- Create `packages/woodland/` with full directory structure
- All type definitions (Collectible, AcquisitionRule, AvatarSlotConfig, ThemeDefinition, PlayerState, etc.)
- Types for badges and avatars exist as complete definitions but with no implementation yet
- `createRegistry()` factory function
- `package.json` with TypeScript config, export from barrel `index.ts`

**Step 2 — Theme resolution (pure functions):**
- `resolveTheme(themeId, registry)` → returns CSS variables + assets
- `getUnlockedThemes(registry, playerState)` → available themes for picker
- Unit tests for both functions

**Step 3 — Cottagecore theme definition:**
- Define cottagecore as a `ThemeDefinition` DTO with full CSS variable set
- Reference existing color scheme from `docs/design-brief-cottagecore-theme.md`
- Define "Classic Dark" as second default theme (current app look)
- Seed both as `Collectible` entries with `acquisition: { type: 'default' }`

**Step 4 — Host app integration:**
- Supabase migration: `ALTER TABLE profiles ADD COLUMN theme text DEFAULT 'cottagecore'`
- Partial `PlayerStateAdapter` — only `saveTheme()` and theme-read path implemented
- `user_collectibles` table migration (for future use, seeded with default theme collectibles)
- Theme switcher component (reads profile, applies CSS vars to `:root`)
- Theme picker UI (shows available themes, saves selection)

**Step 5 — Cottagecore CSS variables + assets:**
- Map cottagecore palette from design brief → CSS custom properties
- Background animation (floating leaves / fireflies)
- Nature accent assets if available
- Verify existing glass-blur UI, bottom nav, calendar all respond to variable changes

### Sprint 2: Badge Engine
- `evaluate()` + `resolveUnlocks()` pure functions
- Supabase adapter for `awardCollectible()` / `getPlayerState()`
- Wire Signal emission into log save flow
- Badge collection page UI
- Seed badge definitions + narrative arcs

### Sprint 3: Avatar System
- Avatar compositing + animation resolution functions
- Generate avatar layer art via nano banana
- Avatar editor UI
- Wire avatar parts as collectibles

### Sprint 4: Cross-system wiring
- Badge → theme unlock chains
- Badge → avatar part unlock chains
- Celebration animations on badge earn

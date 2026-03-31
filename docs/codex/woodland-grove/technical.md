# Woodland Grove — Technical Reference

Pointers to existing technical specs and implemented code. This doc doesn't duplicate — it tells you where to look.

## Architecture

**Registry + Evaluator + Player State** pattern. All earnable items (creatures, avatar parts, themes) are unified as `Collectible` DTOs.

- **Design spec**: `docs/superpowers/specs/2026-03-28-woodland-cosmetics-platform-design.md`
- **Implementation**: `packages/woodland/src/`

```
Registry (pure data)  →  Evaluator (pure functions)  →  Player State (host provides storage)
```

## Implemented Code (`packages/woodland/`)

| Module | Path | Status |
|--------|------|--------|
| Types: Collectible, AcquisitionRule | `src/types/collectible.ts` | Done |
| Types: AvatarSlotConfig, AvatarAnimation | `src/types/avatar.ts` | Done |
| Types: ThemeDefinition, ThemeAssets | `src/types/theme.ts` | Done |
| Types: PlayerState, Signal | `src/types/player.ts`, `signal.ts` | Done |
| Registry factory | `src/registry/index.ts` | Done |
| Evaluator: evaluate() | `src/evaluator/evaluate.ts` | Done |
| Evaluator: resolveUnlocks() | `src/evaluator/unlock.ts` | Done |
| Theme: resolveTheme() | `src/theme/resolve.ts` | Done |
| Avatar: compositing | `src/avatar/composite.ts` | Stub |
| Avatar: animation | `src/avatar/animation.ts` | Stub |
| Theme data: Cottagecore, Classic Dark | `src/data/themes.ts` | Done |

## Sprite Format

All animations: **12 frames, horizontal strip, 3072×256px total** (256×256 per frame).

Defined in `AvatarAnimation` type — `frameCount` is a literal `12`. CSS renders with `steps(12)` timing.

Simple animations (idle, breathe) use 4-6 unique frames duplicated to fill 12. Complex animations use all 12.

## Supabase Schema

### Existing Tables

| Table | Purpose | Migration |
|-------|---------|-----------|
| `profiles` | User profile, includes `theme text` column | `003_profile_theme.sql` |
| `user_collectibles` | Owned items (creature unlocks, avatar parts) | `003_profile_theme.sql` |
| `badges` | Badge/creature registry (id, name, description, image_path, kind, tags, rarity) | `004_badges_registry.sql` |
| `sprite_animations` | Sprite sheet metadata (creature_id, grid, frames, fps, offsets, mirrors) | `006_sprite_animations.sql` |
| `reveal_odds` | Probability weights per animation for creature reveal (sum ≤ 100%) | `007_reveal_odds.sql` |
| `reveal_log` | Audit of creature encounters per user (first_encounter flag) | `007_reveal_odds.sql` |

### Planned (Not Yet Applied)

| Change | Purpose |
|--------|---------|
| `ALTER TABLE badges ADD COLUMN trigger_config jsonb` | Event-driven trigger conditions for creature encounters |

### Storage Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `badges` | Badge sticker images | Public (CDN) |
| `sprites` | Animated creature sprite sheets | Public (CDN) |

## Host App Integration

| Component | Path | Purpose |
|-----------|------|---------|
| WoodlandThemeProvider | `src/components/woodland-theme-provider.tsx` | Applies theme CSS vars to `:root` |
| Theme picker | `src/components/theme-picker.tsx` | Theme selection UI on profile page |
| Badge collection page | `src/app/(app)/collection/page.tsx` | Grid of earned badges |
| Collectibles service | `src/app/lib/services/collectibles/collectibles.service.ts` | Queries user_collectibles + badges |
| Bottom nav | `src/components/bottom-nav.tsx` | Includes Badges tab |

## Related Specs

| Doc | Covers |
|-----|--------|
| `docs/superpowers/specs/2026-03-28-skinnable-components-design.md` | 9-slice component skins (buttons, cards with pixel art textures) |
| `docs/plans/woodland-theme-roadmap.md` | Theme phases (palette, micro-interactions, full personality) |
| `docs/design-brief-cottagecore-theme.md` | Cottagecore color palette and visual direction |

## Key Types Quick Reference

```typescript
// Everything earnable
interface Collectible {
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

// How creatures get triggered
type AcquisitionRule =
  | { type: "trigger"; signalType: string; condition: TriggerCondition }
  | { type: "narrative"; arc: string; order: number }
  | { type: "random"; weight: number }
  | { type: "manual" }
  | { type: "default" };

// Animation sprite strip
interface AvatarAnimation {
  id: string;
  bodyFrames: string;       // sprite strip path
  frameCount: 12;           // always 12
  duration: number;         // ms per cycle
  loop: boolean;
  featureOffsets: Array<{ x: number; y: number }>;  // 12 entries
}
```

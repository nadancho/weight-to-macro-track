# Player Character — The Druid Scout

## Concept

The player character is a **druid-scout** — a young person who's part forest ranger apprentice, part merit-badge collector, part nature mystic. The aesthetic blends:

- **Scout**: Sash with earned patches, practical hiking gear, a can-do attitude
- **Druid**: Connection to the woodland creatures, nature journal, a sense of stewardship over the grove

Not a wizard in robes. Not a military cadet. More like a forest camp counselor who also happens to have a spiritual bond with a raccoon named Tyson.

## Gender & Base Models

**Phase 1 (MVP)**:
- Two base models: male and female
- Selection during onboarding or profile setup
- Visual difference is subtle — body shape, default hair, face proportions
- Same sash, same boots, same gear

**Future**: Non-binary option, more body type variation. But start simple.

## Visual Identity

### Core Outfit (Default)
- **Scout sash**: Diagonal across chest, starts empty, patches appear as achievements unlock
- **Hiking boots**: Sturdy, earthy tones
- **Shorts or cropped pants**: Practical, outdoor-ready
- **Nature journal**: Tucked at hip or held in idle animation
- **Color palette**: Earthy greens, warm browns, cream/khaki accents

### The Sash
The sash is the key visual progression element. It starts bare and fills with patches as you unlock achievements. Each patch corresponds to a creature encounter or milestone. This is the player's visible "badge collection" rendered on their character.

## Customization Slots

Using the existing `AvatarSlotConfig` type from `packages/woodland/`:

### Phase 1 (MVP — minimal viable character)

| Slot | Required | Options | Unlockable |
|------|----------|---------|------------|
| Gender/body | Yes | Male, female | No |
| Skin tone | Yes | 4-5 tones | No |
| Hair | Yes | 4 styles per gender | Some via unlocks |
| Eyes | Yes | 3 styles | No |

### Phase 2 (expanded customization)

| Slot | Required | Options | Unlockable |
|------|----------|---------|------------|
| Hair color | Yes | 6-8 colors | No |
| Mouth | Yes | 3-4 styles | No |
| Clothing top | No | Scout uniform variations (colors, sleeve length) | Some via unlocks |
| Accessory: head | No | Hats, headbands, goggles | All via unlocks |

### Phase 3 (deep customization)

| Slot | Required | Options | Unlockable |
|------|----------|---------|------------|
| Accessory: held | No | Walking stick, lantern, book, mug | All via unlocks |
| Sash patches | Auto | Earned patches appear on sash | All via creature encounters |
| Clothing bottom | No | Shorts, pants, skirt variations | Some via unlocks |
| Shoes | No | Boot variations | Some via unlocks |

## Sprite Format

All player character sprites follow the standard animation format:
- **Frame size**: 256x256 per frame
- **Strip format**: 12 frames horizontal (3072x256 total)
- **Compositing**: Body carries the animation. Feature layers (hair, eyes, accessories) are static PNGs positioned via anchor points with per-frame offsets.

### Required Animations (Phase 1)

| Animation | Frames Used | Duration | Loop |
|-----------|-------------|----------|------|
| Idle / breathing | 6 unique (doubled to 12) | ~2s | Yes |
| Sitting by fire | 6 unique (doubled to 12) | ~2.5s | Yes |

### Future Animations

| Animation | Use |
|-----------|-----|
| Wave | Greeting on app open |
| Celebrate | Badge/creature unlock |
| Write in journal | Logging a meal |
| Look around | Idle variation |

## Art Pipeline Notes

Player character sprites are created through the same Final Parsec → Unfaker pipeline as creatures. Key differences:
- **Body sprite** includes the default outfit (sash + boots). Clothing customization overlays on top.
- **Feature layers** (hair, eyes) are separate transparent PNGs that composite onto the body.
- **Accessory layers** sit at the highest z-index.
- Need both male and female versions of body sprites. Feature layers may be shared across genders.

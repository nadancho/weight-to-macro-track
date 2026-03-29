# Art Pipeline

How we go from "I want a hedgehog character" to a usable sprite asset in the app.

## Tools

| Tool | Role | Cost |
|------|------|------|
| [Final Parsec Art Maker](https://www.finalparsec.com/) | Generate raw sprite sheets | Subscription (~$10/mo) |
| [Unfaker](https://jenissimo.itch.io/unfaker) | Clean up AI pixel art — snap pixel grid, reduce colors, sharpen | Free (browser-based) |
| Any pixel editor (Aseprite, Piskel, Photopea) | Frame curation and assembly | Free/cheap |
| Supabase Storage | Host final assets | Existing infrastructure |

## Reference Style

**Bread & Fred** — 16-bit SNES-era pixel art:
- Chunky, expressive characters with bold black outlines
- Limited color palette (12-15 colors per character)
- Chibi/squat proportions (~2 heads tall)
- Clean readable silhouettes at small sizes
- Warm, friendly aesthetic

## Workflow

### Step 1: Generate (Final Parsec)

Open the Art Maker and describe the character/animation you want. Be specific:
- Name the character and species
- Describe the pose or animation cycle
- Specify the art style ("16-bit pixel art, Bread & Fred style")
- Request the frame count and layout

The Art Maker generates a sheet of frames. Not all will be usable — this is raw material.

**Tips for better generation:**
- One animation per generation — don't combine idle + walk in one prompt
- Describe keyframes for complex animations: "Frame 1: standing. Frame 4: arm raised. Frame 8: peak of jump."
- Reference existing characters by description, not by name (the tool doesn't know Tyson)
- Specify "transparent background" or "solid color background" explicitly

### Step 2: Clean Up (Unfaker)

Upload the raw sprite sheet to Unfaker (runs locally in browser, nothing uploaded to servers):

1. Drag image onto the page
2. Select **Pixel mode**
3. Let it auto-detect pixel size, or set manually if it guesses wrong
4. Adjust settings until pixels are crisp and grid-aligned
5. Optionally reduce color count to enforce a tighter palette
6. Export as PNG

**What Unfaker fixes:**
- Inconsistent pixel sizes (AI often generates slightly different-sized "pixels")
- Color bleeding between adjacent pixels
- Anti-aliasing artifacts that don't belong in pixel art
- Excess colors — snaps to a cleaner, limited palette

### Step 3: Curate

Open the cleaned sheet in a pixel editor. Review each frame:

- **Keep**: Clean frames with consistent proportions and good pose
- **Discard**: Frames where proportions shifted, limbs are wrong, or the character drifted off-model
- **Duplicate**: For simple animations (idle, breathing), you may only need 4-6 unique frames — duplicate the good ones to fill 12

Goal: select the best frames, not all frames. The Final Parsec blog example kept 5 out of a larger generated set.

### Step 4: Assemble

Arrange curated frames into the standard sprite strip format:

- **12 frames**, left to right, in a single horizontal row
- **256px × 256px** per frame
- **Total strip**: 3072px × 256px
- **PNG with transparency**
- Character centered in each frame, feet at consistent Y position
- Frame 1 = neutral/rest pose
- Frame 12 should flow back into frame 1 for looping animations

Use any pixel editor's canvas tools or Final Parsec's Sprite Sheet Maker to assemble.

### Step 5: Upload

Final assets go to **Supabase Storage**:

- **Creature sprites**: `sprites/creatures/{creature-id}/{animation}.png`
- **Player character sprites**: `sprites/player/{gender}/{animation}.png`
- **Feature layers**: `sprites/player/features/{slot}/{option}.png`
- **Badge stickers** (static): `badges/{badge-id}.png`

Upload via Supabase CLI or dashboard. Public bucket with CDN caching.

## Asset Specifications

### Creature Sprites (animated)

| Property | Value |
|----------|-------|
| Format | 12-frame horizontal strip |
| Frame size | 256×256 px |
| Total size | 3072×256 px |
| File type | PNG (transparent background) |
| Naming | `{creature-id}-{animation}.png` (e.g., `tyson-idle.png`) |

### Badge Stickers (static)

| Property | Value |
|----------|-------|
| Format | Single frame |
| Size | 256×256 px |
| File type | PNG (transparent background) |
| Naming | `{badge-id}.png` |

### Player Character Layers

| Layer | Format | Notes |
|-------|--------|-------|
| Body | 12-frame strip (3072×256) | Includes default outfit, carries animation |
| Hair | Static PNG (256×256) | Positioned via anchor point + per-frame offsets |
| Eyes | 12-frame strip (optional blink) | Can be static if blink not needed |
| Accessories | Static PNG (256×256) | Highest z-index |

## Quality Checklist

Before uploading a sprite asset, verify:

- [ ] Pixel grid is clean (no half-pixels, no blurry edges)
- [ ] Color palette is limited (12-15 colors per character max)
- [ ] Character proportions consistent across all 12 frames
- [ ] Transparent background with no artifacts
- [ ] Frame 12 → Frame 1 loops smoothly (for looping animations)
- [ ] Character centered and feet at consistent Y in every frame
- [ ] Reads clearly at small display size (test at 64×64)

## Sources

- [Final Parsec: How to Turn AI Art into Game Sprites](https://www.finalparsec.com/blog_posts/how_to_turn_ai_art_into_game_sprite)
- [Unfaker by jenissimo](https://jenissimo.itch.io/unfaker) — [GitHub: unfake.js](https://github.com/jenissimo/unfake.js/)
- [SEELE: How We Create Sprite Sheets with AI](https://www.seeles.ai/resources/blogs/how-to-create-sprite-sheets-with-ai)

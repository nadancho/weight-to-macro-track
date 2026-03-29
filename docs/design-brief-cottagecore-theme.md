# Cottagecore Theme — Design Brief

## Vision

Transform the weight tracker from a functional dark-mode app into a cozy, illustrated world — inspired by PostHog's design language where the mascot and art are inseparable from the UI, not decoration on top of it. The raccoon (already the app mascot) becomes a character that lives in the app.

## Inspiration References

### PostHog (primary inspiration)
- Max the Hedgehog appears throughout the product in different states and contexts
- Hand-drawn/sketch-style art that feels approachable and playful
- Every element shares the same visual language — buttons, cards, backgrounds, icons
- Animated background elements add life without distraction
- The art and the UI are one cohesive world

### Rosé Pine (color direction)
- Warm, muted palette: dusty roses, deep pine greens, soft golds
- Organic feel — colors that could exist in nature
- Three variants (main, moon, dawn) show how the same theme scales light ↔ dark

### Cottagecore aesthetic
- Soft textured backgrounds (parchment, linen, woodgrain — subtle, not skeuomorphic)
- Nature-inspired accents: mushrooms, leaves, acorns, flowers, pinecones
- Warm and inviting, like a cabin or a forest clearing

## Raccoon Character States

The raccoon should appear in multiple contexts with different moods/poses:

| Context | Raccoon State | Notes |
|---------|--------------|-------|
| Sign-in page | Waving / greeting | Welcoming the user |
| Empty dashboard | Sleeping / lounging | "No data yet" feels cozy, not empty |
| After saving a log | Flexing / celebrating | Already exists — the sprite walk + flex animation |
| Loading states | Foraging / busy | Replaces generic skeleton shimmers? |
| Streak milestone | Party hat / confetti | When user logs N days in a row |
| Error state | Confused / looking around | Softens error messages |
| Profile page | Sitting / relaxed | Ambient presence |

## Illustrated Elements (Accents)

Small illustrated clipart that appears as accents throughout the UI:

- **Card corners/edges**: tiny mushroom, leaf, or acorn peeking in
- **Empty states**: illustrated scene (raccoon napping under a tree) instead of plain text
- **Dividers/separators**: vine or branch line instead of `border-b`
- **Icons**: nature-themed replacements for Lucide icons where it makes sense (acorn for profile, leaf for log, mushroom for dashboard?)
- **Calendar dots**: tiny flower or berry instead of the current green circle for logged days

## Animated Background

Subtle, ambient animations that make the app feel alive:

- **Floating leaves**: 3-5 small leaf SVGs drifting slowly across the background, parallax-style
- **Fireflies** (dark mode): tiny warm dots that gently pulse and drift
- **Seasonal variation** (future): falling leaves in autumn, snowflakes in winter, flowers in spring
- **Performance**: CSS animations only, no JS animation loops. `will-change: transform` for GPU acceleration. Reduced motion media query to disable for accessibility.

## Color Palette Direction

Should feel like a forest at golden hour — warm, muted, earthy.

### Dark mode (primary — this is a PWA used mostly on phones)
- Background: deep forest (very dark green-brown, not pure black)
- Cards: slightly lighter, like dark wood
- Primary accent: warm gold / amber (like lantern light)
- Secondary: muted sage green
- Macro colors: keep distinct but shift warmer (protein → warm clay, carbs → moss, fat → honey)
- Text: warm cream, not pure white

### Light mode
- Background: warm parchment / linen off-white
- Cards: slightly cooler cream, with subtle shadow
- Primary accent: forest green
- Secondary: warm brown
- Same macro color logic, adjusted for light background contrast

## Swappable Themes (Unlockable)

The cottagecore palette is the default, but the system should support multiple themes:

- Each theme is a set of CSS custom properties (`--background`, `--foreground`, `--primary`, etc.)
- Themes are swapped by changing a CSS class on the root element (e.g., `data-theme="cottagecore"`)
- Each theme can optionally include its own mascot variant, background animation, and accent art
- Themes are "unlocked" (mechanism TBD — streak milestones? Easter eggs?)

### Possible future themes:
- **Midnight Forest**: darker, more mysterious, fireflies prominent
- **Cherry Blossom**: pink-tinted, sakura petals floating
- **Ocean Cove**: blues and teals, gentle wave motion
- **Arctic**: cool whites and icy blues, subtle snowfall

## Architecture Notes

This is being built as a **separate package** that can be abstracted and potentially reused. The weight tracker app will consume the theme package. Key interfaces:

- Theme definition: CSS variables + optional asset manifest (background animation, accent images, mascot sprite)
- Theme switcher: reads user's selected theme from profile/localStorage, applies the CSS class
- Asset loading: lazy-load theme-specific images/animations so unused themes don't bloat the bundle

## Current App State (for context)

The app already has:
- CSS custom properties for all colors (globals.css, `:root` and `.dark`)
- A `--skeleton` variable ready for theme customization
- A raccoon sprite animation (walk + flex, triggered on save)
- Glass-blur UI (header + bottom nav)
- Bottom tab navigation
- Framer Motion installed and used for page transitions + collapsible calendar

The theme work layers on top of this foundation. The glass blur, animations, and component structure stay — only colors, textures, and art assets change.

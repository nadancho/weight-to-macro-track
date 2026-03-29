# Woodland Grove — Vision

## The Concept

The Woodland Grove is a virtual campsite that lives alongside the weight/macro tracker. It's *your* grove — a cozy clearing in a forest where your character lives and woodland creatures come to visit.

Think Animal Crossing's island, but as a single screen in a health app. You don't build or manage it — you *inhabit* it, and it grows around you as you use the tracker.

## The Player Character

You are a **druid-scout** — part nature mystic, part merit-badge earner. Boy scout or girl scout aesthetic depending on gender selection. Practical outfit: sash with earned patches, hiking boots, a nature journal. Not a wizard in robes — more like a forest ranger apprentice who also happens to commune with animals.

The character is customizable:
- **Phase 1**: Male / female base model, 2-3 skin tones, a few hair options
- **Phase 2**: More hair, eye, and mouth options. Clothing tops (scout uniform variations)
- **Phase 3**: Accessories — hats, scarves, patches on the sash, carried items (walking stick, lantern)

Customization options are unlockable through tracker activity. You don't buy them — you earn them by showing up.

## Creatures as Collectibles

The woodland creatures are **not badges**. They're characters. Each one has:
- A personality and backstory
- An idle animation (breathing, fidgeting, doing their thing)
- A walking or arrival animation
- A rarity tier that determines how often they visit

When you unlock a creature, they start appearing in your grove. Common ones visit often. Rare ones show up unexpectedly. You don't *summon* them — they just wander in when conditions are met.

This replaces the flat badge collection grid. Instead of "here are 12 badge stickers I've earned," it's "look who's visiting my grove today."

### Rarity Tiers

| Tier | Visit Frequency | Unlock Difficulty | Example |
|------|----------------|-------------------|---------|
| Common | Most visits, multiple at once | Low bar — early activity milestones | Hedgehog, sparrow |
| Uncommon | Regular but not every visit | Moderate — sustained engagement | Ermine, field mouse |
| Rare | Occasional, noticeable when present | Higher — specific achievements or streaks | Fruit bat, otter family |
| Legendary | Very rare, special occasions | Exceptional — rare conditions, low chance encounters | Bartholomew, stag |

### The "Random Encounter" Feel

Not every unlock is deterministic. Some creatures have a *chance* to appear when conditions are met (the `chance` field in the trigger config). You might hit 100g protein three times before the ermine shows up — and that randomness makes the appearance feel special, not like a checkbox.

## The Grove Scene

A single-screen environment. Pixel art background — a forest clearing with:
- A campfire (always there, cozy anchor point)
- Your druid-scout character (animated idle, reacts to taps)
- Visiting creatures scattered around (idle animations, some sleeping, some exploring)
- Seasonal/theme touches (cottagecore: fireflies and mushrooms; cherry blossom: petals falling)

The scene is **not interactive gameplay**. You don't control movement or make decisions. It's a living diorama that reflects your engagement. Open the grove and see who's around today.

## Key Characters

**Tyson** (raccoon) — your personal trainer. He visits often because he's enthusiastic about your progress. Common tier, but his presence is always encouraging. See `docs/characters/tyson.md`.

**Bartholomew** (raccoon) — Tyson's lazy brother. Legendary tier. When Bartholomew shows up, it *means something*, because he normally doesn't get off the couch. See `docs/characters/bartholomew.md`.

**Otter kindergarten family** — a mom with pups in yellow school caps (Japanese kindergarten style). They arrive together as a group. Rare tier — they represent consistency milestones (showing up every day, like getting the kids to school).

Full creature roster: see `creatures.md`.

## Tone & Feel

- **Cozy, not competitive**. No leaderboards. No "you're falling behind."
- **Warm surprise, not grinding**. Creatures appear unexpectedly. The randomness is a gift, not a treadmill.
- **Personality over points**. Each creature has a *reason* to be in the grove. Tyson is there because he's proud of you. Bartholomew is there because even he was impressed.
- **Slice of life**. The grove is a quiet scene. Animals doing animal things. Your character sitting by the fire. A hedgehog reading a tiny book. An otter mom herding her pups.
- **Earned, not bought**. Everything is unlocked through using the tracker. No microtransactions, no premium currency. You log your food, your grove grows.

## What This Is Not

- Not a game with objectives, quests, or fail states
- Not a virtual pet that needs feeding or attention
- Not a competitive system with rankings
- Not a currency/shop economy
- Not something that punishes absence — if you skip a week, your grove is still there, same as you left it

## Connection to the Tracker

The grove is a reward layer on top of a functional health app. The tracker has to be good *without* the grove. The grove makes it delightful.

Events from the tracker feed into the creature unlock system:
- Logging a meal → potential trigger for creature visits
- Hitting protein targets → unlocks consistency creatures
- Streaks → unlocks dedication creatures
- First-time events (first log, first photo extract) → unlocks discovery creatures

The tracker never mentions the grove. It just does its job. The grove quietly responds to your activity in the background.

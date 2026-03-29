# Project Codex

Living design document for the weight-to-macro-track app. Two parallel development tracks, one shared vision.

---

## Track 1: App Improvements

Making the tracker great on its own merits — performance, UX, features, modernization.

- [**Overview**](app-improvements/README.md)

---

## Track 2: Woodland Grove

An Animal Crossing-inspired virtual campsite layered on top of the tracker. Your druid-scout character lives in a forest clearing. Woodland creatures visit based on your engagement. Everything is earned, nothing is bought.

### Vision & Design
- [**Vision**](woodland-grove/vision.md) — What the grove is, how it feels, the core concepts
- [**Creatures**](woodland-grove/creatures.md) — Full roster of woodland creatures with rarity, personality, and visual notes
- [**Player Character**](woodland-grove/player-character.md) — The druid-scout avatar, customization slots, progression

### Production
- [**Art Pipeline**](woodland-grove/art-pipeline.md) — Final Parsec → Unfaker → curate → assemble → Supabase

### Technical
- [**Technical Reference**](woodland-grove/technical.md) — Pointers to architecture, implemented code, schema, sprite format

### Character Profiles
- [`docs/characters/tyson.md`](../characters/tyson.md) — Raccoon personal trainer (Common)
- [`docs/characters/bartholomew.md`](../characters/bartholomew.md) — Tyson's lazy brother (Legendary)

---

## How to Use This Codex

- **Starting a coding session**: Read the relevant track docs to ground yourself in the direction
- **Creating art**: Read `art-pipeline.md` for the workflow, `creatures.md` for character specs
- **Adding a new creature**: Add entry to `creatures.md`, optionally create a detailed profile in `docs/characters/`
- **Planning work**: Check both tracks, decide which to advance
- **Evolving the vision**: Edit these docs directly — they're versioned in git

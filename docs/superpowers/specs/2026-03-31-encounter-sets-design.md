# Encounter Sets — Design Spec

**Date:** 2026-03-31
**Status:** Approved

## Problem

The current reveal system uses a single flat `reveal_odds` table. Every roll draws from the same pool regardless of what the user did. There's no way to reward specific behaviors (hitting protein targets, maintaining streaks) with different creature encounters.

## Solution

Replace the single pool with an **additive encounter set system**:

- A **two-stage roll** (tier first, then creature within tier)
- **Encounter sets** with optional conditions that gate which creatures enter the pool
- **Profile attributes** that track computed user state (streaks, totals, flags)
- A **lightweight event system** that keeps profile attributes up to date

## Two-Stage Roll Mechanic

### Stage 1: Tier Roll

Fixed constants with a "nothing" outcome:

```typescript
const TIER_ODDS = {
  common:    35,
  rare:      20,
  epic:      12,
  unique:     5,
  legendary:  3,
  // nothing: 25 (implicit remainder)
};
```

Random number 0-100. Walk tiers accumulating weights. First tier where `roll < cumulative` wins. If no tier wins (roll lands in the 25% gap), return `null` — no creature.

### Stage 2: Creature Roll Within Tier

1. Collect all qualifying encounter sets (evaluate conditions against event data + profile attributes)
2. Union all `encounter_set_members` from qualifying sets, JOIN `badges` to get rarity, filter to winning tier
3. **Dedup by badge_id** — if same creature appears in multiple qualifying sets, use the **highest weight** (not summed)
4. Weighted random selection: creature probability = `weight / sum(all weights in pool)`

Adding creatures to the pool (by qualifying for more sets) naturally redistributes odds without manual recalculation. A weight-1 creature in a pool of 10 has 10%; add 10 more weight-1 creatures and they all have 5%.

## Data Model

### `encounter_sets`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | default `gen_random_uuid()` |
| `name` | text, NOT NULL | e.g., "default", "high-protein", "streak-7" |
| `condition` | jsonb, nullable | `null` = always active (default set) |
| `created_at` | timestamptz | default `now()` |

### `encounter_set_members`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | default `gen_random_uuid()` |
| `set_id` | uuid FK → encounter_sets ON DELETE CASCADE | |
| `badge_id` | uuid FK → badges ON DELETE CASCADE | |
| `weight` | integer, NOT NULL, default 1 | Relative weight within tier. CHECK > 0 |
| `created_at` | timestamptz | default `now()` |
| | | UNIQUE(set_id, badge_id) |

**No `tier` column.** Tier is always read from `badges.rarity` at roll time. This avoids inconsistency between a creature's canonical rarity and its encounter set placement.

### `profile_attributes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | default `gen_random_uuid()` |
| `key` | text, NOT NULL, UNIQUE | e.g., `current_streak`, `total_logs` |
| `label` | text, NOT NULL | Human-readable name |
| `data_type` | text, NOT NULL | CHECK IN ('number', 'boolean', 'string') |
| `created_at` | timestamptz | default `now()` |

### `profile_attribute_values`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | default `gen_random_uuid()` |
| `user_id` | uuid FK → auth.users ON DELETE CASCADE | |
| `attribute_id` | uuid FK → profile_attributes ON DELETE CASCADE | |
| `value_number` | numeric, nullable | Populated when data_type = 'number' |
| `value_boolean` | boolean, nullable | Populated when data_type = 'boolean' |
| `value_string` | text, nullable | Populated when data_type = 'string' |
| `updated_at` | timestamptz | default `now()` |
| | | UNIQUE(user_id, attribute_id) |

### Rarity Tier Migration

The Woodland Grove vision doc defined 4 tiers: `common`, `uncommon`, `rare`, `legendary`. The new system uses 5 tiers: `common`, `rare`, `epic`, `unique`, `legendary`. Existing `badges.rarity` values need a migration:

- `common` → `common` (unchanged)
- `uncommon` → `rare`
- `rare` → `epic`
- `legendary` → `legendary` (unchanged)
- New tier `unique` sits between `epic` and `legendary`

Update `badges.rarity` CHECK constraint to the new 5-tier enum. Update existing badge rows.

### Retired

- `reveal_odds` — replaced by encounter_sets + encounter_set_members

### Unchanged

- `reveal_log` — stays as-is

## Condition Format

Encounter set conditions are JSON objects evaluated at roll time:

```json
{
  "source": "attribute",
  "key": "current_streak",
  "operator": "gte",
  "value": 7
}
```

```json
{
  "source": "event",
  "key": "protein_g",
  "operator": "gte",
  "value": 100
}
```

**Sources:**
- `"attribute"` — reads from `profile_attribute_values` for the user
- `"event"` — reads from the current daily log data passed to the roll endpoint

**Operators:**
- `eq` — equals
- `gt`, `gte` — greater than / greater than or equal
- `lt`, `lte` — less than / less than or equal
- `exists` — value is non-null (ignores `value` field)

**`condition: null`** — set is always active (the default encounter set).

## Event System

Lightweight in-process function registry at `src/app/lib/services/events/`.

```typescript
type EventType = 'log:saved' | 'profile:updated';

type EventPayload = {
  'log:saved': { userId: string; log: DailyLogsRow };
  'profile:updated': { userId: string; profile: ProfilesRow };
};

function registerHandler<T extends EventType>(
  event: T,
  handler: (payload: EventPayload[T]) => Promise<void>
): void;

function emit<T extends EventType>(
  event: T,
  payload: EventPayload[T]
): Promise<void>;  // runs all registered handlers, awaits all
```

Handlers are registered at import time. Each handler is responsible for computing one profile attribute and upserting the value.

### Starter Attributes & Handlers

| Attribute Key | Data Type | Computed On | Logic |
|---------------|-----------|-------------|-------|
| `current_streak` | number | `log:saved` | Count consecutive days with logs ending at log.date |
| `total_logs` | number | `log:saved` | Count all daily_logs for user |
| `best_protein_day` | number | `log:saved` | Max protein_g across all daily_logs for user |
| `has_logged_weight` | boolean | `log:saved` | Whether today's log has a non-null weight value |

New attributes are added by: inserting a row into `profile_attributes`, writing a handler function, and registering it.

## Roll Flow

```
User taps Save
  |
  +-- 1. Save daily_log (existing)
  +-- 2. emit('log:saved', { userId, log })
  |      +-- handlers upsert profile_attribute_values
  +-- 3. Client dispatches 'woodland:save' (existing)
  |
  +-- WoodlandReveal fires POST /api/reveal/roll { log }
       |
       +-- 4. Load user's profile_attribute_values
       +-- 5. Evaluate all encounter_sets conditions against:
       |      - event data (log: protein_g, fat_g, carbs_g, weight)
       |      - profile attributes (streak, total_logs, etc.)
       +-- 6. Collect qualifying set IDs
       +-- 7. Load encounter_set_members for qualifying sets
       |      JOIN badges to get rarity
       +-- 8. TIER ROLL (fixed constants)
       |      -> nothing (25%) -> return null
       |      -> common / rare / epic / unique / legendary
       +-- 9. Filter members where badges.rarity = winning tier
       +--10. Dedup by badge_id (keep highest weight)
       +--11. CREATURE ROLL (weighted random within tier)
       +--12. Return { animation, firstEncounter }
```

## API Changes

### Modified

- `POST /api/reveal/roll` — now accepts `{ log: { protein_g, fat_g, carbs_g, weight } }` in body for event-data condition evaluation

### New Endpoints

- `GET /api/admin/encounter-sets` — list all sets with members
- `POST /api/admin/encounter-sets` — create set
- `GET /api/admin/encounter-sets/[id]` — get set with members
- `PUT /api/admin/encounter-sets/[id]` — update set (name, condition)
- `DELETE /api/admin/encounter-sets/[id]` — delete set (cascades members)
- `POST /api/admin/encounter-sets/[id]/members` — add member
- `DELETE /api/admin/encounter-sets/[id]/members/[memberId]` — remove member
- `GET /api/admin/profile-attributes` — list all attributes
- `POST /api/admin/profile-attributes` — create attribute

### Retired

- `GET /api/admin/reveal` — replaced by encounter-sets endpoints
- `PUT /api/admin/reveal` — replaced by encounter-sets endpoints

### Unchanged

- `POST /api/reveal/log` — unchanged
- All non-reveal endpoints — unchanged

## New Domains

Following the 4-layer architecture:

- **encounter-sets** — module + service for encounter set CRUD and the two-stage roll
- **profile-attributes** — module + service for attribute definitions and value upserts
- **events** — service-only (no module/routes needed), the event registry and handler registration

## Admin UI

### Encounter Sets Page (`/admin/encounter-sets`)

- List all sets: name, condition summary, member count
- Create / edit / delete sets
- Condition editor: dropdowns for source, key, operator, value
- Per-set member list: add/remove creatures, set weight (tier comes from badge's rarity)
- Probability preview: given a mock scenario, show which sets qualify and effective per-creature odds

### Profile Attributes Page (`/admin/profile-attributes`)

- List all defined attributes: key, label, data_type
- Create new attributes
- Debug view: see current attribute values for a user

## What Stays the Same

- `reveal_log` table and `POST /api/reveal/log` endpoint
- `WoodlandReveal` component phases (pawprints -> leaves -> reveal) — only change is the prefetch call passes log data
- `SpriteAnimator` component
- `badges` table structure
- `sprite_animations` table structure

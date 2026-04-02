-- Encounter sets system: replaces flat reveal_odds with two-stage roll
-- (tier -> creature) using additive encounter sets and profile attributes.

-- 1. Migrate badges.rarity from 4-tier to 5-tier system
ALTER TABLE badges DROP CONSTRAINT IF EXISTS badges_rarity_check;
UPDATE badges SET rarity = 'epic' WHERE rarity = 'rare';
UPDATE badges SET rarity = 'rare' WHERE rarity = 'uncommon';
ALTER TABLE badges ADD CONSTRAINT badges_rarity_check
  CHECK (rarity IN ('common', 'rare', 'epic', 'unique', 'legendary'));

-- 2. Encounter sets — named groups with optional conditions
CREATE TABLE public.encounter_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  condition jsonb,  -- null = always active (default set)
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.encounter_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read encounter sets"
  ON public.encounter_sets FOR SELECT
  TO authenticated USING (true);

-- 3. Encounter set members — which creatures belong to which sets
CREATE TABLE public.encounter_set_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES encounter_sets(id) ON DELETE CASCADE,
  badge_id text NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  weight integer NOT NULL DEFAULT 1 CHECK (weight > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (set_id, badge_id)
);

ALTER TABLE public.encounter_set_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read encounter set members"
  ON public.encounter_set_members FOR SELECT
  TO authenticated USING (true);

-- 4. Profile attributes — global attribute definitions
CREATE TABLE public.profile_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  data_type text NOT NULL CHECK (data_type IN ('number', 'boolean', 'string')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read profile attributes"
  ON public.profile_attributes FOR SELECT
  TO authenticated USING (true);

-- 5. Profile attribute values — per-user attribute values
CREATE TABLE public.profile_attribute_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL REFERENCES profile_attributes(id) ON DELETE CASCADE,
  value_number numeric,
  value_boolean boolean,
  value_string text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, attribute_id)
);

CREATE INDEX profile_attribute_values_user_idx
  ON public.profile_attribute_values (user_id);

ALTER TABLE public.profile_attribute_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own attribute values"
  ON public.profile_attribute_values FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- 6. Seed starter profile attributes
INSERT INTO profile_attributes (key, label, data_type) VALUES
  ('current_streak', 'Current Streak', 'number'),
  ('total_logs', 'Total Logs', 'number'),
  ('best_protein_day', 'Best Protein Day', 'number'),
  ('has_logged_weight', 'Has Logged Weight Today', 'boolean');

-- 7. Migrate reveal_odds to encounter sets
-- Create default encounter set
INSERT INTO encounter_sets (id, name, condition)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default', null);

-- Migrate existing reveal_odds entries to default set members
-- Map animation_id -> creature_id from sprite_animations, then to badge_id
INSERT INTO encounter_set_members (set_id, badge_id, weight)
SELECT
  '00000000-0000-0000-0000-000000000001',
  sa.creature_id,
  GREATEST(1, ro.weight::integer)
FROM reveal_odds ro
JOIN sprite_animations sa ON sa.id = ro.animation_id
WHERE sa.creature_id IS NOT NULL
ON CONFLICT (set_id, badge_id) DO UPDATE SET weight = EXCLUDED.weight;

-- 8. Drop reveal_odds table
DROP TABLE public.reveal_odds;

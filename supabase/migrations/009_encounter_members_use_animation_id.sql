-- Drop old badge-based column and constraints
ALTER TABLE encounter_set_members DROP CONSTRAINT IF EXISTS encounter_set_members_set_id_badge_id_key;
ALTER TABLE encounter_set_members DROP COLUMN badge_id;

-- Add animation reference
ALTER TABLE encounter_set_members ADD COLUMN animation_id text NOT NULL REFERENCES sprite_animations(id) ON DELETE CASCADE;
ALTER TABLE encounter_set_members ADD CONSTRAINT encounter_set_members_set_id_animation_id_key UNIQUE (set_id, animation_id);

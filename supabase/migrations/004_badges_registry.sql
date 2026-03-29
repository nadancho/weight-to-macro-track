-- Badge registry — defines what badges exist
CREATE TABLE IF NOT EXISTS badges (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  image_path text,
  kind text NOT NULL DEFAULT 'badge' CHECK (kind IN ('badge', 'avatar-part', 'theme')),
  tags text[] DEFAULT '{}',
  rarity text DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary')),
  created_at timestamptz DEFAULT now()
);

-- Add FK from user_collectibles to badges
ALTER TABLE user_collectibles
  ADD CONSTRAINT user_collectibles_badge_fk
  FOREIGN KEY (collectible_id) REFERENCES badges(id);

-- Badges are public read — anyone can see what badges exist
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges are publicly readable"
  ON badges FOR SELECT USING (true);

-- Create storage bucket for badge images
INSERT INTO storage.buckets (id, name, public)
VALUES ('badges', 'badges', true)
ON CONFLICT (id) DO NOTHING;

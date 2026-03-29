-- Add theme column to profiles (default: cottagecore)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme text DEFAULT 'cottagecore';

-- Future: user_collectibles table for the full badge/avatar/theme system
CREATE TABLE IF NOT EXISTS user_collectibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  collectible_id text NOT NULL,
  awarded_at timestamptz DEFAULT now(),
  UNIQUE(user_id, collectible_id)
);

ALTER TABLE user_collectibles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collectibles"
  ON user_collectibles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collectibles"
  ON user_collectibles FOR INSERT WITH CHECK (auth.uid() = user_id);

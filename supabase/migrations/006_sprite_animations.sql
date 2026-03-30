-- Sprite animation registry — stores render config for SpriteAnimator
CREATE TABLE IF NOT EXISTS sprite_animations (
  id text PRIMARY KEY,
  creature_id text REFERENCES badges(id),
  name text NOT NULL,
  animation_type text NOT NULL,
  sprite_path text NOT NULL,
  grid_cols int NOT NULL DEFAULT 12,
  grid_rows int NOT NULL DEFAULT 1,
  frame_sequence int[] NOT NULL,
  frame_size int NOT NULL DEFAULT 256,
  fps int NOT NULL DEFAULT 6,
  loop boolean NOT NULL DEFAULT true,
  display_width int DEFAULT 128,
  display_height int DEFAULT 128,
  frame_offsets jsonb DEFAULT '[]',
  frame_mirrors boolean[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sprite_animations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Animations are publicly readable"
  ON sprite_animations FOR SELECT USING (true);

-- Storage bucket for sprite sheet PNGs
INSERT INTO storage.buckets (id, name, public)
VALUES ('sprites', 'sprites', true)
ON CONFLICT (id) DO NOTHING;

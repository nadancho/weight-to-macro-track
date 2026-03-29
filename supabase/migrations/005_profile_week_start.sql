-- Add week_start preference to profiles
-- 1 = Monday (default, ISO standard), 0 = Sunday
ALTER TABLE profiles ADD COLUMN week_start smallint NOT NULL DEFAULT 1;

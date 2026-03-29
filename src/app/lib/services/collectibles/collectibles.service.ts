import { createClient } from "@/app/lib/integrations/supabase/server";

export interface BadgeRow {
  id: string;
  name: string;
  description: string;
  image_path: string | null;
  kind: string;
  tags: string[];
  rarity: string;
}

export interface UserCollectibleRow {
  collectible_id: string;
  awarded_at: string;
  badge: BadgeRow;
}

export async function getUserCollectibles(): Promise<UserCollectibleRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("user_collectibles")
    .select("collectible_id, awarded_at, badges!user_collectibles_badge_fk(id, name, description, image_path, kind, tags, rarity)")
    .eq("user_id", user.id)
    .order("awarded_at", { ascending: false });
  if (!data) return [];
  return (data as unknown as Array<{ collectible_id: string; awarded_at: string; badges: BadgeRow }>).map((row) => ({
    collectible_id: row.collectible_id,
    awarded_at: row.awarded_at,
    badge: row.badges,
  }));
}

export async function getAllBadges(): Promise<BadgeRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("badges")
    .select("*")
    .eq("kind", "badge")
    .order("created_at", { ascending: true });
  return (data as BadgeRow[] | null) ?? [];
}

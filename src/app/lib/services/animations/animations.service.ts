import { createClient } from "@/app/lib/integrations/supabase/server";
import { createAdminClient } from "@/app/lib/integrations/supabase/admin";

export interface SpriteAnimationRow {
  id: string;
  creature_id: string | null;
  name: string;
  animation_type: string;
  sprite_path: string;
  grid_cols: number;
  grid_rows: number;
  frame_sequence: number[];
  frame_size: number;
  fps: number;
  loop: boolean;
  display_width: number | null;
  display_height: number | null;
  frame_offsets: Array<{ x: number; y: number }>;
  frame_mirrors: boolean[];
  created_at: string;
}

export type SpriteAnimationInsert = Omit<SpriteAnimationRow, "created_at">;
export type SpriteAnimationUpdate = Partial<Omit<SpriteAnimationRow, "id" | "created_at">>;

// --- Public reads (use server client, respects RLS) ---

export async function getAllAnimations(): Promise<SpriteAnimationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sprite_animations")
    .select("*")
    .order("created_at", { ascending: true });
  return (data as SpriteAnimationRow[] | null) ?? [];
}

export async function getAnimation(id: string): Promise<SpriteAnimationRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sprite_animations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as SpriteAnimationRow | null;
}

export async function getAnimationsForCreature(creatureId: string): Promise<SpriteAnimationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sprite_animations")
    .select("*")
    .eq("creature_id", creatureId)
    .order("animation_type", { ascending: true });
  return (data as SpriteAnimationRow[] | null) ?? [];
}

// --- Admin writes (use admin client, bypasses RLS) ---

export async function createAnimation(
  dto: SpriteAnimationInsert,
): Promise<SpriteAnimationRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sprite_animations")
    .insert(dto as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SpriteAnimationRow | null;
}

export async function updateAnimation(
  id: string,
  dto: SpriteAnimationUpdate,
): Promise<SpriteAnimationRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sprite_animations")
    .update(dto as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SpriteAnimationRow | null;
}

export async function deleteAnimation(id: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("sprite_animations")
    .delete()
    .eq("id", id);
  return !error;
}

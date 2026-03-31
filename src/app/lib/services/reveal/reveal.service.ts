import { createClient } from "@/app/lib/integrations/supabase/server";
import { createAdminClient } from "@/app/lib/integrations/supabase/admin";
import type { SpriteAnimationRow } from "@/app/lib/services/animations/animations.service";

// --- Types ---

export interface RevealOddsEntry {
  id: string;
  animation_id: string;
  weight: number;
  created_at: string;
  animation: SpriteAnimationRow;
}

export interface RevealOddsInput {
  animation_id: string;
  weight: number;
}

export interface RevealLogRow {
  id: string;
  user_id: string;
  animation_id: string;
  creature_id: string | null;
  first_encounter: boolean;
  created_at: string;
}

// --- Read odds (authenticated) ---

export async function getRevealOdds(): Promise<RevealOddsEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reveal_odds")
    .select("*, sprite_animations(*)")
    .order("weight", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    animation_id: row.animation_id as string,
    weight: Number(row.weight),
    created_at: row.created_at as string,
    animation: row.sprite_animations as unknown as SpriteAnimationRow,
  }));
}

// --- Admin: replace odds table ---

export async function setRevealOdds(entries: RevealOddsInput[]): Promise<void> {
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  if (total > 100) {
    throw new Error(`Total weight ${total}% exceeds 100%`);
  }

  const admin = createAdminClient();

  // Delete all existing, then insert new — simple full replace
  const { error: delError } = await admin
    .from("reveal_odds")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all rows

  if (delError) throw new Error(delError.message);

  if (entries.length > 0) {
    const { error: insError } = await admin
      .from("reveal_odds")
      .insert(entries.map((e) => ({
        animation_id: e.animation_id,
        weight: e.weight,
      })) as never);

    if (insError) throw new Error(insError.message);
  }
}

// --- Roll reveal (server-side) ---

export interface RevealResult {
  animation: SpriteAnimationRow;
  firstEncounter: boolean;
}

/** Roll the reveal table — pure dice roll, no audit. */
export async function rollReveal(userId: string): Promise<RevealResult | null> {
  const odds = await getRevealOdds();
  if (odds.length === 0) return null;

  const roll = Math.random() * 100;
  let cumulative = 0;
  let winner: RevealOddsEntry | null = null;

  for (const entry of odds) {
    cumulative += entry.weight;
    if (roll < cumulative) {
      winner = entry;
      break;
    }
  }

  if (!winner) return null;

  // Check first encounter (read-only, no write yet)
  const admin = createAdminClient();
  const creatureId = winner.animation.creature_id;
  let firstEncounter = false;
  if (creatureId) {
    const { count } = await admin
      .from("reveal_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("creature_id", creatureId);
    firstEncounter = (count ?? 0) === 0;
  }

  return { animation: winner.animation, firstEncounter };
}

/** Log the encounter — call only when the user actually sees the creature. */
export async function logEncounter(
  userId: string,
  animationId: string,
  creatureId: string | null,
  firstEncounter: boolean,
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("reveal_log").insert({
    user_id: userId,
    animation_id: animationId,
    creature_id: creatureId,
    first_encounter: firstEncounter,
  } as never);
}

// --- Read user encounters ---

export async function getUserEncounters(userId: string): Promise<RevealLogRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reveal_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data as RevealLogRow[] | null) ?? [];
}

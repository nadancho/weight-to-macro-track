import { createAdminClient } from "@/app/lib/integrations/supabase/admin";
import { getUserAttributeMap } from "@/app/lib/modules/profile-attributes";
import {
  getQualifyingSetIds,
  getEligibleCreatures,
  type ConditionContext,
} from "@/app/lib/modules/encounter-sets";
import type { SpriteAnimationRow } from "@/app/lib/services/animations/animations.service";

// --- Nothing probability ---

const NOTHING_CHANCE = 0.25;

// --- Types ---

export interface RevealLogRow {
  id: string;
  user_id: string;
  animation_id: string;
  creature_id: string | null;
  first_encounter: boolean;
  created_at: string;
}

export interface RevealResult {
  animation: SpriteAnimationRow;
  firstEncounter: boolean;
}

export interface EventData {
  protein_g?: number | null;
  fat_g?: number | null;
  carbs_g?: number | null;
  weight?: number | null;
}

// --- Single-stage weighted roll ---

export async function rollReveal(
  userId: string,
  eventData?: EventData,
): Promise<RevealResult | null> {
  // 1. Load user profile attributes
  const attributes = await getUserAttributeMap(userId);

  // 2. Build evaluation context
  const context: ConditionContext = { attributes, event: eventData };

  // 3. Get qualifying encounter sets
  const qualifyingSetIds = await getQualifyingSetIds(context);
  if (qualifyingSetIds.length === 0) return null;

  // 4. "Nothing" roll
  if (Math.random() < NOTHING_CHANCE) return null;

  // 5. Get all eligible animations from qualifying sets
  const creatures = await getEligibleCreatures(qualifyingSetIds);
  if (creatures.length === 0) return null;

  // 6. Weighted random selection
  const totalWeight = creatures.reduce((sum, c) => sum + c.weight, 0);
  const roll = Math.random() * totalWeight;
  let cumulative = 0;
  let winner = creatures[0];

  for (const creature of creatures) {
    cumulative += creature.weight;
    if (roll < cumulative) {
      winner = creature;
      break;
    }
  }

  // 7. Fetch full animation row for the winner
  const admin = createAdminClient();
  const { data: animData } = await admin
    .from("sprite_animations")
    .select("*")
    .eq("id", winner.animation_id)
    .maybeSingle();

  if (!animData) return null;
  const animation = animData as unknown as SpriteAnimationRow;

  // 8. Check first encounter (by animation_id)
  const { count } = await admin
    .from("reveal_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("animation_id", winner.animation_id);
  const firstEncounter = (count ?? 0) === 0;

  return { animation, firstEncounter };
}

// --- Log encounter ---

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
  const admin = createAdminClient();
  const { data } = await admin
    .from("reveal_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data as RevealLogRow[] | null) ?? [];
}

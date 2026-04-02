import { createAdminClient } from "@/app/lib/integrations/supabase/admin";
import { getUserAttributeMap } from "@/app/lib/modules/profile-attributes";
import {
  getQualifyingSetIds,
  getEligibleCreatures,
  type ConditionContext,
} from "@/app/lib/modules/encounter-sets";
import type { SpriteAnimationRow } from "@/app/lib/services/animations/animations.service";

// --- Tier odds (fixed constants) ---

const TIER_ODDS: Record<string, number> = {
  common: 35,
  rare: 20,
  epic: 12,
  unique: 5,
  legendary: 3,
  // nothing: 25 (implicit remainder, total = 75)
};

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

// --- Two-stage roll ---

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

  // 4. Tier roll
  const roll = Math.random() * 100;
  let cumulative = 0;
  let winningTier: string | null = null;

  for (const [tier, weight] of Object.entries(TIER_ODDS)) {
    cumulative += weight;
    if (roll < cumulative) {
      winningTier = tier;
      break;
    }
  }

  if (!winningTier) return null; // landed in "nothing" (25%)

  // 5. Get eligible creatures for this tier
  const creatures = await getEligibleCreatures(qualifyingSetIds, winningTier);
  if (creatures.length === 0) return null; // no creatures in this tier

  // 6. Weighted random selection within tier
  const totalWeight = creatures.reduce((sum, c) => sum + c.weight, 0);
  const creatureRoll = Math.random() * totalWeight;
  let creatureCumulative = 0;
  let winner = creatures[0];

  for (const creature of creatures) {
    creatureCumulative += creature.weight;
    if (creatureRoll < creatureCumulative) {
      winner = creature;
      break;
    }
  }

  // 7. Look up a sprite animation for this creature
  const admin = createAdminClient();
  const { data: animData } = await admin
    .from("sprite_animations")
    .select("*")
    .eq("creature_id", winner.badge_id)
    .limit(1)
    .maybeSingle();

  if (!animData) return null; // creature has no animation
  const animation = animData as unknown as SpriteAnimationRow;

  // 8. Check first encounter
  let firstEncounter = false;
  const { count } = await admin
    .from("reveal_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("creature_id", winner.badge_id);
  firstEncounter = (count ?? 0) === 0;

  return { animation, firstEncounter };
}

// --- Log encounter (unchanged) ---

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

// --- Read user encounters (unchanged) ---

export async function getUserEncounters(userId: string): Promise<RevealLogRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("reveal_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data as RevealLogRow[] | null) ?? [];
}

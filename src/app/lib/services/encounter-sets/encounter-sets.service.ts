import { createClient } from "@/app/lib/integrations/supabase/server";
import { createAdminClient } from "@/app/lib/integrations/supabase/admin";
import type {
  EncounterSetRow,
  EncounterSetMemberRow,
  Json,
} from "@/app/lib/integrations/supabase/types";

// --- Types ---

export interface EncounterSetWithMembers extends EncounterSetRow {
  members: EncounterSetMemberWithBadge[];
}

export interface EncounterSetMemberWithBadge extends EncounterSetMemberRow {
  badge: { id: string; name: string; rarity: string; image_path: string | null };
}

export interface EligibleCreature {
  badge_id: string;
  badge_name: string;
  rarity: string;
  image_path: string | null;
  weight: number;
  animation_id: string | null;
}

export interface ConditionContext {
  attributes: Record<string, number | boolean | string | null>;
  event?: {
    protein_g?: number | null;
    fat_g?: number | null;
    carbs_g?: number | null;
    weight?: number | null;
  };
}

export interface Condition {
  source: "attribute" | "event";
  key: string;
  operator: "eq" | "gt" | "gte" | "lt" | "lte" | "exists";
  value?: number | boolean | string;
}

// --- CRUD (admin) ---

export async function getAllSets(): Promise<EncounterSetWithMembers[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("encounter_sets")
    .select("*, encounter_set_members(*, badges!inner(id, name, rarity, image_path))")
    .order("created_at", { ascending: true });

  if (!data) return [];
  return (data as unknown as EncounterSetWithMembers[]);
}

export async function getSet(id: string): Promise<EncounterSetWithMembers | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("encounter_sets")
    .select("*, encounter_set_members(*, badges!inner(id, name, rarity, image_path))")
    .eq("id", id)
    .maybeSingle();

  return data as unknown as EncounterSetWithMembers | null;
}

export async function createSet(
  dto: { name: string; condition?: Json | null },
): Promise<EncounterSetRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("encounter_sets")
    .insert({ name: dto.name, condition: dto.condition ?? null } as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as EncounterSetRow | null;
}

export async function updateSet(
  id: string,
  dto: { name?: string; condition?: Json | null },
): Promise<EncounterSetRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("encounter_sets")
    .update(dto as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as EncounterSetRow | null;
}

export async function deleteSet(id: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("encounter_sets")
    .delete()
    .eq("id", id);
  return !error;
}

export async function addMember(
  setId: string,
  badgeId: string,
  weight: number = 1,
): Promise<EncounterSetMemberRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("encounter_set_members")
    .insert({ set_id: setId, badge_id: badgeId, weight } as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as EncounterSetMemberRow | null;
}

export async function updateMember(
  memberId: string,
  weight: number,
): Promise<EncounterSetMemberRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("encounter_set_members")
    .update({ weight } as never)
    .eq("id", memberId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as EncounterSetMemberRow | null;
}

export async function removeMember(memberId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("encounter_set_members")
    .delete()
    .eq("id", memberId);
  return !error;
}

// --- Condition evaluation ---

export function evaluateCondition(
  condition: Condition,
  context: ConditionContext,
): boolean {
  let actual: number | boolean | string | null | undefined;

  if (condition.source === "attribute") {
    actual = context.attributes[condition.key];
  } else if (condition.source === "event") {
    if (!context.event) return false;
    actual = context.event[condition.key as keyof typeof context.event];
  } else {
    return false;
  }

  if (condition.operator === "exists") {
    return actual !== null && actual !== undefined;
  }

  if (actual === null || actual === undefined) return false;

  const expected = condition.value;
  if (expected === undefined) return false;

  switch (condition.operator) {
    case "eq":
      return actual === expected;
    case "gt":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "gte":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "lt":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "lte":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    default:
      return false;
  }
}

// --- Qualifying sets ---

export async function getQualifyingSetIds(
  context: ConditionContext,
): Promise<string[]> {
  const sets = await getAllSets();
  return sets
    .filter((set) => {
      if (!set.condition) return true; // null condition = always active
      return evaluateCondition(set.condition as unknown as Condition, context);
    })
    .map((set) => set.id);
}

// --- Eligible creatures for a tier ---

export async function getEligibleCreatures(
  qualifyingSetIds: string[],
  tier: string,
): Promise<EligibleCreature[]> {
  if (qualifyingSetIds.length === 0) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("encounter_set_members")
    .select("weight, badge_id, badges!inner(id, name, rarity, image_path), set_id")
    .in("set_id", qualifyingSetIds);

  if (!data) return [];

  // Filter to target tier and dedup by badge_id (keep highest weight)
  const bestByBadge = new Map<string, EligibleCreature>();

  for (const row of data as unknown as Array<{
    weight: number;
    badge_id: string;
    badges: { id: string; name: string; rarity: string; image_path: string | null };
  }>) {
    if (row.badges.rarity !== tier) continue;

    const existing = bestByBadge.get(row.badge_id);
    if (!existing || row.weight > existing.weight) {
      bestByBadge.set(row.badge_id, {
        badge_id: row.badge_id,
        badge_name: row.badges.name,
        rarity: row.badges.rarity,
        image_path: row.badges.image_path,
        weight: row.weight,
        animation_id: null, // resolved later in rollReveal
      });
    }
  }

  return Array.from(bestByBadge.values());
}

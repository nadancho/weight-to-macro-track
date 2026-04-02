import { createClient } from "@/app/lib/integrations/supabase/server";
import { createAdminClient } from "@/app/lib/integrations/supabase/admin";
import type {
  EncounterSetRow,
  EncounterSetMemberRow,
  Json,
} from "@/app/lib/integrations/supabase/types";

// --- Types ---

export interface EncounterSetWithMembers extends EncounterSetRow {
  members: EncounterSetMemberWithAnimation[];
}

export interface EncounterSetMemberWithAnimation extends EncounterSetMemberRow {
  animation: { id: string; name: string; creature_id: string | null; sprite_path: string };
}

export interface EligibleCreature {
  animation_id: string;
  animation_name: string;
  sprite_path: string;
  weight: number;
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

// --- Response mapping ---
// Supabase returns nested joins keyed by table name (encounter_set_members, sprite_animations).
// We remap to our domain types (members, animation).

function mapSetRow(row: Record<string, unknown>): EncounterSetWithMembers {
  const rawMembers = (row.encounter_set_members ?? []) as Array<Record<string, unknown>>;
  return {
    ...(row as unknown as EncounterSetWithMembers),
    members: rawMembers.map((m) => ({
      ...(m as unknown as EncounterSetMemberWithAnimation),
      animation: m.sprite_animations as unknown as EncounterSetMemberWithAnimation["animation"],
    })),
  };
}

const SETS_SELECT = "*, encounter_set_members(*, sprite_animations!inner(id, name, creature_id, sprite_path))";

// --- CRUD (admin) ---

export async function getAllSets(): Promise<EncounterSetWithMembers[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("encounter_sets")
    .select(SETS_SELECT)
    .order("created_at", { ascending: true });

  if (!data) return [];
  return data.map(mapSetRow);
}

export async function getSet(id: string): Promise<EncounterSetWithMembers | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("encounter_sets")
    .select(SETS_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  return mapSetRow(data);
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
  animationId: string,
  weight: number = 1,
): Promise<EncounterSetMemberRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("encounter_set_members")
    .insert({ set_id: setId, animation_id: animationId, weight } as never)
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

// --- Eligible creatures (flat weighted pool, no tier filtering) ---

export async function getEligibleCreatures(
  qualifyingSetIds: string[],
): Promise<EligibleCreature[]> {
  if (qualifyingSetIds.length === 0) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("encounter_set_members")
    .select("weight, animation_id, sprite_animations!inner(id, name, creature_id, sprite_path), set_id")
    .in("set_id", qualifyingSetIds);

  if (!data) return [];

  // Dedup by animation_id (keep highest weight)
  const bestByAnimation = new Map<string, EligibleCreature>();

  for (const row of data as unknown as Array<{
    weight: number;
    animation_id: string;
    sprite_animations: { id: string; name: string; creature_id: string | null; sprite_path: string };
  }>) {
    const existing = bestByAnimation.get(row.animation_id);
    if (!existing || row.weight > existing.weight) {
      bestByAnimation.set(row.animation_id, {
        animation_id: row.animation_id,
        animation_name: row.sprite_animations.name,
        sprite_path: row.sprite_animations.sprite_path,
        weight: row.weight,
      });
    }
  }

  return Array.from(bestByAnimation.values());
}

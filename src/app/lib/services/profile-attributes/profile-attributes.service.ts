import { createClient } from "@/app/lib/integrations/supabase/server";
import { createAdminClient } from "@/app/lib/integrations/supabase/admin";
import type {
  ProfileAttributeRow,
  ProfileAttributeInsert,
  ProfileAttributeValueRow,
} from "@/app/lib/integrations/supabase/types";

export type { ProfileAttributeRow, ProfileAttributeValueRow };

export async function getAllAttributes(): Promise<ProfileAttributeRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_attributes")
    .select("*")
    .order("key", { ascending: true });
  return (data as ProfileAttributeRow[] | null) ?? [];
}

export async function createAttribute(
  dto: Omit<ProfileAttributeInsert, "id" | "created_at">,
): Promise<ProfileAttributeRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profile_attributes")
    .insert(dto as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ProfileAttributeRow | null;
}

export async function getUserAttributeValues(
  userId: string,
): Promise<ProfileAttributeValueRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profile_attribute_values")
    .select("*, profile_attributes!inner(key, data_type)")
    .eq("user_id", userId);
  return (data as unknown as ProfileAttributeValueRow[]) ?? [];
}

export async function getUserAttributeMap(
  userId: string,
): Promise<Record<string, number | boolean | string | null>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profile_attribute_values")
    .select("value_number, value_boolean, value_string, profile_attributes!inner(key, data_type)")
    .eq("user_id", userId);

  const map: Record<string, number | boolean | string | null> = {};
  if (!data) return map;

  for (const row of data as unknown as Array<{
    value_number: number | null;
    value_boolean: boolean | null;
    value_string: string | null;
    profile_attributes: { key: string; data_type: string };
  }>) {
    const attr = row.profile_attributes;
    if (attr.data_type === "number") map[attr.key] = row.value_number;
    else if (attr.data_type === "boolean") map[attr.key] = row.value_boolean;
    else if (attr.data_type === "string") map[attr.key] = row.value_string;
  }
  return map;
}

export async function upsertAttributeValue(
  userId: string,
  attributeKey: string,
  value: number | boolean | string,
): Promise<void> {
  const admin = createAdminClient();

  // Look up attribute ID by key
  const { data: attr } = await admin
    .from("profile_attributes")
    .select("id, data_type")
    .eq("key", attributeKey)
    .single();
  if (!attr) return;

  const typedAttr = attr as { id: string; data_type: string };
  const row: Record<string, unknown> = {
    user_id: userId,
    attribute_id: typedAttr.id,
    updated_at: new Date().toISOString(),
    value_number: null,
    value_boolean: null,
    value_string: null,
  };

  if (typedAttr.data_type === "number" && typeof value === "number") {
    row.value_number = value;
  } else if (typedAttr.data_type === "boolean" && typeof value === "boolean") {
    row.value_boolean = value;
  } else if (typedAttr.data_type === "string" && typeof value === "string") {
    row.value_string = value;
  }

  await admin
    .from("profile_attribute_values")
    .upsert(row as never, { onConflict: "user_id,attribute_id" });
}

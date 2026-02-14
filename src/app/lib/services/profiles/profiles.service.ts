import { createClient } from "@/app/lib/integrations/supabase/server";
import type { ProfilesRow, ProfilesUpdate } from "@/app/lib/integrations/supabase/types";

export async function getProfile(): Promise<ProfilesRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return data as ProfilesRow | null;
}

export async function updateProfile(
  updates: ProfilesUpdate
): Promise<ProfilesRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const payload = { ...updates, updated_at: new Date().toISOString() };
  const { data } = await supabase
    .from("profiles")
    .update(payload as never)
    .eq("id", user.id)
    .select()
    .single();
  return data as ProfilesRow | null;
}

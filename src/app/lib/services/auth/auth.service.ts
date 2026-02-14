import { createClient } from "@/app/lib/integrations/supabase/server";
import type { ProfilesInsert } from "@/app/lib/integrations/supabase/types";

export interface SignInResult {
  success: boolean;
  error?: string;
}

export interface SignUpResult {
  success: boolean;
  error?: string;
}

export async function signUp(
  email: string,
  password: string
): Promise<SignUpResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return { success: false, error: error.message };
  }
  if (data.user && data.session) {
    await ensureProfile(supabase, data.user.id);
  }
  return { success: true };
}

export async function signIn(
  email: string,
  password: string
): Promise<SignInResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return { success: false, error: error.message };
  }
  if (data.user && data.session) {
    await ensureProfile(supabase, data.user.id);
  }
  return { success: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

async function ensureProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (!existing) {
    const row: ProfilesInsert = { id: userId };
    await supabase.from("profiles").insert(row as never);
  }
}

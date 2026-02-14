import { createClient } from "@/app/lib/integrations/supabase/server";
import type {
  DailyLogsRow,
  DailyLogsInsert,
  DailyLogsUpdate,
} from "@/app/lib/integrations/supabase/types";

export interface CreateOrUpdateDailyLogDto {
  date: string;
  weight?: number | null;
  carbs_g?: number | null;
  protein_g?: number | null;
  fat_g?: number | null;
  notes?: string | null;
}

export async function createOrUpdateDailyLog(
  dto: CreateOrUpdateDailyLogDto
): Promise<DailyLogsRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const row: DailyLogsUpdate = {
    date: dto.date,
    weight: dto.weight ?? null,
    carbs_g: dto.carbs_g ?? null,
    protein_g: dto.protein_g ?? null,
    fat_g: dto.fat_g ?? null,
    notes: dto.notes ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: existingRow } = await supabase
    .from("daily_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", dto.date)
    .maybeSingle();
  const existing = existingRow as { id: string } | null;

  if (existing) {
    const { data } = await supabase
      .from("daily_logs")
      .update(row as never)
      .eq("id", existing.id)
      .select()
      .single();
    return data as DailyLogsRow | null;
  }

  const insertRow: DailyLogsInsert = {
    user_id: user.id,
    date: dto.date,
    weight: dto.weight ?? null,
    carbs_g: dto.carbs_g ?? null,
    protein_g: dto.protein_g ?? null,
    fat_g: dto.fat_g ?? null,
    notes: dto.notes ?? null,
  };
  const { data } = await supabase
    .from("daily_logs")
    .insert(insertRow as never)
    .select()
    .single();
  return data as DailyLogsRow | null;
}

export async function getLogsByDateRange(
  from: string,
  to: string
): Promise<DailyLogsRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });
  return (data ?? []) as DailyLogsRow[];
}

export async function getLogByDate(date: string): Promise<DailyLogsRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();
  return data as DailyLogsRow | null;
}

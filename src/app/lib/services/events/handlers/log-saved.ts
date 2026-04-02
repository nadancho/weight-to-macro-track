import { registerHandler, type EventPayload } from "@/app/lib/services/events/event-registry";
import { upsertAttributeValue } from "@/app/lib/modules/profile-attributes";
import { createAdminClient } from "@/app/lib/integrations/supabase/admin";

type LogSavedPayload = EventPayload["log:saved"];

async function updateStreakAttribute({ userId, log }: LogSavedPayload): Promise<void> {
  const admin = createAdminClient();

  // Count consecutive days with logs ending at (or including) log.date
  // Walk backwards from log.date, one day at a time
  const logDate = new Date(log.date);
  let streak = 1;
  const checked = new Set<string>();
  checked.add(log.date);

  for (let i = 1; i <= 365; i++) {
    const prev = new Date(logDate);
    prev.setDate(prev.getDate() - i);
    const prevStr = prev.toISOString().split("T")[0];

    const { data } = await admin
      .from("daily_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("date", prevStr)
      .maybeSingle();

    if (data) {
      streak++;
    } else {
      break;
    }
  }

  await upsertAttributeValue(userId, "current_streak", streak);
}

async function updateTotalLogsAttribute({ userId }: LogSavedPayload): Promise<void> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("daily_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  await upsertAttributeValue(userId, "total_logs", count ?? 0);
}

async function updateBestProteinAttribute({ userId }: LogSavedPayload): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("daily_logs")
    .select("protein_g")
    .eq("user_id", userId)
    .not("protein_g", "is", null)
    .order("protein_g", { ascending: false })
    .limit(1)
    .maybeSingle();

  const best = (data as { protein_g: number } | null)?.protein_g ?? 0;
  await upsertAttributeValue(userId, "best_protein_day", best);
}

async function updateHasLoggedWeightAttribute({ userId, log }: LogSavedPayload): Promise<void> {
  await upsertAttributeValue(userId, "has_logged_weight", log.weight !== null);
}

// Register all handlers
registerHandler("log:saved", updateStreakAttribute);
registerHandler("log:saved", updateTotalLogsAttribute);
registerHandler("log:saved", updateBestProteinAttribute);
registerHandler("log:saved", updateHasLoggedWeightAttribute);

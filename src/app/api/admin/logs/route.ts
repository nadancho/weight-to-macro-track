import { createClient } from "@/app/lib/integrations/supabase/server";
import { createAdminClient } from "@/app/lib/integrations/supabase/admin";
import { NextResponse } from "next/server";

const ADMIN_UUID = "48b3ea43-dc0b-48dc-b4ae-b2144f21d564";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_UUID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("daily_logs")
    .select("id, date, weight, carbs_g, protein_g, fat_g")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

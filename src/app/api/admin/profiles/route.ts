import { createClient } from "@/app/lib/integrations/supabase/server";
import { createAdminClient } from "@/app/lib/integrations/supabase/admin";
import { NextResponse } from "next/server";

const ADMIN_UUID = "48b3ea43-dc0b-48dc-b4ae-b2144f21d564";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_UUID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, display_name")
    .order("display_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

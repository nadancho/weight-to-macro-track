import { createClient } from "@/app/lib/integrations/supabase/server";
import { getUserAttributeMap } from "@/app/lib/modules/profile-attributes";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const attributes = await getUserAttributeMap(user.id);
  return NextResponse.json(attributes, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

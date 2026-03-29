import { getUserCollectibles } from "@/app/lib/modules/collectibles";
import { createClient } from "@/app/lib/integrations/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const collectibles = await getUserCollectibles();
  return NextResponse.json(collectibles, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

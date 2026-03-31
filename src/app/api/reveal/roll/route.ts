import { createClient } from "@/app/lib/integrations/supabase/server";
import { rollReveal } from "@/app/lib/modules/reveal";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await rollReveal(user.id);
    return NextResponse.json({
      animation: result?.animation ?? null,
      firstEncounter: result?.firstEncounter ?? false,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Roll failed" },
      { status: 500 },
    );
  }
}

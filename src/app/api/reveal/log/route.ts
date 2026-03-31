import { createClient } from "@/app/lib/integrations/supabase/server";
import { logEncounter } from "@/app/lib/modules/reveal";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  animation_id: z.string().min(1),
  creature_id: z.string().nullable(),
  first_encounter: z.boolean(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    await logEncounter(
      user.id,
      parsed.data.animation_id,
      parsed.data.creature_id,
      parsed.data.first_encounter,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Log failed" },
      { status: 500 },
    );
  }
}

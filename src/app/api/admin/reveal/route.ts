import { createClient } from "@/app/lib/integrations/supabase/server";
import { ADMIN_UUID } from "@/app/lib/constants";
import { getRevealOdds, setRevealOdds } from "@/app/lib/modules/reveal";
import { NextResponse } from "next/server";
import { z } from "zod";

const putSchema = z.object({
  entries: z.array(
    z.object({
      animation_id: z.string().min(1),
      weight: z.number().gt(0).lte(100),
    }),
  ),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_UUID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const odds = await getRevealOdds();
    return NextResponse.json(odds);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch odds" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_UUID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await setRevealOdds(parsed.data.entries);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save odds" },
      { status: 500 },
    );
  }
}

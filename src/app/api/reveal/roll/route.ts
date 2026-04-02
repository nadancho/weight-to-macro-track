import { createClient } from "@/app/lib/integrations/supabase/server";
import { rollReveal } from "@/app/lib/modules/reveal";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  log: z.object({
    protein_g: z.number().nullable().optional(),
    fat_g: z.number().nullable().optional(),
    carbs_g: z.number().nullable().optional(),
    weight: z.number().nullable().optional(),
  }).optional(),
}).optional();

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => undefined);
    const parsed = bodySchema.safeParse(body);
    const eventData = parsed.success ? parsed.data?.log : undefined;

    const result = await rollReveal(user.id, eventData);
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

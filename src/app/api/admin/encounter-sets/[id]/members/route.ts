import { createClient } from "@/app/lib/integrations/supabase/server";
import { ADMIN_UUID } from "@/app/lib/constants";
import { addMember } from "@/app/lib/modules/encounter-sets";
import { NextResponse } from "next/server";
import { z } from "zod";

const addMemberSchema = z.object({
  badge_id: z.string().min(1),
  weight: z.number().int().positive().default(1),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_UUID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: setId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const member = await addMember(setId, parsed.data.badge_id, parsed.data.weight);
    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to add member" },
      { status: 500 },
    );
  }
}

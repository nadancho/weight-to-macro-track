import { createClient } from "@/app/lib/integrations/supabase/server";
import { ADMIN_UUID } from "@/app/lib/constants";
import { getAllSets, createSet } from "@/app/lib/modules/encounter-sets";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  condition: z.object({
    source: z.enum(["attribute", "event"]),
    key: z.string().min(1),
    operator: z.enum(["eq", "gt", "gte", "lt", "lte", "exists"]),
    value: z.union([z.number(), z.boolean(), z.string()]).optional(),
  }).nullable().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_UUID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sets = await getAllSets();
  return NextResponse.json(sets);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_UUID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const set = await createSet({
      name: parsed.data.name,
      condition: parsed.data.condition ?? null,
    });
    return NextResponse.json(set, { status: 201 });
  } catch (err) {
    console.error("[encounter-sets] POST failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create set" },
      { status: 500 },
    );
  }
}

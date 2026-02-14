import {
  createOrUpdateDailyLog,
  getLogsByDateRange,
} from "@/app/lib/modules/logs";
import { createClient } from "@/app/lib/integrations/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const postBodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight: z.number().optional().nullable(),
  carbs_g: z.number().optional().nullable(),
  protein_g: z.number().optional().nullable(),
  fat_g: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json(
      { error: "Query params 'from' and 'to' (YYYY-MM-DD) required" },
      { status: 400 }
    );
  }
  const logs = await getLogsByDateRange(from, to);
  return NextResponse.json(logs, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = postBodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const log = await createOrUpdateDailyLog(parsed.data);
  if (!log) {
    return NextResponse.json({ error: "Failed to save log" }, { status: 500 });
  }
  return NextResponse.json(log);
}

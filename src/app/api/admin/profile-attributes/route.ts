import { createClient } from "@/app/lib/integrations/supabase/server";
import { ADMIN_UUID } from "@/app/lib/constants";
import { getAllAttributes, createAttribute } from "@/app/lib/modules/profile-attributes";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  key: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(1),
  data_type: z.enum(["number", "boolean", "string"]),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_UUID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const attrs = await getAllAttributes();
  return NextResponse.json(attrs);
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
    const attr = await createAttribute(parsed.data);
    return NextResponse.json(attr, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create attribute" },
      { status: 500 },
    );
  }
}

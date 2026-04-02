import { createClient } from "@/app/lib/integrations/supabase/server";
import { ADMIN_UUID } from "@/app/lib/constants";
import { removeMember } from "@/app/lib/modules/encounter-sets";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string; memberId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_UUID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { memberId } = await context.params;
  const ok = await removeMember(memberId);
  if (!ok) {
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

import { createClient } from "@/app/lib/integrations/supabase/server";
import { createAdminClient } from "@/app/lib/integrations/supabase/admin";
import { NextResponse } from "next/server";
import { ADMIN_UUID } from "@/app/lib/constants";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_UUID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from("sprites")
    .upload(path, buffer, {
      contentType: file.type || "image/png",
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = admin.storage
    .from("sprites")
    .getPublicUrl(path);

  return NextResponse.json({ url: urlData.publicUrl });
}

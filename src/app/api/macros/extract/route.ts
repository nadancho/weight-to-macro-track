import { extractMacrosFromImage } from "@/app/lib/modules/macros";
import { createClient } from "@/app/lib/integrations/supabase/server";
import { rateLimit } from "@/app/lib/utils/rate-limit";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  image: z.string().min(1),
  media_type: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`macros-extract:${user.id}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const macros = await extractMacrosFromImage(
      parsed.data.image,
      parsed.data.media_type
    );
    return NextResponse.json(macros);
  } catch (err) {
    return NextResponse.json(
      { error: "Could not extract macros from image" },
      { status: 422 }
    );
  }
}

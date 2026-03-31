import { createClient } from "@/app/lib/integrations/supabase/server";
import { createAdminClient } from "@/app/lib/integrations/supabase/admin";
import { NextResponse } from "next/server";
import { ADMIN_UUID } from "@/app/lib/constants";
import { execFile } from "child_process";
import { writeFile, readFile, unlink, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

/**
 * Process a raw sprite image through normalize-sprite.py.
 * Accepts: multipart form with "file" + optional "grid", "fill", "threshold", "erode" fields.
 * Returns: { url } pointing to the uploaded processed PNG in Supabase Storage.
 */
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

  const grid = (formData.get("grid") as string) || "4x3";
  const fill = (formData.get("fill") as string) || "0.85";
  const threshold = (formData.get("threshold") as string) || "25";
  const erode = (formData.get("erode") as string) || "2";
  const offsets = formData.get("offsets") as string | null;

  // Write uploaded file to temp dir
  const tmp = await mkdtemp(join(tmpdir(), "sprite-"));
  const inputPath = join(tmp, "input" + (file.name.endsWith(".png") ? ".png" : ".jpg"));
  const outputPath = join(tmp, "output.png");
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(inputPath, buffer);

  // Run normalize-sprite.py
  const scriptPath = join(process.cwd(), "scripts", "normalize-sprite.py");

  try {
    await new Promise<void>((resolve, reject) => {
      execFile(
        "python3",
        [
          scriptPath,
          inputPath,
          outputPath,
          "--grid", grid,
          "--fill", fill,
          "--threshold", threshold,
          "--erode", erode,
          ...(offsets ? ["--offsets", offsets] : []),
        ],
        { timeout: 30000 },
        (error, stdout, stderr) => {
          if (error) {
            console.error("[normalize-sprite]", stderr || error.message);
            reject(new Error(stderr || error.message));
          } else {
            console.log("[normalize-sprite]", stdout);
            resolve();
          }
        },
      );
    });
  } catch (err) {
    // Cleanup
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    return NextResponse.json(
      { error: `Processing failed: ${err instanceof Error ? err.message : err}` },
      { status: 500 },
    );
  }

  // Read processed file and upload to Supabase Storage
  const processed = await readFile(outputPath);
  const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("sprites")
    .upload(storagePath, processed, {
      contentType: "image/png",
      upsert: false,
    });

  // Cleanup temp files
  await unlink(inputPath).catch(() => {});
  await unlink(outputPath).catch(() => {});

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = admin.storage
    .from("sprites")
    .getPublicUrl(storagePath);

  return NextResponse.json({ url: urlData.publicUrl });
}

import { getAnthropicClient } from "@/app/lib/integrations/anthropic";
import { z } from "zod";

const macrosSchema = z.object({
  fat_g: z.number(),
  carbs_g: z.number(),
  protein_g: z.number(),
});

export type ExtractedMacros = z.infer<typeof macrosSchema>;

export async function extractMacrosFromImage(
  base64: string,
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"
): Promise<ExtractedMacros> {
  const response = await getAnthropicClient().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: 'Extract the Day Total values from this food report screenshot. Return JSON with exactly 3 fields: fat_g, carbs_g, protein_g (all numbers, grams). Return ONLY the JSON object, no markdown fences or extra text.',
          },
        ],
      },
    ],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text : "";
  // Strip markdown fences if present (e.g. ```json ... ```)
  const text = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
  const parsed = macrosSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error("Could not extract macros from image");
  }
  return parsed.data;
}

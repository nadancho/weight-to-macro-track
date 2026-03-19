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
    max_tokens: 1024,
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
            text: `This is a "Day Food Report" screenshot from a nutrition tracking app. It contains a table with many columns including: Calories, Grade, Fat, T. Carbs, Protein, Fiber, Sat. Fat, Tr. Fat, Sodium, Calcium, and possibly others.

Find the "Day Total" row in the table. From that row, extract ONLY these three columns:
- "Fat" (total fat, NOT "Sat. Fat" or "Tr. Fat" — it is the first fat column)
- "T. Carbs" (total carbohydrates)
- "Protein"

IMPORTANT: The table has multiple fat-related columns. "Fat" (total fat) comes BEFORE "Sat. Fat" (saturated fat) and "Tr. Fat" (trans fat). Make sure you pick the correct column.

First, list all column headers you see from left to right. Then identify the Day Total row. Then extract the three values.

Return your final answer as a JSON object with exactly 3 fields: fat_g (from the "Fat" column), carbs_g (from the "T. Carbs" column), protein_g (from the "Protein" column). All values should be numbers in grams.

Return ONLY the JSON object on the last line, no markdown fences.`,
          },
        ],
      },
    ],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text : "";
  // The model may output chain-of-thought text before the JSON.
  // Extract the last JSON object from the response.
  const jsonMatch = raw.match(/\{[^{}]*"fat_g"\s*:\s*\d+[^{}]*\}/g);
  if (!jsonMatch) {
    throw new Error("Could not extract macros from image");
  }
  const text = jsonMatch[jsonMatch.length - 1];
  const parsed = macrosSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error("Could not extract macros from image");
  }
  return parsed.data;
}

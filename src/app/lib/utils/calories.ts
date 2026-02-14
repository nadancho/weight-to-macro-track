/**
 * Macro-to-calories calculation (injectable / used app-wide).
 * Formula: carbs g × 4, protein g × 4, fat g × 9.
 */

const CARBS_KCAL_PER_G = 4;
const PROTEIN_KCAL_PER_G = 4;
const FAT_KCAL_PER_G = 9;

/**
 * Returns total calories from macros. Null/undefined values are treated as 0.
 */
export function macrosToCalories(
  carbs_g: number | null | undefined,
  protein_g: number | null | undefined,
  fat_g: number | null | undefined
): number {
  const c = carbs_g ?? 0;
  const p = protein_g ?? 0;
  const f = fat_g ?? 0;
  return c * CARBS_KCAL_PER_G + p * PROTEIN_KCAL_PER_G + f * FAT_KCAL_PER_G;
}

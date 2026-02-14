---
name: Macro hierarchy colors and icons
overview: Add global CSS variables for protein, carbs, and fat (text color + slightly darker accent), apply 75% font size and color/icon to macro rows in History, and add icon representations for each macronutrient.
todos: []
isProject: false
---

# Macro importance hierarchy: colors and icons

## 1. Global color variables (and accents)

Add to [src/app/globals.css](src/app/globals.css) in both `:root` and `.dark`:

- **Protein:** text `#E9967A`, accent a slightly darker variant (e.g. darken for hover/editable background).
- **Carbs:** text `#373D3F`, accent slightly darker (already dark; accent can be a tad darker or a subtle tint for backgrounds).
- **Fats:** text `#A9A444`, accent slightly darker.

Define semantic tokens so components stay theme-aware:

- `--macro-protein` / `--macro-protein-accent`
- `--macro-carbs` / `--macro-carbs-accent`
- `--macro-fat` / `--macro-fat-accent`

Use hex values directly in CSS (e.g. `color: var(--macro-protein)`). For “slightly darker” accent: derive by hand (e.g. protein accent `#c97d5f`) or use a same-hue darker shade so light/dark mode both look good. In `.dark`, the same hex tokens can be reused or tuned if needed for contrast.

Optional: expose these in Tailwind via `theme.extend.colors` in `tailwind.config` so you can use `text-macro-protein`, `bg-macro-protein-accent`, etc.

## 2. History page: 75% size and color per macro row

In [src/app/(app)/history/page.tsx](src/app/(app)/history/page.tsx):

- **Row labels (Weight, Protein, Carbs, Fat, Calories):** For Protein, Carbs, and Fat rows, set the label cell and all value cells in that row to **75% font size** (e.g. `text-[0.75rem]` or a class like `macro-row`) and the corresponding **text color** (e.g. `text-[var(--macro-protein)]` for the Protein row). Weight and Calories stay default size/color.
- **Accent usage:** In edit mode, for the Protein row use `bg-macro-protein-accent` (or equivalent) for hover/editable cell background instead of generic `bg-muted`; same for Carbs and Fat rows so the “visual gesture” reinforces hierarchy and nutrient type.

Apply the same 75% + color + accent only to the three macro rows (Protein, Carbs, Fat), not to Weight or Calories.

## 3. Icon representations (Lucide)

Use these **exact** icons from `lucide-react` for consistent representation:


| Row     | Icon      | Import name |
| ------- | --------- | ----------- |
| Weight  | scale     | `Scale`     |
| Protein | beef      | `Beef`      |
| Carbs   | croissant | `Croissant` |
| Fats    | droplet   | `Droplet`   |


Render the icon next to the row label in the History table (first column of each row). Icon color: Weight uses default foreground; Protein/Carbs/Fat use the row’s macro color (`var(--macro-protein)` etc.). Size ~75% to align with macro row text (e.g. `size-3.5`).

Optional: reuse the same icons (and macro colors for Protein, Carbs, Fat) on the [Log page](src/app/(app)/log/page.tsx) for labels so the language is consistent app-wide.

## 4. Files to touch


| File                                           | Change                                                                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/globals.css`                          | Add `--macro-protein`, `--macro-carbs`, `--macro-fat` and their `-accent` variants (light/dark if needed).                                     |
| `tailwind.config.ts` (or `tailwind.config.js`) | Optionally add `macroProtein`, `macroCarbs`, `macroFat` and accent colors to `theme.extend.colors` for utility classes.                        |
| `src/app/(app)/history/page.tsx`               | Per-row: Protein/Carbs/Fat rows use 75% font size, row-specific text color and accent (hover/editable); add icon next to each macro row label. |
| `src/app/(app)/log/page.tsx`                   | Optional: add same icons and macro colors to the Carbs, Protein, Fat labels.                                                                   |


## 5. Contrast note

- Carbs `#373D3F` is very dark; on a dark theme background it may not read well. In `.dark`, consider a lighter carbs color (e.g. a gray like `#9ca3af`) or keep and ensure the background is light enough so the row remains readable.


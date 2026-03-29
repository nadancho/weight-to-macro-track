import type { Collectible, ThemeDefinition } from "../types";

/**
 * Cottagecore — forest at golden hour.
 * Derived from the woodland scene style anchor: deep forest greens,
 * warm amber lantern light, mossy mid-tones, cream text.
 */
export const cottagecore: ThemeDefinition = {
  id: "cottagecore",
  name: "Cottagecore",
  description: "A cozy forest at golden hour — warm, earthy, and inviting.",
  preview: "/themes/cottagecore/preview.png",
  cssVariables: {
    // Dark mode (primary — mobile PWA)
    "--background": "130 18% 8%",          // deep forest floor
    "--foreground": "40 30% 90%",          // warm cream text
    "--card": "130 14% 13%",               // dark wood panel
    "--card-foreground": "40 30% 90%",
    "--primary": "38 80% 50%",             // amber lantern glow
    "--primary-foreground": "130 20% 8%",
    "--secondary": "130 12% 18%",          // mossy undertone
    "--secondary-foreground": "40 25% 85%",
    "--muted": "130 10% 15%",              // dark moss
    "--muted-foreground": "40 10% 55%",    // faded parchment
    "--accent": "130 12% 18%",
    "--accent-foreground": "40 25% 85%",
    "--destructive": "0 62% 50%",
    "--destructive-foreground": "40 30% 95%",
    "--border": "130 10% 20%",             // subtle bark edge
    "--input": "130 10% 20%",
    "--ring": "38 80% 50%",                // amber focus ring
    // Macro colors shifted warmer
    "--macro-protein": "#c97d5f",          // warm clay
    "--macro-protein-accent": "#a8614a",
    "--macro-carbs": "#7a9a6d",            // forest moss
    "--macro-carbs-accent": "#5f7d54",
    "--macro-fat": "#c9a84c",              // honey gold
    "--macro-fat-accent": "#a88e3a",
    // Chart series
    "--chart-1": "38 80% 55%",             // amber
    "--chart-2": "15 70% 55%",             // warm rust
    "--chart-3": "130 45% 45%",            // forest green
    "--chart-4": "280 30% 55%",            // twilight purple
    "--chart-5": "50 60% 55%",             // golden
    "--skeleton": "130 10% 14%",
  },
  assets: {
    backgroundAnimation: "floating-leaves",
    calendarDotStyle: "flower",
    accentImages: ["/themes/cottagecore/mushroom.png", "/themes/cottagecore/acorn.png"],
  },
};

/**
 * Classic Dark — the current app look, preserved as fallback.
 * Values match the existing .dark {} block in globals.css.
 */
export const classicDark: ThemeDefinition = {
  id: "classic-dark",
  name: "Classic Dark",
  description: "Clean, modern dark theme.",
  preview: "/themes/classic-dark/preview.png",
  cssVariables: {
    "--background": "220 15% 6%",
    "--foreground": "0 0% 98%",
    "--card": "220 10% 11%",
    "--card-foreground": "0 0% 98%",
    "--primary": "210 14% 52%",
    "--primary-foreground": "210 10% 96%",
    "--secondary": "0 0% 14%",
    "--secondary-foreground": "0 0% 98%",
    "--muted": "0 0% 12%",
    "--muted-foreground": "0 0% 60%",
    "--accent": "0 0% 14%",
    "--accent-foreground": "0 0% 98%",
    "--destructive": "0 62.8% 50.6%",
    "--destructive-foreground": "0 0% 98%",
    "--border": "0 0% 15%",
    "--input": "0 0% 15%",
    "--ring": "210 14% 52%",
    "--macro-protein": "#e9967a",
    "--macro-protein-accent": "#c97d5f",
    "--macro-carbs": "#849b84",
    "--macro-carbs-accent": "#6d7f6d",
    "--macro-fat": "#a9a444",
    "--macro-fat-accent": "#8f8a38",
    "--chart-1": "217 91% 65%",
    "--chart-2": "25 95% 58%",
    "--chart-3": "142 71% 50%",
    "--chart-4": "280 60% 55%",
    "--chart-5": "15 70% 55%",
    "--skeleton": "0 0% 14%",
  },
};

/** All theme definitions. */
export const allThemes: ThemeDefinition[] = [cottagecore, classicDark];

/** Theme collectibles — what makes themes part of the unified collectible system. */
export const themeCollectibles: Collectible[] = [
  {
    id: "cottagecore",
    kind: "theme",
    name: "Cottagecore",
    description: "A cozy forest at golden hour — warm, earthy, and inviting.",
    image: "/themes/cottagecore/preview.png",
    tags: ["theme", "default"],
    acquisition: { type: "default" },
    prerequisites: [],
    unlocks: [],
  },
  {
    id: "classic-dark",
    kind: "theme",
    name: "Classic Dark",
    description: "Clean, modern dark theme.",
    image: "/themes/classic-dark/preview.png",
    tags: ["theme", "default"],
    acquisition: { type: "default" },
    prerequisites: [],
    unlocks: [],
  },
];

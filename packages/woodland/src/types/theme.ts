/** Full theme definition including CSS variables and optional assets. */
export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  preview: string;
  cssVariables: Record<string, string>;
  assets?: ThemeAssets;
}

/** Optional theme-specific visual assets. */
export interface ThemeAssets {
  backgroundAnimation?: string;
  accentImages?: string[];
  mascotVariant?: string;
  calendarDotStyle?: string;
}

/** Resolved theme ready to apply — CSS variables + assets. */
export interface ResolvedTheme {
  cssVariables: Record<string, string>;
  assets?: ThemeAssets;
}

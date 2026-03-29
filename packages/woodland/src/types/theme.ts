/** Full theme definition including light and dark CSS variable sets. */
export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  preview: string;
  light: Record<string, string>;
  dark: Record<string, string>;
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

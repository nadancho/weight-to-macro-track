"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  createRegistry,
  resolveTheme,
  allThemes,
  themeCollectibles,
} from "@woodland/core";
import type { ColorMode, ResolvedTheme, ThemeDefinition } from "@woodland/core";
import { useTheme } from "@/components/theme-provider";

const registry = createRegistry({
  collectibles: themeCollectibles,
  themes: allThemes,
});

interface WoodlandThemeContextValue {
  activeThemeId: string;
  setActiveTheme: (themeId: string) => void;
  availableThemes: ThemeDefinition[];
}

const WoodlandThemeContext = createContext<WoodlandThemeContextValue | null>(null);

let appliedKeys: string[] = [];

function applyThemeToDocument(resolved: ResolvedTheme): void {
  clearThemeFromDocument();
  const root = document.documentElement;
  appliedKeys = Object.keys(resolved.cssVariables);
  for (const [key, value] of Object.entries(resolved.cssVariables)) {
    root.style.setProperty(key, value);
  }
}

function clearThemeFromDocument(): void {
  const root = document.documentElement;
  for (const key of appliedKeys) {
    root.style.removeProperty(key);
  }
  appliedKeys = [];
}

export function WoodlandThemeProvider({
  initialThemeId = "cottagecore",
  children,
}: {
  initialThemeId?: string;
  children: React.ReactNode;
}) {
  const [activeThemeId, setActiveThemeId] = useState(initialThemeId);
  const { theme: colorMode } = useTheme();

  // Apply the right variant (light/dark) whenever theme or color mode changes
  useEffect(() => {
    const mode: ColorMode = colorMode === "dark" ? "dark" : "light";
    const resolved = resolveTheme(activeThemeId, mode, registry);
    if (!resolved) return;
    applyThemeToDocument(resolved);
    document.documentElement.setAttribute("data-woodland-theme", activeThemeId);
    return () => {
      clearThemeFromDocument();
      document.documentElement.removeAttribute("data-woodland-theme");
    };
  }, [activeThemeId, colorMode]);

  const setActiveTheme = useCallback(
    async (themeId: string) => {
      setActiveThemeId(themeId);
      try {
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ theme: themeId }),
        });
      } catch {
        // Silently fail — theme is still applied locally
      }
    },
    [],
  );

  const availableThemes = allThemes;

  return (
    <WoodlandThemeContext.Provider
      value={{ activeThemeId, setActiveTheme, availableThemes }}
    >
      {children}
    </WoodlandThemeContext.Provider>
  );
}

export function useWoodlandTheme() {
  const ctx = useContext(WoodlandThemeContext);
  if (!ctx) {
    throw new Error("useWoodlandTheme must be used within WoodlandThemeProvider");
  }
  return ctx;
}

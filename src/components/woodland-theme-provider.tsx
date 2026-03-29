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
import type { ResolvedTheme, ThemeDefinition } from "@woodland/core";

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

function applyThemeToDocument(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(resolved.cssVariables)) {
    root.style.setProperty(key, value);
  }
}

function clearThemeFromDocument(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  for (const key of Object.keys(resolved.cssVariables)) {
    root.style.removeProperty(key);
  }
}

export function WoodlandThemeProvider({
  initialThemeId = "cottagecore",
  children,
}: {
  initialThemeId?: string;
  children: React.ReactNode;
}) {
  const [activeThemeId, setActiveThemeId] = useState(initialThemeId);

  useEffect(() => {
    const resolved = resolveTheme(activeThemeId, registry);
    if (!resolved) return;
    applyThemeToDocument(resolved);
    document.documentElement.setAttribute("data-woodland-theme", activeThemeId);
    return () => {
      clearThemeFromDocument(resolved);
      document.documentElement.removeAttribute("data-woodland-theme");
    };
  }, [activeThemeId]);

  const setActiveTheme = useCallback(
    async (themeId: string) => {
      setActiveThemeId(themeId);
      // Persist to profile
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

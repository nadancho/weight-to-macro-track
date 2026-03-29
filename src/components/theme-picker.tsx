"use client";

import { useWoodlandTheme } from "@/components/woodland-theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemePicker() {
  const { activeThemeId, setActiveTheme, availableThemes } = useWoodlandTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="size-5 shrink-0" aria-hidden />
          Theme
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {availableThemes.map((theme) => {
            const isActive = theme.id === activeThemeId;
            // Extract a few key colors for the preview swatch
            const bg = theme.dark["--background"];
            const primary = theme.dark["--primary"];
            const card = theme.dark["--card"];

            return (
              <button
                key={theme.id}
                onClick={() => setActiveTheme(theme.id)}
                className={cn(
                  "relative flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors",
                  isActive
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-foreground/20",
                )}
              >
                {/* Color swatch preview */}
                <div className="flex gap-1.5">
                  <div
                    className="h-6 w-6 rounded-full border border-white/10"
                    style={{ background: `hsl(${bg})` }}
                    title="Background"
                  />
                  <div
                    className="h-6 w-6 rounded-full border border-white/10"
                    style={{ background: `hsl(${card})` }}
                    title="Card"
                  />
                  <div
                    className="h-6 w-6 rounded-full border border-white/10"
                    style={{ background: `hsl(${primary})` }}
                    title="Primary"
                  />
                </div>

                <div>
                  <p className="text-sm font-medium">{theme.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {theme.description}
                  </p>
                </div>

                {isActive && (
                  <div className="absolute right-2 top-2">
                    <Check className="size-4 text-primary" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

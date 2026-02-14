"use client";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

const THEME_COOKIE = "theme";

function setThemeCookie(value: "light" | "dark"): void {
  if (typeof document === "undefined") return;
  document.cookie = `${THEME_COOKIE}=${value};path=/;max-age=31536000`;
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeCookie(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="relative"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}

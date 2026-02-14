"use client";

import { Smartphone, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "pwa-install-prompt-dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (nav.standalone === true) ||
    document.referrer.includes("android-app://")
  );
}

function isMobileLike(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 768px)").matches
  );
}

export function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (isStandalone()) return;
    if (!isMobileLike()) return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    setVisible(true);
  }, [mounted]);

  if (!visible) return null;

  return (
    <div
      role="banner"
      aria-label="Add to Home Screen"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur-sm",
        "dark:shadow-[0_-4px_12px_rgba(0,0,0,0.3)]",
        "safe-area-pb" // if you add safe-area env later
      )}
    >
      <Smartphone className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      <p className="min-w-0 flex-1 text-sm text-foreground">
        Add to Home Screen for quick logging from your phone.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Dismiss"
      >
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );
}

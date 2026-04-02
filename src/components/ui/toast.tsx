"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { PawPrint, X } from "lucide-react";
import { useEffect } from "react";

type ToastProps = {
  message: string | null;
  type?: "ok" | "error";
  onDismiss: () => void;
  duration?: number;
};

export function Toast({ message, type = "ok", onDismiss, duration = 2500 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [message, onDismiss, duration]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.15 }}
          role={type === "error" ? "alert" : "status"}
          className={cn(
            "fixed right-4 z-[200]",
            "top-[calc(env(safe-area-inset-top,0px)+1rem)]",
            "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium shadow-lg",
            "bg-card text-card-foreground border-border"
          )}
        >
          {type === "ok" ? (
            <PawPrint className="size-4 shrink-0 text-macro-carbs" aria-hidden />
          ) : (
            <X className="size-4 shrink-0 text-destructive" aria-hidden />
          )}
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function PinInput({
  value,
  onChange,
  disabled,
  length = 6,
  "aria-label": ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Number of digits (default 6). Use 4 temporarily for sign-in if needed. */
  length?: number;
  "aria-label"?: string;
  className?: string;
}) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.slice(0, length).split("");
  while (digits.length < length) digits.push("");

  const setDigit = (index: number, char: string) => {
    const next = value.split("");
    next[index] = char;
    onChange(next.join("").slice(0, length));
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v.length > 1) {
      const pasted = v.replace(/\D/g, "").slice(0, length);
      onChange(pasted);
      const focusIdx = Math.min(pasted.length, length - 1);
      refs.current[focusIdx]?.focus();
      return;
    }
    if (v.length === 1) {
      if (!/^\d$/.test(v)) return;
      setDigit(index, v);
      if (index < length - 1) refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (value.length === length) {
        (e.target as HTMLInputElement).form?.requestSubmit();
      }
      e.preventDefault();
      return;
    }
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      setDigit(index - 1, "");
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div
      className={cn("flex gap-1.5 sm:gap-2", className)}
      role="group"
      aria-label={ariaLabel}
    >
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : undefined}
          maxLength={length}
          value={digits[i]}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => { handlePaste(e); }}
          disabled={disabled}
          className={cn(
            "h-12 w-10 sm:w-12 rounded-lg border border-input bg-background text-center text-lg font-semibold tabular-nums",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          aria-label={`Digit ${i + 1} of ${length}`}
        />
      ))}
    </div>
  );
}

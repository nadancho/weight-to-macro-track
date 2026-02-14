"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const LENGTH = 6;

export function PinInput({
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.slice(0, LENGTH).split("");
  while (digits.length < LENGTH) digits.push("");

  const setDigit = (index: number, char: string) => {
    const next = value.split("");
    next[index] = char;
    onChange(next.join("").slice(0, LENGTH));
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v.length > 1) {
      const pasted = v.replace(/\D/g, "").slice(0, LENGTH);
      onChange(pasted);
      const focusIdx = Math.min(pasted.length, LENGTH - 1);
      refs.current[focusIdx]?.focus();
      return;
    }
    if (v.length === 1) {
      if (!/^\d$/.test(v)) return;
      setDigit(index, v);
      if (index < LENGTH - 1) refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      setDigit(index - 1, "");
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    onChange(pasted);
    refs.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
  };

  return (
    <div
      className={cn("flex gap-1.5 sm:gap-2", className)}
      role="group"
      aria-label={ariaLabel}
    >
      {Array.from({ length: LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : undefined}
          maxLength={6}
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
          aria-label={`Digit ${i + 1} of 6`}
        />
      ))}
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Scale } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MIN_WEIGHT = 50.0;
const MAX_WEIGHT = 500.0;

function clamp(v: number): number {
  return Math.round(Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, v)) * 10) / 10;
}

function formatWeight(v: number): string {
  return v.toFixed(1);
}

type WeightStepperProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  previousDayWeight: number | null;
  previousLabel?: string;
  loading?: boolean;
};

export function WeightStepper({
  value,
  onChange,
  previousDayWeight,
  previousLabel = "Yesterday",
  loading,
}: WeightStepperProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAutoFilled = useRef(false);

  // Auto-fill from previous day on first load
  useEffect(() => {
    if (
      !hasAutoFilled.current &&
      value === null &&
      previousDayWeight !== null
    ) {
      hasAutoFilled.current = true;
      onChange(previousDayWeight);
    }
  }, [value, previousDayWeight, onChange]);

  const adjust = (amount: number) => {
    onChange(clamp((value ?? previousDayWeight ?? 150) + amount));
  };

  const enterEditMode = () => {
    setEditText(value !== null ? formatWeight(value) : "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const confirmEdit = () => {
    setEditing(false);
    const parsed = parseFloat(editText);
    if (!isNaN(parsed) && parsed >= MIN_WEIGHT && parsed <= MAX_WEIGHT) {
      onChange(clamp(parsed));
    }
  };

  const delta =
    value !== null && previousDayWeight !== null
      ? Math.round((value - previousDayWeight) * 10) / 10
      : null;

  const btnBase = "flex items-center justify-center rounded-full active:scale-95 transition-transform select-none tabular-nums";
  // Large arrow buttons for ±0.1 (primary action, hit repeatedly)
  const btnFine = cn(btnBase, "h-12 w-12 bg-secondary text-foreground border border-border");
  // Small text buttons for ±1
  const btnCoarse = cn(btnBase, "h-9 w-9 border border-border/60 text-muted-foreground text-xs font-medium");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <Scale className="size-4 shrink-0 text-foreground" aria-hidden />
        Weight (lbs)
      </div>

      {/* Previous day reference */}
      <div className="text-center">
        {loading ? (
          <div className="h-4 w-32 mx-auto rounded bg-muted animate-pulse" />
        ) : previousDayWeight !== null ? (
          <p className="text-xs text-muted-foreground">
            {previousLabel}: {formatWeight(previousDayWeight)} lbs
          </p>
        ) : null}
      </div>

      {/* Stepper row: -1, -0.1, display, +0.1, +1 */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => adjust(-1)}
          className={btnCoarse}
          aria-label="Decrease weight by 1 lb"
        >
          −1
        </button>
        <button
          type="button"
          onClick={() => adjust(-0.1)}
          className={btnFine}
          aria-label="Decrease weight by 0.1 lbs"
        >
          <ChevronDown className="size-5" />
        </button>

        <div
          className="flex flex-col items-center min-w-[100px]"
          onClick={!editing ? enterEditMode : undefined}
          role={!editing ? "button" : undefined}
          tabIndex={!editing ? 0 : undefined}
          onKeyDown={
            !editing
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") enterEditMode();
                }
              : undefined
          }
          aria-label={
            !editing
              ? `Weight: ${value !== null ? formatWeight(value) : "not set"}. Tap to edit.`
              : undefined
          }
        >
          {editing ? (
            <input
              ref={inputRef}
              type="number"
              step="0.1"
              min={MIN_WEIGHT}
              max={MAX_WEIGHT}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={confirmEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              className={cn(
                "w-24 bg-transparent text-center text-3xl font-bold tabular-nums",
                "border-b-2 border-primary outline-none"
              )}
            />
          ) : (
            <span
              className={cn(
                "text-3xl font-bold tabular-nums cursor-pointer",
                value === null && "text-muted-foreground"
              )}
            >
              {value !== null ? formatWeight(value) : "—"}
            </span>
          )}
          {!editing && value !== null && (
            <span className="text-xs text-muted-foreground mt-0.5">lbs</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => adjust(0.1)}
          className={btnFine}
          aria-label="Increase weight by 0.1 lbs"
        >
          <ChevronUp className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => adjust(1)}
          className={btnCoarse}
          aria-label="Increase weight by 1 lb"
        >
          +1
        </button>
      </div>

      {/* Delta badge */}
      <div className="text-center h-5">
        {delta !== null && delta !== 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              delta > 0
                ? "text-red-500 dark:text-red-400"
                : "text-green-500 dark:text-green-400"
            )}
          >
            {delta > 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)} lbs
          </span>
        )}
      </div>
    </div>
  );
}

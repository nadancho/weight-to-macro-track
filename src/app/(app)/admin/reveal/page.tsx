"use client";

import { useAuth } from "@/components/auth-provider";
import { ADMIN_UUID } from "@/app/lib/constants";
import { SpriteAnimator } from "@/components/sprite-animator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dices, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

// --- Types ---

interface AnimationOption {
  id: string;
  name: string;
  sprite_path: string;
  grid_cols: number;
  grid_rows: number;
  frame_sequence: number[];
  frame_size: number;
  fps: number;
  loop: boolean;
  display_width: number | null;
  display_height: number | null;
  frame_offsets: Array<{ x: number; y: number }>;
  frame_mirrors: boolean[];
}

interface OddsRow {
  animation_id: string;
  weight: number;
  animation: AnimationOption;
}

// Segment colors for the probability bar
const SEGMENT_COLORS = [
  "bg-green-500", "bg-blue-500", "bg-amber-500", "bg-purple-500",
  "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-pink-500",
];

// --- Page ---

export default function AdminRevealPage() {
  const { userId } = useAuth();
  const [animations, setAnimations] = useState<AnimationOption[]>([]);
  const [rows, setRows] = useState<OddsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  // Fetch animations + current odds
  useEffect(() => {
    if (userId !== ADMIN_UUID) return;
    Promise.all([
      fetch("/api/admin/animations", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/reveal", { credentials: "include" }).then((r) => r.json()),
    ]).then(([anims, odds]) => {
      setAnimations(anims ?? []);
      setRows(
        (odds ?? []).map((o: Record<string, unknown>) => ({
          animation_id: o.animation_id as string,
          weight: Number(o.weight),
          animation: o.animation as AnimationOption,
        })),
      );
      setLoading(false);
    });
  }, [userId]);

  const totalWeight = useMemo(() => rows.reduce((s, r) => s + r.weight, 0), [rows]);
  const nothingChance = Math.max(0, 100 - totalWeight);
  const overBudget = totalWeight > 100;

  // Available animations not yet in the odds table
  const available = useMemo(() => {
    const used = new Set(rows.map((r) => r.animation_id));
    return animations.filter((a) => !used.has(a.id));
  }, [animations, rows]);

  const addRow = useCallback(
    (anim: AnimationOption) => {
      setRows((prev) => [...prev, { animation_id: anim.id, weight: 10, animation: anim }]);
    },
    [],
  );

  const removeRow = useCallback((animId: string) => {
    setRows((prev) => prev.filter((r) => r.animation_id !== animId));
  }, []);

  const updateWeight = useCallback((animId: string, weight: number) => {
    setRows((prev) =>
      prev.map((r) => (r.animation_id === animId ? { ...r, weight } : r)),
    );
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/reveal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          entries: rows.map((r) => ({ animation_id: r.animation_id, weight: r.weight })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      setMessage({ type: "ok", text: "Saved!" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  if (userId !== ADMIN_UUID) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Dices className="size-6" aria-hidden />
          Creature Reveal Odds
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure which creatures appear after the save celebration
        </p>
      </div>

      {/* Probability bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Probability Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex h-8 w-full overflow-hidden rounded-lg bg-muted/30">
            {rows.map((row, i) => (
              <div
                key={row.animation_id}
                className={cn(
                  SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                  "flex items-center justify-center text-[10px] font-bold text-white transition-all duration-300",
                  row.weight < 5 && "text-[8px]",
                )}
                style={{ width: `${Math.max(row.weight, 0.5)}%` }}
                title={`${row.animation.name}: ${row.weight}%`}
              >
                {row.weight >= 8 ? `${row.weight}%` : ""}
              </div>
            ))}
            {nothingChance > 0 && (
              <div
                className="flex items-center justify-center bg-muted text-[10px] font-medium text-muted-foreground transition-all duration-300"
                style={{ width: `${nothingChance}%` }}
              >
                {nothingChance >= 8 ? `${nothingChance}% nothing` : ""}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Total: <span className={cn("font-semibold", overBudget && "text-destructive")}>{totalWeight.toFixed(1)}%</span>
            </span>
            <span>Nothing: {nothingChance.toFixed(1)}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Odds table */}
      <div className="space-y-3">
        {rows.map((row, i) => (
          <Card key={row.animation_id}>
            <CardContent className="flex items-center gap-4 py-3">
              {/* Sprite preview */}
              <div className="shrink-0">
                <SpriteAnimator
                  src={row.animation.sprite_path}
                  grid={[row.animation.grid_cols, row.animation.grid_rows]}
                  frames={row.animation.frame_sequence}
                  frameSize={row.animation.frame_size}
                  fps={row.animation.fps}
                  loop={row.animation.loop}
                  width={48}
                  height={48}
                  frameOffsets={row.animation.frame_offsets}
                  frameMirrors={row.animation.frame_mirrors}
                />
              </div>

              {/* Name + color indicator */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className={cn("size-2.5 rounded-full shrink-0", SEGMENT_COLORS[i % SEGMENT_COLORS.length])} />
                  <p className="font-medium text-sm truncate">{row.animation.name}</p>
                </div>
              </div>

              {/* Weight input */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Input
                  type="number"
                  min={0.01}
                  max={100}
                  step={0.01}
                  value={row.weight}
                  onChange={(e) => updateWeight(row.animation_id, Number(e.target.value) || 0)}
                  className="w-20 h-9 text-center text-sm"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeRow(row.animation_id)}
                className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label={`Remove ${row.animation.name}`}
              >
                <Trash2 className="size-4" />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add animation */}
      {available.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Add animation to pool</p>
          <div className="flex flex-wrap gap-2">
            {available.map((anim) => (
              <button
                key={anim.id}
                type="button"
                onClick={() => addRow(anim)}
                className="flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-sm hover:bg-white/[0.1] transition-colors"
              >
                <Plus className="size-3.5" />
                {anim.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving || overBudget}
          className="min-h-[44px]"
        >
          <Save className="size-4" aria-hidden />
          {saving ? "Saving…" : "Save odds"}
        </Button>
        {message && (
          <p className={cn("text-sm", message.type === "ok" ? "text-green-500" : "text-destructive")}>
            {message.text}
          </p>
        )}
        {overBudget && (
          <p className="text-sm text-destructive font-medium">
            Total exceeds 100% — reduce weights before saving
          </p>
        )}
      </div>
    </div>
  );
}

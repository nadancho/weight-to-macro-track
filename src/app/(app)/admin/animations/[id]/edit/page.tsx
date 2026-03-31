"use client";

import { useAuth } from "@/components/auth-provider";
import { ADMIN_UUID } from "@/app/lib/constants";
import { SpriteAnimator } from "@/components/sprite-animator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Copy,
  FlipHorizontal,
  GripVertical,
  Layers,
  Grid3X3,
  Pause,
  Play,
  Plus,
  Redo2,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FrameCanvas } from "./frame-canvas";
import {
  useFrameEditor,
  type FrameEditor,
  type SpriteAnimationData,
} from "./use-frame-editor";

// =============================================================================
// Page Shell — fetches animation data, then renders the editor
// =============================================================================

export default function FrameEditorPage() {
  const { userId } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [animation, setAnimation] = useState<SpriteAnimationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = userId === ADMIN_UUID;

  useEffect(() => {
    if (!isAdmin) return;
    fetch(`/api/admin/animations/${params.id}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => setAnimation(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAdmin, params.id]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !animation) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-destructive">{error ?? "Animation not found"}</p>
        <Button variant="outline" onClick={() => router.push("/admin/animations")}>
          Back to Animations
        </Button>
      </div>
    );
  }

  return <EditorView animation={animation} />;
}

// =============================================================================
// Editor View — the main editor layout
// =============================================================================

function EditorView({ animation }: { animation: SpriteAnimationData }) {
  const editor = useFrameEditor(animation);
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState(false);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          editor.selectFrame(editor.selectedIndex - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          editor.selectFrame(editor.selectedIndex + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          editor.moveOffset(0, -1);
          break;
        case "ArrowDown":
          e.preventDefault();
          editor.moveOffset(0, 1);
          break;
        case "d":
        case "D":
          e.preventDefault();
          editor.duplicateFrame();
          break;
        case "Delete":
        case "Backspace":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            editor.deleteFrame();
          }
          break;
        case "m":
        case "M":
          e.preventDefault();
          editor.toggleMirror();
          break;
        case " ":
          e.preventDefault();
          setPlaying((p) => !p);
          break;
        case "z":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            if (e.shiftKey) {
              editor.redo();
            } else {
              editor.undo();
            }
          }
          break;
        case "s":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            handleSave();
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.selectedIndex, editor.frames.length]);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = editor.getUpdatePayload();
      const res = await fetch(`/api/admin/animations/${animation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        alert(err.error);
        return;
      }
      editor.markSaved();
    } finally {
      setSaving(false);
    }
  }

  const previousFrame =
    editor.selectedIndex > 0 ? editor.frames[editor.selectedIndex - 1] : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/admin/animations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{animation.name}</h1>
            <p className="text-xs text-muted-foreground">
              {animation.animation_type} &middot; {editor.frames.length} frames
              {editor.isDirty && (
                <span className="text-primary ml-2">● unsaved</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => editor.resetToSaved()}
            disabled={!editor.isDirty}
          >
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !editor.isDirty}>
            <Save className="size-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Main editor layout */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* Left: Canvas + strip */}
        <div className="flex flex-col gap-4">
          {/* Canvas */}
          <Card>
            <CardContent className="p-4 flex flex-col items-center gap-3">
              <FrameCanvas
                animation={animation}
                frame={editor.selectedFrame}
                previousFrame={previousFrame}
                zoom={editor.zoom}
                showGrid={editor.showGrid}
                showOnionSkin={editor.showOnionSkin}
                onZoomChange={editor.setZoom}
              />

              {/* Canvas toolbar */}
              <div className="flex items-center gap-2">
                <ToggleButton
                  active={editor.showGrid}
                  onClick={editor.toggleGrid}
                  icon={<Grid3X3 className="size-3.5" />}
                  label="Grid"
                />
                <ToggleButton
                  active={editor.showOnionSkin}
                  onClick={editor.toggleOnionSkin}
                  icon={<Layers className="size-3.5" />}
                  label="Onion"
                />
                <span className="w-px h-5 bg-white/[0.12]" />
                <button
                  onClick={editor.undo}
                  disabled={!editor.canUndo}
                  className="rounded p-1.5 text-xs hover:bg-white/[0.08] disabled:opacity-30"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="size-3.5" />
                </button>
                <button
                  onClick={editor.redo}
                  disabled={!editor.canRedo}
                  className="rounded p-1.5 text-xs hover:bg-white/[0.08] disabled:opacity-30"
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <Redo2 className="size-3.5" />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Frame Strip */}
          <Card>
            <CardContent className="p-3">
              <FrameStrip editor={editor} />
            </CardContent>
          </Card>
        </div>

        {/* Right: Tools + Preview */}
        <div className="flex flex-col gap-4">
          <ToolPanel editor={editor} />
          <PlaybackPreview
            editor={editor}
            animation={animation}
            playing={playing}
            onTogglePlay={() => setPlaying((p) => !p)}
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Toggle Button
// =============================================================================

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs transition-colors ${
        active
          ? "bg-primary/20 text-primary"
          : "text-muted-foreground hover:bg-white/[0.08]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// =============================================================================
// Frame Strip — horizontal scrollable list of all frames
// =============================================================================

function FrameStrip({ editor }: { editor: FrameEditor }) {
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {editor.frames.length} frames &middot; Click to select, drag to reorder
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          ← → navigate &middot; D duplicate &middot; Del remove &middot; M mirror
        </p>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        {editor.frames.map((frame, index) => {
          const isSelected = index === editor.selectedIndex;
          const isDragTarget = dragOver === index;

          return (
            <div
              key={`${frame.frameNumber}-${index}`}
              draggable
              onDragStart={() => {
                dragIndex.current = index;
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(index);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex.current !== null) {
                  editor.reorderFrames(dragIndex.current, index);
                }
                dragIndex.current = null;
                setDragOver(null);
              }}
              onDragEnd={() => {
                dragIndex.current = null;
                setDragOver(null);
              }}
              onClick={() => editor.selectFrame(index)}
              className={`relative flex-shrink-0 cursor-pointer rounded-lg border-2 p-0.5 transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : isDragTarget
                    ? "border-primary/50 bg-primary/5"
                    : "border-white/[0.08] bg-white/[0.04] hover:border-white/[0.16]"
              }`}
            >
              <div className="relative">
                <SpriteAnimator
                  src={editor.animation.sprite_path}
                  grid={[editor.animation.grid_cols, editor.animation.grid_rows]}
                  frames={[frame.frameNumber]}
                  frameSize={editor.animation.frame_size}
                  fps={1}
                  loop={false}
                  width={56}
                  height={56}
                  frameOffsets={[frame.offset]}
                  frameMirrors={[frame.mirrored]}
                />
                {/* Frame number badge */}
                <span className="absolute bottom-0 right-0.5 text-[9px] text-white/50 font-mono">
                  {frame.frameNumber}
                </span>
                {/* Sequence position */}
                <span className="absolute top-0 left-0.5 text-[8px] text-white/40 font-mono">
                  {index + 1}
                </span>
                {/* Mirror indicator */}
                {frame.mirrored && (
                  <FlipHorizontal className="absolute top-0 right-0.5 size-2.5 text-primary" />
                )}
                {/* Offset indicator */}
                {(frame.offset.x !== 0 || frame.offset.y !== 0) && (
                  <span className="absolute bottom-0 left-0.5 text-[7px] text-primary font-mono">
                    {frame.offset.x},{frame.offset.y}
                  </span>
                )}
              </div>
              {/* Drag handle (visible on hover) */}
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 hover:opacity-100">
                <GripVertical className="size-3 text-white/30" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Tool Panel — offset d-pad, mirror, frame operations
// =============================================================================

function ToolPanel({ editor }: { editor: FrameEditor }) {
  const frame = editor.selectedFrame;

  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-4">
        <h3 className="text-sm font-medium">
          Frame {editor.selectedIndex + 1}
          {frame && (
            <span className="text-muted-foreground font-normal">
              {" "}
              (grid #{frame.frameNumber})
            </span>
          )}
        </h3>

        {frame && (
          <>
            {/* Offset D-pad */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">
                Offset ({frame.offset.x}, {frame.offset.y})
              </label>
              <div className="flex flex-col items-center gap-0.5">
                <button
                  onClick={() => editor.moveOffset(0, -1)}
                  className="rounded bg-white/[0.06] px-3 py-1.5 text-xs hover:bg-white/[0.12] active:scale-95"
                >
                  ↑
                </button>
                <div className="flex gap-0.5">
                  <button
                    onClick={() => editor.moveOffset(-1, 0)}
                    className="rounded bg-white/[0.06] px-3 py-1.5 text-xs hover:bg-white/[0.12] active:scale-95"
                  >
                    ←
                  </button>
                  <button
                    onClick={() =>
                      editor.moveOffset(-frame.offset.x, -frame.offset.y)
                    }
                    className="rounded bg-white/[0.06] px-2.5 py-1.5 text-[10px] text-muted-foreground hover:bg-white/[0.12]"
                    title="Reset offset"
                  >
                    0,0
                  </button>
                  <button
                    onClick={() => editor.moveOffset(1, 0)}
                    className="rounded bg-white/[0.06] px-3 py-1.5 text-xs hover:bg-white/[0.12] active:scale-95"
                  >
                    →
                  </button>
                </div>
                <button
                  onClick={() => editor.moveOffset(0, 1)}
                  className="rounded bg-white/[0.06] px-3 py-1.5 text-xs hover:bg-white/[0.12] active:scale-95"
                >
                  ↓
                </button>
              </div>
            </div>

            {/* Mirror */}
            <button
              onClick={editor.toggleMirror}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                frame.mirrored
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-white/[0.06] hover:bg-white/[0.12]"
              }`}
            >
              <FlipHorizontal className="size-4" />
              {frame.mirrored ? "Mirrored" : "Mirror"} (M)
            </button>

            {/* Frame operations */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Frame Operations</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={editor.duplicateFrame}
                  className="flex items-center justify-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-2 text-xs hover:bg-white/[0.12]"
                >
                  <Copy className="size-3" />
                  Duplicate (D)
                </button>
                <button
                  onClick={editor.deleteFrame}
                  disabled={editor.frames.length <= 1}
                  className="flex items-center justify-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-2 text-xs hover:bg-white/[0.12] disabled:opacity-30"
                >
                  <Trash2 className="size-3" />
                  Delete (Del)
                </button>
                <button
                  onClick={() => editor.insertFrame(editor.selectedIndex)}
                  className="flex items-center justify-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-2 text-xs hover:bg-white/[0.12] col-span-2"
                >
                  <Plus className="size-3" />
                  Insert After
                </button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Playback Preview — animated preview with controls
// =============================================================================

function PlaybackPreview({
  editor,
  animation,
  playing,
  onTogglePlay,
}: {
  editor: FrameEditor;
  animation: SpriteAnimationData;
  playing: boolean;
  onTogglePlay: () => void;
}) {
  const displayW = animation.display_width ?? 128;
  const displayH = animation.display_height ?? 128;

  return (
    <Card>
      <CardContent className="p-4 flex flex-col items-center gap-3">
        <h3 className="text-sm font-medium self-start">Preview</h3>

        <div
          className="rounded-lg border border-white/[0.08] p-4"
          style={{ background: "linear-gradient(180deg, #2a3a1e, #4a6a32)" }}
        >
          <SpriteAnimator
            key={`preview-${playing}-${editor.frames.length}-${JSON.stringify(editor.getUpdatePayload().frame_sequence)}`}
            src={animation.sprite_path}
            grid={[animation.grid_cols, animation.grid_rows]}
            frames={editor.getUpdatePayload().frame_sequence}
            frameSize={animation.frame_size}
            fps={playing ? editor.fps : 0.001}
            loop={animation.loop}
            width={displayW}
            height={displayH}
            frameOffsets={editor.getUpdatePayload().frame_offsets}
            frameMirrors={editor.getUpdatePayload().frame_mirrors}
          />
        </div>

        {/* Play/pause + FPS */}
        <div className="flex items-center gap-3">
          <button
            onClick={onTogglePlay}
            className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs hover:bg-white/[0.08] flex items-center gap-1.5"
          >
            {playing ? (
              <><Pause className="size-3" /> Pause</>
            ) : (
              <><Play className="size-3" /> Play</>
            )}
          </button>
          <div className="flex items-center gap-1.5 text-xs">
            <label className="text-muted-foreground">FPS</label>
            <input
              type="number"
              min={1}
              max={30}
              value={editor.fps}
              onChange={(e) => {
                const n = parseInt(e.target.value);
                if (!isNaN(n) && n > 0 && n <= 30) editor.setFps(n);
              }}
              className="w-12 rounded border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-center text-xs"
            />
          </div>
          <span className="text-xs text-muted-foreground">Space to toggle</span>
        </div>
      </CardContent>
    </Card>
  );
}

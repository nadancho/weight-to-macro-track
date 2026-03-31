"use client";

import { useAuth } from "@/components/auth-provider";
import { ADMIN_UUID } from "@/app/lib/constants";
import { SpriteAnimator } from "@/components/sprite-animator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BoundaryEditor, type CellOffset } from "@/components/boundary-editor";

interface SpriteAnimation {
  id: string;
  creature_id: string | null;
  name: string;
  animation_type: string;
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

const ANIMATION_TYPES = [
  "idle", "walk", "celebrate", "wave", "eat", "sleep", "read", "flex",
] as const;

const DEFAULT_FORM: Omit<SpriteAnimation, "id"> = {
  creature_id: null,
  name: "",
  animation_type: "idle",
  sprite_path: "",
  grid_cols: 12,
  grid_rows: 1,
  frame_sequence: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  frame_size: 256,
  fps: 6,
  loop: true,
  display_width: 128,
  display_height: 128,
  frame_offsets: [],
  frame_mirrors: [],
};

/** Number input that allows clearing without breaking. Shows empty while typing,
 *  falls back to default on blur if left empty. */
function NumInput({
  value,
  onChange,
  fallback,
  className = "w-20",
  min,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  fallback: number;
  className?: string;
  min?: number;
  max?: number;
}) {
  const [display, setDisplay] = useState(String(value));

  useEffect(() => {
    setDisplay(String(value));
  }, [value]);

  return (
    <input
      type="number"
      className={`${className} rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm`}
      value={display}
      onChange={(e) => {
        setDisplay(e.target.value);
        const n = parseInt(e.target.value);
        if (!isNaN(n)) onChange(n);
      }}
      onBlur={() => {
        const n = parseInt(display);
        if (isNaN(n) || display === "") {
          setDisplay(String(fallback));
          onChange(fallback);
        }
      }}
      min={min}
      max={max}
    />
  );
}

function FrameSequenceInput({
  value,
  onChange,
}: {
  value: number[];
  onChange: (seq: number[]) => void;
}) {
  const [raw, setRaw] = useState(value.join(" "));
  const lastExternal = useRef(value.join(" "));

  // Sync only on external changes (grid resize, etc.)
  useEffect(() => {
    const ext = value.join(" ");
    if (ext !== lastExternal.current) {
      lastExternal.current = ext;
      setRaw(ext);
    }
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Allow only digits and spaces
    const v = e.target.value.replace(/[^0-9 ]/g, "");
    setRaw(v);
    const seq = v.split(/\s+/).map(Number).filter((n) => !isNaN(n) && n > 0);
    lastExternal.current = seq.join(" ");
    onChange(seq);
  }

  return (
    <div className="flex flex-col gap-1.5 sm:col-span-2">
      <label className="text-xs font-medium text-muted-foreground">
        Frame Sequence (space-separated)
      </label>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 font-mono text-base tracking-widest"
          value={raw}
          onChange={handleChange}
          placeholder="1 2 3 4 5 6 7 8 9"
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => { setRaw(""); lastExternal.current = ""; onChange([]); }}
            className="shrink-0 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-muted-foreground hover:bg-white/[0.08]"
          >
            Clear
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{value.length} frames</p>
    </div>
  );
}

function SpritePreview({
  form,
  onOffsetsChange,
  onMirrorsChange,
}: {
  form: Omit<SpriteAnimation, "id">;
  onOffsetsChange: (offsets: Array<{ x: number; y: number }>) => void;
  onMirrorsChange: (mirrors: boolean[]) => void;
}) {
  const [playing, setPlaying] = useState(true);
  const [soloFrame, setSoloFrame] = useState<number | null>(null);
  const totalFrames = form.grid_cols * form.grid_rows;
  const displayW = form.display_width ?? 128;
  const displayH = form.display_height ?? 128;

  const offsets = form.frame_sequence.map((_, i) => form.frame_offsets[i] ?? { x: 0, y: 0 });
  const mirrors = form.frame_sequence.map((_, i) => form.frame_mirrors[i] ?? false);

  function setOffset(seqIdx: number, axis: "x" | "y", delta: number) {
    const updated = [...offsets];
    updated[seqIdx] = { ...updated[seqIdx], [axis]: updated[seqIdx][axis] + delta };
    onOffsetsChange(updated);
  }

  function toggleMirror(seqIdx: number) {
    const updated = [...mirrors];
    updated[seqIdx] = !updated[seqIdx];
    onMirrorsChange(updated);
  }

  // Find the sequence index for a given frame number
  const soloSeqIdx = soloFrame !== null ? form.frame_sequence.indexOf(soloFrame) : -1;

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <p className="text-xs text-muted-foreground">Live Preview</p>

      {/* Main animation / solo frame */}
      <div
        className="rounded-lg border border-white/[0.08] p-4"
        style={{ background: "linear-gradient(180deg, #2a3a1e, #4a6a32)" }}
      >
        <SpriteAnimator
          key={soloFrame !== null ? `solo-${soloFrame}` : `anim-${playing}`}
          src={form.sprite_path}
          grid={[form.grid_cols, form.grid_rows]}
          frames={soloFrame !== null ? [soloFrame] : (form.frame_sequence.length > 0 ? form.frame_sequence : [1])}
          frameSize={form.frame_size}
          fps={soloFrame !== null || !playing ? 0.001 : form.fps}
          loop={form.loop}
          width={displayW}
          height={displayH}
          frameOffsets={soloFrame !== null
            ? [offsets[soloSeqIdx] ?? { x: 0, y: 0 }]
            : offsets
          }
          frameMirrors={soloFrame !== null
            ? [mirrors[soloSeqIdx] ?? false]
            : mirrors
          }
        />
      </div>

      {/* Play/Pause */}
      <button
        type="button"
        onClick={() => { setPlaying(!playing); setSoloFrame(null); }}
        className="rounded-md border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 text-xs hover:bg-white/[0.08]"
      >
        {playing && soloFrame === null ? "Pause" : "Play"}
      </button>

      {/* Viewing frame indicator */}
      {soloFrame !== null && (
        <p className="text-xs text-primary">Viewing frame {soloFrame}</p>
      )}

      {/* Frame-by-frame filmstrip */}
      <div className="flex gap-1 flex-wrap justify-center">
        {Array.from({ length: totalFrames }, (_, i) => i + 1).map((frameNum) => {
          const isActive = form.frame_sequence.includes(frameNum);
          const isSolo = soloFrame === frameNum;
          const seqIdx = form.frame_sequence.indexOf(frameNum);
          const frameOffset = seqIdx >= 0 ? offsets[seqIdx] : null;
          const hasOffset = frameOffset && (frameOffset.x !== 0 || frameOffset.y !== 0);

          return (
            <div key={frameNum} className="flex flex-col items-center gap-0.5">
              <div
                onClick={() => { setSoloFrame(isSolo ? null : frameNum); setPlaying(false); }}
                className={`relative rounded border p-0.5 cursor-pointer transition-colors ${
                  isSolo
                    ? "border-primary bg-primary/20"
                    : isActive
                      ? "border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08]"
                      : "border-white/[0.06] bg-white/[0.02] opacity-40"
                }`}
                style={{ imageRendering: "pixelated" as const }}
              >
                <SpriteAnimator
                  src={form.sprite_path}
                  grid={[form.grid_cols, form.grid_rows]}
                  frames={[frameNum]}
                  frameSize={form.frame_size}
                  fps={1}
                  loop={false}
                  width={48}
                  height={48}
                  frameOffsets={frameOffset ? [frameOffset] : undefined}
                />
                <span className="absolute bottom-0 right-0.5 text-[9px] text-white/50 font-mono">
                  {frameNum}
                </span>
                {hasOffset && (
                  <span className="absolute top-0 left-0.5 text-[8px] text-primary font-mono">
                    {frameOffset.x},{frameOffset.y}
                  </span>
                )}
              </div>

              {/* Controls — show when this frame is soloed */}
              {isSolo && seqIdx >= 0 && (
                <div className="flex flex-col gap-1 items-center mt-1">
                  {/* Offset d-pad */}
                  <div className="flex flex-col gap-0.5 items-center">
                    <button type="button" onClick={() => setOffset(seqIdx, "y", -1)}
                      className="text-[10px] leading-none px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12]">
                      Y-
                    </button>
                    <div className="flex gap-0.5">
                      <button type="button" onClick={() => setOffset(seqIdx, "x", -1)}
                        className="text-[10px] leading-none px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12]">
                        X-
                      </button>
                      <span className="text-[9px] text-muted-foreground font-mono w-8 text-center">
                        {offsets[seqIdx]?.x ?? 0},{offsets[seqIdx]?.y ?? 0}
                      </span>
                      <button type="button" onClick={() => setOffset(seqIdx, "x", 1)}
                        className="text-[10px] leading-none px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12]">
                        X+
                      </button>
                    </div>
                    <button type="button" onClick={() => setOffset(seqIdx, "y", 1)}
                      className="text-[10px] leading-none px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12]">
                      Y+
                    </button>
                  </div>
                  {/* Mirror toggle */}
                  <button
                    type="button"
                    onClick={() => toggleMirror(seqIdx)}
                    className={`text-[10px] leading-none px-2 py-1 rounded transition-colors ${
                      mirrors[seqIdx]
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-white/[0.06] hover:bg-white/[0.12]"
                    }`}
                  >
                    {mirrors[seqIdx] ? "Mirrored" : "Mirror"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Click a frame to solo &amp; adjust offset</p>
    </div>
  );
}

export default function AnimationsPage() {
  const { userId } = useAuth();
  const [animations, setAnimations] = useState<SpriteAnimation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [manualBoundaries, setManualBoundaries] = useState(false);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);

  const isAdmin = userId === ADMIN_UUID;

  const fetchAnimations = useCallback(async () => {
    const res = await fetch("/api/admin/animations");
    if (res.ok) setAnimations(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchAnimations();
  }, [isAdmin, fetchAnimations]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  async function handleUpload(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      alert(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 10MB.`);
      return;
    }
    setUploading(true);
    setUploadStatus("Uploading to storage...");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/animations/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Upload failed: ${err.error}`);
        return;
      }

      setUploadStatus("Detecting frame size...");
      const { url } = await res.json();

      const img = new Image();
      img.onload = () => {
        const detectedFrameSize = Math.round(img.width / form.grid_cols);
        const totalFrames = form.grid_cols * form.grid_rows;
        const seq = Array.from({ length: totalFrames }, (_, i) => i + 1);
        setForm((f) => ({
          ...f,
          sprite_path: url,
          frame_size: detectedFrameSize,
          frame_sequence: seq,
        }));
        setUploadStatus("");
      };
      img.onerror = () => {
        setForm((f) => ({ ...f, sprite_path: url }));
        setUploadStatus("");
      };
      img.src = url;
    } finally {
      setUploading(false);
    }
  }

  async function handleProcessRaw(file: File, boundaryOffsets?: CellOffset[][]) {
    if (file.size > MAX_FILE_SIZE) {
      alert(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 10MB.`);
      return;
    }
    setUploading(true);
    setUploadStatus("Uploading raw image...");
    const startTime = Date.now();

    // Timer that updates status with elapsed time
    const timer = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      setUploadStatus((s) => {
        const base = s.replace(/ \(\d+s\)$/, "");
        return `${base} (${elapsed}s)`;
      });
    }, 1000);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("grid", `${form.grid_cols}x${form.grid_rows}`);
      formData.append("fill", "0.85");
      formData.append("threshold", "25");
      formData.append("erode", "2");
      if (boundaryOffsets) {
        formData.append("offsets", JSON.stringify(boundaryOffsets));
      }

      setUploadStatus("Removing background & normalizing...");

      const res = await fetch("/api/admin/animations/process", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Processing failed: ${err.error}`);
        return;
      }

      setUploadStatus("Loading preview...");
      const { url } = await res.json();

      // normalize-sprite.py outputs a horizontal strip with 256px cells (default --size)
      const totalFrames = form.grid_cols * form.grid_rows;
      const seq = Array.from({ length: totalFrames }, (_, i) => i + 1);
      setForm((f) => ({
        ...f,
        sprite_path: url,
        frame_size: 256,
        frame_sequence: seq,
        grid_cols: totalFrames,
        grid_rows: 1,
      }));
      setUploadStatus("");
    } finally {
      clearInterval(timer);
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.name || !form.sprite_path) {
      alert("Name and sprite path are required");
      return;
    }

    setSaving(true);
    try {
      const id = editingId ?? form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const body = { ...form, id };

      if (editingId) {
        const { id: _id, ...update } = body;
        await fetch(`/api/admin/animations/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(update),
        });
      } else {
        await fetch("/api/admin/animations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      setShowForm(false);
      setEditingId(null);
      setForm(DEFAULT_FORM);
      await fetchAnimations();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(`Delete animation "${id}"?`)) return;
    await fetch(`/api/admin/animations/${id}`, { method: "DELETE" });
    await fetchAnimations();
  }

  function startEdit(anim: SpriteAnimation) {
    setForm({
      creature_id: anim.creature_id,
      name: anim.name,
      animation_type: anim.animation_type,
      sprite_path: anim.sprite_path,
      grid_cols: anim.grid_cols,
      grid_rows: anim.grid_rows,
      frame_sequence: anim.frame_sequence,
      frame_size: anim.frame_size,
      fps: anim.fps,
      loop: anim.loop,
      display_width: anim.display_width,
      display_height: anim.display_height,
      frame_offsets: anim.frame_offsets ?? [],
      frame_mirrors: anim.frame_mirrors ?? [],
    });
    setEditingId(anim.id);
    setShowForm(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Film className="size-6" aria-hidden />
            Sprite Animations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {animations.length} animation{animations.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(DEFAULT_FORM);
            setEditingId(null);
            setShowForm(true);
          }}
        >
          <Plus className="size-4" />
          Add Animation
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingId ? "Edit" : "Add"} Animation</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <input
                  className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Tyson Idle"
                />
              </div>

              {/* Animation Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select
                  className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm"
                  value={form.animation_type}
                  onChange={(e) => setForm((f) => ({ ...f, animation_type: e.target.value }))}
                >
                  {ANIMATION_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Grid Config — BEFORE upload so raw processing uses correct grid */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Source Grid <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {([
                    [3, 3, "3x3 (9 frames)"],
                    [4, 3, "4x3 (12 frames)"],
                    [4, 4, "4x4 (16 frames)"],
                  ] as const).map(([c, r, label]) => {
                    const active = form.grid_cols === c && form.grid_rows === r;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          const total = c * r;
                          setForm((f) => ({
                            ...f,
                            grid_cols: c,
                            grid_rows: r,
                            frame_sequence: Array.from({ length: total }, (_, i) => i + 1),
                          }));
                        }}
                        className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                  <div className="flex items-center gap-1 ml-2">
                    <NumInput
                      value={form.grid_cols}
                      fallback={3}
                      min={1}
                      className="w-14"
                      onChange={(cols) => {
                        const total = cols * form.grid_rows;
                        setForm((f) => ({
                          ...f,
                          grid_cols: cols,
                          frame_sequence: Array.from({ length: total }, (_, i) => i + 1),
                        }));
                      }}
                    />
                    <span className="text-muted-foreground text-xs">x</span>
                    <NumInput
                      value={form.grid_rows}
                      fallback={3}
                      min={1}
                      className="w-14"
                      onChange={(rows) => {
                        const total = form.grid_cols * rows;
                        setForm((f) => ({
                          ...f,
                          grid_rows: rows,
                          frame_sequence: Array.from({ length: total }, (_, i) => i + 1),
                        }));
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Set this before uploading raw images</p>
              </div>

              {/* Sprite Upload */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Sprite Sheet</label>
                <div className="flex gap-2 items-center flex-wrap">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file);
                      }}
                    />
                    <span className="inline-flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm hover:bg-white/[0.08]">
                      <Upload className="size-4" />
                      {uploading ? "Processing..." : "Upload Processed PNG"}
                    </span>
                  </label>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (manualBoundaries) {
                          // Open boundary editor instead of processing immediately
                          setRawFile(file);
                          setRawImageUrl(URL.createObjectURL(file));
                        } else {
                          handleProcessRaw(file);
                        }
                      }}
                    />
                    <span className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm hover:bg-primary/20">
                      <Upload className="size-4" />
                      {uploading ? "Processing..." : "Upload Raw (auto-process)"}
                    </span>
                  </label>
                  {form.sprite_path && (
                    <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                      {form.sprite_path.split("/").pop()}
                    </span>
                  )}
                </div>
                {uploadStatus && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="size-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span className="text-sm text-primary">{uploadStatus}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  &ldquo;Processed&rdquo; = already ran normalize-sprite.py. &ldquo;Raw&rdquo; = JPG/PNG from AI Studio, will auto-remove background &amp; normalize.
                </p>
                {/* Manual boundaries checkbox */}
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="checkbox"
                    id="manual-boundaries"
                    checked={manualBoundaries}
                    onChange={(e) => {
                      setManualBoundaries(e.target.checked);
                      if (!e.target.checked) {
                        setRawFile(null);
                        if (rawImageUrl) URL.revokeObjectURL(rawImageUrl);
                        setRawImageUrl(null);
                      }
                    }}
                  />
                  <label htmlFor="manual-boundaries" className="text-sm">
                    Adjust boundaries manually before processing
                  </label>
                </div>
              </div>

              {/* Boundary Editor — shown when manual boundaries ticked + raw image selected */}
              {rawImageUrl && rawFile && (
                <div className="sm:col-span-2">
                  <BoundaryEditor
                    imageUrl={rawImageUrl}
                    cols={form.grid_cols}
                    rows={form.grid_rows}
                    onConfirm={(offsets) => {
                      URL.revokeObjectURL(rawImageUrl);
                      setRawImageUrl(null);
                      const file = rawFile;
                      setRawFile(null);
                      handleProcessRaw(file, offsets);
                    }}
                    onCancel={() => {
                      URL.revokeObjectURL(rawImageUrl);
                      setRawImageUrl(null);
                      setRawFile(null);
                    }}
                  />
                </div>
              )}

              {/* Frame Size (auto-detected, editable) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Frame Size (px, auto-detected)</label>
                <NumInput
                  value={form.frame_size}
                  fallback={256}
                  className="w-24"
                  onChange={(n) => setForm((f) => ({ ...f, frame_size: n }))}
                />
              </div>

              {/* Frame Sequence */}
              <FrameSequenceInput
                value={form.frame_sequence}
                onChange={(seq) => setForm((f) => ({ ...f, frame_sequence: seq }))}
              />

              {/* FPS + Display Size */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">FPS</label>
                <NumInput
                  value={form.fps}
                  fallback={6}
                  min={1}
                  max={30}
                  onChange={(n) => setForm((f) => ({ ...f, fps: n }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Display Size (px)</label>
                <div className="flex gap-2">
                  <NumInput
                    value={form.display_width ?? 128}
                    fallback={128}
                    onChange={(n) => setForm((f) => ({ ...f, display_width: n }))}
                  />
                  <span className="self-center text-muted-foreground">x</span>
                  <NumInput
                    value={form.display_height ?? 128}
                    fallback={128}
                    onChange={(n) => setForm((f) => ({ ...f, display_height: n }))}
                  />
                </div>
              </div>

              {/* Loop */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="loop"
                  checked={form.loop}
                  onChange={(e) => setForm((f) => ({ ...f, loop: e.target.checked }))}
                />
                <label htmlFor="loop" className="text-sm">Loop animation</label>
              </div>
            </div>

            {/* Live Preview */}
            {form.sprite_path && (
              <SpritePreview
                form={form}
                onOffsetsChange={(offsets) => setForm((f) => ({ ...f, frame_offsets: offsets }))}
                onMirrorsChange={(m) => setForm((f) => ({ ...f, frame_mirrors: m }))}
              />
            )}

            {/* Save */}
            <div className="mt-4 flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Animation List */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : animations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Film className="size-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No animations yet. Add one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {animations.map((anim) => (
            <Card key={anim.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{anim.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {anim.animation_type} &middot; {anim.grid_cols}x{anim.grid_rows} &middot; {anim.fps} FPS &middot; {anim.frame_sequence.length} frames
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Link href={`/admin/animations/${anim.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="size-3.5" />
                        Frames
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => startEdit(anim)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(anim.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Animated Preview */}
                <div className="mt-3 flex justify-center">
                  <div
                    className="rounded-lg p-3"
                    style={{ background: "linear-gradient(180deg, #2a3a1e, #4a6a32)" }}
                  >
                    <SpriteAnimator
                      src={anim.sprite_path}
                      grid={[anim.grid_cols, anim.grid_rows]}
                      frames={anim.frame_sequence}
                      frameSize={anim.frame_size}
                      fps={anim.fps}
                      loop={anim.loop}
                      width={anim.display_width ?? 96}
                      height={anim.display_height ?? 96}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

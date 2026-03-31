"use client";

import { useCallback, useRef, useState } from "react";

export interface EditableFrame {
  frameNumber: number; // 1-indexed grid position in the sprite sheet
  offset: { x: number; y: number };
  mirrored: boolean;
}

export interface SpriteAnimationData {
  id: string;
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

interface HistoryEntry {
  frames: EditableFrame[];
  selectedIndex: number;
}

const MAX_HISTORY = 50;

function animationToFrames(anim: SpriteAnimationData): EditableFrame[] {
  return anim.frame_sequence.map((frameNum, i) => ({
    frameNumber: frameNum,
    offset: anim.frame_offsets[i] ?? { x: 0, y: 0 },
    mirrored: anim.frame_mirrors[i] ?? false,
  }));
}

export function useFrameEditor(animation: SpriteAnimationData) {
  const [frames, setFrames] = useState<EditableFrame[]>(() =>
    animationToFrames(animation),
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoom, setZoom] = useState(2);
  const [showOnionSkin, setShowOnionSkin] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [fps, setFps] = useState(animation.fps);

  // Saved state for dirty detection and reset
  const savedFrames = useRef<EditableFrame[]>(animationToFrames(animation));

  // Undo/redo stacks
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);

  const pushHistory = useCallback(
    (currentFrames: EditableFrame[], currentIndex: number) => {
      undoStack.current = [
        ...undoStack.current.slice(-MAX_HISTORY + 1),
        { frames: currentFrames.map((f) => ({ ...f, offset: { ...f.offset } })), selectedIndex: currentIndex },
      ];
      redoStack.current = [];
    },
    [],
  );

  const selectedFrame = frames[selectedIndex] ?? null;

  // --- Frame selection ---
  const selectFrame = useCallback((index: number) => {
    setSelectedIndex(Math.max(0, Math.min(index, frames.length - 1)));
  }, [frames.length]);

  // --- Offset ---
  const moveOffset = useCallback(
    (dx: number, dy: number) => {
      setFrames((prev) => {
        pushHistory(prev, selectedIndex);
        return prev.map((f, i) =>
          i === selectedIndex
            ? { ...f, offset: { x: f.offset.x + dx, y: f.offset.y + dy } }
            : f,
        );
      });
    },
    [selectedIndex, pushHistory],
  );

  // --- Mirror ---
  const toggleMirror = useCallback(() => {
    setFrames((prev) => {
      pushHistory(prev, selectedIndex);
      return prev.map((f, i) =>
        i === selectedIndex ? { ...f, mirrored: !f.mirrored } : f,
      );
    });
  }, [selectedIndex, pushHistory]);

  // --- Reorder ---
  const reorderFrames = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      setFrames((prev) => {
        pushHistory(prev, selectedIndex);
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
      // Keep selection on the moved frame
      setSelectedIndex(toIndex);
    },
    [selectedIndex, pushHistory],
  );

  // --- Duplicate ---
  const duplicateFrame = useCallback(() => {
    setFrames((prev) => {
      pushHistory(prev, selectedIndex);
      const frame = prev[selectedIndex];
      if (!frame) return prev;
      const copy = { ...frame, offset: { ...frame.offset } };
      const next = [...prev];
      next.splice(selectedIndex + 1, 0, copy);
      return next;
    });
    setSelectedIndex((i) => i + 1);
  }, [selectedIndex, pushHistory]);

  // --- Delete ---
  const deleteFrame = useCallback(() => {
    setFrames((prev) => {
      if (prev.length <= 1) return prev; // Don't delete the last frame
      pushHistory(prev, selectedIndex);
      const next = prev.filter((_, i) => i !== selectedIndex);
      return next;
    });
    setSelectedIndex((i) => Math.min(i, frames.length - 2));
  }, [selectedIndex, frames.length, pushHistory]);

  // --- Insert blank/duplicate at position ---
  const insertFrame = useCallback(
    (afterIndex: number, frameNumber?: number) => {
      setFrames((prev) => {
        pushHistory(prev, selectedIndex);
        const newFrame: EditableFrame = {
          frameNumber: frameNumber ?? (prev[afterIndex]?.frameNumber ?? 1),
          offset: { x: 0, y: 0 },
          mirrored: false,
        };
        const next = [...prev];
        next.splice(afterIndex + 1, 0, newFrame);
        return next;
      });
      setSelectedIndex(afterIndex + 1);
    },
    [selectedIndex, pushHistory],
  );

  // --- Undo ---
  const undo = useCallback(() => {
    const entry = undoStack.current.pop();
    if (!entry) return;
    setFrames((currentFrames) => {
      redoStack.current.push({
        frames: currentFrames.map((f) => ({ ...f, offset: { ...f.offset } })),
        selectedIndex,
      });
      return entry.frames;
    });
    setSelectedIndex(entry.selectedIndex);
  }, [selectedIndex]);

  // --- Redo ---
  const redo = useCallback(() => {
    const entry = redoStack.current.pop();
    if (!entry) return;
    setFrames((currentFrames) => {
      undoStack.current.push({
        frames: currentFrames.map((f) => ({ ...f, offset: { ...f.offset } })),
        selectedIndex,
      });
      return entry.frames;
    });
    setSelectedIndex(entry.selectedIndex);
  }, [selectedIndex]);

  // --- Dirty detection ---
  const isDirty =
    JSON.stringify(frames) !== JSON.stringify(savedFrames.current) ||
    fps !== animation.fps;

  // --- Reset ---
  const resetToSaved = useCallback(() => {
    const original = animationToFrames(animation);
    setFrames(original);
    setSelectedIndex(0);
    setFps(animation.fps);
    undoStack.current = [];
    redoStack.current = [];
  }, [animation]);

  // --- Save payload ---
  const getUpdatePayload = useCallback(() => {
    return {
      frame_sequence: frames.map((f) => f.frameNumber),
      frame_offsets: frames.map((f) => f.offset),
      frame_mirrors: frames.map((f) => f.mirrored),
      fps,
    };
  }, [frames, fps]);

  // Update saved reference after successful save
  const markSaved = useCallback(() => {
    savedFrames.current = frames.map((f) => ({ ...f, offset: { ...f.offset } }));
  }, [frames]);

  return {
    // State
    frames,
    selectedIndex,
    selectedFrame,
    zoom,
    showOnionSkin,
    showGrid,
    fps,
    isDirty,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    animation,

    // Frame ops
    selectFrame,
    moveOffset,
    toggleMirror,
    reorderFrames,
    duplicateFrame,
    deleteFrame,
    insertFrame,

    // View controls
    setZoom,
    setFps,
    toggleOnionSkin: () => setShowOnionSkin((v) => !v),
    toggleGrid: () => setShowGrid((v) => !v),

    // History
    undo,
    redo,

    // Persistence
    getUpdatePayload,
    resetToSaved,
    markSaved,
  };
}

export type FrameEditor = ReturnType<typeof useFrameEditor>;

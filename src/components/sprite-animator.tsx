"use client";

import { useEffect, useRef, useState } from "react";

export interface FrameOffset {
  x: number;
  y: number;
}

interface SpriteAnimatorProps {
  /** Path to the sprite sheet image */
  src: string;
  /** Grid dimensions: [columns, rows] */
  grid: [number, number];
  /** 1-indexed frame numbers to cycle through */
  frames: number[];
  /** Pixel size of each frame (square) */
  frameSize: number;
  /** Frames per second (default 6) */
  fps?: number;
  /** Loop the animation (default true) */
  loop?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Display width in pixels (scales from frameSize) */
  width?: number;
  /** Display height in pixels (scales from frameSize) */
  height?: number;
  /** Per-frame pixel offsets, indexed by position in `frames` array */
  frameOffsets?: FrameOffset[];
  /** Per-frame horizontal mirror flags, indexed by position in `frames` array */
  frameMirrors?: boolean[];
}

export function SpriteAnimator({
  src,
  grid,
  frames,
  frameSize,
  fps = 6,
  loop = true,
  className,
  width,
  height,
  frameOffsets,
  frameMirrors,
}: SpriteAnimatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cols, rows] = grid;
  const displayWidth = width ?? frameSize;
  const displayHeight = height ?? frameSize;

  useEffect(() => {
    if (frames.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= frames.length) {
          return loop ? 0 : prev;
        }
        return next;
      });
    }, 1000 / fps);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [frames.length, fps, loop]);

  const frameNumber = frames[currentIndex] ?? 1;
  const col = (frameNumber - 1) % cols;
  const row = Math.floor((frameNumber - 1) / cols);

  const offset = frameOffsets?.[currentIndex] ?? { x: 0, y: 0 };
  const mirrored = frameMirrors?.[currentIndex] ?? false;
  const bgX = -(col * displayWidth) + offset.x;
  const bgY = -(row * displayHeight) + offset.y;

  return (
    <div
      className={className}
      style={{
        width: displayWidth,
        height: displayHeight,
        backgroundImage: `url(${src})`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundSize: `${cols * displayWidth}px ${rows * displayHeight}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        transform: mirrored ? "scaleX(-1)" : undefined,
      }}
    />
  );
}

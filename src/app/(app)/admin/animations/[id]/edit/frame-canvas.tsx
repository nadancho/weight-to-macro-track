"use client";

import { useCallback, useEffect, useRef } from "react";
import type { EditableFrame, SpriteAnimationData } from "./use-frame-editor";

interface FrameCanvasProps {
  animation: SpriteAnimationData;
  frame: EditableFrame | null;
  previousFrame: EditableFrame | null;
  zoom: number;
  showGrid: boolean;
  showOnionSkin: boolean;
  onZoomChange: (zoom: number) => void;
}

const CHECKERBOARD_SIZE = 8; // px per checker square (before zoom)
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

export function FrameCanvas({
  animation,
  frame,
  previousFrame,
  zoom,
  showGrid,
  showOnionSkin,
  onZoomChange,
}: FrameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteImageRef = useRef<HTMLImageElement | null>(null);
  const imageLoadedRef = useRef(false);

  const frameSize = animation.frame_size;
  const canvasSize = frameSize * zoom;

  // Load the sprite sheet image once
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      spriteImageRef.current = img;
      imageLoadedRef.current = true;
      draw();
    };
    img.src = animation.sprite_path;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animation.sprite_path]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !frame) return;

    const img = spriteImageRef.current;
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // 1. Checkerboard background
    drawCheckerboard(ctx, canvasSize, zoom);

    // 2. Onion skin (previous frame at 30% opacity)
    if (showOnionSkin && previousFrame && img && imageLoadedRef.current) {
      ctx.globalAlpha = 0.3;
      drawFrame(ctx, img, previousFrame, animation, zoom, frameSize, canvasSize);
      ctx.globalAlpha = 1.0;
    }

    // 3. Current frame
    if (img && imageLoadedRef.current) {
      drawFrame(ctx, img, frame, animation, zoom, frameSize, canvasSize);
    }

    // 4. Grid overlay
    if (showGrid) {
      drawGrid(ctx, canvasSize, zoom);
    }
  }, [canvasSize, frame, previousFrame, animation, zoom, frameSize, showGrid, showOnionSkin]);

  // Redraw when dependencies change
  useEffect(() => {
    draw();
  }, [draw]);

  // Mouse wheel for zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1 : -1;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
      onZoomChange(newZoom);
    },
    [zoom, onZoomChange],
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        onWheel={handleWheel}
        className="rounded-lg border border-white/[0.12] cursor-crosshair"
        style={{
          width: Math.min(canvasSize, 512),
          height: Math.min(canvasSize, 512),
          imageRendering: "pixelated",
        }}
      />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <button
          onClick={() => onZoomChange(Math.max(MIN_ZOOM, zoom - 1))}
          className="rounded bg-white/[0.06] px-2 py-1 hover:bg-white/[0.12]"
          disabled={zoom <= MIN_ZOOM}
        >
          −
        </button>
        <span className="w-10 text-center">{zoom}x</span>
        <button
          onClick={() => onZoomChange(Math.min(MAX_ZOOM, zoom + 1))}
          className="rounded bg-white/[0.06] px-2 py-1 hover:bg-white/[0.12]"
          disabled={zoom >= MAX_ZOOM}
        >
          +
        </button>
      </div>
    </div>
  );
}

// --- Drawing helpers ---

function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  size: number,
  zoom: number,
) {
  const step = CHECKERBOARD_SIZE * zoom;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const isLight =
        (Math.floor(x / step) + Math.floor(y / step)) % 2 === 0;
      ctx.fillStyle = isLight ? "#3a3a3a" : "#2a2a2a";
      ctx.fillRect(x, y, step, step);
    }
  }
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  frame: EditableFrame,
  animation: SpriteAnimationData,
  zoom: number,
  frameSize: number,
  canvasSize: number,
) {
  const col = (frame.frameNumber - 1) % animation.grid_cols;
  const row = Math.floor((frame.frameNumber - 1) / animation.grid_cols);
  const sx = col * frameSize;
  const sy = row * frameSize;

  ctx.save();

  if (frame.mirrored) {
    ctx.translate(canvasSize, 0);
    ctx.scale(-1, 1);
  }

  // Apply offset (scaled by zoom)
  const ox = frame.offset.x * zoom;
  const oy = frame.offset.y * zoom;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    img,
    sx,
    sy,
    frameSize,
    frameSize,
    ox,
    oy,
    canvasSize,
    canvasSize,
  );

  ctx.restore();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  canvasSize: number,
  zoom: number,
) {
  // Only draw pixel grid at zoom >= 4 to avoid visual noise
  if (zoom < 4) return;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 0.5;

  const step = zoom; // 1 pixel = zoom canvas pixels
  for (let x = 0; x <= canvasSize; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasSize);
    ctx.stroke();
  }
  for (let y = 0; y <= canvasSize; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasSize, y);
    ctx.stroke();
  }
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw, X } from "lucide-react";

// --- Types ---

export interface CellOffset {
  dx: number;
  dy: number;
}

interface BoundaryEditorProps {
  /** Object URL of the raw image file */
  imageUrl: string;
  cols: number;
  rows: number;
  onConfirm: (offsets: CellOffset[][]) => void;
  onCancel: () => void;
}

// --- Component ---

export function BoundaryEditor({
  imageUrl,
  cols,
  rows,
  onConfirm,
  onCancel,
}: BoundaryEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null); // [col, row]
  const [stepSize, setStepSize] = useState<1 | 5 | 10>(5);
  const [offsets, setOffsets] = useState<CellOffset[][]>(() =>
    Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ dx: 0, dy: 0 })),
    ),
  );

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Reset offsets when grid changes
  useEffect(() => {
    setOffsets(
      Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({ dx: 0, dy: 0 })),
      ),
    );
    setSelectedCell(null);
  }, [cols, rows]);

  // Cell dimensions in source image pixels
  const cellW = imgRef.current ? imgRef.current.width / cols : 0;
  const cellH = imgRef.current ? imgRef.current.height / rows : 0;

  // Draw main canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.clientWidth;
    const displayH = Math.round(displayW * (img.height / img.width));

    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.height = `${displayH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    // Draw image
    ctx.drawImage(img, 0, 0, displayW, displayH);

    const scaleX = displayW / img.width;
    const scaleY = displayH / img.height;

    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let c = 1; c < cols; c++) {
      const x = Math.round(c * cellW * scaleX);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, displayH);
      ctx.stroke();
    }
    for (let r = 1; r < rows; r++) {
      const y = Math.round(r * cellH * scaleY);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(displayW, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw offset indicators for non-zero cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const o = offsets[r][c];
        if (o.dx === 0 && o.dy === 0) continue;

        const x = (c * cellW + o.dx) * scaleX;
        const y = (r * cellH + o.dy) * scaleY;
        const w = cellW * scaleX;
        const h = cellH * scaleY;

        ctx.strokeStyle = "rgba(59, 130, 246, 0.6)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
      }
    }

    // Highlight selected cell
    if (selectedCell) {
      const [sc, sr] = selectedCell;
      const o = offsets[sr][sc];
      const x = (sc * cellW + o.dx) * scaleX;
      const y = (sr * cellH + o.dy) * scaleY;
      const w = cellW * scaleX;
      const h = cellH * scaleY;

      ctx.fillStyle = "rgba(234, 179, 8, 0.15)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgba(234, 179, 8, 0.8)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    }
  }, [imgLoaded, cols, rows, cellW, cellH, offsets, selectedCell]);

  useEffect(() => { draw(); }, [draw]);

  // Draw mini preview of selected cell
  useEffect(() => {
    const previewCanvas = previewCanvasRef.current;
    const img = imgRef.current;
    if (!previewCanvas || !img || !selectedCell) return;

    const [sc, sr] = selectedCell;
    const o = offsets[sr][sc];
    const sx = sc * cellW + o.dx;
    const sy = sr * cellH + o.dy;

    const size = 128;
    const dpr = window.devicePixelRatio || 1;
    previewCanvas.width = size * dpr;
    previewCanvas.height = size * dpr;
    previewCanvas.style.width = `${size}px`;
    previewCanvas.style.height = `${size}px`;

    const ctx = previewCanvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    // Checkerboard background
    const tileSize = 8;
    for (let ty = 0; ty < size; ty += tileSize) {
      for (let tx = 0; tx < size; tx += tileSize) {
        ctx.fillStyle = ((tx / tileSize + ty / tileSize) % 2 === 0) ? "#2a2a2a" : "#1a1a1a";
        ctx.fillRect(tx, ty, tileSize, tileSize);
      }
    }

    // Draw cropped cell
    ctx.drawImage(img, sx, sy, cellW, cellH, 0, 0, size, size);
  }, [selectedCell, offsets, cellW, cellH, imgLoaded]);

  // Handle canvas click to select cell
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scaleX = canvas.clientWidth / img.width;
    const scaleY = (canvas.clientHeight) / img.height;

    const imgX = clickX / scaleX;
    const imgY = clickY / scaleY;

    const col = Math.min(Math.floor(imgX / cellW), cols - 1);
    const row = Math.min(Math.floor(imgY / cellH), rows - 1);

    setSelectedCell([col, row]);
  }

  // Adjust offset for selected cell
  function adjustOffset(axis: "dx" | "dy", delta: number) {
    if (!selectedCell) return;
    const [sc, sr] = selectedCell;
    setOffsets((prev) => {
      const next = prev.map((row) => row.map((c) => ({ ...c })));
      next[sr][sc][axis] += delta;
      return next;
    });
  }

  function resetCell() {
    if (!selectedCell) return;
    const [sc, sr] = selectedCell;
    setOffsets((prev) => {
      const next = prev.map((row) => row.map((c) => ({ ...c })));
      next[sr][sc] = { dx: 0, dy: 0 };
      return next;
    });
  }

  function resetAll() {
    setOffsets(
      Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({ dx: 0, dy: 0 })),
      ),
    );
  }

  const hasAnyOffsets = offsets.some((row) => row.some((c) => c.dx !== 0 || c.dy !== 0));
  const currentOffset = selectedCell ? offsets[selectedCell[1]][selectedCell[0]] : null;

  if (!imgLoaded) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading image...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Adjust Frame Boundaries</h3>
        <p className="text-xs text-muted-foreground">
          Click a cell to select, then adjust its crop offset
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Main canvas */}
        <div className="flex-1 min-w-0">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full cursor-crosshair rounded-lg border border-white/[0.08]"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        {/* Controls panel */}
        <div className="lg:w-56 shrink-0 flex flex-col gap-3">
          {selectedCell ? (
            <>
              {/* Cell label */}
              <div className="text-center">
                <span className="text-xs text-muted-foreground">Cell </span>
                <span className="font-mono text-sm font-medium">
                  [{selectedCell[0]}, {selectedCell[1]}]
                </span>
              </div>

              {/* Mini preview */}
              <div className="flex justify-center">
                <canvas
                  ref={previewCanvasRef}
                  className="rounded-lg border border-white/[0.08]"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>

              {/* Offset display */}
              <div className="text-center font-mono text-xs text-muted-foreground">
                dx: {currentOffset!.dx > 0 ? "+" : ""}{currentOffset!.dx},
                dy: {currentOffset!.dy > 0 ? "+" : ""}{currentOffset!.dy}
              </div>

              {/* D-pad */}
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustOffset("dy", -stepSize)}
                  className="min-h-[44px] min-w-[44px] rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-sm font-mono"
                >
                  Y-{stepSize}
                </button>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => adjustOffset("dx", -stepSize)}
                    className="min-h-[44px] min-w-[44px] rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-sm font-mono"
                  >
                    X-{stepSize}
                  </button>
                  <button
                    type="button"
                    onClick={resetCell}
                    className="min-h-[44px] min-w-[44px] rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustOffset("dx", stepSize)}
                    className="min-h-[44px] min-w-[44px] rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-sm font-mono"
                  >
                    X+{stepSize}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => adjustOffset("dy", stepSize)}
                  className="min-h-[44px] min-w-[44px] rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-sm font-mono"
                >
                  Y+{stepSize}
                </button>
              </div>

              {/* Step size selector */}
              <div className="flex justify-center gap-1">
                {([1, 5, 10] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStepSize(s)}
                    className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition-colors ${
                      stepSize === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/[0.06] hover:bg-white/[0.12]"
                    }`}
                  >
                    {s}px
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Click a cell on the image to select it
            </p>
          )}

          {/* Reset all */}
          {hasAnyOffsets && (
            <button
              type="button"
              onClick={resetAll}
              className="flex items-center justify-center gap-1.5 min-h-[36px] rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs text-muted-foreground"
            >
              <RotateCcw className="size-3" />
              Reset all offsets
            </button>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          <X className="size-4" />
          Cancel
        </Button>
        <Button onClick={() => onConfirm(offsets)}>
          <Check className="size-4" />
          Process with boundaries
        </Button>
      </div>
    </div>
  );
}

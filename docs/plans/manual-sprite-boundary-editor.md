# Manual Sprite Boundary Editor

## Context

When uploading raw AI-generated sprite sheets, the auto-processing (`normalize-sprite.py`) splits frames using either pixel-gap detection or equal grid division. Both assume a perfectly uniform grid. In practice, AI-generated art often has slightly irregular spacing, padding, or overlapping characters — causing misaligned frame crops.

This feature adds an optional **manual boundary adjustment step** between uploading a raw image and processing it. The admin sees the image with a grid overlay matching the configured cols×rows, can click any cell to select it, and adjust its crop region via ±x/±y offset controls. Each cell's offset is independent — overlapping crops are allowed (the frame editor's existing per-frame eraser/offset tools handle cleanup later).

## UI Flow

1. Admin sets grid (e.g. 4×3) as usual
2. Ticks a new **"Adjust boundaries manually"** checkbox
3. Selects a raw image file → instead of immediately calling `/api/admin/animations/process`, the image loads into a **BoundaryEditor** component
4. The editor shows:
   - **Left/main area:** The full raw image on a `<canvas>` with the grid lines overlaid. Clicking a cell highlights it (colored border). Zoom via mouse wheel / pinch.
   - **Right/bottom panel:** The selected cell's controls:
     - Cell label: `[col, row]` (e.g. `[2, 1]`)
     - Four offset buttons: `-X`, `+X`, `-Y`, `+Y` with current offset values displayed
     - A **mini preview** of the cropped cell at the current offsets
     - Step size toggle (1px, 5px, 10px) for coarse/fine adjustment
5. When satisfied, admin clicks **"Process with boundaries"** → sends the raw image + the 2D offset array to the backend
6. Backend passes boundaries to `normalize-sprite.py` (new `--offsets` flag) → each cell is cropped at `(base_x + offset_x, base_y + offset_y, cell_w, cell_h)` instead of the mechanical equal-split
7. The rest of the flow continues as normal (bg removal, normalize, upload strip, populate form)

## Data Model

```ts
// Per-cell boundary offset — deviations from the equal-grid baseline
interface CellOffset {
  dx: number; // pixels to shift crop region horizontally (+ = right)
  dy: number; // pixels to shift crop region vertically (+ = down)
}

// 2D array: offsets[row][col]
type BoundaryOffsets = CellOffset[][];
```

The **baseline** is always the equal-grid split: `cell_w = img_width / cols`, `cell_h = img_height / rows`. Offsets shift each cell's crop origin from that baseline. A cell at `[col, row]` with offset `{dx: 5, dy: -3}` crops from `(col * cell_w + 5, row * cell_h - 3, cell_w, cell_h)`.

## Files to create

| File | Purpose |
|---|---|
| `src/components/boundary-editor.tsx` | Canvas-based grid overlay with per-cell offset controls |

## Files to modify

| File | Change |
|---|---|
| `src/app/(app)/admin/animations/page.tsx` | Add checkbox, rawFile state, BoundaryEditor integration, pass offsets to process |
| `src/app/api/admin/animations/process/route.ts` | Forward `offsets` param to normalize-sprite.py |
| `scripts/normalize-sprite.py` | Add `--offsets` argument, apply per-cell crop shifts in grid mode |

## Verification

1. Upload a raw sprite sheet without the checkbox → current auto-process flow works unchanged
2. Tick "Adjust boundaries manually" → upload same image → BoundaryEditor appears
3. Click a cell → it highlights, controls panel shows
4. Adjust ±X/±Y → grid overlay updates in real-time, mini preview shows the adjusted crop
5. Click "Process with boundaries" → normalize-sprite.py receives offsets, processes correctly
6. Resulting sprite strip has properly aligned frames
7. `pnpm build` passes

## Worktree

Recommended — touches Python script, API route, admin page, and a new component.

# Sprite Frame Editor — Feature Plan

## Context

The current admin tool at `/admin/animations` handles sprite sheet upload, processing, and registration with per-frame offsets and mirroring. But editing individual frames requires re-generating the entire sheet in AI Studio. A dedicated frame editor would let Nathan fine-tune animations without leaving the browser.

## Current State (what exists)

- `sprite_animations` table with frame_sequence, frame_offsets, frame_mirrors
- `SpriteAnimator` component supports offsets and mirrors per-frame
- `normalize-sprite.py` processes raw AI output into clean strips
- Admin page at `/admin/animations` with filmstrip preview, solo frame view, offset d-pad, mirror toggle
- Sprites stored in Supabase Storage `sprites` bucket

## Proposed: Frame Editor Page

New page at `/admin/animations/[id]/edit` — a canvas-based editor for fine-tuning individual frames of a registered animation.

### Core Features

#### 1. Frame Canvas View
- Large canvas (512x512) showing the selected frame at high zoom
- Checkerboard transparency background
- Grid overlay toggle showing pixel boundaries
- Zoom in/out (mouse wheel or buttons)

#### 2. Frame Strip (bottom)
- Horizontal scrollable strip of all frames (like current filmstrip but larger)
- Click to select, drag to reorder
- Active frame highlighted
- Onion skin toggle: show previous frame at 30% opacity behind current frame

#### 3. Per-Frame Tools
- **Move**: drag the character within the frame (updates frame_offsets)
- **Mirror**: flip horizontal (updates frame_mirrors)
- **Crop/Recenter**: auto-detect bounding box and recenter in cell
- **Delete frame**: remove from sequence
- **Duplicate frame**: copy to create held poses
- **Insert frame**: add a blank or duplicated frame at position

#### 4. Frame Sequence Editor
- Drag-and-drop reorder
- Visual timeline showing frame duration at current FPS
- Click to insert duplicate frames (for held poses like idle breathing)
- Keyboard shortcuts: arrow keys to navigate, D to duplicate, Delete to remove, M to mirror

#### 5. Playback Preview
- Side panel or top panel with animated preview at actual display size
- Play/pause, FPS adjustment, loop toggle
- A/B comparison: toggle between saved and edited state

#### 6. Import Individual Frames
- Upload single PNG images as individual frames
- Useful when AI generates good standalone poses but bad sheets
- Auto-sizes and centers to match existing frame dimensions

### Architecture

```
/admin/animations/[id]/edit (page.tsx)
├── FrameCanvas — HTML5 Canvas, handles zoom/pan/pixel grid
├── FrameStrip — horizontal frame list with drag-and-drop (use @dnd-kit or native drag)
├── ToolPanel — move/mirror/crop/delete controls
├── PlaybackPreview — small SpriteAnimator with controls
└── useFrameEditor hook — manages edit state, undo/redo stack
```

#### State Management
```typescript
interface FrameEditorState {
  animationId: string;
  frames: EditableFrame[];      // ordered list
  selectedIndex: number;
  zoom: number;
  showOnionSkin: boolean;
  showGrid: boolean;
  undoStack: FrameEditorState[];
  redoStack: FrameEditorState[];
}

interface EditableFrame {
  frameNumber: number;          // original grid position in sprite sheet
  offset: { x: number; y: number };
  mirrored: boolean;
  // Future: per-frame image data for pixel editing
}
```

#### Save Flow
- Editor modifies `frame_sequence`, `frame_offsets`, `frame_mirrors` in memory
- "Save" button PATCHes `/api/admin/animations/[id]` with updated arrays
- No image manipulation needed — all edits are metadata on top of the existing sprite sheet
- Future: if pixel editing is added, save modified frames back to a new sprite sheet PNG

### Dependencies

- No new npm packages required for v1 (Canvas API is native)
- `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop frame reorder (optional, can use native HTML drag)
- Existing: `SpriteAnimator`, admin auth pattern, Supabase Storage

### Implementation Steps

1. **Create the page route** — `/admin/animations/[id]/edit/page.tsx`, fetch animation data on load
2. **Build FrameStrip** — render all frames from the sprite sheet as clickable thumbnails, highlight selected
3. **Build FrameCanvas** — HTML5 Canvas rendering the selected frame at zoom, with checkerboard bg
4. **Add offset/mirror controls** — reuse the d-pad pattern from the current admin page but larger, with keyboard shortcuts
5. **Add drag-and-drop reorder** — frame strip becomes sortable
6. **Add onion skinning** — overlay previous frame at low opacity on the canvas
7. **Add undo/redo** — state stack with Ctrl+Z / Ctrl+Shift+Z
8. **Add playback preview** — small SpriteAnimator panel showing the result in real-time
9. **Add save** — PATCH endpoint with the modified arrays
10. **Add frame import** — upload single PNG, add to strip at position
11. **Link from admin list** — "Edit" button on each animation card goes to `/admin/animations/[id]/edit`

### Verification

1. Navigate to `/admin/animations` → click "Edit" on an animation
2. Editor loads with all frames visible in strip
3. Click frame → shows in canvas at zoom
4. Adjust offset with d-pad or drag → preview updates in real-time
5. Mirror a frame → preview shows flipped
6. Reorder frames by drag → sequence updates
7. Toggle onion skin → previous frame visible
8. Save → animation plays with edits in the admin list
9. Undo/redo works across all operations

### Future Extensions (not in v1)

- **Pixel drawing**: paint on individual frames (requires generating new sprite sheet PNGs)
- **Auto-tween**: given keyframes, interpolate intermediate positions
- **Hitbox editor**: define collision/interaction regions per frame
- **Export**: download the animation as GIF or APNG for sharing
- **Batch offset**: apply same offset to a range of frames
- **Timeline view**: horizontal timeline with frame duration bars instead of fixed-width strips

#!/usr/bin/env python3
"""
Normalize AI-generated sprite sheets into clean, grid-aligned strips.

Takes a messy sprite image from AI generation (Gemini, etc.) and produces
a perfectly gridded horizontal strip with transparent background, suitable
for use with SpriteAnimator.

Usage:
  python3 scripts/normalize-sprite.py input.png output.png
  python3 scripts/normalize-sprite.py input.png output.png --frames 12
  python3 scripts/normalize-sprite.py input.png output.png --frames 12 --size 256
  python3 scripts/normalize-sprite.py input.png output.png --frames 12 --equal-split
  python3 scripts/normalize-sprite.py input.png output.png --frames 12 --debug
  python3 scripts/normalize-sprite.py input.png output.png --frames 12 --threshold 30
  python3 scripts/normalize-sprite.py input.png output.png --frames 12 --grid 4x3

Pipeline:
  1. Detect and remove flat background color (sampled from corners)
  2. Detect individual frames (auto-detect gaps or equal-split)
  3. Crop each frame to its bounding box
  4. Center horizontally, bottom-anchor vertically in clean cells
  5. Reassemble into a perfect horizontal strip with transparency
"""

import argparse
import math
import sys
from PIL import Image, ImageDraw


def color_distance(c1, c2):
    """Euclidean distance in RGB space, normalized to 0-100."""
    d = math.sqrt(sum((a - b) ** 2 for a, b in zip(c1[:3], c2[:3])))
    return (d / math.sqrt(255 ** 2 * 3)) * 100


def detect_bg_color(img):
    """Sample corner pixels to detect the background color."""
    pixels = img.load()
    w, h = img.size
    margin = max(2, min(w, h) // 50)
    samples = []
    for x in (margin, w - 1 - margin):
        for y in (margin, h - 1 - margin):
            samples.append(pixels[x, y][:3])
    r = sum(c[0] for c in samples) // len(samples)
    g = sum(c[1] for c in samples) // len(samples)
    b = sum(c[2] for c in samples) // len(samples)
    return (r, g, b)


def remove_background(img, bg_color, threshold, smooth=5.0, erode=2):
    """Flood-fill from edges to remove background. Only removes pixels
    that are both similar to bg_color AND connected to the image border.
    This protects interior pixels (like a cream belly) even if they're
    a similar color to a white background."""
    from collections import deque

    img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size

    # Flood fill from all edges
    visited = {}
    queue = deque()

    # Seed all border pixels
    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(1, h - 1):
        queue.append((0, y))
        queue.append((w - 1, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in visited:
            continue
        if x < 0 or x >= w or y < 0 or y >= h:
            continue

        r, g, b, a = pixels[x, y]
        dist = color_distance((r, g, b), bg_color)
        visited[(x, y)] = dist

        # Only spread through pixels within threshold
        if dist <= threshold:
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                    queue.append((nx, ny))

    # Apply transparency only to flood-filled pixels
    inner_threshold = max(0, threshold - smooth)

    for (x, y), dist in visited.items():
        if dist > threshold:
            continue
        r, g, b, a = pixels[x, y]
        if dist <= inner_threshold:
            pixels[x, y] = (0, 0, 0, 0)
        else:
            # Smooth edge transition
            t = (dist - inner_threshold) / smooth
            new_alpha = int(min(1.0, t) * 255)
            # Despill: remove bg color contribution from semi-transparent pixels
            if new_alpha > 0:
                alpha_f = new_alpha / 255.0
                inv_alpha = 1.0 - alpha_f
                kr, kg, kb = bg_color
                nr = max(0, min(255, int((r - kr * inv_alpha) / alpha_f)))
                ng = max(0, min(255, int((g - kg * inv_alpha) / alpha_f)))
                nb = max(0, min(255, int((b - kb * inv_alpha) / alpha_f)))
                pixels[x, y] = (nr, ng, nb, new_alpha)
            else:
                pixels[x, y] = (0, 0, 0, 0)

    # Pixel erosion: shave off the outermost N layers of visible pixels.
    # This removes the JPEG anti-aliasing halo that sits just outside
    # the character's black outline. The outline is 2-3px thick, so
    # eroding 1-2px strips the halo without damaging the character.
    for _pass in range(erode):
        to_remove = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = pixels[x, y]
                if a == 0:
                    continue
                # If this pixel touches any transparent pixel, it's on the edge
                for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    nx, ny = x + dx, y + dy
                    if nx < 0 or nx >= w or ny < 0 or ny >= h:
                        to_remove.append((x, y))
                        break
                    elif pixels[nx, ny][3] == 0:
                        to_remove.append((x, y))
                        break

        if not to_remove:
            break
        for (x, y) in to_remove:
            pixels[x, y] = (0, 0, 0, 0)
        print(f"  Erode pass {_pass + 1}: removed {len(to_remove)} edge pixels")

    # Stray bright pixel cleanup: remove any remaining near-white pixel
    # that touches at least one transparent pixel. These are JPEG artifact
    # specks that survived flood-fill by sitting just inside the outline.
    # We use a tighter color threshold than the main removal to avoid
    # touching the cream belly (which is surrounded by opaque pixels and
    # won't touch transparent).
    # Multiple passes since removing strays can expose new edge-touching strays.
    BRIGHT_THRESHOLD = 20
    for _pass in range(3):
        stray_removed = 0
        for y in range(h):
            for x in range(w):
                r, g, b, a = pixels[x, y]
                if a == 0:
                    continue
                dist = color_distance((r, g, b), bg_color)
                if dist > BRIGHT_THRESHOLD:
                    continue
                # If this bright pixel touches ANY transparent pixel, remove it
                touches_transparent = False
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        if dx == 0 and dy == 0:
                            continue
                        nx, ny = x + dx, y + dy
                        if nx < 0 or nx >= w or ny < 0 or ny >= h:
                            touches_transparent = True
                            break
                        elif pixels[nx, ny][3] == 0:
                            touches_transparent = True
                            break
                    if touches_transparent:
                        break
                if touches_transparent:
                    pixels[x, y] = (0, 0, 0, 0)
                    stray_removed += 1
        if stray_removed == 0:
            break
        print(f"  Stray bright cleanup pass {_pass + 1}: removed {stray_removed} pixels")

    return img


def is_column_empty(img, x, threshold=5):
    """Check if a column is mostly transparent (background-removed)."""
    pixels = img.load()
    h = img.size[1]
    opaque = 0
    for y in range(h):
        if pixels[x, y][3] > 30:
            opaque += 1
    return opaque < (h * threshold / 100)


def auto_detect_frames(img, expected_count=None):
    """Detect frame boundaries by finding empty column gaps."""
    w, h = img.size
    regions = []
    in_region = False
    start = 0

    for x in range(w):
        empty = is_column_empty(img, x)
        if not empty and not in_region:
            start = x
            in_region = True
        elif empty and in_region:
            # Only register regions above a minimum width
            if x - start > w * 0.02:
                regions.append((start, x))
            in_region = False

    if in_region:
        if w - start > w * 0.02:
            regions.append((start, w))

    # If we detected more regions than expected, merge small gaps
    if expected_count and len(regions) > expected_count:
        regions = merge_close_regions(regions, expected_count, w)

    # If we detected fewer than expected, fall back to equal split
    if expected_count and len(regions) < expected_count:
        print(f"  Auto-detect found {len(regions)} frames, expected {expected_count}. Falling back to equal-split.")
        return equal_split_frames(w, expected_count)

    return regions


def merge_close_regions(regions, target_count, total_width):
    """Merge regions that are separated by small gaps until we hit target count."""
    while len(regions) > target_count:
        # Find the smallest gap between consecutive regions
        min_gap = total_width
        min_idx = 0
        for i in range(len(regions) - 1):
            gap = regions[i + 1][0] - regions[i][1]
            if gap < min_gap:
                min_gap = gap
                min_idx = i
        # Merge regions[min_idx] and regions[min_idx + 1]
        merged = (regions[min_idx][0], regions[min_idx + 1][1])
        regions = regions[:min_idx] + [merged] + regions[min_idx + 2:]
    return regions


def equal_split_frames(width, count):
    """Split image into equal-width frames."""
    frame_w = width // count
    return [(i * frame_w, (i + 1) * frame_w) for i in range(count)]


def get_bounding_box(img, x1, y1, x2, y2):
    """Find the tight bounding box of non-transparent pixels in a region."""
    pixels = img.load()
    min_x, min_y = x2, y2
    max_x, max_y = x1, y1

    for y in range(y1, y2):
        for x in range(x1, x2):
            if pixels[x, y][3] > 30:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)

    if max_x <= min_x or max_y <= min_y:
        return None
    return (min_x, min_y, max_x + 1, max_y + 1)


def compute_scale(max_char_w, max_char_h, cell_size, fill_pct, bottom_pad):
    """Compute uniform scale factor for character sizing within cells.

    When fill_pct > 0, scales characters UP so the largest dimension fills
    that percentage of the cell (using nearest-neighbor for crisp pixel art).
    Also scales DOWN if characters exceed the cell.
    """
    usable = cell_size - bottom_pad
    if max_char_h == 0 or max_char_w == 0:
        return 1.0

    if fill_pct > 0:
        target = usable * fill_pct
        scale = min(target / max_char_h, target / max_char_w)
    elif max_char_h > usable or max_char_w > usable:
        scale = min(usable / max_char_h, usable / max_char_w)
    else:
        scale = 1.0

    if scale != 1.0:
        direction = "up" if scale > 1 else "down"
        print(f"  Scaling {direction} to {scale:.2f}x (largest char: {max_char_w}x{max_char_h} → {int(max_char_w*scale)}x{int(max_char_h*scale)})")
    return scale


def place_in_cell(char_img, cell_size, scale, bottom_pad):
    """Scale a cropped character and place it centered/bottom-anchored in a cell."""
    cell = Image.new("RGBA", (cell_size, cell_size), (0, 0, 0, 0))
    if scale != 1.0:
        new_w = max(1, int(char_img.width * scale))
        new_h = max(1, int(char_img.height * scale))
        char_img = char_img.resize((new_w, new_h), Image.NEAREST)

    paste_x = max(0, (cell_size - char_img.width) // 2)
    paste_y = max(0, cell_size - bottom_pad - char_img.height)
    cell.paste(char_img, (paste_x, paste_y), char_img)
    return cell


def normalize_frames(img, regions, cell_size, bottom_pad=8, fill_pct=0):
    """Extract each frame, center horizontally, bottom-anchor vertically."""
    h = img.size[1]
    frames = []

    bboxes = []
    for (x1, x2) in regions:
        bbox = get_bounding_box(img, x1, 0, x2, h)
        bboxes.append(bbox)

    max_char_h = max((b[3] - b[1] for b in bboxes if b), default=0)
    max_char_w = max((b[2] - b[0] for b in bboxes if b), default=0)
    scale = compute_scale(max_char_w, max_char_h, cell_size, fill_pct, bottom_pad)

    for i, ((x1, x2), bbox) in enumerate(zip(regions, bboxes)):
        if bbox is None:
            print(f"  Frame {i + 1}: empty (no visible pixels)")
            frames.append(Image.new("RGBA", (cell_size, cell_size), (0, 0, 0, 0)))
            continue
        char_img = img.crop(bbox)
        frames.append(place_in_cell(char_img, cell_size, scale, bottom_pad))

    return frames


def assemble_strip(frames, cell_size):
    """Stitch frames into a single horizontal strip."""
    count = len(frames)
    strip = Image.new("RGBA", (cell_size * count, cell_size), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        strip.paste(frame, (i * cell_size, 0), frame)
    return strip


def create_debug_image(img, regions, bboxes, cell_size):
    """Create a debug visualization showing detected frames and bounding boxes."""
    debug = img.copy().convert("RGBA")
    draw = ImageDraw.Draw(debug)
    h = img.size[1]

    for i, (x1, x2) in enumerate(regions):
        # Red lines for frame boundaries
        draw.line([(x1, 0), (x1, h)], fill=(255, 0, 0, 200), width=2)
        draw.line([(x2, 0), (x2, h)], fill=(255, 0, 0, 200), width=2)

        # Frame number
        draw.text((x1 + 4, 4), str(i + 1), fill=(255, 0, 0, 255))

    # Blue boxes for character bounding boxes
    for bbox in bboxes:
        if bbox:
            draw.rectangle([bbox[0], bbox[1], bbox[2] - 1, bbox[3] - 1],
                           outline=(0, 100, 255, 200), width=2)

    return debug


def is_row_empty(img, y, threshold=5):
    """Check if a horizontal row is mostly transparent."""
    pixels = img.load()
    w = img.size[0]
    opaque = 0
    for x in range(w):
        if pixels[x, y][3] > 30:
            opaque += 1
    return opaque < (w * threshold / 100)


def auto_detect_rows(img, expected_rows):
    """Detect row boundaries by finding horizontal empty gaps."""
    w, h = img.size
    row_regions = []
    in_region = False
    start = 0

    for y in range(h):
        empty = is_row_empty(img, y)
        if not empty and not in_region:
            start = y
            in_region = True
        elif empty and in_region:
            if y - start > h * 0.02:
                row_regions.append((start, y))
            in_region = False

    if in_region:
        if h - start > h * 0.02:
            row_regions.append((start, h))

    # Merge if we found more rows than expected
    if expected_rows and len(row_regions) > expected_rows:
        while len(row_regions) > expected_rows:
            min_gap = h
            min_idx = 0
            for i in range(len(row_regions) - 1):
                gap = row_regions[i + 1][0] - row_regions[i][1]
                if gap < min_gap:
                    min_gap = gap
                    min_idx = i
            merged = (row_regions[min_idx][0], row_regions[min_idx + 1][1])
            row_regions = row_regions[:min_idx] + [merged] + row_regions[min_idx + 2:]

    # Fall back to equal split if detection fails
    if expected_rows and len(row_regions) != expected_rows:
        print(f"  Row auto-detect found {len(row_regions)} rows, expected {expected_rows}. Using equal split for rows.")
        cell_h = h // expected_rows
        row_regions = [(r * cell_h, (r + 1) * cell_h) for r in range(expected_rows)]

    return row_regions


def detect_blobs_in_column(img, x1, x2, expected_count):
    """Within a vertical column strip, detect individual character blobs
    by scanning for horizontal empty gaps. Returns list of (y1, y2) for
    each blob found."""
    pixels = img.load()
    h = img.size[1]

    # Scan each row within this column to find opaque vs empty
    row_has_content = []
    for y in range(h):
        opaque = 0
        for x in range(x1, x2):
            if pixels[x, y][3] > 30:
                opaque += 1
        row_has_content.append(opaque > (x2 - x1) * 0.03)

    # Group consecutive content rows into blobs
    blobs = []
    in_blob = False
    start = 0
    for y in range(h):
        if row_has_content[y] and not in_blob:
            start = y
            in_blob = True
        elif not row_has_content[y] and in_blob:
            blobs.append((start, y))
            in_blob = False
    if in_blob:
        blobs.append((start, h))

    # Merge small gaps if we have more blobs than expected
    while len(blobs) > expected_count:
        min_gap = h
        min_idx = 0
        for i in range(len(blobs) - 1):
            gap = blobs[i + 1][0] - blobs[i][1]
            if gap < min_gap:
                min_gap = gap
                min_idx = i
        merged = (blobs[min_idx][0], blobs[min_idx + 1][1])
        blobs = blobs[:min_idx] + [merged] + blobs[min_idx + 2:]

    # If we found fewer blobs, try equal split within the content area
    if len(blobs) < expected_count:
        if blobs:
            content_top = blobs[0][0]
            content_bottom = blobs[-1][1]
        else:
            content_top = 0
            content_bottom = h
        ch = (content_bottom - content_top) // expected_count
        blobs = [(content_top + i * ch, content_top + (i + 1) * ch) for i in range(expected_count)]

    return blobs


def grid_split_frames(img, cols, rows):
    """Split a grid-layout image into regions. Uses equal columns and
    auto-detects row boundaries per-column for tight vertical cropping."""
    w, h = img.size
    cell_w = w // cols

    # Detect blobs in each column independently
    col_blobs = []
    for col in range(cols):
        x1 = col * cell_w
        x2 = x1 + cell_w
        blobs = detect_blobs_in_column(img, x1, x2, rows)
        col_blobs.append(blobs)
        if col == 0:
            print(f"  Col 0 row blobs: {blobs}")

    # Build regions: for each row, for each column
    regions = []
    for row in range(rows):
        for col in range(cols):
            x1 = col * cell_w
            x2 = x1 + cell_w
            if row < len(col_blobs[col]):
                y1, y2 = col_blobs[col][row]
            else:
                # Fallback: equal split
                cell_h = h // rows
                y1 = row * cell_h
                y2 = y1 + cell_h
            regions.append((x1, y1, x2, y2))
    return regions


def normalize_grid_frames(img, grid_regions, cell_size, bottom_pad=8, fill_pct=0):
    """Extract frames from grid regions, center horizontally, bottom-anchor."""
    frames = []

    bboxes = []
    for (x1, y1, x2, y2) in grid_regions:
        bbox = get_bounding_box(img, x1, y1, x2, y2)
        bboxes.append(bbox)

    max_char_h = max((b[3] - b[1] for b in bboxes if b), default=0)
    max_char_w = max((b[2] - b[0] for b in bboxes if b), default=0)
    scale = compute_scale(max_char_w, max_char_h, cell_size, fill_pct, bottom_pad)

    for i, (region, bbox) in enumerate(zip(grid_regions, bboxes)):
        if bbox is None:
            print(f"  Frame {i + 1}: empty (no visible pixels)")
            frames.append(Image.new("RGBA", (cell_size, cell_size), (0, 0, 0, 0)))
            continue
        char_img = img.crop(bbox)
        frames.append(place_in_cell(char_img, cell_size, scale, bottom_pad))

    return frames


def create_grid_debug_image(img, grid_regions, cell_size):
    """Debug visualization for grid-mode detection."""
    debug = img.copy().convert("RGBA")
    draw = ImageDraw.Draw(debug)
    for i, (x1, y1, x2, y2) in enumerate(grid_regions):
        draw.rectangle([x1, y1, x2 - 1, y2 - 1], outline=(255, 0, 0, 200), width=2)
        draw.text((x1 + 4, y1 + 4), str(i + 1), fill=(255, 0, 0, 255))
        bbox = get_bounding_box(img, x1, y1, x2, y2)
        if bbox:
            draw.rectangle([bbox[0], bbox[1], bbox[2] - 1, bbox[3] - 1],
                           outline=(0, 100, 255, 200), width=2)
    return debug


def normalize_sprite(input_path, output_path, frames_count=None, cell_size=256,
                     equal_split=False, threshold=25.0, debug=False, grid=None,
                     fill_pct=0, erode=1):
    print(f"Loading: {input_path}")
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    print(f"  Dimensions: {w}x{h}")

    # Step 1: Detect and remove background
    bg_color = detect_bg_color(img)
    print(f"  Background color: rgb{bg_color}")
    img = remove_background(img, bg_color, threshold, erode=erode)
    print(f"  Background removed (threshold={threshold}, erode={erode})")

    # Step 2: Detect frames
    if grid:
        cols, rows = grid
        grid_regions = grid_split_frames(img, cols, rows)
        total = cols * rows
        print(f"  Grid mode: {cols}x{rows} = {total} frames")

        if debug:
            debug_img = create_grid_debug_image(img, grid_regions, cell_size)
            debug_path = output_path.rsplit(".", 1)[0] + "-debug.png"
            debug_img.save(debug_path, "PNG")
            print(f"  Debug image: {debug_path}")

        frames = normalize_grid_frames(img, grid_regions, cell_size, fill_pct=fill_pct)
    else:
        if equal_split:
            if not frames_count:
                print("Error: --equal-split requires --frames")
                sys.exit(1)
            regions = equal_split_frames(w, frames_count)
            print(f"  Equal-split: {frames_count} frames, {w // frames_count}px each")
        else:
            regions = auto_detect_frames(img, frames_count)
            print(f"  Auto-detected: {len(regions)} frames")

        if not regions:
            print("Error: No frames detected!")
            sys.exit(1)

        if debug:
            bboxes = []
            for (x1, x2) in regions:
                bboxes.append(get_bounding_box(img, x1, 0, x2, h))
            debug_img = create_debug_image(img, regions, bboxes, cell_size)
            debug_path = output_path.rsplit(".", 1)[0] + "-debug.png"
            debug_img.save(debug_path, "PNG")
            print(f"  Debug image: {debug_path}")

        frames = normalize_frames(img, regions, cell_size, fill_pct=fill_pct)
    strip = assemble_strip(frames, cell_size)
    print(f"  Output: {strip.width}x{strip.height} ({len(frames)} frames, {cell_size}px each)")

    strip.save(output_path, "PNG")
    print(f"Saved: {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Normalize AI-generated sprite sheets into clean grid-aligned strips",
        epilog="Example: python3 scripts/normalize-sprite.py raw.png clean.png --frames 12"
    )
    parser.add_argument("input", help="Input sprite image (PNG/JPEG)")
    parser.add_argument("output", help="Output PNG path")
    parser.add_argument("--frames", type=int, default=None,
                        help="Expected number of frames (aids detection, required for --equal-split)")
    parser.add_argument("--size", type=int, default=256,
                        help="Output cell size in pixels (default: 256)")
    parser.add_argument("--equal-split", action="store_true",
                        help="Split evenly instead of auto-detecting gaps")
    parser.add_argument("--threshold", type=float, default=25.0,
                        help="Background color distance threshold 0-100 (default: 25)")
    parser.add_argument("--erode", type=int, default=2,
                        help="Pixel erosion passes — shaves N layers off the outer edge to remove "
                             "JPEG anti-aliasing halo (default: 2). Use 0 to disable, 1 for gentle.")
    parser.add_argument("--fill", type=float, default=0,
                        help="Scale characters to fill this fraction of the cell (e.g., 0.85 = 85%%). "
                             "Uses nearest-neighbor for crisp pixel art upscaling. 0 = no upscaling.")
    parser.add_argument("--grid", default=None,
                        help="Grid layout as COLSxROWS (e.g., 4x3 for a 4-column, 3-row grid)")
    parser.add_argument("--debug", action="store_true",
                        help="Output a debug image showing detected frame boundaries")
    args = parser.parse_args()

    grid = None
    if args.grid:
        parts = args.grid.lower().split("x")
        if len(parts) != 2:
            print("Error: --grid must be COLSxROWS (e.g., 4x3)")
            sys.exit(1)
        grid = (int(parts[0]), int(parts[1]))

    normalize_sprite(
        args.input, args.output,
        frames_count=args.frames,
        cell_size=args.size,
        equal_split=args.equal_split,
        threshold=args.threshold,
        debug=args.debug,
        grid=grid,
        fill_pct=args.fill,
        erode=args.erode,
    )

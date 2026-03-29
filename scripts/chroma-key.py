#!/usr/bin/env python3
"""
Remove chroma key background from sticker images.

Usage:
  python3 scripts/chroma-key.py input.jpeg output.png
  python3 scripts/chroma-key.py input.jpeg output.png --threshold 37 --smooth 6

Replicates the behavior of onlinepngtools.com/remove-png-chroma-key:
1. Auto-detect the chroma key color from the corner pixels
2. Flood-fill from edges to find background-connected pixels
3. Apply smooth alpha transition at object edges
"""

import argparse
import math
import sys
from collections import deque
from PIL import Image


def color_distance(r1, g1, b1, r2, g2, b2):
    """Euclidean distance in RGB space, normalized to 0-100."""
    d = math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
    max_d = math.sqrt(255 ** 2 * 3)
    return (d / max_d) * 100


def detect_key_color(img):
    """Sample corner pixels to auto-detect the chroma key color."""
    pixels = img.load()
    w, h = img.size
    corners = [
        pixels[0, 0], pixels[w - 1, 0],
        pixels[0, h - 1], pixels[w - 1, h - 1],
    ]
    r = sum(c[0] for c in corners) // 4
    g = sum(c[1] for c in corners) // 4
    b = sum(c[2] for c in corners) // 4
    return (r, g, b)


def remove_chroma_key(input_path, output_path, threshold=37.0, smooth=6.0, key_color=None):
    img = Image.open(input_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size

    if key_color is None:
        key_color = detect_key_color(img)
    kr, kg, kb = key_color
    print(f"Key color: rgb({kr}, {kg}, {kb})")

    # Flood fill from all edges — find background-connected pixels
    # Store distance to key color for each visited pixel
    dist_map = {}
    queue = deque()

    # Seed edges
    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(h):
        queue.append((0, y))
        queue.append((w - 1, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in dist_map:
            continue
        if x < 0 or x >= w or y < 0 or y >= h:
            continue

        r, g, b, a = pixels[x, y]
        dist = color_distance(r, g, b, kr, kg, kb)
        dist_map[(x, y)] = dist

        # Only spread through pixels within threshold
        if dist <= threshold:
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in dist_map:
                    queue.append((nx, ny))

    # Apply transparency
    inner_threshold = max(0, threshold - smooth)

    # Pass 1: set alpha
    bg_pixels = set()
    edge_pixels = set()
    for (x, y), dist in dist_map.items():
        if dist > threshold:
            continue

        r, g, b, a = pixels[x, y]

        if dist <= inner_threshold:
            pixels[x, y] = (0, 0, 0, 0)
            bg_pixels.add((x, y))
        else:
            t = (dist - inner_threshold) / smooth
            new_alpha = int(min(1.0, t) * 255)
            pixels[x, y] = (r, g, b, new_alpha)
            edge_pixels.add((x, y))

    # Pass 2: despill — mathematically remove the key color contribution
    # from semi-transparent edge pixels.
    # The idea: a semi-transparent pixel's color is a blend of the subject
    # and the key color. We reverse that blend to recover the subject color.
    # blended = subject * alpha + key * (1 - alpha)
    # subject = (blended - key * (1 - alpha)) / alpha
    for (x, y) in edge_pixels:
        r, g, b, a = pixels[x, y]
        if a == 0:
            continue
        alpha_f = a / 255.0
        inv_alpha = 1.0 - alpha_f
        new_r = max(0, min(255, int((r - kr * inv_alpha) / alpha_f)))
        new_g = max(0, min(255, int((g - kg * inv_alpha) / alpha_f)))
        new_b = max(0, min(255, int((b - kb * inv_alpha) / alpha_f)))
        pixels[x, y] = (new_r, new_g, new_b, a)

    img.save(output_path, "PNG")
    print(f"Saved: {output_path} ({w}x{h})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Remove chroma key background from sticker images")
    parser.add_argument("input", help="Input image (JPEG or PNG)")
    parser.add_argument("output", help="Output PNG path")
    parser.add_argument("--color", default=None, help="Key color as R,G,B (auto-detected from corners if omitted)")
    parser.add_argument("--threshold", type=float, default=37.0, help="Color similarity threshold 0-100 (default: 37)")
    parser.add_argument("--smooth", type=float, default=6.0, help="Edge smoothing radius (default: 6)")
    args = parser.parse_args()

    key = tuple(int(c) for c in args.color.split(",")) if args.color else None
    remove_chroma_key(args.input, args.output, args.threshold, args.smooth, key)

#!/usr/bin/env python3
"""
Generate multiple sprite variants with different settings for visual comparison.

Creates a grid of outputs with varying threshold and smooth values,
plus a preview HTML page to compare them side-by-side on a dark background.

Usage:
  python3 scripts/sprite-tuner.py input.png --grid 4x3
  python3 scripts/sprite-tuner.py input.png --grid 4x3 --fill 0.85
  python3 scripts/sprite-tuner.py input.png --frames 12
"""

import argparse
import os
import sys
import tempfile
import webbrowser

# Import from normalize-sprite
sys.path.insert(0, os.path.dirname(__file__))
from importlib.util import spec_from_file_location, module_from_spec
spec = spec_from_file_location("normalize_sprite",
    os.path.join(os.path.dirname(__file__), "normalize-sprite.py"))
ns = module_from_spec(spec)
spec.loader.exec_module(ns)


def generate_variants(input_path, grid=None, frames_count=None, fill_pct=0.85,
                      equal_split=False):
    """Generate sprite strips with different threshold/smooth combos."""

    out_dir = tempfile.mkdtemp(prefix="sprite-tuner-")

    thresholds = [15, 20, 25, 30, 35]
    smooth_values = [2, 5, 8]

    variants = []
    for thresh in thresholds:
        for smooth in smooth_values:
            name = f"t{thresh}_s{smooth}"
            out_path = os.path.join(out_dir, f"{name}.png")
            print(f"\n--- threshold={thresh}, smooth={smooth} ---")
            ns.normalize_sprite(
                input_path, out_path,
                frames_count=frames_count,
                cell_size=256,
                equal_split=equal_split,
                threshold=thresh,
                debug=False,
                grid=grid,
                fill_pct=fill_pct,
            )
            variants.append({
                "name": name,
                "threshold": thresh,
                "smooth": smooth,
                "path": out_path,
                "filename": f"{name}.png",
            })

    return out_dir, variants


def create_tuner_html(out_dir, variants, thresholds, smooth_values):
    """Create an interactive comparison HTML page."""
    html = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Sprite Tuner</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: system-ui, sans-serif;
    background: #1a2314;
    color: #e8dcc8;
    padding: 24px;
  }
  h1 { font-size: 20px; font-weight: 400; opacity: 0.7; margin-bottom: 8px; }
  .instructions {
    font-size: 13px; opacity: 0.5; margin-bottom: 24px; line-height: 1.5;
  }
  .variant-grid {
    display: grid;
    grid-template-columns: repeat(COLS, 1fr);
    gap: 16px;
    margin-bottom: 32px;
  }
  .variant {
    background: rgba(255,255,255,0.04);
    border: 2px solid transparent;
    border-radius: 12px;
    padding: 12px;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .variant:hover { border-color: rgba(255,255,255,0.2); }
  .variant.selected { border-color: #c89632; }
  .variant-label {
    font-size: 12px;
    opacity: 0.6;
    margin-bottom: 8px;
    font-variant-numeric: tabular-nums;
  }
  .variant-sprite {
    width: 100%;
    height: 120px;
    position: relative;
    overflow: hidden;
    border-radius: 8px;
  }
  .variant-sprite .anim {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 96px;
    height: 96px;
    background-repeat: no-repeat;
    background-size: 1152px 96px;
  }
  .bg-dark { background: #1a2314; }
  .bg-green { background: linear-gradient(180deg, #2a3a1e, #4a6a32); }
  .bg-brown { background: #2a1f14; }
  .bg-checker {
    background-image:
      linear-gradient(45deg, #333 25%, transparent 25%),
      linear-gradient(-45deg, #333 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #333 75%),
      linear-gradient(-45deg, transparent 75%, #333 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0;
    background-color: #222;
  }

  .big-preview {
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .big-preview h2 { font-size: 16px; font-weight: 400; opacity: 0.6; }
  .big-scene {
    width: 400px;
    height: 250px;
    border-radius: 12px;
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.1);
  }
  .big-scene .anim {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    position: absolute;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%);
    width: 128px;
    height: 128px;
    background-repeat: no-repeat;
    background-size: 1536px 128px;
  }
  .big-scene .grass {
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 28px; background: #4a6a32;
  }
  .controls {
    display: flex; gap: 24px; align-items: center; flex-wrap: wrap;
    justify-content: center;
  }
  .controls label { font-size: 13px; opacity: 0.6; }
  .controls select, .controls input {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.15);
    color: #e8dcc8; border-radius: 4px; padding: 4px 8px;
  }
  .winner-text {
    margin-top: 16px; padding: 12px 20px;
    background: rgba(200,150,50,0.15);
    border: 1px solid rgba(200,150,50,0.3);
    border-radius: 8px;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    display: none;
  }
  .winner-text.visible { display: block; }
</style>
</head>
<body>

<h1>Sprite Tuner</h1>
<p class="instructions">
  Click a variant to select it. Change backgrounds to check for white halo on different surfaces.<br>
  When you find the best one, the settings are shown below.
</p>

<div class="controls">
  <label>Background:</label>
  <select id="bg-select">
    <option value="bg-dark">Dark forest</option>
    <option value="bg-green">Green gradient</option>
    <option value="bg-brown">Dark brown</option>
    <option value="bg-checker">Checkerboard (transparency)</option>
  </select>
  <label>FPS:</label>
  <input type="range" id="fps" min="1" max="16" value="6" style="width:80px">
  <span id="fps-val">6</span>
</div>

<div class="variant-grid" id="grid">
VARIANT_CARDS
</div>

<div class="big-preview">
  <h2>Selected variant (128px)</h2>
  <div class="big-scene bg-dark" id="big-scene">
    <div class="grass"></div>
    <div class="anim" id="big-anim"></div>
  </div>
</div>

<div class="winner-text" id="winner">
  Selected: <strong id="winner-settings"></strong><br>
  <code id="winner-cmd"></code>
</div>

<script>
const FRAMES = 12;
const variants = VARIANT_JSON;
let selected = 0;
let frame = 0;
let interval;

function setBackground(cls) {
  document.querySelectorAll('.variant-sprite, .big-scene').forEach(el => {
    el.className = el.className.replace(/bg-\\w+/g, '') + ' ' + cls;
  });
}

function selectVariant(idx) {
  selected = idx;
  document.querySelectorAll('.variant').forEach((el, i) => {
    el.classList.toggle('selected', i === idx);
  });
  const v = variants[idx];
  document.getElementById('big-anim').style.backgroundImage = `url('${v.filename}')`;
  const winner = document.getElementById('winner');
  winner.classList.add('visible');
  document.getElementById('winner-settings').textContent =
    `threshold=${v.threshold}, smooth=${v.smooth}`;
  document.getElementById('winner-cmd').textContent =
    `python3 scripts/normalize-sprite.py INPUT OUTPUT --grid COLSxROWS --fill 0.85 --threshold ${v.threshold}`;
}

function animate() {
  frame = (frame + 1) % FRAMES;
  document.querySelectorAll('.anim').forEach(el => {
    const w = el.offsetWidth;
    el.style.backgroundPosition = `${-frame * w}px 0`;
  });
}

function startLoop(fps) {
  if (interval) clearInterval(interval);
  interval = setInterval(animate, 1000 / fps);
}

document.getElementById('bg-select').addEventListener('change', e => {
  setBackground(e.target.value);
});

document.getElementById('fps').addEventListener('input', e => {
  const fps = parseInt(e.target.value);
  document.getElementById('fps-val').textContent = fps;
  startLoop(fps);
});

// Init
selectVariant(0);
setBackground('bg-dark');
startLoop(6);
</script>
</body>
</html>"""
    return html


def main():
    parser = argparse.ArgumentParser(description="Sprite tuner — generate variants for visual comparison")
    parser.add_argument("input", help="Input sprite image")
    parser.add_argument("--grid", default=None, help="Grid layout as COLSxROWS")
    parser.add_argument("--frames", type=int, default=None, help="Expected frame count")
    parser.add_argument("--fill", type=float, default=0.85, help="Fill percentage (default 0.85)")
    parser.add_argument("--equal-split", action="store_true")
    args = parser.parse_args()

    grid = None
    if args.grid:
        parts = args.grid.lower().split("x")
        grid = (int(parts[0]), int(parts[1]))

    thresholds = [15, 20, 25, 30, 35]
    smooth_values = [2, 5, 8]

    out_dir, variants = generate_variants(
        args.input, grid=grid, frames_count=args.frames,
        fill_pct=args.fill, equal_split=args.equal_split,
    )

    # Build variant cards HTML
    cards = ""
    for i, v in enumerate(variants):
        cards += f"""
  <div class="variant" onclick="selectVariant({i})">
    <div class="variant-label">threshold={v['threshold']} smooth={v['smooth']}</div>
    <div class="variant-sprite bg-dark">
      <div class="anim" style="background-image: url('{v['filename']}')"></div>
    </div>
  </div>"""

    import json
    variant_json = json.dumps([{
        "filename": v["filename"],
        "threshold": v["threshold"],
        "smooth": v["smooth"],
    } for v in variants])

    html = create_tuner_html(out_dir, variants, thresholds, smooth_values)
    html = html.replace("VARIANT_CARDS", cards)
    html = html.replace("VARIANT_JSON", variant_json)
    html = html.replace("COLS", str(len(smooth_values)))

    html_path = os.path.join(out_dir, "tuner.html")
    with open(html_path, "w") as f:
        f.write(html)

    print(f"\n{'='*60}")
    print(f"Tuner ready: {html_path}")
    print(f"Variants in: {out_dir}")
    print(f"{'='*60}")
    webbrowser.open(f"file://{html_path}")


if __name__ == "__main__":
    main()

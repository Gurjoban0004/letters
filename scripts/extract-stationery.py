#!/usr/bin/env python3
"""
Extract individual stationery assets from the inspo sprite boards.
Outputs optimized WebP files into public/stationery/.
"""
import os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INSPO = os.path.join(ROOT, "inspo")
OUT = os.path.join(ROOT, "public", "stationery")

# ─── Grid geometry discovered from the source boards ───
# paper.png  1536×1024  — 6 cols × 4 rows
# paper_9-16.png  941×1672 — 5 cols × 5 rows  (last row may have 5)
# letter.png 1536×1024  — 6 cols × 4 rows  (closed envelopes)
# open_letter.png 1536×1024  — 6 cols × 4 rows  (open envelopes)
# image.png  1254×1254  — 4 cols × 4 rows  (square closed envelopes)

def extract_grid(src_path, out_dir, prefix, cols, rows, padding, quality=82):
    """Crop each cell from a grid sprite and save as WebP."""
    im = Image.open(src_path).convert("RGB")
    w, h = im.size

    # Estimate cell size from total dimensions and gaps
    # We'll use the gap analysis results to compute precise bounds
    cell_w = (w - padding["left"] - padding["right"]) / cols
    cell_h = (h - padding["top"] - padding["bottom"]) / rows

    os.makedirs(out_dir, exist_ok=True)
    count = 0
    for row in range(rows):
        for col in range(cols):
            x0 = int(padding["left"] + col * cell_w)
            y0 = int(padding["top"] + row * cell_h)
            x1 = int(x0 + cell_w)
            y1 = int(y0 + cell_h)

            # Inset slightly to avoid bleed from adjacent cells and background
            inset = 4
            x0 += inset
            y0 += inset
            x1 -= inset
            y1 -= inset

            crop = im.crop((x0, y0, x1, y1))
            fname = f"{prefix}-{count}.webp"
            crop.save(os.path.join(out_dir, fname), "WEBP", quality=quality)
            count += 1
            print(f"  {fname}  ({crop.size[0]}×{crop.size[1]})")
    return count


def main():
    # ─── Desktop papers (6×4 = 24) ───
    print("=== Desktop Papers ===")
    desk_dir = os.path.join(OUT, "papers", "desktop")
    extract_grid(
        os.path.join(INSPO, "paper.png"), desk_dir, "paper",
        cols=6, rows=4,
        padding={"left": 32, "right": 26, "top": 78, "bottom": 19},
    )

    # ─── Mobile papers (5×5 = 25) ───
    print("\n=== Mobile Papers ===")
    mob_dir = os.path.join(OUT, "papers", "mobile")
    extract_grid(
        os.path.join(INSPO, "paper_9-16.png"), mob_dir, "paper",
        cols=5, rows=5,
        padding={"left": 18, "right": 11, "top": 24, "bottom": 32},
    )

    # ─── Closed envelopes from letter.png (6×4 = 24) ───
    print("\n=== Closed Envelopes ===")
    env_dir = os.path.join(OUT, "envelopes", "closed")
    extract_grid(
        os.path.join(INSPO, "letter.png"), env_dir, "env",
        cols=6, rows=4,
        padding={"left": 27, "right": 18, "top": 80, "bottom": 62},
    )

    # ─── Open envelopes from open_letter.png (6×4 = 24) ───
    print("\n=== Open Envelopes ===")
    open_dir = os.path.join(OUT, "envelopes", "open")
    extract_grid(
        os.path.join(INSPO, "open_letter.png"), open_dir, "open",
        cols=6, rows=4,
        padding={"left": 30, "right": 24, "top": 21, "bottom": 30},
    )

    # ─── Square envelopes from image.png (4×4 = 16) ───
    print("\n=== Square Envelopes ===")
    sq_dir = os.path.join(OUT, "envelopes", "square")
    extract_grid(
        os.path.join(INSPO, "image.png"), sq_dir, "sq",
        cols=4, rows=4,
        padding={"left": 24, "right": 24, "top": 24, "bottom": 24},
    )

    print("\n✓ All stationery assets extracted.")


if __name__ == "__main__":
    main()

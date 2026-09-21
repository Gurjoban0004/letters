#!/usr/bin/env python3
"""
Extract individual sticker PNGs from vault/details/details.png.
Uses largest-connected-component isolation so neighbouring stickers don't bleed.
Output: public/stationery/details/<name>.png  (tight-trimmed RGBA)
"""

import os, sys, pathlib
import numpy as np
from PIL import Image

try:
    from scipy.ndimage import label
except ImportError:
    print("Installing scipy…")
    os.system(f"{sys.executable} -m pip install scipy pillow --quiet")
    from scipy.ndimage import label

ROOT   = pathlib.Path(__file__).parent.parent
SRC    = ROOT / "vault" / "details" / "details.png"
OUTDIR = ROOT / "public" / "stationery" / "details"
OUTDIR.mkdir(parents=True, exist_ok=True)

img  = Image.open(SRC).convert("RGBA")
arr  = np.array(img)          # H × W × 4
alpha = arr[:, :, 3]          # 0 = transparent

# ── Crop definitions (x, y, w, h)  — generous regions around each sticker ───
crops = {
    # Voice players (top-left column)
    "voiceReady":       (14,  55,  384, 120),
    "voicePlaying":     (18, 167,  382, 120),
    "voiceWave":        (14, 274,  372, 132),
    # Photo frames (top-center column)
    "photoPolaroid":    (386,  60, 210, 280),
    "photoStamp":       (572,  45, 196, 305),
    "photoDeckled":     (748,  45, 218, 305),
    # Label tags (top-right column)
    "datePill":         (958,  40, 244, 132),
    "justForYouTag":    (954, 153, 248, 124),
    "littleNoteTag":    (956, 255, 250, 155),
    # Washi tapes & paper strips (mid-left)
    "washiPink":        (418, 405, 158, 110),
    "washiBeige":       (560, 402, 168, 112),
    "washiGingham":     (718, 403, 180, 108),
    "tapeHearts":       (418, 500, 172, 110),
    # Stamps (lower-left block)
    "stampTulip":       (14,  630, 148, 208),
    "stampCat":         (146, 630, 150, 208),
    "stampBow":         (278, 630, 150, 208),
    "stamps":           (14,  630, 414, 208),
    # Notes & deckled cards (lower-center)
    "noteLined":        (424, 638, 160, 218),
    "heartNote":        (552, 638, 182, 208),
    "smallProgress":    (702, 636, 194, 232),
    "letterNote":       (1038, 882, 172, 206),
    "withLoveTag":      (618, 1078, 190, 132),
    # Botanicals & nature
    "botanical":        (884, 630, 128, 218),
    "petal":            (992, 640, 110, 134),
    "leaf":             (1090, 636, 115, 152),
    "cloud":            (1025, 766, 182, 120),
    "botanicalFlower":  (508, 1080, 130, 152),
    "floralSprig":      (782, 1016, 140, 216),
    # Decorative keepsakes
    "bow":              (288, 853, 300, 302),
    "waxSeal":          (545, 876, 180, 188),
    "waxSealSmall":     (376, 1056, 140, 144),
    "paperclip":        (708, 868, 130, 202),
    "miniEnvelope":     (850, 896, 200, 154),
    "cat":              (920, 1058, 262, 178),
}

def extract_sticker(name: str, region: tuple) -> None:
    x, y, w, h = region
    # Clamp to image bounds
    ih, iw = arr.shape[:2]
    x2, y2 = min(x + w, iw), min(y + h, ih)
    x, y = max(x, 0), max(y, 0)

    patch_alpha = alpha[y:y2, x:x2]
    patch_rgba  = arr[y:y2, x:x2].copy()

    # Find connected components in non-transparent pixels
    mask = (patch_alpha > 12).astype(np.int32)
    if mask.sum() == 0:
        print(f"  ⚠  {name}: no opaque pixels in region")
        return

    labeled, num_features = label(mask)
    if num_features == 0:
        print(f"  ⚠  {name}: no components found")
        return

    # Keep only the largest connected component
    sizes = np.bincount(labeled.ravel())
    sizes[0] = 0   # ignore background label
    largest_label = sizes.argmax()
    keep_mask = (labeled == largest_label)

    # Zero out everything that's not the largest component
    patch_rgba[:, :, 3] = np.where(keep_mask, patch_rgba[:, :, 3], 0)

    # Tight trim: find bounding box of the kept component
    rows = np.any(keep_mask, axis=1)
    cols = np.any(keep_mask, axis=0)
    if not rows.any():
        print(f"  ⚠  {name}: empty after component isolation")
        return
    r0, r1 = np.where(rows)[0][[0, -1]]
    c0, c1 = np.where(cols)[0][[0, -1]]

    # Add 4 px padding
    pad = 4
    r0 = max(r0 - pad, 0)
    r1 = min(r1 + pad + 1, patch_rgba.shape[0])
    c0 = max(c0 - pad, 0)
    c1 = min(c1 + pad + 1, patch_rgba.shape[1])

    trimmed = patch_rgba[r0:r1, c0:c1]

    out_path = OUTDIR / f"{name}.png"
    Image.fromarray(trimmed, "RGBA").save(out_path, optimize=True)
    pw, ph = trimmed.shape[1], trimmed.shape[0]
    print(f"  ✓  {name:20s}  {pw}×{ph} px  → {out_path.relative_to(ROOT)}")

print(f"\n📦 Source : {SRC}")
print(f"📂 Output : {OUTDIR}\n")

for name, region in crops.items():
    try:
        extract_sticker(name, region)
    except Exception as e:
        print(f"  ✗  {name}: {e}")

print("\n✅ Done.\n")

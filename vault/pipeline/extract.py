#!/usr/bin/env python3
"""
Production Asset Extraction Pipeline for Letters (HG)
Processes all stationery sources from /better into clean, production-ready alpha assets.

Inputs (from better/ — copied into raw_inputs/):
  env_1.jpeg           — Blue-screen:    Rose Silk Ribbon & Bow       (open+closed in ONE file)
  env_2.jpeg           — Kelly green:    Ceramic Floral Brooch         (open+closed in ONE file)
  env_3.jpeg           — Chartreuse:     Pressed Flowers & Stamp       (open+closed in ONE file)
  env_4_open.jpeg      — Chartreuse:     Pink Floral Heart Envelope    (pre-split — open only)
  env_4_closed.jpeg    — Chartreuse:     Pink Floral Heart Envelope    (pre-split — closed only)
  env_5_open.jpeg      — Dusty rose BG:  Lavender Floral Envelope      (pre-split — open only)
  env_5_closed.jpeg    — Dusty rose BG:  Lavender Floral Envelope      (pre-split — closed only)
  paper_1.png          — Lime green:     Deckled Botanical Paper
  paper_2.jpeg         — Chartreuse:     Pink Sparkle Bow Paper
  paper_3.jpeg         — Yellow-green:   Floral Border Botanical Paper
  paper_4.jpeg         — Lime green:     Lavender Lined Paper
  paper_5.jpeg         — Lime green:     Cherry Blossom Deckled Paper

Outputs (vault/processed/ and vault/production_assets/):
  Each envelope → 4 PNGs + 4 WebPs: _closed, _open_full, _open_front, _open_back, plus _open_back_clean
  Each paper   → 1 PNG  + 1 WebP
  manifest.json + metadata.json
"""

import os
import sys
import json
import shutil
import numpy as np
from PIL import Image
from scipy import ndimage

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
VAULT_DIR = os.path.dirname(SCRIPT_DIR)
RAW_DIR = os.path.join(VAULT_DIR, "raw_inputs")
PROCESSED_DIR = os.path.join(VAULT_DIR, "processed")
PROD_DIR = os.path.join(VAULT_DIR, "production_assets")
BETTER_DIR = os.path.join(os.path.dirname(VAULT_DIR), "better")


# ─── COLOR KEYING ALGORITHMS ───────────────────────────────────────────────────

def blue_screen_key(img_rgb: np.ndarray, low_thresh=15.0, high_thresh=50.0, despill_factor=0.95):
    """Blue screen chroma key with blue despill. Used for env_1 (pure blue #0020ff BG)."""
    arr = img_rgb.astype(np.float32)
    max_rg = np.maximum(arr[:, :, 0], arr[:, :, 1])
    blue_diff = arr[:, :, 2] - max_rg
    alpha = 1.0 - np.clip((blue_diff - low_thresh) / (high_thresh - low_thresh), 0.0, 1.0)
    despill = arr.copy()
    excess_blue = np.maximum(0.0, despill[:, :, 2] - max_rg)
    despill[:, :, 2] -= excess_blue * despill_factor
    return np.dstack([despill, alpha * 255.0]).astype(np.uint8)


def kelly_green_key(img_rgb: np.ndarray, low_thresh=-18.0, high_thresh=25.0, despill_factor=0.95):
    """Kelly green chroma key with green despill. Used for env_2 (kelly green #03ab45 BG)."""
    arr = img_rgb.astype(np.float32)
    max_rb = np.maximum(arr[:, :, 0], arr[:, :, 2])
    green_diff = arr[:, :, 1] - max_rb
    alpha = 1.0 - np.clip((green_diff - low_thresh) / (high_thresh - low_thresh), 0.0, 1.0)
    despill = arr.copy()
    excess_green = np.maximum(0.0, despill[:, :, 1] - max_rb)
    despill[:, :, 1] -= excess_green * despill_factor
    return np.dstack([despill, alpha * 255.0]).astype(np.uint8)


def chartreuse_key(img_rgb: np.ndarray, bg_ref=None, dist_thresh=40.0, ramp=32.0, despill_factor=0.95):
    """Chartreuse / lime-yellow chroma key with despill."""
    arr = img_rgb.astype(np.float32)
    if bg_ref is None:
        bg_ref = np.array([175.0, 251.0, 4.0], dtype=np.float32)
    else:
        bg_ref = np.array(bg_ref, dtype=np.float32)
    dist = np.linalg.norm(arr - bg_ref, axis=-1)
    alpha = np.clip((dist - dist_thresh) / ramp, 0.0, 1.0)
    despill = arr.copy()
    max_rb = np.maximum(despill[:, :, 0], despill[:, :, 2])
    excess_green = np.maximum(0.0, despill[:, :, 1] - max_rb * 0.9)
    despill[:, :, 1] -= excess_green * despill_factor
    return np.dstack([despill, alpha * 255.0]).astype(np.uint8)


def paper_green_key(img_rgb: np.ndarray, bg_ref=None):
    """
    Precision paper key with erosion + Gaussian anti-aliasing.
    Works on lime/chartreuse backgrounds used for all papers.
    """
    arr = img_rgb.astype(np.float32)
    if bg_ref is None:
        bg_ref = np.array([214.6, 253.1, 81.1], dtype=np.float32)
    else:
        bg_ref = np.array(bg_ref, dtype=np.float32)
    dist = np.linalg.norm(arr - bg_ref, axis=-1)
    green_diff = arr[:, :, 1] - arr[:, :, 0]

    is_bg = (dist < 65.0) | (green_diff > -10.0)
    paper_binary = ~is_bg

    labeled, num_features = ndimage.label(paper_binary)
    if num_features > 0:
        sizes = ndimage.sum(paper_binary, labeled, range(1, num_features + 1))
        paper_mask = (labeled == (int(np.argmax(sizes)) + 1))
    else:
        paper_mask = paper_binary

    paper_mask = ndimage.binary_fill_holes(paper_mask)
    eroded_mask = ndimage.binary_erosion(paper_mask, iterations=2)
    alpha_smooth = ndimage.gaussian_filter(eroded_mask.astype(np.float32), sigma=0.75)
    alpha_smooth = np.clip(alpha_smooth, 0.0, 1.0)

    despill = arr.copy()
    edge_zone = (alpha_smooth > 0.0) & (alpha_smooth < 0.96)
    overgreen = (despill[:, :, 1] > despill[:, :, 0] * 0.86) & edge_zone
    despill[:, :, 1][overgreen] = despill[:, :, 0][overgreen] * 0.86

    return np.dstack([despill, alpha_smooth * 255.0]).astype(np.uint8)


# ─── FRONT POCKET LAYER EXTRACTION ────────────────────────────────────────────

def extract_pocket_layer(open_crop_rgba: np.ndarray, cut_y_start: int, v_center_y: int) -> np.ndarray:
    """Extracts front pocket layer (downward V-cut fold) from open envelope."""
    h, w, _ = open_crop_rgba.shape
    front = open_crop_rgba.copy()
    y_grid, x_grid = np.mgrid[:h, :w]

    slope = (v_center_y - cut_y_start) / (w / 2.0)
    dist_from_edge = np.minimum(x_grid, w - 1 - x_grid)
    fold_rim = cut_y_start + dist_from_edge * slope

    front_mask = (y_grid >= fold_rim)
    alpha_cut = ndimage.gaussian_filter(front_mask.astype(np.float32), sigma=0.8)
    front[:, :, 3] = np.clip(front[:, :, 3].astype(np.float32) * alpha_cut, 0, 255).astype(np.uint8)
    return front


# ─── CLEAN INTERIOR GENERATORS (Remove Mockup Beige Cards) ────────────────────

def clean_interior_lining(open_rgba: np.ndarray, env_id: str) -> np.ndarray:
    """
    Paints over the studio beige card tucked inside open envelopes,
    leaving a pristine empty interior lining of matching paper.
    """
    h, w = open_rgba.shape[:2]
    clean = open_rgba.copy()
    y_grid, x_grid = np.mgrid[:h, :w]

    if env_id == "env_1":
        card_mask = (clean[:, :, 1] > 195) & (clean[:, :, 0] - clean[:, :, 1] < 45) & (y_grid >= 230) & (y_grid <= 750) & (x_grid >= 70) & (x_grid <= w - 70)
        base = np.array([225, 163, 164], dtype=np.float32)
    elif env_id == "env_4":
        card_mask = (clean[:, :, 1] > 195) & (clean[:, :, 0] - clean[:, :, 1] < 45) & (y_grid >= 300) & (y_grid <= 970) & (x_grid >= 80) & (x_grid <= w - 80)
        base = np.array([220, 165, 172], dtype=np.float32)
    elif env_id == "env_5":
        card_mask = (clean[:, :, 0] > 195) & (clean[:, :, 1] > 185) & (clean[:, :, 0] - clean[:, :, 2] > 20) & (y_grid >= 280) & (y_grid <= 910) & (x_grid >= 70) & (x_grid <= w - 70)
        base = np.array([195, 175, 192], dtype=np.float32)
    else:
        return clean

    np.random.seed(42)
    noise = np.random.normal(0, 3, (h, w, 3))
    texture = np.clip(base + noise, 0, 255).astype(np.uint8)
    alpha_mask = ndimage.gaussian_filter(card_mask.astype(float), sigma=2.0)
    for c in range(3):
        clean[:, :, c] = np.clip(clean[:, :, c] * (1.0 - alpha_mask) + texture[:, :, c] * alpha_mask, 0, 255).astype(np.uint8)
    return clean


# ─── SAVE HELPERS ─────────────────────────────────────────────────────────────

def save_image_pair(img_rgba: np.ndarray, out_dir: str, base_name: str):
    """Saves RGBA array as both optimized PNG and lossless WebP."""
    os.makedirs(out_dir, exist_ok=True)
    im = Image.fromarray(img_rgba)
    png_path = os.path.join(out_dir, f"{base_name}.png")
    webp_path = os.path.join(out_dir, f"{base_name}.webp")
    im.save(png_path, "PNG", optimize=True)
    im.save(webp_path, "WEBP", lossless=True, quality=100)
    print(f"    ✓ {base_name}.png & .webp ({im.width}×{im.height})")
    return im.width, im.height


def crop_largest_component(rgba: np.ndarray):
    """Crops strictly to the largest connected alpha component (filters watermark icons)."""
    alpha = rgba[:, :, 3]
    binary = alpha > 20
    labeled, num = ndimage.label(binary)
    if num == 0:
        return rgba
    sizes = ndimage.sum(binary, labeled, range(1, num + 1))
    main_idx = int(np.argmax(sizes)) + 1
    main_mask = (labeled == main_idx)
    ys, xs = np.where(main_mask)
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def ensure_raw(src_name: str) -> str:
    """Ensures file is in raw_inputs/."""
    raw_path = os.path.join(RAW_DIR, src_name)
    if not os.path.exists(raw_path):
        better_path = os.path.join(BETTER_DIR, src_name)
        if os.path.exists(better_path):
            shutil.copy2(better_path, raw_path)
            print(f"  📋 Copied better/{src_name} → raw_inputs/")
        else:
            raise FileNotFoundError(f"Cannot find {src_name} in better/ or raw_inputs/")
    return raw_path


# ─── MAIN PIPELINE ────────────────────────────────────────────────────────────

def main():
    print("==================================================")
    print(" LETTERS (HG) — PRECISION ASSET EXTRACTION PIPELINE")
    print(" 5 Envelopes × 4 layers + 5 Papers × 1 layer")
    print("==================================================")

    os.makedirs(PROCESSED_DIR, exist_ok=True)
    os.makedirs(PROD_DIR, exist_ok=True)
    os.makedirs(RAW_DIR, exist_ok=True)

    manifest = {
        "project": "Letters (HG)",
        "generatedAt": "2026-09-20",
        "description": "Production-ready transparent stationery assets extracted from studio mockups",
        "envelopes": {},
        "papers": {}
    }

    # ─────────────────────────────────────────────────────────────────
    # SET 1: env_1.jpeg  — Rose Silk Ribbon & Bow  (Blue screen BG)
    # ─────────────────────────────────────────────────────────────────
    print("\n[1/5] Processing Set 1: Rose Silk Ribbon & Bow (env_1.jpeg) …")
    env1_path = ensure_raw("env_1.jpeg")
    env1_raw = np.array(Image.open(env1_path).convert("RGB"))
    env1_rgba = blue_screen_key(env1_raw)

    ys1_o, xs1_o = np.where(env1_rgba[:, :1300, 3] > 20)
    open1 = env1_rgba[ys1_o.min():ys1_o.max() + 1, xs1_o.min():xs1_o.max() + 1]

    ys1_c, xs1_c = np.where(env1_rgba[:, 1300:, 3] > 20)
    xs1_c += 1300
    closed1 = env1_rgba[ys1_c.min():ys1_c.max() + 1, xs1_c.min():xs1_c.max() + 1]

    front1 = extract_pocket_layer(open1, cut_y_start=345, v_center_y=720)
    back1_clean = clean_interior_lining(open1, "env_1")

    set1_dir = os.path.join(PROD_DIR, "env_1_rose_silk")
    for d in [PROCESSED_DIR, set1_dir]:
        save_image_pair(closed1, d, "env_1_closed")
        save_image_pair(open1,   d, "env_1_open_full")
        save_image_pair(front1,  d, "env_1_open_front")
        save_image_pair(open1,   d, "env_1_open_back")
        save_image_pair(back1_clean, d, "env_1_open_back_clean")

    manifest["envelopes"]["env_1"] = {
        "title": "Rose Silk Ribbon & Bow",
        "badge": "Silk Bow",
        "aesthetic": "Pink handmade paper, vertical & horizontal rose silk ribbon, bow knot, heart pin",
        "folder": "env_1_rose_silk",
        "closed": {"file": "env_1_closed.webp", "w": closed1.shape[1], "h": closed1.shape[0], "aspect": round(closed1.shape[1] / closed1.shape[0], 4)},
        "openFull": {"file": "env_1_open_full.webp", "w": open1.shape[1], "h": open1.shape[0], "aspect": round(open1.shape[1] / open1.shape[0], 4)},
        "openFront": {"file": "env_1_open_front.webp", "w": front1.shape[1], "h": front1.shape[0], "zIndex": 3},
        "openBack":  {"file": "env_1_open_back_clean.webp",  "w": back1_clean.shape[1],  "h": back1_clean.shape[0],  "zIndex": 1},
        "pocketCut": {"cut_y_start": 345, "v_center_y": 720},
        "recommendedPaperFit": {"scaleWidthPercent": 77.5, "tuckTopPercent": 48.0, "unfoldTopPercent": -20.0}
    }

    # ─────────────────────────────────────────────────────────────────
    # SET 2: env_2.jpeg  — Ceramic Floral Brooch  (Kelly green BG)
    # ─────────────────────────────────────────────────────────────────
    print("\n[2/5] Processing Set 2: Ceramic Floral Brooch (env_2.jpeg) …")
    env2_path = ensure_raw("env_2.jpeg")
    env2_raw = np.array(Image.open(env2_path).convert("RGB"))
    env2_rgba = kelly_green_key(env2_raw)

    ys2_c, xs2_c = np.where(env2_rgba[:, :1350, 3] > 20)
    closed2 = env2_rgba[ys2_c.min():ys2_c.max() + 1, xs2_c.min():xs2_c.max() + 1]

    ys2_o, xs2_o = np.where(env2_rgba[:, 1350:, 3] > 20)
    xs2_o += 1350
    open2 = env2_rgba[ys2_o.min():ys2_o.max() + 1, xs2_o.min():xs2_o.max() + 1]

    front2 = extract_pocket_layer(open2, cut_y_start=340, v_center_y=710)
    back2 = open2.copy()

    set2_dir = os.path.join(PROD_DIR, "env_2_ceramic_flower")
    for d in [PROCESSED_DIR, set2_dir]:
        save_image_pair(closed2, d, "env_2_closed")
        save_image_pair(open2,   d, "env_2_open_full")
        save_image_pair(front2,  d, "env_2_open_front")
        save_image_pair(back2,   d, "env_2_open_back")

    manifest["envelopes"]["env_2"] = {
        "title": "Ceramic Floral Brooch & Golden Twig",
        "badge": "Ceramic Brooch",
        "aesthetic": "Pink artisanal paper, sculpted pink ceramic blossom seal, tucked brass twig",
        "folder": "env_2_ceramic_flower",
        "closed": {"file": "env_2_closed.webp", "w": closed2.shape[1], "h": closed2.shape[0], "aspect": round(closed2.shape[1] / closed2.shape[0], 4)},
        "openFull": {"file": "env_2_open_full.webp", "w": open2.shape[1], "h": open2.shape[0], "aspect": round(open2.shape[1] / open2.shape[0], 4)},
        "openFront": {"file": "env_2_open_front.webp", "w": front2.shape[1], "h": front2.shape[0], "zIndex": 3},
        "openBack":  {"file": "env_2_open_back.webp",  "w": back2.shape[1],  "h": back2.shape[0],  "zIndex": 1},
        "pocketCut": {"cut_y_start": 340, "v_center_y": 710},
        "recommendedPaperFit": {"scaleWidthPercent": 76.0, "tuckTopPercent": 48.0, "unfoldTopPercent": -20.0}
    }

    # ─────────────────────────────────────────────────────────────────
    # SET 3: env_3.jpeg  — Pressed Botanical Flowers & Stamp  (Chartreuse BG)
    # ─────────────────────────────────────────────────────────────────
    print("\n[3/5] Processing Set 3: Pressed Flowers & Vintage Stamp (env_3.jpeg) …")
    env3_path = ensure_raw("env_3.jpeg")
    env3_raw = np.array(Image.open(env3_path).convert("RGB"))
    env3_rgba = chartreuse_key(env3_raw, bg_ref=[175.0, 251.0, 4.0])

    ys3_o, xs3_o = np.where(env3_rgba[:, :1350, 3] > 20)
    open3 = env3_rgba[ys3_o.min():ys3_o.max() + 1, xs3_o.min():xs3_o.max() + 1]

    ys3_c, xs3_c = np.where(env3_rgba[:, 1350:, 3] > 20)
    xs3_c += 1350
    closed3 = env3_rgba[ys3_c.min():ys3_c.max() + 1, xs3_c.min():xs3_c.max() + 1]

    front3 = extract_pocket_layer(open3, cut_y_start=380, v_center_y=790)
    back3 = open3.copy()

    set3_dir = os.path.join(PROD_DIR, "env_3_botanical_stamp")
    for d in [PROCESSED_DIR, set3_dir]:
        save_image_pair(closed3, d, "env_3_closed")
        save_image_pair(open3,   d, "env_3_open_full")
        save_image_pair(front3,  d, "env_3_open_front")
        save_image_pair(back3,   d, "env_3_open_back")

    manifest["envelopes"]["env_3"] = {
        "title": "Pressed Botanical Flowers & Vintage Stamp",
        "badge": "Vintage Postage",
        "aesthetic": "Blush speckled paper, delicate pressed flower branches, vintage engraved rose stamp",
        "folder": "env_3_botanical_stamp",
        "closed": {"file": "env_3_closed.webp", "w": closed3.shape[1], "h": closed3.shape[0], "aspect": round(closed3.shape[1] / closed3.shape[0], 4)},
        "openFull": {"file": "env_3_open_full.webp", "w": open3.shape[1], "h": open3.shape[0], "aspect": round(open3.shape[1] / open3.shape[0], 4)},
        "openFront": {"file": "env_3_open_front.webp", "w": front3.shape[1], "h": front3.shape[0], "zIndex": 3},
        "openBack":  {"file": "env_3_open_back.webp",  "w": back3.shape[1],  "h": back3.shape[0],  "zIndex": 1},
        "pocketCut": {"cut_y_start": 380, "v_center_y": 790},
        "recommendedPaperFit": {"scaleWidthPercent": 75.0, "tuckTopPercent": 48.0, "unfoldTopPercent": -20.0}
    }

    # ─────────────────────────────────────────────────────────────────
    # SET 4: env_4_open/closed.jpeg  — Pink Floral Heart Envelope
    # Exact connected component (rejects bottom-right watermark)
    # ─────────────────────────────────────────────────────────────────
    print("\n[4/5] Processing Set 4: Pink Floral Heart Envelope (env_4) …")
    env4_open_path   = ensure_raw("env_4_open.jpeg")
    env4_closed_path = ensure_raw("env_4_closed.jpeg")

    # Open Envelope
    im4_o = Image.open(env4_open_path).convert('RGB')
    arr4_o = np.array(im4_o)
    bg4 = np.array([205.0, 250.0, 2.0], dtype=np.float32)
    dist4_o = np.linalg.norm(arr4_o.astype(np.float32) - bg4, axis=-1)
    non_bg4_o = dist4_o > 40.0
    labeled4_o, num4_o = ndimage.label(non_bg4_o)
    sizes4_o = ndimage.sum(non_bg4_o, labeled4_o, range(1, num4_o + 1))
    main_mask4_o = (labeled4_o == (int(np.argmax(sizes4_o)) + 1))
    ys4_o, xs4_o = np.where(main_mask4_o)
    crop4_o = arr4_o[ys4_o.min():ys4_o.max() + 1, xs4_o.min():xs4_o.max() + 1]
    h4, w4 = crop4_o.shape[:2]

    # Chroma key + despill on envelope crop
    dist_crop4 = np.linalg.norm(crop4_o.astype(np.float32) - bg4, axis=-1)
    alpha4_o = np.clip((dist_crop4 - 38.0) / 32.0, 0.0, 1.0)
    despill4_o = crop4_o.copy().astype(np.float32)
    max_rb4_o = np.maximum(despill4_o[:, :, 0], despill4_o[:, :, 2])
    excess4_o = np.maximum(0.0, despill4_o[:, :, 1] - max_rb4_o * 0.9)
    despill4_o[:, :, 1] -= excess4_o * 0.95
    open4 = np.dstack([despill4_o.astype(np.uint8), (alpha4_o * 255.0).astype(np.uint8)])

    # Precision V-cut front pocket:
    # Edges at y=510, Center V reaches heart top at y=970
    front4 = extract_pocket_layer(open4, cut_y_start=510, v_center_y=970)
    back4_clean = clean_interior_lining(open4, "env_4")

    # Closed Envelope
    im4_c = Image.open(env4_closed_path).convert('RGB')
    arr4_c = np.array(im4_c)
    bg4_c = np.array([205.0, 247.0, 0.0], dtype=np.float32)
    dist4_c = np.linalg.norm(arr4_c.astype(np.float32) - bg4_c, axis=-1)
    non_bg4_c = dist4_c > 40.0
    labeled4_c, num4_c = ndimage.label(non_bg4_c)
    sizes4_c = ndimage.sum(non_bg4_c, labeled4_c, range(1, num4_c + 1))
    main_mask4_c = (labeled4_c == (int(np.argmax(sizes4_c)) + 1))
    ys4_c, xs4_c = np.where(main_mask4_c)
    crop4_c = arr4_c[ys4_c.min():ys4_c.max() + 1, xs4_c.min():xs4_c.max() + 1]

    dist_crop4_c = np.linalg.norm(crop4_c.astype(np.float32) - bg4_c, axis=-1)
    alpha4_c = np.clip((dist_crop4_c - 38.0) / 32.0, 0.0, 1.0)
    despill4_c = crop4_c.copy().astype(np.float32)
    max_rb4_c = np.maximum(despill4_c[:, :, 0], despill4_c[:, :, 2])
    excess4_c = np.maximum(0.0, despill4_c[:, :, 1] - max_rb4_c * 0.9)
    despill4_c[:, :, 1] -= excess4_c * 0.95
    closed4 = np.dstack([despill4_c.astype(np.uint8), (alpha4_c * 255.0).astype(np.uint8)])

    set4_dir = os.path.join(PROD_DIR, "env_4_pink_heart")
    for d in [PROCESSED_DIR, set4_dir]:
        save_image_pair(closed4, d, "env_4_closed")
        save_image_pair(open4,   d, "env_4_open_full")
        save_image_pair(front4,  d, "env_4_open_front")
        save_image_pair(back4_clean, d, "env_4_open_back")
        save_image_pair(back4_clean, d, "env_4_open_back_clean")

    manifest["envelopes"]["env_4"] = {
        "title": "Pink Floral Heart Envelope",
        "badge": "Heart Seal",
        "aesthetic": "Soft pink handmade paper, scattered floral sprigs, 3D heart seal, warm botanical details",
        "folder": "env_4_pink_heart",
        "closed": {"file": "env_4_closed.webp", "w": closed4.shape[1], "h": closed4.shape[0], "aspect": round(closed4.shape[1] / closed4.shape[0], 4)},
        "openFull": {"file": "env_4_open_full.webp", "w": open4.shape[1], "h": open4.shape[0], "aspect": round(open4.shape[1] / open4.shape[0], 4)},
        "openFront": {"file": "env_4_open_front.webp", "w": front4.shape[1], "h": front4.shape[0], "zIndex": 3},
        "openBack":  {"file": "env_4_open_back.webp",  "w": back4_clean.shape[1],  "h": back4_clean.shape[0],  "zIndex": 1},
        "pocketCut": {"cut_y_start": 510, "v_center_y": 970},
        "recommendedPaperFit": {"scaleWidthPercent": 76.0, "tuckTopPercent": 48.0, "unfoldTopPercent": -20.0}
    }

    # ─────────────────────────────────────────────────────────────────
    # SET 5: env_5_open/closed.jpeg  — Lavender Floral Envelope
    # Geometric flap boundary + edge feathering + clean pocket
    # ─────────────────────────────────────────────────────────────────
    print("\n[5/5] Processing Set 5: Lavender Floral Envelope (env_5) …")
    env5_open_path   = ensure_raw("env_5_open.jpeg")
    env5_closed_path = ensure_raw("env_5_closed.jpeg")

    # Open Envelope: exact crop x=[716, 2006], y=[41, 1442]
    im5_o = Image.open(env5_open_path).convert('RGB')
    arr5_o = np.array(im5_o)
    crop5_o = arr5_o[41:1443, 716:2007]
    h5, w5 = crop5_o.shape[:2]

    # Geometric flap keying: flap apex at (w/2, 0), shoulders at (0, 475) and (w-1, 475)
    y_grid5, x_grid5 = np.mgrid[:h5, :w5]
    apex_x5 = w5 / 2.0
    dist_from_center5 = np.abs(x_grid5 - apex_x5)
    flap_top_rim5 = (475.0 / (w5 / 2.0)) * dist_from_center5
    is_outside_top5 = (y_grid5 < flap_top_rim5)

    alpha5_o = (~is_outside_top5).astype(np.float32)
    alpha5_o = ndimage.gaussian_filter(alpha5_o, sigma=0.6)
    alpha5_o = np.clip(alpha5_o, 0.0, 1.0) * 255.0
    open5 = np.dstack([crop5_o, alpha5_o.astype(np.uint8)])

    # Precision downward V pocket: edges at y=475, center V at y=910
    front5 = extract_pocket_layer(open5, cut_y_start=475, v_center_y=910)
    back5_clean = clean_interior_lining(open5, "env_5")

    # Closed Envelope
    im5_c = Image.open(env5_closed_path).convert('RGB')
    arr5_c = np.array(im5_c)
    bg5_c = np.array([246.0, 221.0, 216.0], dtype=np.float32)
    dist5_c = np.linalg.norm(arr5_c.astype(np.float32) - bg5_c, axis=-1)
    is_env5_c = dist5_c > 22.0
    labeled5_c, num5_c = ndimage.label(is_env5_c)
    sizes5_c = ndimage.sum(is_env5_c, labeled5_c, range(1, num5_c + 1))
    main_mask5_c = (labeled5_c == (int(np.argmax(sizes5_c)) + 1))
    ys5_c, xs5_c = np.where(main_mask5_c)

    crop5_c = arr5_c[ys5_c.min():ys5_c.max() + 1, xs5_c.min():xs5_c.max() + 1]
    dist_crop5_c = np.linalg.norm(crop5_c.astype(np.float32) - bg5_c, axis=-1)
    alpha5_c = np.clip((dist_crop5_c - 18.0) / 20.0, 0.0, 1.0)
    closed5 = np.dstack([crop5_c, (alpha5_c * 255.0).astype(np.uint8)])

    set5_dir = os.path.join(PROD_DIR, "env_5_lavender_floral")
    for d in [PROCESSED_DIR, set5_dir]:
        save_image_pair(closed5, d, "env_5_closed")
        save_image_pair(open5,   d, "env_5_open_full")
        save_image_pair(front5,  d, "env_5_open_front")
        save_image_pair(back5_clean, d, "env_5_open_back")
        save_image_pair(back5_clean, d, "env_5_open_back_clean")

    manifest["envelopes"]["env_5"] = {
        "title": "Lavender Floral Envelope",
        "badge": "Lavender Blooms",
        "aesthetic": "Soft lavender textured paper, scattered 3D mini cosmos flowers in lilac & gold, stamp & postmark",
        "folder": "env_5_lavender_floral",
        "closed": {"file": "env_5_closed.webp", "w": closed5.shape[1], "h": closed5.shape[0], "aspect": round(closed5.shape[1] / closed5.shape[0], 4)},
        "openFull": {"file": "env_5_open_full.webp", "w": open5.shape[1], "h": open5.shape[0], "aspect": round(open5.shape[1] / open5.shape[0], 4)},
        "openFront": {"file": "env_5_open_front.webp", "w": front5.shape[1], "h": front5.shape[0], "zIndex": 3},
        "openBack":  {"file": "env_5_open_back.webp",  "w": back5_clean.shape[1],  "h": back5_clean.shape[0],  "zIndex": 1},
        "pocketCut": {"cut_y_start": 475, "v_center_y": 910},
        "recommendedPaperFit": {"scaleWidthPercent": 77.0, "tuckTopPercent": 48.0, "unfoldTopPercent": -20.0}
    }

    # ─────────────────────────────────────────────────────────────────
    # PAPERS (1 through 5)
    # ─────────────────────────────────────────────────────────────────
    papers_info = [
        ("paper_1", "paper_1.png", [214.6, 253.1, 81.1], "paper_1_botanical", "Deckled Botanical Stationery", "Pressed Florals",
         "Soft pink handmade deckled paper, dried pink blossom sprig, washi tape",
         {"top": "12%", "left": "12%", "right": "16%", "bottom": "18%"}),
        ("paper_2", "paper_2.jpeg", [205.0, 253.0, 2.0], "paper_2_sparkle_bow", "Pink Sparkle Bow Stationery", "Sparkle Bow",
         "Blush pink deckled paper, 4-point sparkle stars in corner, ribbon bow detail at bottom-right",
         {"top": "14%", "left": "14%", "right": "14%", "bottom": "18%"}),
        ("paper_3", "paper_3.jpeg", [232.0, 236.0, 65.0], "paper_3_floral_border", "Floral Border Botanical Paper", "Botanical Border",
         "Pink handmade textured paper, decorative border of pink & red botanical sprigs and berries",
         {"top": "15%", "left": "18%", "right": "18%", "bottom": "16%"}),
        ("paper_4", "paper_4.jpeg", [224.0, 248.0, 2.0], "paper_4_lavender_lined", "Lavender Lined Stationery", "Lavender Lines",
         "Soft lavender/lilac paper with horizontal ruled lines, lavender flower bunch with kraft tape at lower-right",
         {"top": "11%", "left": "14%", "right": "14%", "bottom": "22%"}),
        ("paper_5", "paper_5.jpeg", [234.0, 251.0, 5.0], "paper_5_cherry_blossom", "Cherry Blossom Deckled Paper", "Cherry Blossoms",
         "Warm ivory deckled handmade paper, cherry blossom corners with pink decorative border",
         {"top": "16%", "left": "18%", "right": "18%", "bottom": "16%"}),
    ]

    for p_id, p_src, p_bg, p_folder, p_title, p_badge, p_aest, p_safe in papers_info:
        print(f"\n[Paper] Processing {p_title} ({p_src}) …")
        p_path = ensure_raw(p_src)
        p_raw = np.array(Image.open(p_path).convert("RGB"))
        p_rgba = paper_green_key(p_raw, bg_ref=p_bg)
        p_crop = crop_largest_component(p_rgba)

        p_dir = os.path.join(PROD_DIR, p_folder)
        for d in [PROCESSED_DIR, p_dir]:
            save_image_pair(p_crop, d, p_id)

        manifest["papers"][p_id] = {
            "title": p_title,
            "badge": p_badge,
            "aesthetic": p_aest,
            "folder": p_folder,
            "file": f"{p_id}.webp",
            "w": p_crop.shape[1],
            "h": p_crop.shape[0],
            "aspect": round(p_crop.shape[1] / p_crop.shape[0], 4),
            "safeArea": p_safe,
            "paddingCss": f"{p_safe['top']} {p_safe['right']} {p_safe['bottom']} {p_safe['left']}"
        }

    # Save manifest
    for out_meta in [os.path.join(PROCESSED_DIR, "metadata.json"), os.path.join(PROD_DIR, "manifest.json")]:
        with open(out_meta, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
    print(f"\n✓ manifest.json saved")

    print("\n" + "="*50)
    print("✓ ALL 5 ENVELOPES & 5 PAPERS FULLY EXTRACTED & CALIBRATED!")
    print("="*50)


if __name__ == "__main__":
    main()

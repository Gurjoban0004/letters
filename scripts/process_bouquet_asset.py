#!/usr/bin/env python3
"""Normalize one transparent bouquet asset into full and thumbnail WebP files."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


FULL_SIZE = (768, 1024)
THUMB_SIZE = (192, 192)
ALPHA_THRESHOLD = 8


def alpha_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > ALPHA_THRESHOLD else 0)
    bounds = mask.getbbox()
    if bounds is None:
        raise ValueError("The source has no visible pixels.")
    return bounds


def normalized_canvas(
    source: Image.Image,
    relative_height: float,
    anchor_x: float,
    anchor_y: float,
    render_scale: float,
) -> Image.Image:
    cropped = source.crop(alpha_bounds(source))
    target_height = round(890 * relative_height * render_scale)
    target_height = min(target_height, round(FULL_SIZE[1] * 0.9))
    target_width = round(cropped.width * target_height / cropped.height)
    max_width = round(FULL_SIZE[0] * 0.88)
    if target_width > max_width:
        target_width = max_width
        target_height = round(cropped.height * target_width / cropped.width)

    resized = cropped.resize((target_width, target_height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", FULL_SIZE, (0, 0, 0, 0))
    base_x = round(FULL_SIZE[0] * anchor_x)
    base_y = round(FULL_SIZE[1] * anchor_y)
    paste_x = max(0, min(FULL_SIZE[0] - target_width, base_x - target_width // 2))
    paste_y = max(0, min(FULL_SIZE[1] - target_height, base_y - target_height))
    canvas.alpha_composite(resized, (paste_x, paste_y))
    return canvas


def thumbnail(full: Image.Image) -> Image.Image:
    preview = full.copy()
    preview.thumbnail(THUMB_SIZE, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", THUMB_SIZE, (0, 0, 0, 0))
    canvas.alpha_composite(
        preview,
        ((THUMB_SIZE[0] - preview.width) // 2, (THUMB_SIZE[1] - preview.height) // 2),
    )
    return canvas


def save_to_budget(image: Image.Image, output: Path, budget: int, start_quality: int) -> int:
    output.parent.mkdir(parents=True, exist_ok=True)
    for quality in range(start_quality, 19, -3):
        image.save(output, "WEBP", quality=quality, method=6, exact=True)
        if output.stat().st_size <= budget:
            return quality
    raise ValueError(f"{output} could not meet the {budget}-byte budget.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--slug", required=True)
    parser.add_argument("--relative-height", type=float, required=True)
    parser.add_argument("--category", choices=("flowers", "greenery"), default="flowers")
    parser.add_argument("--anchor-x", type=float, default=0.5)
    parser.add_argument("--anchor-y", type=float, default=0.94)
    parser.add_argument("--render-scale", type=float, default=1)
    parser.add_argument("--output-root", type=Path, default=Path("public/bouquets"))
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGBA")
    full = normalized_canvas(source, args.relative_height, args.anchor_x, args.anchor_y, args.render_scale)
    thumb = thumbnail(full)
    full_path = args.output_root / args.category / f"{args.slug}.webp"
    thumb_path = args.output_root / "thumbs" / f"{args.slug}.webp"
    full_quality = save_to_budget(full, full_path, 150_000, 82)
    thumb_quality = save_to_budget(thumb, thumb_path, 15_000, 80)
    print(
        f"{args.slug}: full={full_path.stat().st_size}B q{full_quality}, "
        f"thumb={thumb_path.stat().st_size}B q{thumb_quality}"
    )


if __name__ == "__main__":
    main()

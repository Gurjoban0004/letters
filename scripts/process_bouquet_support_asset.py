#!/usr/bin/env python3
"""Normalize and recolor registered wrap or ribbon artwork."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps


ALPHA_THRESHOLD = 8
WRAP_COLORS = {
    "blush": None,
    "parchment": ("#9f8973", "#fff6e7"),
    "lavender": ("#75657f", "#eee7f5"),
    "sage": ("#61705d", "#e6eee1"),
}
RIBBON_COLORS = {
    "rose": None,
    "peach": ("#a96f61", "#f8d8c9"),
    "lavender": ("#74607f", "#e6d9ee"),
    "sage": ("#63745f", "#dce8d6"),
}


def visible_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    mask = image.getchannel("A").point(lambda value: 255 if value > ALPHA_THRESHOLD else 0)
    bounds = mask.getbbox()
    if bounds is None:
        raise ValueError("The source has no visible pixels.")
    return bounds


def normalize(source: Image.Image, size: tuple[int, int], fill: float) -> Image.Image:
    cropped = source.crop(visible_bounds(source))
    max_width = round(size[0] * fill)
    max_height = round(size[1] * fill)
    scale = min(max_width / cropped.width, max_height / cropped.height)
    resized = cropped.resize(
        (round(cropped.width * scale), round(cropped.height * scale)),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((size[0] - resized.width) // 2, (size[1] - resized.height) // 2))
    return canvas


def recolor(image: Image.Image, colors: tuple[str, str] | None) -> Image.Image:
    if colors is None:
        return image.copy()
    alpha = image.getchannel("A")
    grayscale = ImageOps.grayscale(image.convert("RGB"))
    tinted = ImageOps.colorize(grayscale, colors[0], colors[1]).convert("RGBA")
    tinted.putalpha(alpha)
    return tinted


def wrap_front(image: Image.Image) -> Image.Image:
    width, height = image.size
    alpha = image.getchannel("A")
    mask = Image.new("L", image.size, 0)
    pixels = mask.load()
    for x in range(width):
        center_weight = 1 - abs((2 * x / max(1, width - 1)) - 1)
        cutoff = round(height * (0.5 + 0.15 * center_weight))
        for y in range(max(0, cutoff - 10), height):
            pixels[x, y] = 255 if y >= cutoff else round(255 * (y - cutoff + 10) / 10)
    front = image.copy()
    front.putalpha(Image.composite(alpha, Image.new("L", image.size, 0), mask))
    return front


def save(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", quality=82, method=6, exact=True)


def thumbnail(image: Image.Image) -> Image.Image:
    preview = image.copy()
    preview.thumbnail((192, 192), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (192, 192), (0, 0, 0, 0))
    canvas.alpha_composite(preview, ((192 - preview.width) // 2, (192 - preview.height) // 2))
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--kind", choices=("wrap", "ribbon"), required=True)
    parser.add_argument("--output-root", type=Path, default=Path("public/bouquets"))
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGBA")
    if args.kind == "wrap":
        normalized = normalize(source, (1024, 1024), 0.94)
        for name, colors in WRAP_COLORS.items():
            variant = recolor(normalized, colors)
            save(variant, args.output_root / "wraps" / f"{name}-back.webp")
            save(wrap_front(variant), args.output_root / "wraps" / f"{name}-front.webp")
            save(thumbnail(variant), args.output_root / "thumbs" / f"wrap-{name}.webp")
    else:
        normalized = normalize(source, (1024, 640), 0.9)
        for name, colors in RIBBON_COLORS.items():
            variant = recolor(normalized, colors)
            save(variant, args.output_root / "ribbons" / f"{name}.webp")
            save(thumbnail(variant), args.output_root / "thumbs" / f"ribbon-{name}.webp")


if __name__ == "__main__":
    main()

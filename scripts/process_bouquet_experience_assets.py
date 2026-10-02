#!/usr/bin/env python3
"""Normalize Bloom reveal artwork and compose reusable experience assets."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps


ALPHA_THRESHOLD = 8


def visible_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A").point(lambda value: 255 if value > ALPHA_THRESHOLD else 0)
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("The source has no visible pixels.")
    return bounds


def normalize(source: Image.Image, size: tuple[int, int], fill: float) -> Image.Image:
    cropped = source.convert("RGBA").crop(visible_bounds(source.convert("RGBA")))
    scale = min(size[0] * fill / cropped.width, size[1] * fill / cropped.height)
    resized = cropped.resize(
        (round(cropped.width * scale), round(cropped.height * scale)),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((size[0] - resized.width) // 2, (size[1] - resized.height) // 2))
    return canvas


def save_budget(image: Image.Image, path: Path, budget: int, quality: int = 82) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    for candidate in range(quality, 27, -3):
        image.save(path, "WEBP", quality=candidate, method=6, exact=True)
        if path.stat().st_size <= budget:
            return candidate
    raise ValueError(f"{path} could not meet the {budget}-byte budget.")


def place_at_base(
    canvas: Image.Image,
    source: Image.Image,
    base: tuple[int, int],
    scale: float,
    angle: float = 0,
    anchor_y: float = 0.94,
) -> None:
    width = round(source.width * scale)
    height = round(source.height * scale)
    resized = source.resize((width, height), Image.Resampling.LANCZOS)
    anchor = (width // 2, round(height * anchor_y))
    side = max(width, height) * 2
    layer = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    layer.alpha_composite(resized, (side // 2 - anchor[0], side // 2 - anchor[1]))
    if angle:
        layer = layer.rotate(angle, resample=Image.Resampling.BICUBIC, center=(side // 2, side // 2))
    canvas.alpha_composite(layer, (base[0] - side // 2, base[1] - side // 2))


def compose_hero(root: Path) -> Image.Image:
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    wrap_back = Image.open(root / "wraps/blush-back.webp").convert("RGBA")
    wrap_front = Image.open(root / "wraps/blush-front.webp").convert("RGBA")
    ribbon = Image.open(root / "ribbons/rose.webp").convert("RGBA")
    place_at_base(canvas, wrap_back, (512, 945), 0.72, anchor_y=0.92)

    layers = [
        ("greenery/fern.webp", (390, 875), 0.62, 17),
        ("greenery/olive-branch.webp", (640, 875), 0.62, -17),
        ("greenery/eucalyptus.webp", (505, 860), 0.65, 2),
        ("flowers/lavender.webp", (380, 875), 0.53, 13),
        ("flowers/babys-breath.webp", (660, 880), 0.5, -13),
        ("flowers/hydrangea-lilac.webp", (665, 880), 0.52, -8),
        ("flowers/daisy-cream.webp", (345, 875), 0.5, 13),
        ("flowers/tulip-rose.webp", (560, 855), 0.56, -5),
        ("flowers/rose-blush.webp", (390, 880), 0.58, 8),
        ("flowers/peony-pink.webp", (510, 890), 0.64, 0),
        ("flowers/ranunculus-peach.webp", (625, 890), 0.54, -8),
        ("flowers/rose-blush.webp", (690, 890), 0.52, -14),
    ]
    for relative, base, scale, angle in layers:
        place_at_base(canvas, Image.open(root / relative).convert("RGBA"), base, scale, angle)

    place_at_base(canvas, wrap_front, (512, 945), 0.72, anchor_y=0.92)
    place_at_base(canvas, ribbon, (512, 862), 0.42, anchor_y=0.5)
    return canvas


def compose_corner(root: Path) -> Image.Image:
    canvas = Image.new("RGBA", (768, 768), (0, 0, 0, 0))
    layers = [
        ("greenery/fern.webp", (610, 750), 0.78, -26),
        ("greenery/eucalyptus.webp", (660, 748), 0.72, -13),
        ("flowers/lavender.webp", (565, 752), 0.62, -21),
        ("flowers/daisy-cream.webp", (650, 752), 0.62, -8),
        ("flowers/rose-blush.webp", (705, 758), 0.68, 8),
    ]
    for relative, base, scale, angle in layers:
        place_at_base(canvas, Image.open(root / relative).convert("RGBA"), base, scale, angle)
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--closed", type=Path, required=True)
    parser.add_argument("--open", type=Path, required=True)
    parser.add_argument("--seal", type=Path, required=True)
    parser.add_argument("--note", type=Path, required=True)
    parser.add_argument("--paper", type=Path, required=True)
    parser.add_argument("--output-root", type=Path, default=Path("public/bouquets"))
    args = parser.parse_args()

    output = args.output_root / "experience"
    assets = {
        "envelope-closed": (normalize(Image.open(args.closed), (1280, 900), 0.92), 300_000),
        "envelope-open": (normalize(Image.open(args.open), (1280, 960), 0.92), 300_000),
        "heart-seal": (normalize(Image.open(args.seal), (512, 512), 0.9), 100_000),
        "note-paper": (normalize(Image.open(args.note), (768, 1024), 0.94), 250_000),
        "hero-bouquet": (compose_hero(args.output_root), 500_000),
        "botanical-corner": (compose_corner(args.output_root), 250_000),
    }
    for slug, (image, budget) in assets.items():
        quality = save_budget(image, output / f"{slug}.webp", budget)
        print(f"{slug}: {image.width}x{image.height}, {output.joinpath(slug + '.webp').stat().st_size}B q{quality}")

    paper = ImageOps.fit(Image.open(args.paper).convert("RGB"), (1536, 1024), method=Image.Resampling.LANCZOS)
    quality = save_budget(paper, output / "paper-bouquet-soft.webp", 350_000, 80)
    print(f"paper-bouquet-soft: 1536x1024, {output.joinpath('paper-bouquet-soft.webp').stat().st_size}B q{quality}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Generate Android icon + splash PNGs from SVG sources.
Run from /app/frontend/ before running `npx cap sync android`.
"""
import cairosvg, os, sys, io
from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))

ICON_SVG = os.path.join(BASE, "icon.svg")
SPLASH_SVG = os.path.join(BASE, "splash.svg")

# Android launcher icon sizes (mipmap-*)
ICON_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
# Android splash sizes (drawable-*)
SPLASH_SIZES = {
    "drawable-mdpi": (320, 480),
    "drawable-hdpi": (480, 800),
    "drawable-xhdpi": (720, 1280),
    "drawable-xxhdpi": (960, 1600),
    "drawable-xxxhdpi": (1280, 1920),
    "drawable-land-mdpi": (480, 320),
    "drawable-land-hdpi": (800, 480),
    "drawable-land-xhdpi": (1280, 720),
    "drawable-land-xxhdpi": (1600, 960),
    "drawable-land-xxxhdpi": (1920, 1280),
    "drawable-port-mdpi": (320, 480),
    "drawable-port-hdpi": (480, 800),
    "drawable-port-xhdpi": (720, 1280),
    "drawable-port-xxhdpi": (960, 1600),
    "drawable-port-xxxhdpi": (1280, 1920),
}

ANDROID_RES = os.path.join(BASE, "..", "android", "app", "src", "main", "res")


def svg_to_png(svg_path, out_path, width, height=None):
    height = height or width
    png_bytes = cairosvg.svg2png(
        url=svg_path, output_width=width, output_height=height
    )
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(png_bytes)


def gen_icons():
    for folder, size in ICON_SIZES.items():
        out_folder = os.path.join(ANDROID_RES, folder)
        for name in ("ic_launcher", "ic_launcher_round", "ic_launcher_foreground"):
            svg_to_png(ICON_SVG, os.path.join(out_folder, f"{name}.png"), size)
        print(f"  ✓ {folder} @ {size}px")


def gen_splash():
    for folder, (w, h) in SPLASH_SIZES.items():
        out = os.path.join(ANDROID_RES, folder, "splash.png")
        svg_to_png(SPLASH_SVG, out, w, h)
        print(f"  ✓ {folder} {w}x{h}")


if __name__ == "__main__":
    if not os.path.isdir(os.path.join(BASE, "..", "android")):
        print("android/ folder not found — run `npx cap add android` first.")
        sys.exit(1)
    print("Generating icons…")
    gen_icons()
    print("Generating splash…")
    gen_splash()
    print("Done. Now run: cd /app/frontend && npx cap sync android")

#!/usr/bin/env python3
"""
Compute a per-image motion for every slide → assets/motion.json.

The screens hold the background almost still; what little movement there is has
to suit the picture, or it looks like a screensaver from 2003. So instead of one
Ken-Burns for everything, each image is analysed and gets its own drift:

  * a picture with a strong horizon (a landscape, Earth's limb from the ISS)
    drifts sideways — moving *across* a horizon reads as camera movement, moving
    up and down through it reads as a mistake;
  * a picture with one bright subject in the middle (a nebula, a galaxy) gets a
    slow push in, so the subject grows;
  * a picture with detail spread everywhere (plasma, ribbons, waves) gets a lazy
    diagonal drift and a little zoom.

Amplitudes are tiny and the duration is chosen so the *apparent speed* is the
same for every image (a big move takes proportionally longer). That is what
keeps it calm: the eye reads a constant, barely-there drift, never a zoom that
suddenly accelerates.

    python3 tools/make_motion.py                 # writes assets/motion.json
    python3 tools/make_motion.py --check         # print the table, write nothing

Values are "at intensity 1"; the screen multiplies them by the bgMotion setting
(subtle 0.6 · gentle 1 · lively 1.5) and clamps so the layer edge can never
show. Re-run after adding slides (the deploy also runs it for missing entries).
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = None

SLIDES = "assets/slides"
OUT = "assets/motion.json"

# Ceilings at intensity 1, in % of the viewport. The layer sits at scale 1.14,
# i.e. 7% of overhang on each side; at the liveliest setting the pan reaches
# 4.5 x 1.5 = 6.75%, so an edge can never come into view.
# (Was 2.4 / 0.045 / 0.055: at ~2 px/s on a 4K panel nobody in the office ever
# noticed the background moving at all. This is ~2.4x: a slow, visible sway.)
MAX_PAN = 4.5        # half-amplitude of the drift (peak-to-peak = 2x this)
MAX_ZOOM = 0.08      # added to the base scale over the animation
SPEED = 0.13         # % of the viewport per second — the constant that sets the pace
                     # (~5 px/s on a 4K panel, ~2.5 px/s at 1080p: seen, not felt)
DUR_MIN, DUR_MAX = 40.0, 150.0


def analyse(path):
    """Return (motion dict, debug dict) for one image."""
    im = Image.open(path).convert("L")
    im.thumbnail((320, 320))
    g = np.asarray(im.filter(ImageFilter.GaussianBlur(1.1)), dtype=np.float32) / 255.0
    h, w = g.shape

    # Gradients. gx picks up vertical edges (detail across the frame),
    # gy picks up horizontal edges (horizons, cloud decks, the Earth's limb).
    gx = np.abs(np.diff(g, axis=1, prepend=g[:, :1]))
    gy = np.abs(np.diff(g, axis=0, prepend=g[:1, :]))
    energy = gx + gy + 1e-6

    ys, xs = np.mgrid[0:h, 0:w]

    def centroid(weight):
        """(cx, cy, spread_x, spread_y) of a weight map, in -1..1 from the centre."""
        t = float(weight.sum())
        mx = float((weight * xs).sum() / t / (w - 1) * 2 - 1)
        my = float((weight * ys).sum() / t / (h - 1) * 2 - 1)
        sx = float(np.sqrt((weight * (xs / (w - 1) * 2 - 1 - mx) ** 2).sum() / t))
        sy = float(np.sqrt((weight * (ys / (h - 1) * 2 - 1 - my) ** 2).sum() / t))
        return mx, my, sx, sy

    # Where the detail is — this sets which way the drift leads, and whether the
    # picture is wider than it is tall in the way it carries detail.
    cx, cy, spread_x, spread_y = centroid(energy)
    spread = (spread_x + spread_y) / 2
    # Where the *light* is. Edge energy can't tell a galaxy from its starfield (the
    # stars win on count), but bright mass can: a subject is a concentrated glow.
    bright = np.clip(g - np.percentile(g, 45), 0, None) ** 1.6 + 1e-6
    bx, by, bsx, bsy = centroid(bright)
    bspread = (bsx + bsy) / 2

    # Horizon: horizontal edges dominating, and packed into a few rows.
    rows = gy.sum(axis=1)
    band = float(np.sort(rows)[-max(1, h // 10):].sum() / max(rows.sum(), 1e-6))
    horiz_ratio = float(gy.sum() / (gx.sum() + 1e-6))
    horizon = min(1.0, max(0.0, (band - 0.20) / 0.30) * min(1.5, horiz_ratio) / 1.5)

    # Subject-ness: concentrated light, and not a horizon (a sunset is bright and
    # tight too, but pushing into a horizon just crops it).
    subject = max(0.0, min(1.0, (0.50 - bspread) / 0.20)) * (1.0 - horizon)

    # --- pick the motion -----------------------------------------------------
    # Horizontal weight goes up with horizon-ness; vertical is suppressed by it.
    ax = 0.55 + 0.45 * horizon
    ay = (0.55 - 0.45 * horizon) * (0.5 + 0.5 * min(1.0, spread_y / max(spread_x, 1e-3)))
    # Lead the drift towards the busy side (the image moves the other way, so the
    # detail travels into the middle of the frame).
    lead_x = cx if abs(cx) > 0.05 else bx
    lead_y = cy if abs(cy) > 0.05 else by
    dirx = -1.0 if lead_x > 0 else 1.0
    diry = -1.0 if lead_y > 0 else 1.0
    # A subject in the middle wants scale, not travel.
    travel = 1.0 - 0.55 * subject
    x = MAX_PAN * ax * travel * dirx
    y = MAX_PAN * ay * travel * diry
    z = MAX_ZOOM * (0.22 + 0.78 * subject)

    # Constant apparent speed: how far anything on screen actually moves.
    path_pct = 2 * (x * x + y * y) ** 0.5 + z * 50
    dur = round(min(DUR_MAX, max(DUR_MIN, path_pct / SPEED)))

    motion = {"x": round(x, 2), "y": round(y, 2), "z": round(z, 3), "d": dur}
    dbg = {"cx": round(cx, 2), "cy": round(cy, 2), "spread": round(spread, 2),
           "bspread": round(bspread, 2), "horizon": round(horizon, 2), "subject": round(subject, 2)}
    return motion, dbg


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--slides", default=SLIDES)
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--check", action="store_true", help="print the table, write nothing")
    ap.add_argument("--only-missing", action="store_true", help="keep existing entries, only add new files")
    args = ap.parse_args(argv)

    old = {}
    if args.only_missing and os.path.exists(args.out):
        try:
            old = json.load(open(args.out))
        except Exception:
            old = {}

    files = sorted(f for f in os.listdir(args.slides) if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")))
    out, added = dict(old), 0
    for f in files:
        token = os.path.splitext(f)[0]
        if args.only_missing and token in out:
            continue
        m, d = analyse(os.path.join(args.slides, f))
        out[token] = m
        added += 1
        if args.check:
            print(f"{token:34s} x={m['x']:+5.2f} y={m['y']:+5.2f} z={m['z']:.3f} {m['d']:3d}s   "
                  f"horizon={d['horizon']:.2f} subject={d['subject']:.2f} bspread={d['bspread']:.2f}")
    # drop entries whose file is gone
    tokens = {os.path.splitext(f)[0] for f in files}
    out = {k: v for k, v in out.items() if k in tokens}
    if args.check:
        print(f"\n{added} analysed, {len(out)} total")
        return 0
    json.dump(out, open(args.out, "w"), indent=0, sort_keys=True)
    print(f"{args.out}: {len(out)} entries ({added} newly analysed)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

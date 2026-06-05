# Drop your Nano Banana renders here

The screen works out of the box with CSS-generated backgrounds. To use your
own Nano Banana Pro 4K art, drop image files here with these **exact names**:

| File                | Used by style    |
|---------------------|------------------|
| `bg-premium.jpg`    | Premium          |
| `bg-nature.jpg`     | Cinematic        |
| `bg-tech.jpg`       | Futuristic       |
| `bg-minimal.jpg`    | Minimal          |

`.png` and `.webp` also work (e.g. `bg-premium.png`). If a file isn't present,
that style falls back to the built-in animated CSS background — so you can add
images one at a time.

### Logo (optional)
Drop `logo.svg` (or `logo.png` / `logo.webp`) here and it replaces the text
wordmark automatically. Use a transparent background and light/white artwork so
it reads on the dark scene.

### Image specs
- **Resolution:** 4096 × 2304 (Nano Banana Pro "4K", 16:9). Looks razor-sharp on
  4K panels and scales cleanly on 8K.
- **Format:** JPG at high quality is fine (smaller = faster TV load). WebP is
  even smaller. Keep each file under ~6 MB if you can.
- **Composition:** leave the **top-left** calm for the logo and keep the
  **middle band** uncluttered so the rocket reads as it flies across.

### Background gallery (slideshow)
Images in **`assets/slides/`** are cycled as a slow, cross-fading slideshow with
a gentle Ken-Burns drift. To add more, just drop a **16:9** image in that folder
and push — the deploy workflow lists every image into `backgrounds.json`
automatically (no code change). Remove a file to drop it from the rotation.

### Credits
All slides are free **Unsplash License** (commercial use OK, no attribution required), from Unsplash:
`01-liquid`, `02-waves`, `03-bronze`, `04-gold`, `05-streaks`, `06-glow`, `07-layers` (orange/amber)
· `08-blue`, `09-teal`, `10-purple`, `11-red`, `12-soft` (other colours).

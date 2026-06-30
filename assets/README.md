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

### Credits & licensing
All slides are cleared for **commercial use with no attribution required**.

- **`01`–`12`** — free **Unsplash License**, from Unsplash. `01-liquid`, `02-waves`, `03-bronze`,
  `04-gold`, `05-streaks`, `06-glow`, `07-layers` (orange/amber) · `08-blue`, `09-teal`,
  `10-purple`, `11-red`, `12-soft` (other colours). These shipped as 1920×1080 and have been
  **upscaled to 4096×2304** (Lanczos + light sharpen + fine de-banding grain) so they're crisp on
  4K/8K panels.
- **`13`–`32`** — **original artwork generated in-house** for this screen (no third-party rights),
  rendered natively at 4K. Landscapes: `13-sunset-ridge`, `14-dunes`, `15-ocean-dusk`,
  `16-aurora-peaks`, `17-mesa-dusk`, `27-alpine-lake`, `28-foggy-peaks`, `29-pine-forest`,
  `30-coastal-dusk`, `31-alpenglow`, `32-starry-desert`. Patterns: `18-facets`, `19-ribbons`,
  `20-ripples`, `21-aurora-bands`, `22-hex-mesh`, `23-ember-plasma`, `24-teal-plasma`,
  `25-nebula`, `26-dusk-clouds`.

> Note: this repo's web sessions can only reach GitHub/package registries, so stock-photo sites
> (Unsplash/Pexels/etc.) can't be fetched here. To add a *specific real photo*, just drop a 16:9
> image into this folder and push — the deploy lists it into `backgrounds.json` automatically.

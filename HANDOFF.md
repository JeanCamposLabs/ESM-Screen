# ESM‑Screen — Handoff / project notes

Ambient brand screen for the **Easy Scale Media** office TVs. Plain **static site**
(vanilla HTML/CSS/JS, no build step). Live: **https://jeancamposlabs.github.io/ESM-Screen/**

---

## Recent fixes (latest session)
- **Background photo not showing on the TV = FIXED.** The Philips browser (older Chromium)
  supports `el.animate()` but not `el.getAnimations()`; `panLayer` called it unguarded and
  threw *before* the image layer got `is-on`, so the photo never appeared (gradient fallback)
  while the rocket still animated. Now guarded, and the image is revealed before the pan runs.
- **Per-deploy cache-busting** of `app.js`/`styles.css` (`?v=<sha>` injected by the workflow)
  so TV browsers can't serve a stale copy.
- **Slideshow hardened:** `initSlides` retries the manifest 3× and falls back to an embedded
  slide list — it never gets stuck on the bare gradient.
- Defaults: **purple** bg (`10-purple`), clock + weather on, slow looping background pan.

## How it's built & deployed
- Files: `index.html`, `styles.css`, `app.js`, `config.json`, `version.json`, `assets/`.
- **Deploy:** `.github/workflows/deploy-pages.yml` runs on every push to `main` → assembles `_site`,
  stamps `version.json` with the commit, **auto‑generates `assets/backgrounds.json` from `assets/slides/*`**,
  publishes to GitHub Pages. (Pages source = **GitHub Actions**, set in repo Settings → Pages.)
- **Auto‑refresh:** every screen polls `version.json` every **30 s**; when it changes it fades out and
  reloads. So **any push to `main` updates all TVs within ~30 s** — no manual step.
- **Dev workflow used:** branch `claude/determined-cannon-oJhoy` → rebase onto `main` → push → PR → merge.

## Central control (sync all TVs)
- **`config.json`** (repo root) is the house config every screen obeys: `style`, `palette`,
  `bg` (slide token, e.g. `"10-purple"`), `logo`, `rocket`, `clock`, `particles`, `weather`, `speed`,
  `music` (on/off), `musicStation` (SomaFM slug, e.g. `"groovesalad"`/`"fluid"`), `musicVolume` (0–1).
- Screens poll it every 30 s and adopt it (config wins; local panel tweaks persist until config changes).
- **One‑click (new):** admin panel → **“Apply this look to all screens”** commits `config.json` to `main`
  via the GitHub REST API (`pushConfigToAllScreens()` in `app.js`); the deploy republishes and every TV
  follows in ~2 min. Needs a one‑time **fine‑grained PAT** (repo: ESM‑Screen only, Contents read/write),
  stored only in that browser's localStorage (`esm-screen.ghtoken`) — never synced to TVs.
- Manual fallbacks still work: edit `config.json` + commit, or panel → **“Copy config”** → paste.
- A truly instant push (no ~2 min Pages deploy) would still need a tiny backend (Render/Worker + PIN’d
  write). Render MCP was available but had **no workspace selected**, so not built; the GitHub‑API
  route was chosen instead (free, durable, no new infra).

## Admin / settings panel
- Open: add **`?admin`** to the URL, or **triple‑click the top‑right corner**, or press **`C`**.
- Keys: `C`/`S` settings · `F` fullscreen · `N` next background · `Esc` close.
- Controls: style, palette, show‑toggles (logo/rocket/clock/particles/weather), **background picker**,
  motion speed, on/off schedule, fullscreen, reset, **copy‑config**.
- State persists in `localStorage` key `esm-screen.v1`; `DEFAULTS` is in `app.js`.

## Pieces
- **Background gallery:** `assets/slides/` (12 images, `01‑`…`12‑`, 1920px ~16:9). Add more by dropping a
  16:9 image in that folder + push (auto‑added). One image shown at a time (no auto‑rotation, by request);
  chosen via `?bg=` / `config.bg` / `DEFAULTS.bg`. Slow infinite Ken‑Burns drift = `panLayer()` in `app.js`.
- **Disc (brand):** floating neon "Easy Scale Media" built in **CSS/SVG** (ring + rocket glyph + **Fredoka**
  wordmark), orange‑acrylic look, **static** (no float), recolors with the palette. Vector so it stays crisp.
- **Rocket:** WAAPI flight (`flyRocket()`), random entry each pass, **tip‑first** (`NOSE_OFFSET=45`), slow.
- **Weather:** Open‑Meteo (free, no key, CORS‑ok). Maastricht `50.8514, 5.6909`. Current + tomorrow +
  day‑after. Bottom‑left, toggle in Show, refresh 30 min + on wake.
- **Ambient music:** audio‑only **SomaFM** internet radio (commercial‑free, listener‑supported, HTTPS).
  `STATIONS` list + `setupMusic()` in `app.js`; small top‑right control (`.musicbar`) + **`M`** = next
  station. Stream URLs built per station with **mirror fallback** (ice1/2/4/6 → ice.somafm.com) and a
  stalled‑stream auto‑recover via the schedule tick. **Autoplay caveat:** browsers need a user gesture,
  so it shows “Tap to start music” until the first tap/click/key (one tap per boot). Auto‑mutes on the
  night screen; a manual pause stays paused (won’t auto‑resume). No files hosted, no ads, no API key.
  Self‑hosting a few MP3s was the first idea but rejected: can’t quality‑check binaries blind, repo bloat,
  finite loop — radio gives an endless, curated, consistently‑mastered library instead.

## Performance — the TV is the constraint
- Hardware: **Philips 85PUS8500/12** (85" 4K QLED Ambilight) running **Titan OS** (closed platform),
  shown in the **native TV browser** in its kiosk mode. **No external hardware allowed** (budget).
- The built‑in browser engine is the bottleneck, **not** the panel.
- Done: static disc glow (no animated box‑shadow), no canvas `shadowBlur`, blurred blob/beam/grid/grain
  layers hidden over photos, particle canvas at 0.5× / ~24 fps / ≤50 motes, **backgrounds re‑encoded
  4K→1920** (textures 9.5 MB→2.6 MB), gentle pan.
- More levers if needed: static background (disable pan), fewer/no particles, a "lite" flag, or the USB
  video below. TV‑side: turn **off motion smoothing** + use **Game/Monitor** picture mode.

## Open threads / TODO
1. **Boot‑to‑screen / "home" (user will try later).** Plan given, safe‑first:
   (1) favourite the URL on the Titan home, (2) set the browser homepage to the URL,
   (3) Settings → System → startup / "resume last app", (4) hidden professional/hotel menu via remote code
   **`0 6 2 5 9 6` then Home (⌂)** — *only* touch a "Hotel/Professional" or "Power‑on app/source" option,
   **never** change service/calibration numbers, exiting without saving is safe, stop if it asks a password.
   Full Hotel/PBS mode is mainly an **HFL hospitality** feature; the consumer PUS8500 may have a slimmed
   version or none. Next agent: have the user report what each menu shows, then guide.
2. **Custom TV app:** Titan OS apps are hosted HTML5 + there's a dev portal (`docs.titanos.tv`), **but**
   publishing is a submission/partner process — **no consumer sideload**, and screensaver/Home‑button
   aren't customizable. So a self‑serve app isn't realistic on this set.
3. **USB looping video (smoothest; uses the user's pen‑drive idea).** Pre‑render the scene to a seamless
   MP4 → play from USB (Philips supports USB autoplay/scheduling). Trade‑off: no live clock/weather.
   Build path: a GitHub Action with headless Chromium + ffmpeg (the agent sandbox has no browser/ffmpeg).
   **Not built yet** — proposed.

## User preferences / constraints
- **No paid hardware/accessories.** Security‑conscious (avoid unnecessary external exposure).
- Wants: smooth on the **native TV browser**; one central control for all TVs; eventually
  "home/screensaver" behavior. Treats this web build as the **mock** while the app idea is assessed.

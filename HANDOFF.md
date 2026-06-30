# ESM‑Screen — Handoff / project notes

Ambient brand screen for the **Easy Scale Media** office TVs. Plain **static site**
(vanilla HTML/CSS/JS, no build step). Live: **https://jeancamposlabs.github.io/ESM-Screen/**

---

## Recent fixes (latest session)
- **Music badge centred over the clock + more stations.** The clock and badge now share a bottom-right
  `.corner` wrapper (`index.html`); the clock defines the width and the badge is centred over it
  (`position:absolute; left:50%; translateX(-50%)`), so it no longer drifts as the station name changes.
  Added stations (now ~20): SomaFM **The Trip, Space Station Soma, Left Coast 70s, Underground 80s,
  Indie Pop Rocks, PopTron, Boot Liquor, Suburbs of Goa**, plus two **classical** stations that are *not*
  SomaFM — **YourClassical** and **WCPE (The Classical Station)**, listener-supported public radio. To
  support those, `STATIONS` entries may now carry explicit `urls: [...]` (tried in order) instead of a
  SomaFM slug; `stationUrls(station)` returns those or builds the SomaFM mirror list from `id`.
  *(Public-radio classical may carry brief underwriting/pledge, unlike SomaFM's strict commercial-free.)*
- **Motion dialled back to the viewer's taste.** They clarified: rocket + particles are fine; only the
  *floating clock / weather / World Cup* bothered them. So: `floaty` drift removed from
  `.clock`/`.weather`/`.worldcup`; flying **rocket + particles back on** (`rocket:true`/`particles:true`
  in `DEFAULTS` & `config.json`); the **background is held static** (`panLayer` fixed `scale(1.08)`, no
  Ken-Burns — it was part of the original nausea complaint and wasn't exonerated). The logo keeps its
  gentle bob (`discFloat`). **Full-screen light wave** (`playWave()` toggles `.wave-go` on `#screen`,
  auto ~every 2 min or on logo click): a light band (`.wave`) sweeps the screen, `.weather`/`.worldcup`/
  `.corner` ripple in sequence (`@keyframes ripple`, staggered delays ≈ their x-position), and over the
  logo it's a rainbow (`discShine` on `.disc__tube::after`) that reveals a repeating, colourful
  **EasyScaleMedia** pattern in Space Mono (`.disc__code`, `codeReveal`+`codeFlow`). All transform/opacity
  based and only runs during the ~5s pass = light on the TV. *(Earlier neon flicker was scrapped — user
  disliked it twice; don't bring it back. Delays are approximate; tune in `styles.css`.)*
- **Background gallery expanded to 26 (NEW).** The 12 original Unsplash JPGs (which shipped at only
  1920×1080) were **upscaled**, and **14 new in-house backgrounds** were added — 5 stylized landscapes
  (`13`–`17`) and 9 patterns (`18`–`26`). These were generated locally with **headless-Chromium HTML/SVG
  rasterization + numpy procedural fields**, each one visually reviewed before keeping (earlier *flat CSS*
  gradients looked cheap and were rejected — these are layered/cinematic, a different bar). Web sessions
  here can only reach GitHub + package registries, so external stock sites (Unsplash/Pexels) can't be
  fetched — dropping a real 16:9 image into `assets/slides/` still auto-joins the rotation on push.
- **Background resolution = QHD 2560×1440 (NOTE).** Served at 2560×1440 (crisp on the 4K panel, ~15 MB
  decoded/layer) rather than full 4K, to respect the Philips browser limit that forced the old 4K→1920
  re-encode. Full-4K masters were generated; bump the re-encode in the deploy/source if the TV proves it
  can handle 4096×2304.
- **Music badge → opens the menu.** The on‑screen music control is now a single `<button>` that opens
  the settings panel on click (controls moved into the panel); the inline play/next mini‑buttons were
  removed. `M` still skips to the next station. *(If a different layout is wanted — e.g. badge at the
  bottom, or keep inline buttons — it's a small change in `index.html`/`renderMusicbar`.)*
- **Daily auto‑rotating background (NEW).** `dailyBg` (default **on**) shows a new background each day,
  same on every screen, chosen by date. Toggle under **Background → New background every day**; picking
  one in the grid pins it and turns rotation off. Now cycles **26** backgrounds; add more art to
  `assets/slides/` for more variety. See *Pieces → Background*.
- **Ambient music added (NEW) + deployed.** Audio‑only **SomaFM** internet radio (commercial‑free,
  listener‑supported, HTTPS). 10 office stations; **`M`** = next station;
  toggle + station picker + volume in the panel under **Music**. Implementation detail in
  *Pieces → Ambient music* below. **Autoplay:** browsers need one user gesture, so it shows
  "Tap to start music" until the first tap/click/key (one tap per boot). User confirmed it works.
- **Music rollout state:** **live and ON house‑wide.** Deployed to `main`, then enabled for all screens
  via the admin panel's **"Apply this look to all screens"** button (commit *Update screen config from
  admin panel*). The house `config.json` is now `"music": true`, `"musicStation": "gsclassic"`
  (Groove Salad Classic), `"musicVolume": 0.5`. To change or disable it for all screens, use that panel
  button again or edit `config.json` (`music` / `musicStation` / `musicVolume`) and push to `main`; all
  TVs adopt in ~2 min. Each screen still shows the one‑tap "Tap to start" pill after a reload (nothing
  auto‑plays until tapped). *(It was briefly shipped `music:false` for a no‑risk test, then turned on.)*
- **Add/remove stations:** edit the `STATIONS` array in `app.js` (each = SomaFM channel `slug` + `name`
  + `genre`); URLs are generated with mirror fallback, so just the slug is needed.
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
  reloads. `version` is a **hash of `app.js`+`styles.css`+`index.html`**, so only **code** pushes reload
  the TVs (~30 s). **Config/panel pushes do NOT reload** — `config.json` changes apply live via the 30 s
  config poll (`syncConfig`). This was changed to stop the screens "blinking" on every settings push.
- **Dev workflow used:** branch `claude/determined-cannon-oJhoy` → rebase onto `main` → push → PR → merge.

## Central control (sync all TVs)
- **`config.json`** (repo root) is the house config every screen obeys: `style`, `palette`,
  `bg` (slide token, e.g. `"10-purple"`), `dailyBg` (auto‑rotate daily), `logo`, `rocket`, `clock`,
  `particles`, `weather`, `speed`, `music` (on/off), `musicStation` (SomaFM slug, e.g.
  `"groovesalad"`/`"fluid"`), `musicVolume` (0–1).
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
- **Background gallery:** `assets/slides/` — 26 QHD (2560×1440) JPGs (`01‑`…`26‑`), 16:9. Add more by
  dropping a `.jpg/.png/.webp` in that folder + push (auto‑added → daily rotation includes it; see the
  README *"Where to get more rotating backgrounds"*). **Daily auto‑rotation
  (NEW):** `dailyBg` (default on) picks the slide by local day number (`dayNumber()`/`dailyIndex()` in
  `app.js`), so all screens show the same "background of the day" and advance at midnight (`maybeDailyBg`
  every 15 min covers a TV left on across the rollover; otherwise the next morning's boot rotates it).
  Priority: `?bg=` kiosk pin (`bgPinned`) > daily > saved `config.bg` > first. Picking one in the grid
  (or `N`) **pins it and turns `dailyBg` off**. Slow infinite Ken‑Burns drift = `panLayer()`.
- **Disc (brand):** floating neon "Easy Scale Media" built in **CSS/SVG** (ring + rocket glyph + **Fredoka**
  wordmark), orange‑acrylic look, **static** (no float), recolors with the palette. Vector so it stays crisp.
- **Rocket:** WAAPI flight (`flyRocket()`), random entry each pass, **tip‑first** (`NOSE_OFFSET=45`), slow.
- **Weather:** Open‑Meteo (free, no key, CORS‑ok). Maastricht `50.8514, 5.6909`. Current + tomorrow +
  day‑after. Bottom‑left, toggle in Show, refresh 30 min + on wake.
- **Ambient music:** audio‑only **SomaFM** internet radio (commercial‑free, listener‑supported, HTTPS).
  `STATIONS` list + `setupMusic()` in `app.js`. The lower‑right badge (`.musicbar`, above the clock; a single `<button>`)
  shows the current station and **opens the settings panel on click** — play/pause, station picker and
  volume live in the panel; **`M`** = next station. Stream URLs built per station with **mirror
  fallback** (ice1/2/4/6 → ice.somafm.com) and a
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
  layers hidden over photos, particle canvas at 0.5× / ~24 fps / ≤50 motes, **backgrounds served at
  QHD 2560×1440** (whole 26-image gallery ≈ 6 MB; was 4K→1920 before), gentle pan.
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

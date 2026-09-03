# ESM-Screen

An animated ambient display for big-screen TVs — built for **Easy Scale Media**.
A flying rocket + ESM branding over a rotating gallery of real photography (deep
space, Earth from orbit, landscapes, abstract light), with a **remote control
page** to steer every TV from a laptop or phone and a hidden on-screen panel for
the TV in front of you.

It's a plain static site (HTML/CSS/JS, no build step), so it loads instantly in
any TV browser and runs all day without babysitting.

---

## How it works (the short version)

1. **Background art** is a gallery of **104 QHD stills** in `assets/slides/`
   (NASA space imagery, real landscapes, abstract light — see
   [`assets/README.md`](assets/README.md) for credits). Every TV shows the same
   one and they all switch together on a timer (hourly by default).
2. **Animation happens in the browser**, not in a video file: drifting
   particles, a light wave every couple of minutes, and a flying rocket over a
   still image. No looping seams, smooth forever, tiny bandwidth.
3. **Auto on/off:** shows the art during the day and fades to a dim idle clock at
   night (default **23:00**), back on in the morning (default **07:00**).
4. **Self-updating:** every screen watches `version.json` and reloads itself when
   you ship a **code** release — so all your TVs stay current with no manual refresh.
   Changing the *look* via the panel (config) applies live **without** a reload.

---

## Operating the screen

| Action | How |
|---|---|
| **Control every TV** | Open **`remote.html`** on your computer or phone (link in the panel's *All screens* tab) |
| **Open the on-screen panel** | Triple-click the **top-right corner**, or press **`C`** / **`S`** on a keyboard, or add `?admin` to the URL |
| **Close the panel** | Press **`Esc`**, the **✕**, or click outside the panel |
| **Fullscreen** | Press **`F`**, or the Fullscreen button in the panel |
| **Keys** | `N` next background (pins it) · `M` next station |

The on-screen panel has five tabs — **Look** (style, palette, what to show,
motion speed), **Background** (rotation + gallery), **Music**, **Schedule** and
**All screens** — and applies to *that* TV straight away (saved in its
localStorage, so it survives reloads and power cycles). Note that every TV
re-reads the shared `config.json` every 30 s, so a local tweak only lasts until
the house config next changes.

### Ambient music

A small player streams **commercial-free lofi/chill internet radio** from
[SomaFM](https://somafm.com) (audio only — no video). Toggle it under
**Music → Play music**, choose a station (Groove Salad, Fluid lo-fi hip-hop,
Secret Agent lounge, Drone Zone ambient, plus **classical** — YourClassical and
WCPE), and set the volume. A subtle
**badge sits in the lower-right (above the clock) showing the current station —
click it to open the settings menu** (play/pause, station picker and volume all
live there); press `M` for the next station.

> **One tap to start:** browsers block audio until someone interacts with the
> page. The screen now *tries* to start on boot (kiosk browsers, and Chrome once
> the site has a media history, allow it); if that is refused it shows
> **“Tap to start music”** until the screen is tapped/clicked or a key is
> pressed. Music auto-mutes on the night/idle screen. SomaFM is
> listener-supported; if the office enjoys it, consider a small donation.
> On the remote, every station has a **▶ listen** button so you can audition it
> on your own device before pushing.

**Changing it for all screens:** like every shared setting, music is driven by
`config.json` — easiest via the panel's **“Apply this look to all screens”**
button, or by editing `config.json` directly: `"music"` (on/off),
`"musicStation"` (e.g. `groovesalad` calm chill, `fluid` lo-fi hip-hop,
`gsclassic` classic chill), `"musicVolume"` (0–1). Every TV adopts a change
within ~2 minutes. **Currently music is ON house-wide** (Groove Salad Classic,
volume 0.5); each screen still needs its one tap to start after a reload.

### Background

The background **rotates on a timer** — every TV shows the same image and they
all switch at the same moment (the pick is computed from the clock, not
negotiated). Rotation (`config.json` → `bgRotate`): `daily`, `4h`, `hourly`
(the default), `30m`, `15m`, or `off` (pinned to `bg`). Within one cycle every
image is shown exactly once, in a shuffled order, so two orange ribbons never
follow each other.

**Playlist.** `bgSet` decides which images take part: a list of file tokens
(`39-space-cosmic-cliffs`) and/or whole categories (`space`, `earth`, `nature`,
`abstract`, `art`); an empty list means everything. The default keeps the four
photographic categories (78 images) and leaves the flat *Illustrated* set out —
tick it back in on the remote if you miss it. The gallery is grouped by category
in both the remote and the panel, with real thumbnails.

Picking a specific image in the panel (or pressing `N`) **pins that TV** to it
until a rotation is chosen again; on the remote, *Pin this* pins every TV.
Want more variety? Drop more 16:9 art into `assets/slides/` (see
[Adding your own art](#adding-your-own-art)); it joins the rotation on the next
deploy, thumbnail included.

### Controlling all screens from your computer

Open **`https://jeancamposlabs.github.io/ESM-Screen/remote.html`** on a laptop
or phone. It shows:

- a **live preview** of the screen (the real page, in an iframe) that follows
  every change you make before anything is pushed;
- **what the TVs show right now** and when the next background change is due;
- **Look / Music / Schedule** cards and the full **gallery with the playlist**;
- one **Push to all screens** button. It commits `config.json` to GitHub, then
  watches the published site until the new config is live and tells you so
  (usually 1–2 minutes; the TVs follow within 30 s of that).

Nothing you do on the remote touches a TV until you press *Push*; *Discard*
throws the draft away. If someone else pushes while you are editing, the page
says so and offers to load the server version.

The first push asks for a GitHub **fine-grained token** (github.com → Settings
→ Developer settings → Fine-grained tokens → repository access: only
**ESM-Screen** → permission **Contents: Read & write**). It is stored only in
that browser — never on the TVs. The on-screen panel's *All screens* tab still
has the same **Apply this look to all screens** button for use at the TV.

---

## Adding your own art

Generate in Nano Banana Pro at **4K, 16:9** and drop files in `assets/`:

- `bg-premium.jpg` · `bg-nature.jpg` · `bg-tech.jpg` · `bg-minimal.jpg`
- `logo.svg` (optional — replaces the text wordmark)

See [`assets/README.md`](assets/README.md) for full specs. Missing files simply
fall back to the built-in animated CSS background, so you can add them one at a
time.

### Where to get more rotating backgrounds

The rotation lives in **`assets/slides/`**. Drop any **16:9** image
(`.jpg`, `.png`, `.webp`) in there, commit/push, and it's **auto-added to the
rotation** within ~2 minutes — the deploy lists it into `backgrounds.json` and
renders its thumbnail. Name it `NN-<category>-<name>.jpg` (category = `space`,
`earth`, `nature`, `abstract` or `art`) so it lands in the right gallery group
and category playlists include it. Aim for 2560×1440, calm, ideally a bit darker
in the centre so the logo reads on top.

The current 104 images: 12 abstract Unsplash photos, 26 illustrated renders,
32 NASA images (Webb/Hubble/Spitzer nebulae and galaxies, auroras and the
horizon from the ISS — public domain) and 34 real landscapes under the Unsplash
License. Full credits in [`assets/README.md`](assets/README.md).

Good **free** sources:
- **Nano Banana Pro** — best match for the current look; use the prompts below at
  **4K, 16:9**.
- **Other AI image tools** — Midjourney, DALL·E, Adobe Firefly, Leonardo. Prompt
  for something like *"4K 16:9 abstract ambient background, dark premium, soft
  volumetric light, smooth gradients, no text."*
- **Free stock photo sites** (royalty-free, no attribution needed) —
  [Unsplash](https://unsplash.com), [Pexels](https://pexels.com),
  [Pixabay](https://pixabay.com). Search e.g. *abstract gradient*, *dark abstract*,
  *liquid light*, *bokeh*, *aurora*, *nebula*, *4k abstract wallpaper*; download the
  largest size and crop to 16:9.

---

## Reusing the backgrounds + disc elsewhere (drop-in pack)

`embed/` is a two-file module (`esm-backdrop.js` + `esm-backdrop.css`) that
mounts the rotating backgrounds and the ESM disc into any page — for another
screen or project. Live demo: `/embed/demo.html`; the full pack with all images
is built on every deploy at `/embed/esm-backdrop-pack.zip`. Options, API and the
self-hosting recipe are in [`embed/README.md`](embed/README.md).

```html
<link rel="stylesheet" href="https://jeancamposlabs.github.io/ESM-Screen/embed/esm-backdrop.css">
<script src="https://jeancamposlabs.github.io/ESM-Screen/embed/esm-backdrop.js"></script>
<script>ESMBackdrop.mount({ intervalMinutes: 3 });</script>
```

---

## Nano Banana Pro prompts

**Settings in Nano Banana Pro:** Resolution **4K**, Aspect ratio **16:9**
(this outputs **4096 × 2304** — perfect for a 4K panel, scales cleanly on 8K).

> Keep the rocket **out** of the image — it's animated on top. These prompts say
> "no text/logos" because the ESM logo is overlaid live (sharper, and it lets you
> rebrand without regenerating).

### Master template (reusable)
```
Ultra-high-resolution 4K digital signage artwork, 16:9 aspect ratio.
[SCENE]. Dominant color palette: [PALETTE]. Cinematic volumetric lighting,
rich depth, smooth clean gradients, premium and tasteful, extremely detailed
and crisp for display on a very large TV.
Composition: keep the UPPER-LEFT calm and uncluttered for a logo, keep an open
clear horizontal band across the MIDDLE, and a calm LOWER-RIGHT corner.
No text, no words, no logos, no watermark, no people. No harsh noise.
```

### 1 · Premium (default)
```
Ultra-high-resolution 4K digital signage artwork, 16:9 aspect ratio.
Abstract flowing liquid light and molten glass ribbons drifting through dark
space, soft volumetric glow, silken bokeh, suspended glowing particles, deep
luxe charcoal background with warm amber-orange iridescence and highlights.
Cinematic lighting, rich depth, smooth clean gradients, premium and tasteful,
extremely detailed and crisp for a very large TV.
Composition: calm uncluttered upper-left, open clear middle band, calm
lower-right. No text, no words, no logos, no watermark, no people.
```

### 2 · Cinematic (nature)
```
Ultra-high-resolution 4K digital signage artwork, 16:9 aspect ratio.
Breathtaking aerial view of a coastline at golden hour, layered mountains
fading into soft atmospheric haze, slow drifting clouds, a warm low sun, calm
ocean mirroring warm amber light. Serene, expansive, cinematic.
Smooth gradients, rich depth, extremely detailed and crisp for a very large TV.
Composition: calm uncluttered upper-left sky, open clear middle band, calm
lower-right. No text, no words, no logos, no watermark, no people.
```

### 3 · Futuristic (tech)
```
Ultra-high-resolution 4K digital signage artwork, 16:9 aspect ratio.
Sleek futuristic abstract environment: glowing geometric light trails, a fine
particle field like a digital nebula, soft neon volumetric beams, a dark studio
backdrop with a subtly reflective floor, warm orange energy accents.
High-tech, premium, cinematic. Smooth gradients, rich depth, extremely detailed
and crisp for a very large TV.
Composition: calm uncluttered upper-left, open clear middle band, calm
lower-right. No text, no words, no logos, no watermark, no people.
```

### 4 · Minimal
```
Ultra-high-resolution 4K digital signage artwork, 16:9 aspect ratio.
Minimalist soft gradient field with a single gentle warm light source, smooth
amber-to-charcoal color transitions, generous calm negative space, the faintest
film grain. Elegant, understated, spa-like calm.
Extremely detailed and crisp for a very large TV.
Composition: light source toward upper-left kept simple, open clear middle,
calm lower-right. No text, no words, no logos, no watermark, no people.
```

### Matching other palettes
Swap the color words in any prompt:

| Palette | Use these color words |
|---|---|
| **Brand Orange** | warm amber-orange `#ff7a18` + deep charcoal |
| **Navy + Gold** | deep navy `#0a1326` + gold `#e9c46a` |
| **Electric Blue** | near-black + electric cyan `#23d4fd` |
| **Teal** | dark teal + emerald `#2ee6a6` |
| **Purple** | deep plum + magenta `#b15cff` |

---

## Hosting / deployment

It's a static site, so it runs anywhere that serves files. This repo ships a
**GitHub Pages** deploy: every push to `main` runs
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml), which
publishes the site (Settings → Pages → *Build and deployment* → *GitHub Actions*).
Open the Pages URL on the TV and press **`F`** (or use the browser's fullscreen /
kiosk mode). On Chrome-based smart TVs / mini-PCs you can launch with
`--kiosk <url>` for a no-chrome, always-on display.

### Self-updating (auto-refresh)
Every screen polls [`version.json`](version.json) every 30 s (and whenever the
device wakes or reconnects). When the `version` changes, the page fades out and
reloads itself — so a deploy reaches **every TV with no one touching the
hardware**. The deploy workflow stamps the commit into `version.json` on each run,
so it's fully automatic: **just push to `main`.**

### Always-on
The screen requests a **Wake Lock** so supported panels won't dim or sleep, and
re-requests it after the device wakes.

> **Burn-in note (OLED):** the background changes on the rotation, the rocket
> and particles keep moving, the light wave passes every couple of minutes and
> the idle clock wanders at night. The logo, clock and weather are deliberately
> still (the drift was found nauseating) — on a true OLED, keep the hourly
> rotation on.

---

## Running on the office TVs (smooth playback + one control for all)

A smart TV's **built-in browser** (e.g. the Philips Titan OS browser) is the usual
cause of lag — the panel is fine, the TV's web engine isn't. For smooth 24/7
playback, run the page through a small HDMI player:

- **Easiest — Amazon Fire TV Stick 4K + Fully Kiosk Browser:** set the Start URL
  to `https://jeancamposlabs.github.io/ESM-Screen/`, enable *Start on boot* and
  *Keep screen on*, and hide the address/nav bars. Fully Kiosk also has a remote
  dashboard to control every device (reload, repoint, screen on/off).
- **Most robust — Raspberry Pi 4/5 + Chromium kiosk:** autostart
  `chromium-browser --kiosk --noerrdialogs https://jeancamposlabs.github.io/ESM-Screen/`
  (or a signage image like FullPageOS); manage the fleet over SSH.

Pin a fixed look on one device via the URL, e.g. `…/?style=premium&bg=teal`.

### Central control — all screens together
Every screen polls **`config.json`** every 30 s and adopts it, so you change
the look in ONE place and all TVs follow. The remote (`remote.html`) writes that
file for you; the manual route is **Copy config** (remote or panel) → paste into
`config.json` on GitHub → commit.

Fields: `style`, `palette`, `bg` (pinned slide token, e.g. `06-glow`),
`bgRotate` (`off`/`daily`/`4h`/`hourly`/`30m`/`15m`), `bgSet` (playlist: tokens
and/or category ids, `[]` = all), `logo`, `rocket`, `clock`, `particles`,
`weather`, `speed`, `music`, `musicStation` (e.g. `lofigirl`, `groovesalad`),
`musicVolume` (0–1), `schedule`, `onTime`, `offTime`, `nightClock`. The old
`dailyBg: true/false` is still understood (= `bgRotate: daily`/`off`).

---

## Local preview

```bash
python3 -m http.server 8000   # then open http://localhost:8000 (screen) or /remote.html
```

The remote's preview iframe loads `index.html?preview=1`: that mode never reads
or writes the device's saved settings, never polls, never plays audio, and only
mirrors what the remote posts to it.

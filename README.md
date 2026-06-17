# ESM-Screen

An animated ambient display for big-screen TVs — built for **Easy Scale Media**.
A flying rocket + ESM branding over cinematic, animated artwork, with a **hidden
control panel** to switch styles, colors, and the on/off schedule live.

It's a plain static site (HTML/CSS/JS, no build step), so it loads instantly in
any TV browser and runs all day without babysitting.

---

## How it works (the short version)

1. **Background art** comes from **Nano Banana Pro** — native **4K** stills (see
   prompts below). Drop them in `assets/` and they appear per style.
2. **Animation happens in the browser**, not in a video file: a slow cinematic
   Ken-Burns drift over the still, plus drifting particles, light, and a flying
   rocket. No looping seams, smooth forever, tiny bandwidth.
3. **Auto on/off:** shows the art during the day and fades to a dim idle clock at
   night (default **23:00**), back on in the morning (default **07:00**).
4. **Self-updating:** every screen watches `version.json` and reloads itself when
   you ship a new release — so all your TVs stay current with no manual refresh.

---

## Operating the screen

| Action | How |
|---|---|
| **Open settings** | Triple-click the **top-right corner**, or press **`C`** / **`S`** on a keyboard, or add `#admin` to the URL |
| **Close settings** | Press **`Esc`**, the **✕**, or click outside the panel |
| **Fullscreen** | Press **`F`**, or the Fullscreen button in settings |

In the panel you can change **style**, **color palette**, toggle the
**logo / rocket / clock / particles / weather / World Cup scores**, turn on
**ambient music** (pick a station + volume), edit the **company name + tagline**,
set **motion speed**, and configure the **on/off schedule**. Everything saves to
the TV automatically (localStorage), so it survives reloads and power cycles.

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
> page, so the player shows **“Tap to start music”** until the screen is tapped/
> clicked or a key is pressed — just give the TV one tap when you switch it on
> each morning. Music auto-mutes on the night/idle screen. SomaFM is
> listener-supported; if the office enjoys it, consider a small donation.

**Changing it for all screens:** like every shared setting, music is driven by
`config.json` — easiest via the panel's **“Apply this look to all screens”**
button, or by editing `config.json` directly: `"music"` (on/off),
`"musicStation"` (e.g. `groovesalad` calm chill, `fluid` lo-fi hip-hop,
`gsclassic` classic chill), `"musicVolume"` (0–1). Every TV adopts a change
within ~2 minutes. **Currently music is ON house-wide** (Groove Salad Classic,
volume 0.5); each screen still needs its one tap to start after a reload.

### Background

By default the background **auto-rotates — a new one each day** (every screen
shows the same one, picked from the gallery by the date). Toggle it under
**Background → New background every day**. Picking a specific image in the
grid below pins it and turns auto-rotate off. Want more variety? Add more 4K
art to `assets/slides/` (see [Adding your own art](#adding-your-own-art)) — the
daily rotation automatically includes every image in the folder.

### World Cup scores

A slim strip at the bottom-centre shows **yesterday's results, live scores and
the next kick-offs** for the FIFA World Cup (free ESPN scoreboard, no key).
It refreshes every 5 minutes — every 60 seconds while a match is live — and
hides itself automatically when there are no matches (e.g. after the
tournament). Toggle it under **Show → World Cup**.

### Controlling all screens from your computer

Open the screen URL on your computer, open the settings panel, set the look you
want, then press **“Apply this look to all screens”**. That commits
`config.json` to GitHub for you; the deploy workflow republishes it and **every
TV adopts it within ~2 minutes** (they poll `config.json` and `version.json`
every 30 s).

The first time, the button asks for a GitHub **fine-grained token** (github.com
→ Settings → Developer settings → Fine-grained tokens → repository access:
only **ESM-Screen** → permission **Contents: Read & write**). It's stored only
in that browser on your computer — never on the TVs. Manual fallback: **“Copy
config”** and paste it into `config.json` on GitHub yourself.

---

## Adding your own art

Generate in Nano Banana Pro at **4K, 16:9** and drop files in `assets/`:

- `bg-premium.jpg` · `bg-nature.jpg` · `bg-tech.jpg` · `bg-minimal.jpg`
- `logo.svg` (optional — replaces the text wordmark)

See [`assets/README.md`](assets/README.md) for full specs. Missing files simply
fall back to the built-in animated CSS background, so you can add them one at a
time.

### Where to get more rotating backgrounds

The day-to-day rotation lives in **`assets/slides/`**. Drop any **16:9** image
(`.jpg`, `.png`, `.webp`) in there, commit/push, and it's **auto-added to the
rotation** within ~2 minutes — no code changes. Aim for ~1920px wide, calm and
abstract, ideally a bit darker in the centre so the logo reads on top.

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
Every screen polls [`version.json`](version.json) once a minute (and whenever the
device wakes or reconnects). When the `version` changes, the page fades out and
reloads itself — so a deploy reaches **every TV with no one touching the
hardware**. The deploy workflow stamps the commit into `version.json` on each run,
so it's fully automatic: **just push to `main`.**

### Always-on
The screen requests a **Wake Lock** so supported panels won't dim or sleep, and
re-requests it after the device wakes.

> **Burn-in note (OLED):** nothing on screen is perfectly static — the logo and
> clock gently float, the background drifts, and the idle clock wanders at night.
> That's intentional to protect large OLED panels over long run times.

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
Every screen polls **`config.json`** once a minute and adopts it, so you change
the look in ONE place and all TVs follow within ~a minute:

1. Open settings on any device (triple-click the top-right corner, or add `?admin`),
   set it how you want, and click **“Copy config for all screens.”**
2. Paste that JSON into **`config.json`** on GitHub and commit (or send it over).
3. Every screen updates on its next check.

Fields: `style`, `palette`, `bg` (slide name, e.g. `06-glow`), `dailyBg`
(auto-rotate daily), `logo`, `rocket`, `clock`, `particles`, `weather`, `speed`,
`music` (on/off), `musicStation` (e.g. `groovesalad`, `fluid`), `musicVolume` (0–1).

---

## Local preview

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

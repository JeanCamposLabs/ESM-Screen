# ESM Backdrop — drop-in pack

Rotating full-screen backgrounds (the same 104 images as the ESM office screen:
NASA deep space, Earth from orbit, real landscapes, abstract light) with the
**ESM disc** on top. Two files, no dependencies, no build step. Made to be handed
to another project: mount it, put your own content on top, done.

```
esm-backdrop/
├── esm-backdrop.js      the module  (window.ESMBackdrop)
├── esm-backdrop.css     the styles  (everything prefixed .esmb)
├── demo.html            a working full-screen demo
├── fetch-slides.sh      optional: download the 104 images for local hosting
├── backgrounds.json     the image list (only in the full pack, points at slides/)
└── slides/              the images, 2560×1440 JPEG (only in the full pack, ~38 MB)
```

Full pack (with images): **https://jeancamposlabs.github.io/ESM-Screen/embed/esm-backdrop-pack.zip**
Live demo: **https://jeancamposlabs.github.io/ESM-Screen/embed/demo.html** (`?interval=0.2` to see it change fast)

## 1. Quickest: hot-link everything from the ESM site

```html
<link rel="stylesheet" href="https://jeancamposlabs.github.io/ESM-Screen/embed/esm-backdrop.css">
<script src="https://jeancamposlabs.github.io/ESM-Screen/embed/esm-backdrop.js"></script>
<script>
  ESMBackdrop.mount({ intervalMinutes: 3 });   // fixed full-screen layer, disc on, new image every 3 min
</script>
```

The image list is fetched from the site (`assets/backgrounds.json`), the images
stream from there too. Your own content goes on top: anything with
`position: fixed/absolute` and `z-index` above 0.

## 2. Self-hosted (recommended for a TV that must work when the ESM site is down)

Copy the two files into your project, then either unzip the full pack (it already
contains `backgrounds.json` + `slides/`) or run `sh fetch-slides.sh` next to them.
Then point `base` at that folder:

```html
<link rel="stylesheet" href="/esm-backdrop/esm-backdrop.css">
<script src="/esm-backdrop/esm-backdrop.js"></script>
<script>
  ESMBackdrop.mount({
    base: "/esm-backdrop/",            // where backgrounds.json + slides/ live
    manifest: "backgrounds.json",      // relative to base (the pack's manifest points at slides/…)
    intervalMinutes: 3,
  });
</script>
```

If the manifest cannot be loaded the module falls back to its built-in list of
the 104 file names (resolved against `base + "assets/slides/"`, the site layout).

## 3. Inside a box instead of full-screen

```html
<div id="stage" style="position:relative; width:100%; aspect-ratio:16/9;"></div>
<script>
  ESMBackdrop.mount({ el: "#stage", intervalMinutes: 3, discSize: "60vmin" });
</script>
```

The container needs `position: relative|absolute|fixed`; the backdrop fills it.
Note the disc is sized in **viewport** units by default (`78vmin`) because it is
meant for a TV; pass `discSize` (any CSS length) for a box.

## Options

| option | default | what it does |
|---|---|---|
| `el` | *(creates a fixed full-screen layer)* | selector or element to fill |
| `base` | `https://jeancamposlabs.github.io/ESM-Screen/` | root the manifest and image paths are resolved against |
| `manifest` | `assets/backgrounds.json` | image list (string or array of candidates, relative to `base` or absolute) |
| `slides` | — | explicit array of image URLs; skips the manifest |
| `intervalMinutes` | `3` | minutes per image (`0.5`, `3`, `60`, `1440`…) |
| `categories` | *(all)* | e.g. `["space","earth","nature","abstract"]` — `art` is the flat illustrated set |
| `playlist` | — | explicit tokens (`"41-space-cosmic-cliffs"`) and/or category ids |
| `shuffle` | `true` | seeded shuffle per cycle (every image once per cycle); `false` = folder order |
| `start` | — | token to start pinned on (rotation stays off until `unpin()`) |
| `disc` | `true` | show the ESM disc |
| `palette` | `"orange"` | `orange`, `navy`, `electric`, `teal`, `purple` |
| `discSize` | `"78vmin"` | any CSS length; everything inside scales with it |
| `discFloat` | `true` | the gentle 14 s bob |
| `wordmark` | `"Easy Scale\|Media"` | two lines split on `\|` |
| `vignette` | `true` | soft dark edges so the disc reads on bright photos |
| `fadeMs` | `1600` | cross-fade duration |
| `zIndex` | — | z-index for the created layer |
| `onChange(info)` | — | called after every change: `{ src, index, total, token, cat, name }` |

`mount()` returns a controller: `next()`, `prev()` (both pin), `pin(token)`,
`unpin()`, `current()`, `palette(id)`, `slides`, `destroy()`.

## How the rotation picks an image

Local time is cut into slots of `intervalMinutes`. Each slot maps to one image
through a seeded shuffle per cycle, so every image is shown exactly once before
the order reshuffles, and two screens with the same list and interval show the
same image at the same moment — no server, no sync, just the clock. The next
image is pre-decoded before the fade, and a TV that slept re-checks on wake.

## TV notes

- Plain ES5-style code (no optional chaining, no modules): runs on older Chromium
  TV browsers. Needs `fetch` and `Promise` (Chrome 42+).
- Images are 2560×1440 progressive JPEG, ~370 KB each; only two are decoded at a
  time. The image is held still on purpose — a slow Ken-Burns zoom was found
  nauseating on an 85" panel.
- The disc's wordmark uses the *Fredoka* web font (loaded by the CSS `@import`
  from Google Fonts); offline it falls back to the system sans.
- Want the rocket flight, particles, the light wave, clock or weather too? Take
  `styles.css`/`app.js` from the ESM-Screen repo — this pack is deliberately just
  backgrounds + disc.

## Licensing

All images are cleared for commercial use, no attribution required: NASA imagery
is public domain (Webb images: NASA/ESA/CSA/STScI, free with credit), the
photographs are under the Unsplash License, the illustrated set was made
in-house. Per-image credits: https://github.com/JeanCamposLabs/ESM-Screen/blob/main/assets/README.md

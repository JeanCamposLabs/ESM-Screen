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

### Background gallery (rotation)
Images in **`assets/slides/`** are the rotation (every TV shows the same one and
they switch together — hourly by default, see `config.json` → `bgRotate`). To add
more, drop a **16:9** image in that folder and push — the deploy workflow lists
every image into `backgrounds.json` and renders a 480×270 thumbnail into
`assets/thumbs/` automatically (no code change). Remove a file to drop it.

**Naming = category.** `NN-space-…`, `NN-earth-…`, `NN-nature-…` (or `abstract-`/`art-`)
puts the image in that group in the gallery and lets the playlist (`bgSet`) include a
whole category by name. Files without a category token count as *Abstract*
(`13`–`38` are *Illustrated* for historical reasons).

### Credits & licensing

All slides are cleared for **commercial use with no attribution required**. Credits are kept here anyway.

- **`01`–`12` · Abstract** — free **Unsplash License**, from Unsplash. `01-liquid`, `02-waves`, `03-bronze`,
  `04-gold`, `05-streaks`, `06-glow`, `07-layers` (orange/amber) · `08-blue`, `09-teal`,
  `10-purple`, `11-red`, `12-soft` (other colours). Upscaled from 1920×1080.
- **`13`–`38` · Illustrated** — **original artwork generated in-house** (headless-Chromium + numpy renders, no
  third-party rights). Landscapes: `13-sunset-ridge`, `14-dunes`, `15-ocean-dusk`, `16-aurora-peaks`, `17-mesa-dusk`,
  `27-alpine-lake`, `28-foggy-peaks`, `29-pine-forest`, `30-coastal-dusk`, `31-alpenglow`, `32-starry-desert`.
  Patterns: `18-facets`, `19-ribbons`, `20-ripples`, `21-aurora-bands`, `22-hex-mesh`, `23-ember-plasma`,
  `24-teal-plasma`, `25-nebula`, `26-dusk-clouds`. Liquid ribbons: `33`–`38`. *Left out of the default
  rotation (config.json `bgSet`) because they look flat next to the photographs — tick them back in on the remote.*
- **`39`–`70` · Deep space + Earth from orbit** — **NASA image library** (images.nasa.gov), public domain
  (NASA imagery is not copyrighted; Webb images are NASA/ESA/CSA/STScI, free to use with credit). Centre-cropped to 16:9
  at 2560×1440 from the originals.

  | File | NASA ID | Title | Centre / date |
  |---|---|---|---|
  | `39-space-cosmic-cliffs` | `carina_nebula` | James Webb Space Telescope NIRCam Image of the “Cosmic Cliffs” in Carina Nebula | STScI (Webb) · 2022-07-12 |
  | `40-space-milky-way-core` | `PIA03653` | The Milky Way Center Aglow with Dust | JPL · 2006-01-10 |
  | `41-space-carina-mystic` | `GSFC_20171208_Archive_e002076` | Hubble Captures Spectacular "Landscape" in the Carina Nebula | GSFC · 2017-12-08 |
  | `42-space-carina-dust` | `GSFC_20171208_Archive_e002152` | Carina Nebula Detail | GSFC · 2017-12-08 |
  | `43-space-tarantula` | `PIA04200` | Doradus Nebula | Select · 1999-12-01 |
  | `44-space-tarantula-violet` | `PIA14415` | A New View of the Tarantula Nebula | JPL · 2012-04-17 |
  | `45-space-galactic-centre` | `PIA12348` | Great Observatories Unique Views of the Milky Way | JPL · 2009-11-10 |
  | `46-space-rho-ophiuchi` | `PIA10182` | Young Stars in Their Baby Blanket of Dust | JPL · 2008-02-11 |
  | `47-space-helix` | `PIA09178` | Comets Kick up Dust in Helix Nebula | JPL · 2007-02-12 |
  | `48-space-star-nursery` | `PIA13441` | Cosmic Cocoon | JPL · 2010-10-20 |
  | `49-space-nebula-lantern` | `PIA25434` | Orion Nebula in Infrared | JPL · 2022-11-22 |
  | `50-space-spiral-pair` | `PIA08097` | Eyes in the Sky | JPL · 2006-04-26 |
  | `51-space-m81` | `PIA09579` | M81 Galaxy is Pretty in Pink | JPL · 2007-06-01 |
  | `52-space-andromeda` | `7993119` | Space Science | MSFC · 1978-12-01 |
  | `53-space-nebula-ember` | `0302062` | History of Hubble Space Telescope (HST) | MSFC · 1995-02-01 |
  | `54-earth-limb-sunset` | `iss023e057948` | Earth Observations taken by the Expedition 23 Crew | JSC · 2010-05-25 |
  | `55-earth-limb-ember` | `iss043e193911` | Earth observation taken by the Expedition 43 crew | JSC · 2015-05-14 |
  | `56-earth-limb-dawn` | `iss024e006136` | Earth Observations | JSC · 2010-06-16 |
  | `57-earth-limb-moonrise` | `iss040e018975` | Earth Observation | JSC · 2014-06-24 |
  | `58-earth-milky-way` | `iss063e054340` | iss063e054340 | JSC · 2020-07-23 |
  | `59-earth-milky-way-arc` | `iss064e055946` | iss064e055946 | JSC · 2021-04-08 |
  | `60-earth-limb-violet` | `iss073e0982679` | The Milky Way spans the night sky above a bright orange-yellow airglow | JSC · 2025-10-25 |
  | `61-earth-aurora-violet` | `iss039e009944` | Earth Observations taken by the Expedition 39 Crew | JSC · 2014-04-05 |
  | `62-earth-aurora-curtains` | `iss040e117958` | Earth Observation | JSC · 2014-08-27 |
  | `63-earth-aurora-green` | `iss040e117941` | Earth Observation | JSC · 2014-08-27 |
  | `64-earth-aurora-sweep` | `iss040e112268` | Earth Observation | JSC · 2014-08-27 |
  | `65-earth-aurora-city-lights` | `iss029e012564` | Aurora Borealis and city lights on the horizon  taken by the Expedition 29 crew | JSC · 2011-09-29 |
  | `66-earth-night-clouds` | `iss041e012095` | Earth Observations taken by Expedition 41 crewmember | JSC · 2014-09-14 |
  | `67-earth-limb-blue` | `iss040e008245` | Earth Observation | JSC · 2014-06-07 |
  | `68-earth-limb-city-lights` | `iss039e009160` | Earth Observations taken by the Expedition 39 Crew | JSC · 2014-04-02 |
  | `69-earth-limb-purple-dawn` | `iss065e061117` | iss065e061117 | JSC · 2021-05-21 |
  | `70-earth-aurora-ribbon` | `iss023e058455` | Earth Observations taken by the Expedition 23 Crew | JSC · 2010-05-29 |

- **`71`–`104` · Landscapes** — real photographs under the free **Unsplash License** (fetched via picsum.photos, which
  serves Unsplash photos by ID), resized to 2560×1440.

  | File | Photographer | Unsplash page |
  |---|---|---|
  | `71-nature-first-light` | Elliott Engelmann | https://unsplash.com/photos/DjlKxYFJlTc |
  | `72-nature-dawn-star` | Grant McIver | https://unsplash.com/photos/pmUEwPKL5IE |
  | `73-nature-ember-dusk` | Lauren Coleman | https://unsplash.com/photos/shy0cEi7h1o |
  | `74-nature-rose-dusk` | Blake Richard Verdoorn | https://unsplash.com/photos/SbcqUQ4iEcI |
  | `75-nature-dunes-dusk` | Tim de Groot | https://unsplash.com/photos/yNGQ830uFB4 |
  | `76-nature-aurora-pine` | Vashishtha Jogi | https://unsplash.com/photos/bClr95glx6k |
  | `77-nature-aurora-forest` | Nelly Volkovich | https://unsplash.com/photos/ZSMgNjYrHRM |
  | `78-nature-red-rock-night` | Luke Pamer | https://unsplash.com/photos/TjEjUqGHjcw |
  | `79-nature-star-trails` | ahmadreza sajadi | https://unsplash.com/photos/55xd_uiUYEE |
  | `80-nature-star-circle` | Michael Hull | https://unsplash.com/photos/UdvXJ95Yqt8 |
  | `81-nature-starry-pines` | Axel  Antas-Bergkvist | https://unsplash.com/photos/OAVRFaEo8qE |
  | `82-nature-violet-sky` | Blair Fraser | https://unsplash.com/photos/aI1tDC8PaLM |
  | `83-nature-twilight-plains` | thomas shellberg | https://unsplash.com/photos/Ki0dpxd3LGc |
  | `84-nature-ice-shore` | Pierre Bouillot | https://unsplash.com/photos/FRYtAMzphLs |
  | `85-nature-moonlit-sea` | Viktor Jakovlev | https://unsplash.com/photos/mtNweauBsMQ |
  | `86-nature-deep-blue` | Stefanus Martanto Setyo Husodo | https://unsplash.com/photos/74ytEYcOJDc |
  | `87-nature-blue-swell` | Matthew Kosloski | https://unsplash.com/photos/BT_BUEwjeQg |
  | `88-nature-breaking-wave` | Tim Marshall | https://unsplash.com/photos/yEOCA6oiVqg |
  | `89-nature-sea-horizon` | Mark Asthoff | https://unsplash.com/photos/Pk8t4cL2pkw |
  | `90-nature-snow-peaks-dusk` | Martin Staněk | https://unsplash.com/photos/8WClaa1CmZ0 |
  | `91-nature-alpine-sunset` | Tomasz Paciorek | https://unsplash.com/photos/rMwCJs4Pcw0 |
  | `92-nature-matterhorn` | Sven Scheuermeier | https://unsplash.com/photos/VNseEaTt9w4 |
  | `93-nature-dolomites-glow` | David Marcu | https://unsplash.com/photos/CaQ_KITtnVY |
  | `94-nature-lake-dusk` | Nick West | https://unsplash.com/photos/4M-5WBrG5-c |
  | `95-nature-misty-ridge` | Forrest Cavale | https://unsplash.com/photos/qfmd9bu7IgA |
  | `96-nature-larch-fog` | Vadim Sherbakov | https://unsplash.com/photos/NQSWvyVRIJk |
  | `97-nature-forest-light` | Sebastian Unrau | https://unsplash.com/photos/dJVU4jXV1Q8 |
  | `98-nature-mars-crater` | NASA | https://unsplash.com/photos/E7q00J_8N7A |
  | `99-nature-coast-aerial` | NASA | https://unsplash.com/photos/6-jTZysYY_U |
  | `100-nature-violet-pier` | Stefanus Martanto Setyo Husodo | https://unsplash.com/photos/GKR1tBkmW3M |
  | `101-nature-crimson-shore` | Michael Baird | https://unsplash.com/photos/6WLGMivmV00 |
  | `102-nature-golden-meadow` | Kenneth Thewissen | https://unsplash.com/photos/D76DklsG-5U |
  | `103-nature-cloud-valley` | Tim Mossholder | https://unsplash.com/photos/p3kpqGBRPok |
  | `104-nature-misty-marsh` | Gian-Reto Tarnutzer | https://unsplash.com/photos/rZsqmXfM3qQ |

> Note: this repo's web sessions can only reach GitHub/package registries, so stock-photo sites
> (Unsplash/Pexels/etc.) can't be fetched here. To add a *specific real photo*, just drop a 16:9
> image into this folder and push — the deploy lists it into `backgrounds.json` automatically.

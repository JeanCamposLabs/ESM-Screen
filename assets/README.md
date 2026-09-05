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

<!-- generated-credits:start -->
- **`105`–`167` · Landscapes, second batch** — real photographs under the free **Unsplash License** (fetched via
  picsum.photos by ID, centre-cropped to 2560×1440). Picked from the whole picsum catalogue for the dark, moody look the
  disc needs; nothing with people, products or streets.

  | File | Photographer | Unsplash page |
  |---|---|---|
  | `105-nature-meadow-light` | Alejandro Escamilla | https://unsplash.com/photos/LBI7cgq3pbM |
  | `106-nature-pines-at-dusk` | Julie Geiger | https://unsplash.com/photos/dYshDcTI1Js |
  | `107-nature-grass-at-dusk` | Vectorbeast | https://unsplash.com/photos/rsJtMXn3p_c |
  | `108-nature-tuscan-field` | Anton Sulsky | https://unsplash.com/photos/YcfCXxo7rpc |
  | `109-abstract-rain-drops` | Mark Doda | https://unsplash.com/photos/tS9hJOnmKK8 |
  | `110-nature-lake-and-mountains` | Matteo Minelli | https://unsplash.com/photos/hlnucYOsL-c |
  | `111-nature-sandstone-towers` | Marcin Czerwinski | https://unsplash.com/photos/2wugfiddtXw |
  | `112-nature-lightning-horizon` | Guillaume | https://unsplash.com/photos/revxuIor0nY |
  | `113-nature-frosted-rows` | Andre Koch | https://unsplash.com/photos/oSf8ePoG9NU |
  | `114-abstract-warm-bokeh` | Maria Carrasco | https://unsplash.com/photos/vwY2D2Wr4ME |
  | `115-nature-blue-hour-trees` | Jennifer Langley | https://unsplash.com/photos/vIqxsp0_p1g |
  | `116-nature-snow-ridge` | Greg Shield | https://unsplash.com/photos/Du30R57aCyM |
  | `117-nature-green-forest-track` | Sonja Langford | https://unsplash.com/photos/L_F8jAsRWtU |
  | `118-nature-glacier-peaks` | Ryan Schroeder | https://unsplash.com/photos/Gg7uKdHFb_c |
  | `119-abstract-wet-stones` | Felipe Santana | https://unsplash.com/photos/-e_njRV9hRE |
  | `120-nature-grey-forest-road` | Tirza van Dijk | https://unsplash.com/photos/aGx7X1VmFIY |
  | `121-nature-mossy-branch` | Davey Heuser | https://unsplash.com/photos/ixHfyjA49M8 |
  | `122-nature-wheat-sunset` | Lucas Löf | https://unsplash.com/photos/weqZJ1WNYj8 |
  | `123-nature-golden-grass` | Lukasz Szmigiel | https://unsplash.com/photos/Hez3-whPnNA |
  | `124-nature-alpine-pier` | Ales Krivec | https://unsplash.com/photos/DgtRKZOOE0w |
  | `125-nature-forest-stream` | Caleb George | https://unsplash.com/photos/zZzKLzKP24o |
  | `126-nature-highland-road` | Casey Fyfe | https://unsplash.com/photos/R5S4OQpG0lE |
  | `127-nature-misty-volcano` | Casey Fyfe | https://unsplash.com/photos/zJnpPhF4HyY |
  | `128-nature-forest-sunbeams` | Mr. Marco | https://unsplash.com/photos/QP1dUyQ8WsI |
  | `129-nature-green-railway` | Antoine Beauvillain | https://unsplash.com/photos/0Kw44ElHN3A |
  | `130-nature-hill-path` | Drew Geraets | https://unsplash.com/photos/NtrxaEdbMXU |
  | `131-nature-sea-cliffs` | Paulo Simões Mendes | https://unsplash.com/photos/hrcRtexM7M0 |
  | `132-nature-redwood-canopy` | Kim Daniel | https://unsplash.com/photos/JsqAqevX6lg |
  | `133-nature-pier-sunset` | Gabriel Santiago | https://unsplash.com/photos/qFabgklobRY |
  | `134-nature-river-canyon` | Daniel Beilinson | https://unsplash.com/photos/eiqJBh7eHDU |
  | `135-nature-snow-valley` | Ales Krivec | https://unsplash.com/photos/58zgsq3c63g |
  | `136-nature-misty-forest-path` | Ales Krivec | https://unsplash.com/photos/4k-U1Wp2d00 |
  | `137-nature-bamboo-grove` | Jason Ortego | https://unsplash.com/photos/buF62ewDLcQ |
  | `138-nature-autumn-alps` | Samuel Zeller | https://unsplash.com/photos/YN_JWPDYVoM |
  | `139-nature-dark-snow-peak` | Lee Roylland | https://unsplash.com/photos/dfZbts6B4yw |
  | `140-nature-bamboo-canopy` | Ståle Grut | https://unsplash.com/photos/NUgw97CVdAk |
  | `141-nature-ember-sky-chapel` | Stefan Ringler | https://unsplash.com/photos/A0U9EMwvkXs |
  | `142-nature-thunderhead` | Garrett Carroll | https://unsplash.com/photos/5iPhUVPYWsw |
  | `143-nature-blue-lake-horizon` | Alex Wigan | https://unsplash.com/photos/5qlegaTwZpM |
  | `144-nature-dark-wooded-slope` | Micah. H | https://unsplash.com/photos/aRZvsaPw57g |
  | `145-nature-sea-cave` | Stefan Kunze | https://unsplash.com/photos/1-C334jLxG0 |
  | `146-nature-misty-hills` | Carmine De Fazio | https://unsplash.com/photos/3ytjETpQMNY |
  | `147-nature-dark-forest-river` | Nick Scheerbart | https://unsplash.com/photos/xFjAftU8lMY |
  | `148-nature-blue-jellyfish` | 贝莉儿 NG | https://unsplash.com/photos/bviex5lwf3s |
  | `149-nature-desert-moonrise` | thomas shellberg | https://unsplash.com/photos/7gZEY7tY9C4 |
  | `150-nature-plane-in-pink-cloud` | Cristian Baron | https://unsplash.com/photos/dPFaq7RVzbQ |
  | `151-nature-sea-stacks-sunset` | Jenna Beekhuis | https://unsplash.com/photos/Bm0Ja6LZWl4 |
  | `152-nature-milky-way-shore` | Greg Rakozy | https://unsplash.com/photos/oMpAz-DN-9I |
  | `153-nature-tea-terraces` | McDobbie Hu | https://unsplash.com/photos/24tsXm7qGQE |
  | `154-nature-autumn-forest-aerial` | Jakub Sejkora | https://unsplash.com/photos/utqJcneoFjo |
  | `155-nature-crop-rows-aerial` | Matt Benson | https://unsplash.com/photos/rHbob_bEsSs |
  | `156-nature-forest-sun-rays` | Mike Petrucci | https://unsplash.com/photos/kluhXsuW7Is |
  | `157-nature-river-veins-aerial` | Paulo Simões Mendes | https://unsplash.com/photos/V8YzvXKLwDw |
  | `158-nature-milky-way-hill` | Greg Rakozy | https://unsplash.com/photos/0LU4vO5iFpM |
  | `159-nature-highland-valley` | Sylvain Guiheneuc | https://unsplash.com/photos/hIMdKs_0cSE |
  | `160-nature-misty-cliff` | Eric Huang | https://unsplash.com/photos/r75qppvP-FE |
  | `161-nature-red-rock-glow` | Philippe Wuyts | https://unsplash.com/photos/_h7aBovKia4 |
  | `162-nature-storm-over-sea` | Patrick Fore | https://unsplash.com/photos/V6s1cmE39XM |
  | `163-nature-forest-aerial` | William Hook | https://unsplash.com/photos/93Ep1dhTd2s |
  | `164-nature-forest-waterfall` | Andrew Coelho | https://unsplash.com/photos/VB-w_3dnyvI |
  | `165-nature-yosemite-valley` | Christian Joudrey | https://unsplash.com/photos/mWRR1xj95hg |
  | `166-nature-forest-road-aerial` | Alexandre Perotto | https://unsplash.com/photos/sai-x7brics |
  | `167-nature-orange-jellyfish` | Marat Gilyadzinov | https://unsplash.com/photos/wpTWYBll4_w |

- **`168`–`220` · Deep space, second batch** — **NASA image library** (images.nasa.gov), public domain. Centre-cropped to 16:9 at 2560×1440 from the originals; diagrams, composites and stitched mosaics were left out by hand.

  | File | NASA ID | Title | Centre / date |
  |---|---|---|---|
  | `168-space-cygnus-loop` | `PIA15415` | Cygnus Loop Nebula | JPL · 2012-03-22 |
  | `169-space-mission-celebrates-sixth-anniversary` | `PIA12000` | NASA Galaxy Mission Celebrates Sixth Anniversary | JPL · 2009-04-28 |
  | `170-space-hubble-planetary-nebula` | `0203044` | Space Science | MSFC · 2001-06-01 |
  | `171-space-galaxies-hiding` | `PIA17241` | Galaxies in Hiding | JPL · 2013-06-05 |
  | `172-space-giant-gathering-galaxies` | `PIA20052` | A Giant Gathering of Galaxies | JPL · 2015-11-03 |
  | `173-space-packs-big-star-making` | `PIA17005` | Galaxy Packs Big Star-Making Punch | JPL · 2013-04-23 |
  | `174-space-anatomy-triangulum` | `PIA03033` | Anatomy of a Triangulum | JPL · 2005-10-13 |
  | `175-space-grip-scorpion-claw` | `PIA13128` | In the Grip of the Scorpion Claw | JPL · 2010-09-21 |
  | `176-space-helix-unraveling-at-seams` | `PIA15817` | The Helix Nebula: Unraveling at the Seams | JPL · 2012-10-03 |
  | `177-space-andromeda-imaged-by-herschel` | `PIA25163` | Andromeda Galaxy Imaged by Herschel, Planck, IRAS, COBE | JPL · 2022-06-16 |
  | `178-space-crab-nebula-purple` | `PIA17563` | Crab Nebula, as Seen by Herschel and Hubble | JPL · 2013-12-12 |
  | `179-space-iridescent-glory-nearby-helix` | `PIA18164` | Iridescent Glory of Nearby Helix Nebula | JPL · 2014-04-04 |
  | `180-space-blue-ring` | `PIA23867` | The Blue Ring Nebula | JPL · 2020-11-18 |
  | `181-space-making-spectacle-star-formation` | `PIA14106` | Making a Spectacle of Star Formation in Orion | JPL · 2011-06-30 |
  | `182-space-spiral-m83` | `GSFC_20171208_Archive_e001262` | spiral galaxy M83 | GSFC · 2017-12-08 |
  | `183-space-blackest-night-green-ring` | `PIA14104` | In the Blackest Night, a Green Ring Nebula | JPL · 2011-06-15 |
  | `184-space-spins-web-into-giant` | `GSFC_20171208_Archive_e000195` | Hubble Spins a Web Into a Giant Red Spider Nebula | GSFC · 2017-12-08 |
  | `185-space-multi-wavelength-radio-hercules` | `GSFC_20171208_Archive_e001618` | A Multi-Wavelength View of Radio Galaxy Hercules A | GSFC · 2017-12-08 |
  | `186-space-menkhib-california` | `PIA13108` | Menkhib and the California Nebula | JPL · 2010-05-07 |
  | `187-space-does-pacman-have-teeth` | `PIA14873` | Does Pacman Have Teeth? | JPL · 2011-10-26 |
  | `188-space-bubbles-baby-stars` | `GSFC_20171208_Archive_e002039` | Hubble Captures Bubbles And Baby Stars | GSFC · 2017-12-08 |
  | `189-space-cosmic-hearth` | `PIA16684` | The Cosmic Hearth | JPL · 2013-02-05 |
  | `190-space-cluster-abell-1689` | `GSFC_20171208_Archive_e002174` | Galaxy Cluster Abell 1689 | GSFC · 2017-12-08 |
  | `191-space-tortured-clouds-eta-carinae` | `PIA17257` | The Tortured Clouds of Eta Carinae | JPL · 2013-08-23 |
  | `192-space-celestial-sea-stars` | `PIA11445` | Celestial Sea of Stars | JPL · 2008-12-08 |
  | `193-space-celestial-sea-stars` | `PIA12071` | Celestial Sea of Stars | JPL · 2008-12-08 |
  | `194-space-inside-flame` | `PIA18249` | Inside the Flame Nebula | JPL · 2014-05-07 |
  | `195-space-case-disappearing-continent` | `PIA13843` | The Case of the Disappearing Continent | JPL · 2011-02-10 |
  | `196-space-storm-stars-trifid` | `PIA17834` | Storm of Stars in the Trifid Nebula | JPL · 2014-01-29 |
  | `197-space-all-pillars-point-to` | `PIA03515` | All Pillars Point to Eta | JPL · 2005-05-30 |
  | `198-space-supergiant-star-near-giraffe` | `PIA13459` | Supergiant Star Near Giraffe Hind Foot | JPL · 2011-02-19 |
  | `199-space-chasing-chickens-lambda-centauri` | `PIA13451` | Chasing Chickens in the Lambda Centauri Nebula | JPL · 2010-12-22 |
  | `200-space-horsehead-different-color` | `PIA18905` | Horsehead of a Different Color | JPL · 2014-12-19 |
  | `201-space-spider` | `PIA20357` | The Spider Nebula | JPL · 2016-04-14 |
  | `202-space-eagle-observed-by` | `PIA25433` | The Eagle Nebula Observed by WISE | JPL · 2022-11-11 |
  | `203-space-spies-tarantula` | `PIA13118` | WISE Spies the Tarantula Nebula | JPL · 2010-07-06 |
  | `204-space-godzilla-imaged-by` | `PIA24579` | Godzilla Nebula Imaged by Spitzer | JPL · 2021-10-25 |
  | `205-space-lagoon-center-action` | `PIA13453` | WISE Catches the Lagoon Nebula in Center of Action | JPL · 2011-01-06 |
  | `206-space-crab` | `GSFC_20171208_Archive_e002159` | Crab Nebula | GSFC · 2017-12-08 |
  | `207-space-nebulae-not-as-close` | `PIA14092` | Nebulae: Not as Close as They Appear | JPL · 2011-05-05 |
  | `208-space-tarantula-3-color` | `PIA23647` | Tarantula Nebula Spitzer 3-Color Image | JPL · 2020-01-27 |
  | `209-space-dragon-lair` | `PIA13240` | Dragon Lair | JPL · 2010-07-07 |
  | `210-space-heart-soul` | `PIA13112` | Heart and Soul | JPL · 2010-05-24 |
  | `211-space-north-america-different-lights` | `PIA13845` | North America Nebula in Different Lights | JPL · 2011-02-10 |
  | `212-space-cepheus-c-cepheus-b` | `PIA23127` | Cepheus C and Cepheus B Region by Spitzer (One-Instrument) | JPL · 2019-05-30 |
  | `213-space-peony-star-settles-for` | `PIA10955` | Peony Nebula Star Settles for Silver Medal | JPL · 2008-07-15 |
  | `214-space-pacman` | `PIA14731` | The Pacman Nebula | JPL · 2011-09-28 |
  | `215-space-soul` | `PIA13014` | Soul Nebula | JPL · 2010-04-05 |
  | `216-space-amazing-andromeda` | `PIA08787` | Amazing Andromeda Galaxy | JPL · 2006-09-28 |
  | `217-space-seagull-running-big-dog` | `PIA13111` | Seagull Nebula -- Running with the Big Dog | JPL · 2010-05-20 |
  | `218-space-hubble-nebula-wall` | `0302063` | History of Hubble Space Telescope (HST) | MSFC · 1999-05-29 |
  | `219-space-hubble-dust-pillars` | `0203048` | Space Science | MSFC · 2002-08-01 |
  | `220-space-cats-paw` | `PIA22568` | Cat's Paw Image 1 | JPL · 2018-10-23 |

- **`221`–`235` · Earth from orbit, second batch** — **NASA image library** (images.nasa.gov), public domain. ISS crew Earth observations, centre-cropped to 16:9 at 2560×1440.

  | File | NASA ID | Title | Centre / date |
  |---|---|---|---|
  | `221-earth-red-sprite` | `0300803` | Space Science | MSFC · 2001-10-01 |
  | `222-earth-city-lights-shuttle-era` | `s36-39-014` | STS-36 night Earth observation of New York City, New York | JSC · 1990-03-03 |
  | `223-earth-iss070e027906` | `iss070e027906` | iss070e027906 | JSC · 2023-11-19 |
  | `224-earth-usa-city-lights` | `GSFC_20171208_Archive_e001590` | City Lights of the United States 2012 | GSFC · 2017-12-08 |
  | `225-earth-milky-way-over-limb` | `iss073e0982823` | A bright airglow blankets Earth's horizon as the Milky Way illuminates the night sky | JSC · 2025-10-26 |
  | `226-earth-red-yellow-airglow-blankets` | `iss073e1198911` | A red-yellow airglow blankets Earth's horizon above southwestern Europe and North Africa | JSC · 2025-11-28 |
  | `227-earth-airglow-and-stars` | `iss074e0531901` | A bright orange airglow outlines Earth’s horizon beneath the starry expanse of the night s | JSC · 2026-04-19 |
  | `228-earth-densely-urbanized-region-surrounding` | `iss073e0820756` | The densely urbanized region surrounding the Bohai Sea on China's east | JSC · 2025-09-14 |
  | `229-earth-dawn-limb` | `iss074e0480485` | This celestial image reveals Comet C/2025 R3 (PANSTARRS) and its faint vertical tail | JSC · 2026-04-17 |
  | `230-earth-border-between-south-korea` | `iss073e0842436` | The border between South Korea and North Korea | JSC · 2025-09-15 |
  | `231-earth-city-lights-outline-southern` | `iss073e0824492` | City lights outline southern Japan from Fukuoka to Tokyo  | JSC · 2025-09-14 |
  | `232-earth-hurricane-helene-pictured-station` | `iss072e001649` | Hurricane Helene pictured from the space station | JSC · 2024-09-25 |
  | `233-earth-hurricane-helene-pictured-station` | `iss072e001650` | Hurricane Helene pictured from the space station | JSC · 2024-09-25 |
  | `234-earth-iss063e057876` | `iss063e057876` | iss063e057876 | JSC · 2020-07-25 |
  | `235-earth-iss063e059436` | `iss063e059436` | iss063e059436 | JSC · 2020-07-25 |
<!-- generated-credits:end -->

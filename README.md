# ESM-Screen

The credential-free display half of the Easy Scale Media office wall. It is a
plain static HTML/CSS/JavaScript site and remains live on GitHub Pages at
`https://jeancamposlabs.github.io/ESM-Screen/` while a replacement host is
tested. The site address is Boschcour 20, 6221 JR Maastricht. Making this
repository private would not improve display performance.

## Control and security boundary

Managers use authenticated Scale OS at
<https://responseslatracker-eu.onrender.com/>. The former public
`remote.html` administrator is now only a retirement page linking there.
`remote.js` and `remote.css` are deleted and are not published. The display has
no PAT, account, cookie/session flow, browser persistence, GitHub Contents API
write, or `config.json` control path.

The one allowed control read is fixed in `wall-background.js`:

`https://responseslatracker-eu.onrender.com/wall-background/display.json`

It is fetched with `credentials: "omit"`, bounded to 32 KiB, held only in
memory, and normally revalidated with ETag/`If-None-Match`. The exact schema
accepts only version 1, a positive integer revision, `selected-library` or
`bundled-fallback`, at most 40 opaque `{id, version}` pairs, `slotMs: 180000`, a
UTC activation instant, integer `revisionOffset`, the fixed
Europe/Amsterdam 07:00–23:00 schedule, an optional bounded list of valid
`YYYY-MM-DD` Wall Controls holidays, `browserAudio: false`, and
`output: "cast-group"`. Extra and malformed fields are rejected.

Remote image URLs are constructed—not supplied by data—as the fixed-origin
`/wall-background/display-image?id=&v=` route. The screen does not call roster,
account, session, or any other Scale OS API.

## Display behavior

A valid `selected-library` feed owns background selection. Every display stages
a revision until its UTC activation instant, then derives the same 180-second
slot and image from that instant plus the revision offset. A previous revision
stays active until the exact boundary. Local panel and URL background actions do
not override the feed or the deterministic fallback. Invalid/unavailable data, an
explicit `bundled-fallback`, or a remote image error selects bundled ESM slides
with the same deterministic clock rotation.

Software active time is 07:00 inclusive to 23:00 exclusive, Monday–Saturday,
at Boschcour 20, 6221 JR Maastricht. Sundays and official Dutch public holidays
are inactive. The calendar is calculated locally and `Intl.DateTimeFormat` in
`Europe/Amsterdam` applies CET/CEST transitions. The screen also remains inactive
on every valid holiday in the active Wall Controls feed;
the feed supplements rather than replaces the local Sunday/Dutch-holiday rules.
TV HTML audio is absent. Music intent remains enabled, Lofi Girl, volume 0.45, with the existing configured
office Google Cast group as the only output.

## Google Home status (not yet deliverable)

The wall account is in Public Preview, but its Home is not configured with the
known office address, so `time.schedule` fails. Only two TVs appear in script autocomplete; they support
OnOff but not `assistant.command.OkGoogle`. No compatible speaker/group appears.
Do not claim the automations work.

One attended Google Home mobile setup session is required:

1. Set the Home address to Boschcour 20, 6221 JR Maastricht.
2. Link a compatible Assistant speaker into that Home and ensure the group
   `Speqckers centrake r` is available.
3. Validate a 07:00 script: **Play Lofi Girl on Speqckers centrake r**.
4. Validate a 23:00 script: **Stop music on Speqckers centrake r**.

The intended scripts use Google Home's documented `time.schedule` starter and
`assistant.command.OkGoogle` action:
<https://support.google.com/googlehome/answer/13460475> and
<https://developers.home.google.com/automations/schema/reference/entity/assistant/ok_google_command>.

`cast-follower/` is included only as an optional foreground fallback while
those prerequisites remain blocked. It has no remote configuration or
credentials, targets an explicitly supplied group name, uses one allowlisted
HTTPS Lofi Girl stream, steps aside for playback it did not start, and stops its
own playback at 23:00. It is not installed or auto-started. Persistent
installation requires explicit authorization.

## Movement and content

Each image keeps the smooth motion work from PR #37. It drifts slowly in the
way that suits *that picture*:
`tools/make_motion.py` looks at every slide and writes `assets/motion.json` —
a strong horizon (a landscape, Earth's limb) slides sideways, a bright subject
in the middle (a galaxy, a nebula) is pushed into, an all-over texture drifts
diagonally. Amplitudes are 1–3.5% of the frame over 70–100 s, the same apparent
speed for every image, easing at both ends. `bgMotion` sets how much:
`off` (dead still) · `subtle` · `gentle` (default) · `lively`;
`prefers-reduced-motion` disables it, and the night screen pauses it.
Add a slide and the deploy analyses it automatically.

Add 16:9 JPG, PNG, or WebP artwork under `assets/slides/`; the Pages workflow
generates `assets/backgrounds.json` and thumbnails. Naming files
`NN-<category>-<name>.jpg` preserves gallery grouping. Full image and credit
guidance remains in [`assets/README.md`](assets/README.md).

The `embed/` drop-in backdrop pack remains published for Scale OS and other
explicit integrations. Its consumer must supply a fixed, validated slide list.
The retired `config.json` follow mode must not be reintroduced or generalized
to accept remote URLs. See [`embed/README.md`](embed/README.md).

## Development and hosting

Run locally with `python3 -m http.server 8000` and open `/index.html`.
Dependency-free checks:

```bash
node --test tests/*.test.js
python3 -m unittest cast-follower/test_cast_follower.py
```

For the physical test, compare two displays and confirm the selected feed changes
both images on the same 180-second boundary, then disconnect the feed and confirm
the synchronized bundled fallback. Verify active behavior on a normal weekday and
Saturday, inactivity on Sunday, a Dutch public holiday, and a Wall Controls holiday
from the active feed, plus both 07:00/23:00
boundaries under CET and CEST. Confirm Lofi Girl plays on the existing configured
office Cast group only, never through browser/TV audio. The optional
`cast-follower/` remains uninstalled and is not auto-started.

GitHub Pages remains enabled through `.github/workflows/deploy-pages.yml`. The
workflow still publishes the live static site and bundled assets, but no longer
publishes the deleted remote assets or `config.json`. Keep Pages enabled until
a replacement host has been tested on the actual displays, including cache,
CORS, reload, and image behavior.

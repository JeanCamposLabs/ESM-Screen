# ESM-Screen

The credential-free display half of the Easy Scale Media office wall. It is a
plain static HTML/CSS/JavaScript site and remains live on GitHub Pages at
`https://jeancamposlabs.github.io/ESM-Screen/` while a replacement host is
tested. Making this repository private would not improve display performance.
The office address is deliberately not recorded here or on the page.

## Control and security boundary

Managers use an authenticated internal wall controller; its origin is the
`ORIGIN` constant in `wall-background.js`, because the browser must fetch the
feed from it. Nothing on the page links, navigates or points to it. The former
public `remote.html` administrator is now only a retirement page.
`remote.js` and `remote.css` are deleted and are not published. The display has
no PAT, account, cookie/session flow, browser persistence, GitHub Contents API
write, or `config.json` control path.

The one allowed control read is fixed in `wall-background.js`:

`<controller origin>/wall-background/display.json`

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

### Security audit (September 2026)

What this page can do to Scale OS: read one fixed HTTPS URL
(`/wall-background/display.json`) and the image route it names, both with
`credentials: "omit"`, `redirect: "error"` and no referrer. Nothing else. There
is no token, cookie, form, POST, WebSocket or storage anywhere in the page, so
there is nothing to steal and no write path to abuse. What Scale OS can do to
this page: choose which of its own images show and set the on/off schedule,
inside a strictly validated 32 KiB envelope (exact keys, 32-hex opaque ids,
bounded lists, fixed timezone) with image URLs constructed by the page, never
supplied. A compromised feed cannot inject a URL, a script or markup.

Defence in depth added by the audit:

- A Content-Security-Policy `<meta>` (Pages cannot set headers):
  `default-src 'none'`, `script-src 'self'` (no inline script exists, so nothing
  injected could run), and allowlists naming every host the page may connect
  to, load images from or play audio from. A contract test keeps the station
  list in `shared.js` and the CSP in agreement.
- `<meta name="referrer" content="no-referrer">`; the feed fetch also refuses
  redirects.
- The `?preview` message channel accepts and posts to `location.origin` only.
- All dynamic HTML is built from static catalogue strings or DOM nodes; the
  weather forecast no longer goes through `innerHTML`.
- The audio element no longer requests CORS mode, so a station that omits
  `Access-Control-Allow-Origin` still plays.
- The keepalive workflow runs with `permissions: {}`; the two deploy workflows
  already held the minimum.
- The relay's `/diag` probe (which ran yt-dlp against a caller-supplied URL from
  Render's network) is now disabled unless `DIAG_TOKEN` is set and supplied.

Residual, accepted: Google Fonts CSS is a third-party stylesheet (style-only,
cannot execute script under the CSP); GitHub Actions are pinned to major tags,
not commit SHAs. The audio streams are third-party hosts named in the CSP.

## Display behavior

A valid `selected-library` feed owns background selection. Every display stages
a revision until its UTC activation instant, then derives the same 180-second
slot and image from that instant plus the revision offset. A previous revision
stays active until the exact boundary. Local panel and URL background actions do
not override the feed or the deterministic fallback. Invalid/unavailable data, an
explicit `bundled-fallback`, or a remote image error selects the bundled ESM slides.
The bundled rotation has its own pace and order: one slide every **5 minutes**
(`BUNDLED_SLOT_MS`, separate from the feed's validated 180-second `slotMs`), walking
the 235 slides in an order reshuffled once per UTC day (the change lands at
01:00/02:00 Amsterdam, while the screens are off). Every TV computes the same
order from the same clock, so they still switch together, and with 235 slides a
16-hour screen day (192 slots) never shows the same image twice. The catalogue is
real photography only: Unsplash landscapes, NASA deep space and Earth from orbit,
each live-tested, licence-checked (no ESO/CC-BY material) and credited in
`assets/README.md`.

Software active time is 07:00 inclusive to 23:00 exclusive, Monday–Saturday.
Sundays and official Dutch public holidays
are inactive. The calendar is calculated locally and `Intl.DateTimeFormat` in
`Europe/Amsterdam` applies CET/CEST transitions. The screen also remains inactive
on every valid holiday in the active Wall Controls feed;
the feed supplements rather than replaces the local Sunday/Dutch-holiday rules.
The TV page plays Lofi Girl at volume 0.45 through the TV's own browser. It tries to start by itself on
load; TVs that allow autoplay simply play. The Philips refuses sound before a user gesture, so there the
corner badge shows ▶ until anything is clicked — clicking the logo starts the music and fires the light
wave without opening the settings sidebar, so a TV automation only has to click the middle of the screen.
The badge plays and pauses.

The stream is a live relay on a free Render plan and is expected to drop. A watchdog checks that playback
is actually advancing; a stall, error or self-pause is reconnected on a fresh connection with exponential
backoff, forever. Every third failure moves one step along a fallback chain of lo-fi stations on
unrelated infrastructure — FluxFM Chillhop (Berlin), I Love Chillhop, REYFM #lofi — so the room is never
silent and a second dead host costs seconds; while off the intended station the relay is probed (the probe
also wakes a sleeping Render) and Lofi Girl returns by itself when the relay answers with audio again. The
station picker also carries NTS Low Key, 0nlineradio LO-FI and Epic Lounge Jazzhop; every entry is a
live-tested HTTPS Icecast MP3 stream. While the
relay plays, the page pings its `/healthz` every five minutes so Render's idle timer never fires.
Silent for the whole of the overnight window. The existing configured office Google Cast group remains a
separate, parallel output; the feed's `browserAudio: false` describes that Cast set-up, not this page.

## Google Home status (not yet deliverable)

The wall account is in Public Preview, but its Home is not configured with the
known office address, so `time.schedule` fails. Only two TVs appear in script autocomplete; they support
OnOff but not `assistant.command.OkGoogle`. No compatible speaker/group appears.
Do not claim the automations work.

One attended Google Home mobile setup session is required:

1. Set the Home address to the office address (not recorded in this repository).
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

Each image drifts in the way that suits *that picture*:
`tools/make_motion.py` looks at every slide and writes `assets/motion.json` —
a strong horizon (a landscape, Earth's limb) slides sideways, a bright subject
in the middle (a galaxy, a nebula) is pushed into, an all-over texture drifts
diagonally. Amplitudes are 2–9% of the frame peak-to-peak over 55–75 s at a
constant apparent speed of ~0.13% of the viewport per second (about 5 px/s on a
4K panel), easing at both ends. That is 2.4× the original tuning, which nobody
in the office could see; the image layer is drawn at scale 1.14 (7% overhang) so
the larger pan never shows an edge. `bgMotion` sets how much:
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
boundaries under CET and CEST. Confirm that a non-Philips TV starts Lofi Girl on load, that on the
Philips one click on the logo starts it without revealing the settings sidebar, that pulling the relay
switches the badge to "FluxFM Chillhop · Lofi Girl unreachable" and back when the relay returns, and that the
existing configured office Cast group still plays independently. The optional
`cast-follower/` remains uninstalled and is not auto-started.

GitHub Pages remains enabled through `.github/workflows/deploy-pages.yml`. The
workflow still publishes the live static site and bundled assets, but no longer
publishes the deleted remote assets or `config.json`. Keep Pages enabled until
a replacement host has been tested on the actual displays, including cache,
CORS, reload, and image behavior.

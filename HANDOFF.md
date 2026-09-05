# ESM-Screen handoff

## Current architecture

This repository is the screen/display half only. Public PAT administration is
retired. `remote.html` is a no-secret signpost to authenticated Scale OS at
<https://responseslatracker-eu.onrender.com/>; `remote.js` and `remote.css` were
removed and the Pages workflow does not publish them.

`wall-background.js` is the isolated, dependency-free boundary for the sole
Scale OS read. It fixes the origin/path, omits credentials, bounds JSON, uses an
in-memory ETag, rejects unknown schema fields, and constructs fixed-origin image
URLs from opaque IDs/versions. Never expand it to accept URLs or call accounts,
sessions, rosters, or another API.

A valid `selected-library` response is authoritative over all local background
controls. Future revisions remain pending until their UTC activation instant;
the prior active revision is retained until that boundary. Selection then uses
the elapsed 180-second slot plus revision offset. Exact-boundary timers are
backed by a 30-second safety/feed poll. `bundled-fallback`,
invalid/unavailable feed, and image failure use the bundled slides
deterministically: one every 5 minutes (`BUNDLED_SLOT_MS`, distinct from the
feed's 180-second `slotMs`), in an order reshuffled once per UTC day, identical
on every TV. 235 slides cover a 16-hour day without a repeat. Background motion
is 2.4× the original tuning (`tools/make_motion.py`, layer scale 1.14).

At Boschcour 20, 6221 JR Maastricht, active time is 07:00 inclusive to 23:00
exclusive Monday–Saturday. Sundays and official Dutch public holidays are
inactive. Local calendar parts use `Europe/Amsterdam` through `Intl`, including DST.
The deployed three-field feed schedule remains valid; a new schedule may add a
bounded, strictly validated `YYYY-MM-DD` holiday list. Those dates supplement the
local Sunday and Dutch-public-holiday closures and come only from the active feed.
HTML audio starts by itself where the TV allows it (script, not the `autoplay`
attribute). The Philips refuses sound before a gesture, so there the badge shows
▶ and the first click anywhere starts it — the logo is the start button and also
fires the light wave, with no settings sidebar, so a TV automation can trigger
it by clicking screen centre. A watchdog reconnects a stalled or dead stream
with backoff, walks a fallback chain (FluxFM Chillhop → I Love Chillhop → REYFM
#lofi, three strikes each) when the relay is down, probes the relay while off it
and returns when it answers; the page pings the relay's
`/healthz` every five minutes while playing so Render never idles it. The
keepalive cron and the relay's self-ping cover Mon-Sat 05:00-21:59 UTC to match
the 07:00-23:00 Amsterdam screen window. The Google Cast group remains a
separate output.

## Security audit (September 2026)
The page's only contact with Scale OS is a credential-free GET of one fixed
feed URL and its image route (`redirect: "error"`, no referrer), validated into
a strict 32 KiB envelope; there is no write path and nothing to steal. Added: a
CSP `<meta>` (`default-src 'none'`, `script-src 'self'`, per-host allowlists for
connect/img/media, contract-tested against the station list), no-referrer,
same-origin-only preview messaging, DOM-built weather forecast, audio without
CORS mode, `permissions: {}` on the keepalive workflow, and the relay's `/diag`
gated behind `DIAG_TOKEN` (needs a Render redeploy; unset = disabled). The clock
is on by default again (`CONFIG_DEFAULTS.clock`). Residual: Google Fonts CSS,
Actions pinned to tags not SHAs.

## Preserved motion work

PR #37's smooth per-image motion remains intact. `tools/make_motion.py`
maintains `assets/motion.json`; `shared.js` caps movement and exposes
off/subtle/gentle/lively levels; `app.js` uses its tailored Web Animations
profiles and pauses them in night mode. Reduced-motion remains still. New
Scale OS image URLs safely use the fallback motion profile when they have no
local token entry.

## Google Home blocker

Google Home automation is **not deliverable yet**. The Public Preview wall
account's Home is not configured with the known office address (`time.schedule`
fails), autocomplete exposes
only two OnOff TVs without `assistant.command.OkGoogle`, and no compatible
speaker/group appears.

An attended Google Home mobile session must set the Home address to Boschcour
20, 6221 JR Maastricht, link a
compatible Assistant speaker into that Home, then validate—not merely save—the
07:00 “Play Lofi Girl on Speqckers centrake r” and 23:00 “Stop music on
Speqckers centrake r” scripts. Do not report these as working before that test.

An optional foreground-only LAN follower is isolated under `cast-follower/`.
It is a temporary fallback, not installed or auto-started, and must not become a
persistent service without explicit authorization. It reads no remote config,
uses one allowlisted HTTPS station, requires the group name explicitly, and
never replaces or stops playback it did not start.

## Hosting and verification

### Physical stick 2 check

At Boschcour 20, 6221 JR Maastricht, on the actual 1920×1080 stick 2, reload
the page with the clock hidden and confirm the music badge and a deliberately
long label remain inside the right TV-safe margin. With the selected feed active
beside another office display, confirm both change to the same image at the same
180-second UTC boundary; then
disconnect the feed and confirm both select the same bundled fallback on the next
5-minute boundary, that the order differs from the previous day, and that the
background visibly drifts. Check active behavior on a normal weekday and Saturday, inactivity on
Sunday, an official Dutch public holiday, and a holiday supplied by Wall Controls,
then check just before/after 07:00 and 23:00
Europe/Amsterdam under both CET and CEST. Finally, verify a non-Philips TV starts Lofi
Girl on load, that on the Philips one click on the logo starts it without opening the
settings sidebar, that pulling the relay switches the badge to "FluxFM Chillhop ·
Lofi Girl unreachable" and back once it returns, and that the existing configured office Cast
speaker group still plays independently.
The optional `cast-follower/` is not part of this check: do not install or
auto-start it.

Pages remains the production host until a replacement is tested. Repository
privacy does not improve performance. The workflow still uses
`actions/deploy-pages`, publishes `remote.html`, and excludes `remote.js`,
`remote.css`, and `config.json`.

Run `node --test tests/*.test.js` and
`python3 -m unittest cast-follower/test_cast_follower.py`. Tests cover exact validation,
URL confinement, unknown/URL field rejection, deterministic boundary/revision,
Amsterdam CET/CEST, fallback, credential omission, ETag, absence of PAT/GitHub
writes, script-started audio (an `<audio>` element with no `autoplay` attribute,
plus the watchdog/reconnect/probe contract), remote retirement, and continued
Pages deployment.

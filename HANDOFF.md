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
deterministically.

Night mode uses `Europe/Amsterdam` 07:00–23:00 through `Intl`, including DST.
HTML audio is disabled/absent. Music intent is `true`, Lofi Girl, volume `0.45`;
only the Google Cast group may output it.

## Preserved motion work

PR #37's smooth per-image motion remains intact. `tools/make_motion.py`
maintains `assets/motion.json`; `shared.js` caps movement and exposes
off/subtle/gentle/lively levels; `app.js` uses its tailored Web Animations
profiles and pauses them in night mode. Reduced-motion remains still. New
Scale OS image URLs safely use the fallback motion profile when they have no
local token entry.

## Google Home blocker

Google Home automation is **not deliverable yet**. The Public Preview wall
account's Home has no address (`time.schedule` fails), autocomplete exposes
only two OnOff TVs without `assistant.command.OkGoogle`, and no compatible
speaker/group appears.

An attended Google Home mobile session must add the Home address, link a
compatible Assistant speaker into that Home, then validate—not merely save—the
07:00 “Play Lofi Girl on Speqckers centrake r” and 23:00 “Stop music on
Speqckers centrake r” scripts. Do not report these as working before that test.

An optional foreground-only LAN follower is isolated under `cast-follower/`.
It is a temporary fallback, not installed or auto-started, and must not become a
persistent service without explicit authorization. It reads no remote config,
uses one allowlisted HTTPS station, requires the group name explicitly, and
never replaces or stops playback it did not start.

## Hosting and verification

Pages remains the production host until a replacement is tested. Repository
privacy does not improve performance. The workflow still uses
`actions/deploy-pages`, publishes `remote.html`, and excludes `remote.js`,
`remote.css`, and `config.json`.

Run `node --test tests/wall-background.test.js` and
`python3 -m unittest cast-follower/test_cast_follower.py`. Tests cover exact validation,
URL confinement, unknown/URL field rejection, deterministic boundary/revision,
Amsterdam CET/CEST, fallback, credential omission, ETag, absence of PAT/GitHub
writes and HTML audio, remote retirement, and continued Pages deployment.

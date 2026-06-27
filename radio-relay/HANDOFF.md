# Lofi relay — project notes (for the next agent)

> The office TVs play background lofi from one stable MP3 URL. This folder
> (`radio-relay/`) is that service. **Status: working & stable.** It streams
> **Lofi Girl's SoundCloud catalogue on a loop.**
>
> Before changing anything, read **§3 (deploy topology)** — it's a two-repo
> setup that trips people up — and **§6 (why NOT YouTube)** so you don't waste
> days reverting to a dead end we already proved impossible.

---

## 1. What it is / how it works

`server.js` is the whole relay (one file, Node stdlib only). Flow:

1. **Flat-list** the source (`STREAM_URL`, default `https://soundcloud.com/lofi_girl`)
   into track permalinks via `yt-dlp --flat-playlist` (cached; refreshed every
   `RELIST_MS` = 6h, so new releases appear on their own).
2. **Shuffle** the list (unless `SHUFFLE=0`).
3. For each track: **resolve** a fresh media URL with `yt-dlp -g` (SoundCloud
   URLs expire, so resolve per-track right before playing), **transcode** to MP3
   with `ffmpeg` (`-vn`, no video), and **fan the bytes out** to every connected
   TV.
4. When a track ends, **advance** and loop forever. Bad/expired tracks are
   skipped; failures back off and retry.

One shared upstream serves all TVs at **`/lofi.mp3`**. A small prebuffer gives
instant start; the upstream stops `IDLE_TIMEOUT_MS` after the last TV leaves
(free-plan friendly).

## 2. Quick health check

- `GET /status` → `upstream:"playing"`, `tracks:<n>`, `trackIndex`,
  `currentTrack` (a real `soundcloud.com/lofi_girl/<song>` link), `lastError`.
- `GET /diag` → verbose `yt-dlp` resolve of the first track. `?url=X` tests any
  source URL; `?list` flat-lists the source's permalinks.
- `GET /healthz` → `ok`.
- Live URL: **https://esm-lofi-relay.onrender.com** (TVs use `/lofi.mp3`).

## 3. ⚠️ Deploy topology — READ THIS

Two **separate** GitHub repos are involved:

| Repo | Role | Can the agent push? |
|------|------|---------------------|
| **JeanCamposLabs/ESM-Screen** — relay in `radio-relay/`, branch `main` | Source of truth | ✅ yes |
| **JeanTechSupport/ESM-Screen** — relay files at repo **root**, branch `main` | What Render deploys | ❌ no (out of scope) — the **user** re-syncs |

Because they're separate repos, **commit hashes differ** between them — don't be
confused by that.

**The user's re-sync ritual** (they run it; `~/esm-lofi-relay` = their
JeanTechSupport clone):
```bash
rm -rf ~/esm-src
git clone https://github.com/JeanCamposLabs/ESM-Screen.git ~/esm-src
cp -R ~/esm-src/radio-relay/. ~/esm-lofi-relay/
cd ~/esm-lofi-relay && git add -A && git commit -m "sync relay" && git push origin main
```
Pushing to JeanTechSupport auto-deploys on Render. (Pushing relay changes to
JeanCamposLabs `main` is safe — `radio-relay/` is not published by GitHub Pages,
so it never touches the live ESM-Screen site.)

**Render service:** `esm-lofi-relay` · ID `srv-d8t8l9pkh4rs73bp0fdg` · runtime
**Docker** · plan **Free** · region **frankfurt** · autoDeploy on commit.

**Render env gotcha:** a `STREAM_URL` set in the Render dashboard **overrides**
the Dockerfile's `ENV STREAM_URL`. It must be the SoundCloud URL (or unset). A
leftover `cookies.txt` Secret File from the YouTube era is unused now and can be
deleted.

## 4. Maintenance — effectively none

- **Leave it running.** No cookies/tokens/secrets to rotate — that whole class of
  babysitting is gone (the entire reason for the SoundCloud switch).
- **Automatic:** skips bad/expired tracks, retries with exponential backoff,
  refreshes the track list every 6h.
- **Only real failure mode:** SoundCloud changes something that breaks `yt-dlp`
  (rare — far more stable than YouTube). Symptom: silent wall + `/status`
  `lastError` populated. **Fix (one click, ~3 min):** Render → `esm-lofi-relay`
  → **Manual Deploy → "Clear build cache & deploy"**. That pulls the latest
  `yt-dlp` (the Dockerfile `ADD` of yt-dlp's release metadata busts the pip
  layer), which almost always already has the fix.
- **Free plan:** spins down when no TV is connected; ~50s cold start on the first
  morning connection. Bump to **Starter** for always-on (optional, paid).
- **Optional fully-hands-off:** a weekly scheduled redeploy (Render Deploy Hook
  triggered by a cron / GitHub Action) would keep `yt-dlp` fresh proactively.
  Not currently set up.

## 5. Config & files

**Env vars** (full table in `README.md`): `STREAM_URL` (any SoundCloud
user/playlist/track URL), `BITRATE` (128k), `SHUFFLE` (1), `MAX_TRACKS` (300),
`RELIST_MS` (6h), `IDLE_TIMEOUT_MS` (60s), `MAX_LISTENERS` (50),
`MAX_CLIENT_BACKLOG` (4 MB), `PORT` (Render-set), `FFMPEG_PATH` / `YTDLP_PATH`.

**Files in `radio-relay/`:**
- `server.js` — the relay (see §1). Endpoints: `/lofi.mp3`, `/`, `/status`,
  `/diag`, `/healthz`.
- `Dockerfile` — `node:20-bookworm-slim` + apt `ffmpeg` + `pip yt-dlp[default]`
  (`curl_cffi` for SoundCloud impersonation). Single process: `node server.js`.
- `render.yaml` — Render Blueprint (runtime docker, free, frankfurt, STREAM_URL).
- `package.json` — `start` script + `ffmpeg-static` (a *local-dev* ffmpeg
  fallback only; the Docker image uses apt ffmpeg and never runs `npm install`).
- `README.md` — user-facing design + ops.
- `HANDOFF.md` — this file.

## 6. Why NOT YouTube (do not revert — proven impossible)

The original goal was the Lofi Girl **YouTube live** feed. **It cannot be served
from a cloud/datacenter IP**, proven across ~10 deploys:

- Every player client (web, web_safari, tv, mweb, android_vr) returns
  **`LOGIN_REQUIRED`** from Render's IP, at the *playability* stage — before PO
  tokens even apply.
- We built the **entire** modern yt-dlp YouTube stack and each piece verifiably
  worked, yet it was *still* walled: the **bgutil PO-token provider** (minted
  tokens fine, seen in `/diag`), **Deno** JS runtime, the **EJS** challenge
  solver (`--remote-components ejs:github`), and account **cookies**.
- The only thing that ever passed the wall was valid cookies — and Google
  **invalidates them within hours** from a datacenter IP. Unsustainable for an
  always-on relay. Cookieless + PO token also fails (`LOGIN_REQUIRED`).

**Conclusion:** "robust + the literal YouTube live + a cloud server" is not
achievable. SoundCloud hosts the same Lofi Girl label catalogue and resolves
cleanly with plain yt-dlp, so that's the design. If YouTube is ever demanded
again, the only options are a **residential IP/proxy** or **babysitting cookies**
— both strictly worse than the current setup. The investigation lives in the git
history (`102017d` … `07d20af`).

## 7. Common changes (how-to)

- **Different playlist/source:** set `STREAM_URL` to any SoundCloud
  user/set/track URL — a Render env var, instant, no rebuild.
- **No shuffle / fixed order:** `SHUFFLE=0`.
- **Reduce the ~1–2 s gap between tracks:** pre-resolve the *next* track's URL
  while the current one plays (small change in `startPipeline` / the
  `scheduleRestart(ok)` quick path). Left out — judged unnecessary for
  background audio.
- **"Now playing" on the wall:** the ESM-Screen page can poll `/status`
  `currentTrack` and show "Now playing … · Lofi Girl" with the SoundCloud link
  (good for proving authenticity). Offered to the user, not built.
- **It is NOT the YouTube live mirror** — it's the same catalogue looped, so the
  song won't match YouTube's live radio at any given moment. Describe it as
  "Lofi Girl's music," not "the livestream."

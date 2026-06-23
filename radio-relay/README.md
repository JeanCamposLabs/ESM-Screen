# ESM lofi relay 🎧

A tiny always-on service that turns the **Lofi Girl YouTube live stream** into a
plain **MP3 stream** the office TVs can play in their existing `<audio>` element.

**Why:** playing the YouTube video on the TVs is heavy (continuous 1080p video
decode on weak TV chips = lag) and shows ads. This relay strips all of that:

- `yt-dlp` resolves Lofi Girl's *current* live audio URL.
- `ffmpeg` drops the video (`-vn`) and transcodes the audio to MP3.
- The same bytes are fanned out to every TV from **one** upstream, served at a
  single stable URL: **`/lofi.mp3`**.
- No video decode on the TV → no lag. No YouTube player → no ads.

When YouTube rotates the URL or Lofi Girl restarts the stream, the upstream dies
and the relay re-resolves + restarts automatically — the TVs keep playing the
same URL and never notice.

## Endpoints

| Path         | What it does                                        |
|--------------|-----------------------------------------------------|
| `/lofi.mp3`  | The MP3 stream (point the TV `<audio>` here)         |
| `/`          | Debug page with an inline player                     |
| `/status`    | JSON: listener count, upstream state, last error     |
| `/healthz`   | Health check (used by Render)                        |

## Config (env vars)

| Var               | Default                                   | Notes                                  |
|-------------------|-------------------------------------------|----------------------------------------|
| `PORT`            | `10000`                                   | Render sets this automatically         |
| `STREAM_URL`      | `https://www.youtube.com/@LofiGirl/live`  | Any YouTube live/video or playlist URL |
| `BITRATE`         | `128k`                                    | MP3 bitrate                            |
| `IDLE_TIMEOUT_MS` | `60000`                                   | Stop the upstream this long after the last TV disconnects |

## Run locally

```bash
# needs ffmpeg + yt-dlp on PATH
node server.js
# open http://localhost:10000
```

Or with Docker (matches production):

```bash
docker build -t esm-lofi-relay .
docker run -p 10000:10000 esm-lofi-relay
```

## Deploy (Render)

Runs as a Docker **web service**, `rootDir: radio-relay`, **Starter** plan
(always-on — the free tier sleeps on idle and would drop the stream).
Health check path `/healthz`. See `render.yaml`.

## Caveats

- This relies on `yt-dlp`, which plays cat-and-mouse with YouTube and breaks
  from time to time — **redeploy to pull the latest `yt-dlp`** if the stream
  stops. `/status` shows the last error.
- Consumer YouTube is licensed for personal use; check music-licensing
  expectations before using in a customer-facing space.

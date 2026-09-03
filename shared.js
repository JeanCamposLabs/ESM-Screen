/* =================================================================
   Easy Scale Media — shared catalog + helpers
   Loaded by BOTH the screen (index.html → app.js) and the remote
   control page (remote.html → remote.js), so the two can never drift:
   same styles, palettes, stations, rotation maths and GitHub push.
   Exposed as window.ESM. No dependencies, no build. Keep it compatible
   with the older Chromium in the Philips TV browser (no ??, no .at()).
   ================================================================= */
(function (global) {
  "use strict";

  /* ---------- Catalog ---------- */
  const STYLES = [
    { id: "premium", name: "Premium",    desc: "Flowing liquid light, dark luxe" },
    { id: "nature",  name: "Cinematic",  desc: "Soft skies, horizon, golden glow" },
    { id: "tech",    name: "Futuristic", desc: "Particles, grid, light beams" },
    { id: "minimal", name: "Minimal",    desc: "Calm gradient, lots of space" },
  ];
  const PALETTES = [
    { id: "orange",   name: "Brand Orange",  color: "#ff7a18" },
    { id: "navy",     name: "Navy + Gold",   color: "#e9c46a" },
    { id: "electric", name: "Electric Blue", color: "#23d4fd" },
    { id: "teal",     name: "Teal",          color: "#2ee6a6" },
    { id: "purple",   name: "Purple",        color: "#b15cff" },
  ];
  // Audio-only stations. The first is the self-hosted Lofi Girl relay (see
  // radio-relay/); the rest are SomaFM (commercial-free, listener-supported)
  // plus two listener-supported classical stations with explicit stream URLs.
  const STATIONS = [
    { id: "lofigirl",      name: "Lofi Girl",              genre: "Lo-fi hip-hop · live",
      urls: ["https://esm-lofi-relay.onrender.com/lofi.mp3"] },
    { id: "groovesalad",   name: "Groove Salad",           genre: "Chill · downtempo" },
    { id: "fluid",         name: "Fluid",                  genre: "Lo-fi hip-hop · chillhop" },
    { id: "gsclassic",     name: "Groove Salad Classic",   genre: "Classic chill · ambient" },
    { id: "secretagent",   name: "Secret Agent",           genre: "Lounge · downtempo jazz" },
    { id: "lush",          name: "Lush",                   genre: "Mellow vocal chill" },
    { id: "beatblender",   name: "Beat Blender",           genre: "Deep house · downtempo" },
    { id: "thetrip",       name: "The Trip",               genre: "Downtempo · trip-hop" },
    { id: "spacestation",  name: "Space Station Soma",     genre: "Ambient · space" },
    { id: "sonicuniverse", name: "Sonic Universe",         genre: "Modern jazz" },
    { id: "illstreet",     name: "Illinois Street Lounge", genre: "Vintage lounge · exotica" },
    { id: "dronezone",     name: "Drone Zone",             genre: "Ambient · minimal beats" },
    { id: "deepspaceone",  name: "Deep Space One",         genre: "Deep ambient · space" },
    { id: "seventies",     name: "Left Coast 70s",         genre: "Mellow 70s album rock" },
    { id: "u80s",          name: "Underground 80s",        genre: "80s new wave · synthpop" },
    { id: "indiepop",      name: "Indie Pop Rocks",        genre: "Indie pop" },
    { id: "poptron",       name: "PopTron",                genre: "Electro-pop · indie dance" },
    { id: "bootliquor",    name: "Boot Liquor",            genre: "Americana roots" },
    { id: "suburbsofgoa",  name: "Suburbs of Goa",         genre: "Desi · world beats" },
    { id: "yourclassical", name: "YourClassical",          genre: "Classical",
      urls: ["https://ycradio.stream.publicradio.org/ycradio.mp3",
             "https://ycradio.stream.publicradio.org/ycradio.aac"] },
    { id: "wcpe",          name: "The Classical Station",  genre: "Classical (WCPE)",
      urls: ["https://playerservices.streamtheworld.com/api/livestream-redirect/WCPE_FMAAC.aac"] },
  ];
  // How often the background changes. Every screen computes the same pick from
  // the clock, so all TVs show the same image and switch at the same moment.
  const ROTATIONS = [
    { id: "off",    name: "Pinned (never)",   minutes: 0 },
    { id: "daily",  name: "Every day",        minutes: 1440 },
    { id: "4h",     name: "Every 4 hours",    minutes: 240 },
    { id: "hourly", name: "Every hour",       minutes: 60 },
    { id: "30m",    name: "Every 30 minutes", minutes: 30 },
    { id: "15m",    name: "Every 15 minutes", minutes: 15 },
    { id: "5m",     name: "Every 5 minutes",  minutes: 5 },
    { id: "3m",     name: "Every 3 minutes",  minutes: 3 },
  ];
  // How much the background drifts. Each image carries its own motion (assets/
  // motion.json, computed from the picture itself by tools/make_motion.py);
  // this only scales it. "off" holds every image perfectly still.
  const MOTIONS = [
    { id: "off",    name: "Still",        k: 0 },
    { id: "subtle", name: "Barely there", k: 0.6 },
    { id: "gentle", name: "Gentle",       k: 1 },
    { id: "lively", name: "Lively",       k: 1.5 },
  ];
  // The image layer is drawn this much bigger than the screen, so it can drift
  // without ever showing an edge: 1.09 → 4.5% of overhang on each side, and the
  // pan is capped below that (2.0% x 1.5 = 3.0% at the liveliest setting).
  const MOTION_BASE_SCALE = 1.09;
  const MOTION_MARGIN = 4.0;                                   // % — hard cap on the pan
  const MOTION_FALLBACK = { x: 1.1, y: 1.05, z: 0.012, d: 115 }; // used if motion.json is missing

  // Gallery categories, read from the file name (see slideInfo).
  const CATEGORIES = [
    { id: "space",    name: "Deep space",        blurb: "Hubble / Webb / Spitzer — NASA, public domain" },
    { id: "earth",    name: "Earth from orbit",  blurb: "Auroras and the horizon, shot from the ISS — NASA" },
    { id: "nature",   name: "Landscapes",        blurb: "Real photography — Unsplash licence" },
    { id: "abstract", name: "Abstract",          blurb: "Liquid light, gold, waves — Unsplash licence" },
    { id: "art",      name: "Illustrated",       blurb: "Generated in-house (flat, stylised)" },
  ];
  // The keys that make up the house config (config.json). Anything else in
  // the screen's state (name, tag, musicBar…) stays local to that device.
  const CONFIG_KEYS = [
    "style", "palette", "bg", "bgRotate", "bgSet", "bgMotion",
    "logo", "rocket", "clock", "particles", "weather", "speed",
    "music", "musicStation", "musicVolume", "musicOutput",
    "schedule", "onTime", "offTime", "nightClock",
  ];
  // Where the music plays: the TVs' own speakers, a Google Cast speaker group
  // (see cast-follower/), or both. The TVs only play when it is "tvs" or "both".
  const MUSIC_OUTPUTS = [
    { id: "tvs",      name: "The TVs" },
    { id: "speakers", name: "Google speakers (cast follower)" },
    { id: "both",     name: "TVs and speakers" },
  ];

  // House-config defaults (the screen adds its device-only keys on top).
  const CONFIG_DEFAULTS = {
    style: "premium", palette: "orange",
    bg: "10-purple", bgRotate: "daily", bgSet: [], bgMotion: "gentle",
    logo: true, rocket: true, clock: false, particles: true, weather: true, speed: 1,
    music: false, musicStation: "lofigirl", musicVolume: 0.35, musicOutput: "tvs",
    schedule: true, onTime: "07:00", offTime: "23:00", nightClock: true,
  };

  const REPO = "JeanCamposLabs/ESM-Screen";
  const SITE = "https://jeancamposlabs.github.io/ESM-Screen/";

  /* ---------- Stations ---------- */
  // Candidate stream URLs for a station, tried in order with fallback. SomaFM
  // stations build mirror URLs from the id (so one server outage doesn't kill
  // the music); others carry explicit `urls`. All HTTPS (works on Pages).
  function stationUrls(st) {
    if (st && st.urls) return st.urls.slice();
    const slug = (st && st.id) || st;
    return ["ice1", "ice2", "ice4", "ice6"]
      .map((m) => "https://" + m + ".somafm.com/" + slug + "-128-mp3")
      .concat("https://ice.somafm.com/" + slug);
  }
  function findStation(id) {
    return STATIONS.find((s) => s.id === id) || STATIONS[0];
  }

  /* ---------- Slides ---------- */
  // "assets/slides/41-space-cosmic-cliffs.jpg" → "41-space-cosmic-cliffs"
  function slideToken(src) {
    return String(src || "").split("/").pop().replace(/\.\w+$/, "");
  }
  // Category + display name from the file name. New files carry a category
  // token (space-/earth-/nature-); the original 01–12 are abstract Unsplash
  // photos and 13–38 the in-house illustrated set.
  function slideInfo(src) {
    const token = slideToken(src);
    const m = token.match(/^(\d+)-(.*)$/);
    const num = m ? parseInt(m[1], 10) : 0;
    let rest = m ? m[2] : token;
    let cat = "abstract";
    const cm = rest.match(/^(space|earth|nature|abstract|art)-(.+)$/);
    if (cm) { cat = cm[1]; rest = cm[2]; }
    else if (num >= 13 && num <= 38) cat = "art";
    const name = rest.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return { token, num, cat, name };
  }
  function thumbFor(src) {
    return String(src).replace(/^assets\/slides\//, "assets/thumbs/").replace(/\.\w+$/, ".jpg");
  }
  // The playlist: `bgSet` lists the tokens allowed in the rotation. Empty or
  // missing = everything. A set that matches nothing falls back to everything
  // (so a renamed file can never leave a screen with no background).
  function effectiveSlides(all, set) {
    if (!Array.isArray(set) || !set.length) return all.slice();
    const want = {};
    set.forEach((t) => { want[slideToken(t)] = true; });
    const out = all.filter((s) => { const i = slideInfo(s); return want[i.token] || want[i.cat]; });
    return out.length ? out : all.slice();
  }
  // The shortest bgSet for a list of ticked tokens: whole categories collapse to
  // their id, everything ticked collapses to [] (= no restriction, so a new
  // file dropped into assets/slides joins the rotation by itself).
  function compactPlaylist(all, tokens) {
    const inc = {};
    tokens.forEach((t) => { inc[slideToken(t)] = true; });
    const out = []; let total = 0;
    CATEGORIES.forEach((cat) => {
      const items = all.map(slideInfo).filter((i) => i.cat === cat.id);
      if (!items.length) return;
      const on = items.filter((i) => inc[i.token]);
      total += on.length;
      if (on.length === items.length) out.push(cat.id);
      else on.forEach((i) => out.push(i.token));
    });
    return total >= all.length ? [] : out;
  }
  function findSlide(all, nameOrToken) {
    if (!nameOrToken) return -1;
    const t = slideToken(nameOrToken);
    let i = all.findIndex((s) => slideToken(s) === t);
    if (i < 0) i = all.findIndex((s) => s.indexOf(nameOrToken) >= 0);
    return i;
  }

  /* ---------- Rotation maths ----------
     Time is cut into slots of N minutes (local time, so "daily" flips at local
     midnight and "hourly" on the hour). Each slot maps to one slide through a
     seeded shuffle, so consecutive slots show different-looking images instead
     of walking the folder in order — and every image is shown exactly once
     before the order reshuffles. Same clock ⇒ same pick on every TV. */
  function rotationMinutes(id) {
    const r = ROTATIONS.find((x) => x.id === id);
    return r ? r.minutes : 0;
  }
  function localMinutes(now) {
    const d = now || new Date();
    return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 60000);
  }
  function seededOrder(n, seed) {
    // mulberry32 + Fisher–Yates: tiny, deterministic, good enough for shuffling
    let a = (seed >>> 0) || 1;
    const rnd = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }
    return order;
  }
  // → { index, slot, nextChangeMs } or null when rotation is off / no slides
  function rotationPick(count, rotateId, now) {
    const mins = rotationMinutes(rotateId);
    if (!mins || !count) return null;
    const d = now || new Date();
    const slot = Math.floor(localMinutes(d) / mins);
    const epoch = Math.floor(slot / count);
    const order = seededOrder(count, epoch * 7919 + count * 31 + mins);
    const index = order[((slot % count) + count) % count];
    // to the second, so a screen can switch right on the boundary (paired screens switch together)
    const localSec = Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 1000);
    const nextChangeMs = ((slot + 1) * mins * 60 - localSec) * 1000;
    return { index, slot, nextChangeMs };
  }

  /* ---------- Background motion ----------
     Each slide has its own drift; the setting only scales it. Returns the two
     transforms and a duration, or null when nothing should move. The animation
     runs `alternate` and forever, so the image eases out to one side, comes back,
     and never jumps. */
  function motionFor(map, src) {
    const m = map && map[slideToken(src)];
    return m && typeof m.d === "number" ? m : MOTION_FALLBACK;
  }
  function motionScale(id) {
    const m = MOTIONS.find((x) => x.id === id);
    return m ? m.k : 1;
  }
  function motionFrames(motion, motionId, reduced) {
    const k = motionScale(motionId);
    if (!k || reduced) return null;
    const cap = (v) => Math.max(-MOTION_MARGIN, Math.min(MOTION_MARGIN, v * k));
    const x = cap(motion.x), y = cap(motion.y), z = Math.max(0, motion.z * k);
    if (!x && !y && !z) return null;
    const s0 = MOTION_BASE_SCALE;
    return {
      from: "translate(" + (-x).toFixed(2) + "%, " + (-y).toFixed(2) + "%) scale(" + s0.toFixed(3) + ")",
      to: "translate(" + x.toFixed(2) + "%, " + y.toFixed(2) + "%) scale(" + (s0 + z).toFixed(3) + ")",
      duration: Math.max(30, motion.d) * 1000,
    };
  }
  const motionStill = () => "scale(" + MOTION_BASE_SCALE.toFixed(3) + ")";

  /* ---------- Config ---------- */
  // Accept older configs: `dailyBg: true/false` becomes `bgRotate`.
  function normalizeConfig(cfg) {
    const c = Object.assign({}, cfg || {});
    if (c.bgRotate == null && c.dailyBg != null) c.bgRotate = c.dailyBg ? "daily" : "off";
    if (c.bgRotate != null && !ROTATIONS.some((r) => r.id === c.bgRotate)) delete c.bgRotate;
    delete c.dailyBg;
    if (c.bgSet != null && !Array.isArray(c.bgSet)) delete c.bgSet;
    if (Array.isArray(c.bgSet)) c.bgSet = c.bgSet.map(slideToken).filter(Boolean);
    if (c.bg != null) c.bg = slideToken(c.bg);
    if (c.musicOutput != null && !MUSIC_OUTPUTS.some((o) => o.id === c.musicOutput)) delete c.musicOutput;
    if (c.bgMotion != null && !MOTIONS.some((m) => m.id === c.bgMotion)) delete c.bgMotion;
    return c;
  }
  // The house config as it is written to config.json (stable key order).
  function pickConfig(state) {
    const out = {};
    CONFIG_KEYS.forEach((k) => {
      if (state[k] === undefined) return;
      out[k] = k === "bg" ? slideToken(state[k]) : state[k];
    });
    if (Array.isArray(out.bgSet) && !out.bgSet.length) delete out.bgSet;
    return out;
  }
  function sameConfig(a, b) {
    return JSON.stringify(pickConfig(normalizeConfig(a))) === JSON.stringify(pickConfig(normalizeConfig(b)));
  }

  /* ---------- One-click central control (GitHub REST) ----------
     Commits config.json on `main`; the Pages workflow republishes it and every
     screen adopts it on its next 30 s poll. Needs a fine-grained token with
     Contents: read & write on this repo only. */
  const b64utf8 = (s) => btoa(unescape(encodeURIComponent(s)));
  function explainGithub(status, phase, ghMessage) {
    const gh = ghMessage ? " — GitHub said: “" + ghMessage + "”" : "";
    if (status === 401)
      return "GitHub says the token itself is invalid (401). Re-copy the full token (it starts with github_pat_) and paste it again.";
    if (status === 404)
      return "The token works but cannot see this repo (404). On the token's page: Repository access → Only select repositories → add ESM-Screen, then Save and try again.";
    if (status === 403)
      return "The token cannot " + phase + " (403). On the token's page: Permissions → Repository permissions → Contents → Read and write, then Save and try again." + gh;
    if (status === 409)
      return "GitHub reported a conflict (409) — someone pushed at the same moment. Try again.";
    return "GitHub error " + status + " while trying to " + phase + gh + ". Try again.";
  }
  async function pushConfig(token, cfg, message) {
    const api = "https://api.github.com/repos/" + REPO + "/contents/config.json";
    const headers = { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" };
    const body = JSON.stringify(cfg, null, 2) + "\n";
    let res;
    try {
      res = await fetch(api + "?ref=main&t=" + Date.now(), { headers, cache: "no-store" });
    } catch (e) {
      return { ok: false, network: true, message: "Couldn't reach GitHub — check the connection and try again." };
    }
    if (!res.ok) {
      let gh = ""; try { gh = (await res.json()).message || ""; } catch (e) {}
      return { ok: false, status: res.status, message: explainGithub(res.status, "read config.json", gh) };
    }
    const cur = await res.json();
    let put;
    try {
      put = await fetch(api, {
        method: "PUT", headers,
        body: JSON.stringify({ message: message || "Update screen config from remote", branch: "main", sha: cur.sha, content: b64utf8(body) }),
      });
    } catch (e) {
      return { ok: false, network: true, message: "Couldn't reach GitHub — check the connection and try again." };
    }
    if (!put.ok) {
      let gh = ""; try { gh = (await put.json()).message || ""; } catch (e) {}
      return { ok: false, status: put.status, message: explainGithub(put.status, "write config.json", gh) };
    }
    let commitUrl = "";
    try { commitUrl = (await put.json()).commit.html_url || ""; } catch (e) {}
    return { ok: true, commitUrl, body };
  }
  // Fetch the config the screens are currently reading (from this site).
  async function fetchLiveConfig(base) {
    const r = await fetch((base || "") + "config.json?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error("config.json " + r.status);
    return r.json();
  }
  // Poll the published site until it serves the config we just pushed.
  // onTick(secondsElapsed) is called every poll; resolves true when live.
  async function waitForDeploy(expected, opts) {
    const o = opts || {};
    const every = o.everyMs || 10000, limit = o.limitMs || 6 * 60000, base = o.base || "";
    const t0 = Date.now();
    while (Date.now() - t0 < limit) {
      await new Promise((res) => setTimeout(res, every));
      try {
        const live = await fetchLiveConfig(base);
        if (sameConfig(live, expected)) return true;
      } catch (e) {}
      if (o.onTick) o.onTick(Math.round((Date.now() - t0) / 1000));
    }
    return false;
  }

  global.ESM = {
    STYLES, PALETTES, STATIONS, ROTATIONS, CATEGORIES, MUSIC_OUTPUTS, MOTIONS, CONFIG_KEYS, CONFIG_DEFAULTS, REPO, SITE,
    stationUrls, findStation,
    slideToken, slideInfo, thumbFor, effectiveSlides, compactPlaylist, findSlide,
    rotationMinutes, localMinutes, seededOrder, rotationPick,
    motionFor, motionScale, motionFrames, motionStill, MOTION_BASE_SCALE,
    normalizeConfig, pickConfig, sameConfig,
    pushConfig, fetchLiveConfig, waitForDeploy, explainGithub,
  };
})(typeof window !== "undefined" ? window : globalThis);

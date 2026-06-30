/* =================================================================
   Easy Scale Media — Ambient Screen controller
   - Theme/palette switching, hidden control panel, live clock,
     auto on/off schedule, ambient particle canvas, persistence.
   - No dependencies, no build. Settings persist in localStorage.
   ================================================================= */
(() => {
  "use strict";

  /* ---------- Catalog (drives the control panel) ---------- */
  const STYLES = [
    { id: "premium", name: "Premium",   desc: "Flowing liquid light, dark luxe" },
    { id: "nature",  name: "Cinematic", desc: "Soft skies, horizon, golden glow" },
    { id: "tech",    name: "Futuristic",desc: "Particles, grid, light beams" },
    { id: "minimal", name: "Minimal",   desc: "Calm gradient, lots of space" },
  ];
  const PALETTES = [
    { id: "orange",   name: "Brand Orange", color: "#ff7a18" },
    { id: "navy",     name: "Navy + Gold",  color: "#e9c46a" },
    { id: "electric", name: "Electric Blue",color: "#23d4fd" },
    { id: "teal",     name: "Teal",         color: "#2ee6a6" },
    { id: "purple",   name: "Purple",       color: "#b15cff" },
  ];

  /* ---------- Defaults / state ---------- */
  const DEFAULTS = {
    style: "premium",
    palette: "orange",
    logo: true,
    rocket: true,
    clock: false,
    particles: true,
    name: "Easy Scale Media",
    tag: "Scaling brands to the moon.",
    speed: 1,
    schedule: true,
    onTime: "07:00",
    offTime: "23:00",
    nightClock: true,
    bg: "10-purple",
    dailyBg: true,           // auto-rotate the background once a day
    weather: true,
    worldcup: true,
    music: false,            // ambient internet radio (audio only)
    musicStation: "lofigirl",
    musicVolume: 0.35,
    musicBar: true,          // show the small on-screen music control
  };
  const KEY = "esm-screen.v1";

  // Audio-only stations for the office; "Next" cycles through them. The first is
  // our self-hosted Lofi Girl relay (YouTube live -> MP3, see radio-relay/); the
  // rest are SomaFM — commercial-free, listener-supported (https://somafm.com).
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
    // Classical — listener-supported public radio (not SomaFM), explicit stream URLs.
    { id: "yourclassical", name: "YourClassical",          genre: "Classical",
      urls: ["https://ycradio.stream.publicradio.org/ycradio.mp3",
             "https://ycradio.stream.publicradio.org/ycradio.aac"] },
    { id: "wcpe",          name: "The Classical Station",  genre: "Classical (WCPE)",
      urls: ["https://playerservices.streamtheworld.com/api/livestream-redirect/WCPE_FMAAC.aac"] },
  ];
  // Candidate stream URLs for a station, tried in order with fallback. SomaFM
  // stations build mirror URLs from the id (so a single server outage doesn't
  // kill the music); others carry explicit `urls`. All HTTPS (works on Pages).
  function stationUrls(st) {
    if (st && st.urls) return st.urls.slice();
    const slug = (st && st.id) || st;
    return ["ice1", "ice2", "ice4", "ice6"]
      .map((m) => `https://${m}.somafm.com/${slug}-128-mp3`)
      .concat(`https://ice.somafm.com/${slug}`);
  }

  let state = load();

  // URL overrides — handy for pinning a kiosk to one look: ?style=premium&palette=navy
  (() => {
    const q = new URLSearchParams(location.search);
    const s = q.get("style"), p = q.get("palette");
    if (s && STYLES.some((x) => x.id === s)) state.style = s;
    if (p && PALETTES.some((x) => x.id === p)) state.palette = p;
  })();

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      return { ...DEFAULTS, ...saved };
    } catch { return { ...DEFAULTS }; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }

  /* ---------- Element refs ---------- */
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const screen = $("screen");

  /* ---------- Apply state to the DOM ---------- */
  function apply() {
    root.dataset.style = state.style;
    root.dataset.palette = state.palette;
    root.dataset.nightclock = state.nightClock ? "1" : "0";
    root.style.setProperty("--speed", String(state.speed));

    $("brand").style.display = "none";                  // superseded by the floating disc
    $("disc").style.display = state.logo ? "" : "none";
    $("rocketLane").style.display = state.rocket ? "" : "none";
    $("clock").hidden = !state.clock;
    $("particles").style.display = state.particles ? "" : "none";
    $("weather").hidden = !state.weather;
    $("worldcup").hidden = !(state.worldcup && wcHasGames);

    $("brandName").textContent = state.name;
    $("brandTag").textContent = state.tag;
    $("brandTag").style.display = state.tag ? "" : "none";
    document.title = state.name || "Ambient Screen";

    if (!slidesActive) loadSceneImage(state.style);   // gallery, when present, owns the bg
    syncPanel();
    applySchedule();
  }

  /* ---------- Nano Banana image loader ----------
     If assets/bg-<style>.(jpg|png|webp) exists, use it as the base layer.
     Otherwise the CSS-generated scene shows through. */
  const imgCache = {};
  function loadSceneImage(style) {
    const el = $("sceneImage");
    if (imgCache[style] !== undefined) { setSceneImage(el, imgCache[style]); return; }
    const candidates = [
      `assets/bg-${style}.jpg`,
      `assets/bg-${style}.png`,
      `assets/bg-${style}.webp`,
    ];
    (function tryNext(i) {
      if (i >= candidates.length) { imgCache[style] = null; setSceneImage(el, null); return; }
      const probe = new Image();
      probe.onload = () => { imgCache[style] = candidates[i]; if (root.dataset.style === style) setSceneImage(el, candidates[i]); };
      probe.onerror = () => tryNext(i + 1);
      probe.src = candidates[i];
    })(0);
  }
  function setSceneImage(el, url) {
    // Once the slide gallery is up it owns the image layers — the async probe
    // above may resolve late and must never wipe the slide that's on screen.
    if (slidesActive) return;
    if (url) { el.style.backgroundImage = `url("${url}")`; el.classList.add("is-ready"); }
    else { el.style.backgroundImage = ""; el.classList.remove("is-ready"); }
  }

  /* ---------- Optional logo image (assets/logo.svg|png) ---------- */
  (function detectLogo() {
    const candidates = ["assets/logo.svg", "assets/logo.png", "assets/logo.webp"];
    (function tryNext(i) {
      if (i >= candidates.length) return;
      const probe = new Image();
      probe.onload = () => {
        const lockup = document.querySelector(".brand__lockup");
        if (!lockup) return;
        lockup.innerHTML = "";
        const img = document.createElement("img");
        img.className = "brand__logo-img"; img.src = candidates[i]; img.alt = state.name;
        lockup.appendChild(img);
      };
      probe.onerror = () => tryNext(i + 1);
      probe.src = candidates[i];
    })(0);
  })();

  /* ---------- Clock ---------- */
  function pad(n) { return String(n).padStart(2, "0"); }
  function tick() {
    const now = new Date();
    const t = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    $("clockTime").textContent = t;
    $("nightClock").textContent = t;
    $("clockDate").textContent = now.toLocaleDateString(undefined,
      { weekday: "long", month: "long", day: "numeric" });
  }

  /* ---------- Schedule (auto on/off) ---------- */
  function toMin(hhmm) { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function applySchedule() {
    if (!state.schedule) {
      screen.classList.remove("is-night");
    } else {
      const now = new Date();
      const cur = now.getHours() * 60 + now.getMinutes();
      const on = toMin(state.onTime), off = toMin(state.offTime);
      // Daytime window may wrap past midnight (e.g. on 07:00, off 23:00 = simple;
      // on 18:00, off 02:00 = wraps).
      const isDay = on <= off ? (cur >= on && cur < off) : (cur >= on || cur < off);
      screen.classList.toggle("is-night", !isDay);
    }
    syncMusic();   // go quiet at night, resume in the day
  }

  /* ---------- Ambient particle canvas ----------
     Lightweight floating motes that pick up the palette accent. Capped for
     a smooth all-day run on big panels. */
  let particles = [], rafId = null, lastT = 0;
  const canvas = $("particles");
  const ctx = canvas.getContext("2d");
  function accentColor() {
    return getComputedStyle(root).getPropertyValue("--accent").trim() || "#ff7a18";
  }
  function sizeCanvas() {
    const scale = 0.5;                      // render motes below native res — big TV perf win
    canvas.width = Math.floor(innerWidth * scale);
    canvas.height = Math.floor(innerHeight * scale);
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    seed();
  }
  function seed() {
    // denser + sized relative to the panel so motes read on big screens
    const target = Math.min(50, Math.round((innerWidth * innerHeight) / 42000));
    const base = Math.max(1.3, Math.min(innerWidth, innerHeight) / 430);
    particles = Array.from({ length: target }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: base * (Math.random() * 1.8 + 0.8),
      sx: (Math.random() - 0.5) * 0.12,
      sy: -(Math.random() * 0.22 + 0.05),
      a: Math.random() * 0.5 + 0.35,
      tw: Math.random() * Math.PI * 2,
    }));
  }
  function frame(t) {
    rafId = requestAnimationFrame(frame);
    if (t - lastT < 42) return;            // ~24fps cap (gentler on TV CPUs)
    const dt = Math.min((t - lastT) / 16.67, 2); lastT = t;
    if (!state.particles || screen.classList.contains("is-night")) {
      ctx.clearRect(0, 0, innerWidth, innerHeight); return;
    }
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const col = accentColor();
    const spd = state.speed;
    for (const p of particles) {
      p.x += p.sx * dt * spd; p.y += p.sy * dt * spd; p.tw += 0.03 * dt;
      if (p.y < -6) { p.y = innerHeight + 6; p.x = Math.random() * innerWidth; }
      if (p.x < -6) p.x = innerWidth + 6; else if (p.x > innerWidth + 6) p.x = -6;
      const flicker = (Math.sin(p.tw) * 0.3 + 0.7);
      ctx.globalAlpha = p.a * flicker;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Control panel ---------- */
  function buildPanel() {
    const sg = $("styleGrid");
    sg.innerHTML = "";
    STYLES.forEach((s) => {
      const b = document.createElement("button");
      b.className = "opt"; b.dataset.id = s.id;
      b.innerHTML = `<span class="opt__name">${s.name}</span><span class="opt__desc">${s.desc}</span>`;
      b.onclick = () => { state.style = s.id; commit(); };
      sg.appendChild(b);
    });
    const pr = $("paletteRow");
    pr.innerHTML = "";
    PALETTES.forEach((p) => {
      const b = document.createElement("button");
      b.className = "swatch"; b.dataset.id = p.id;
      b.style.background = p.color; b.title = p.name;
      b.onclick = () => { state.palette = p.id; commit(); };
      pr.appendChild(b);
    });

    $("tgLogo").onchange    = (e) => { state.logo = e.target.checked; commit(); };
    $("tgRocket").onchange  = (e) => { state.rocket = e.target.checked; commit(); };
    $("tgClock").onchange   = (e) => { state.clock = e.target.checked; commit(); };
    $("tgParticles").onchange = (e) => { state.particles = e.target.checked; commit(); };
    $("tgWeather").onchange = (e) => { state.weather = e.target.checked; if (state.weather) fetchWeather(); commit(); };
    $("tgWorldcup").onchange = (e) => { state.worldcup = e.target.checked; commit(); if (state.worldcup) fetchWorldCup(); };
    $("tgDailyBg").onchange = (e) => { state.dailyBg = e.target.checked; save(); if (state.dailyBg) gotoDailyBg(); };
    $("inSpeed").oninput    = (e) => { state.speed = parseFloat(e.target.value); commit(); };
    $("tgSchedule").onchange= (e) => { state.schedule = e.target.checked; commit(); };
    $("inOn").onchange      = (e) => { state.onTime = e.target.value; commit(); };
    $("inOff").onchange     = (e) => { state.offTime = e.target.value; commit(); };
    $("tgNightClock").onchange = (e) => { state.nightClock = e.target.checked; commit(); };

    // Music
    const stg = $("stationGrid");
    stg.innerHTML = "";
    STATIONS.forEach((s) => {
      const b = document.createElement("button");
      b.className = "opt"; b.dataset.id = s.id;
      b.innerHTML = `<span class="opt__name">${s.name}</span><span class="opt__desc">${s.genre}</span>`;
      b.onclick = () => setStation(s.id, false);
      stg.appendChild(b);
    });
    $("tgMusic").onchange    = (e) => { state.music = e.target.checked; if (state.music) manualPaused = false; commit(); };
    $("tgMusicBar").onchange = (e) => { state.musicBar = e.target.checked; commit(); };
    $("inMusicVol").oninput  = (e) => { state.musicVolume = parseFloat(e.target.value); audio.volume = clamp(state.musicVolume, 0, 1); save(); renderMusicbar(); };
    $("btnNextStation").onclick = nextStation;

    $("btnFull").onclick  = toggleFullscreen;
    $("btnReset").onclick = () => { state = { ...DEFAULTS }; commit(); flash("Reset to defaults"); };
    $("btnApplyAll").onclick = pushConfigToAllScreens;
    $("btnSync").onclick = () => {
      try { navigator.clipboard.writeText(JSON.stringify(configForExport(), null, 2)); flash("Config copied — paste into config.json on GitHub"); }
      catch { flash("Clipboard unavailable here"); }
    };
    $("panelClose").onclick = closePanel;
    $("panelScrim").onclick = closePanel;
  }

  function syncPanel() {
    document.querySelectorAll("#styleGrid .opt").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.id === state.style));
    document.querySelectorAll("#paletteRow .swatch").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.id === state.palette));
    $("tgLogo").checked = state.logo;
    $("tgRocket").checked = state.rocket;
    $("tgClock").checked = state.clock;
    $("tgParticles").checked = state.particles;
    $("tgWeather").checked = state.weather;
    $("tgWorldcup").checked = state.worldcup;
    $("inSpeed").value = state.speed;
    $("tgSchedule").checked = state.schedule;
    $("inOn").value = state.onTime;
    $("inOff").value = state.offTime;
    $("tgNightClock").checked = state.nightClock;
    $("tgMusic").checked = state.music;
    $("tgMusicBar").checked = state.musicBar;
    $("inMusicVol").value = state.musicVolume;
    $("tgDailyBg").checked = state.dailyBg;
    syncMusicPanel();
    syncBgGrid();
  }

  function syncMusicPanel() {
    document.querySelectorAll("#stationGrid .opt").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.id === state.musicStation));
  }

  function commit() { save(); apply(); }
  function flash(msg, ms = 2000) { const s = $("panelStatus"); s.textContent = msg; setTimeout(() => { if (s.textContent === msg) s.textContent = ""; }, ms); }

  let panelOpen = false;
  function openPanel() {
    panelOpen = true;
    $("panel").hidden = false; $("panelScrim").hidden = false;
    document.body.classList.add("show-cursor");
    syncPanel();
  }
  function closePanel() {
    panelOpen = false;
    $("panel").hidden = true; $("panelScrim").hidden = true;
    document.body.classList.remove("show-cursor");
  }
  function togglePanel() { panelOpen ? closePanel() : openPanel(); }

  /* ---------- Reveal: triple-click hotspot, key "c"/"s", or #admin ---------- */
  let clicks = 0, clickTimer = null;
  $("hotspot").addEventListener("click", () => {
    clicks++;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { clicks = 0; }, 1500);
    if (clicks >= 3) { clicks = 0; togglePanel(); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) { if (e.key === "Escape") closePanel(); return; }
    const k = e.key.toLowerCase();
    if (k === "c" || k === "s") togglePanel();
    else if (k === "escape") closePanel();
    else if (k === "f") toggleFullscreen();
    else if (k === "n" && slidesActive) setBg(slideIdx + 1, true);   // manual next background
    else if (k === "m" && state.music) nextStation();                // next music station
  });
  if (location.hash === "#admin" || new URLSearchParams(location.search).has("admin")) {
    // open after first paint
    setTimeout(openPanel, 400);
  }

  /* ---------- Fullscreen ---------- */
  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  }

  /* ---------- First-run hint ---------- */
  function maybeHint() {
    if (localStorage.getItem(KEY)) return;  // returning device: skip
    const h = $("hint");
    h.classList.add("is-show");
    setTimeout(() => h.classList.remove("is-show"), 9000);
  }

  /* ---------- Keep the display awake (always-on TV) ---------- */
  let wakeLock = null;
  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener?.("release", () => { wakeLock = null; });
      }
    } catch { /* denied or unsupported — harmless on a TV browser */ }
  }

  /* ---------- Auto-refresh on a new release ----------
     Poll version.json; when the deployed version differs from the one this page
     booted with, fade out and reload to pick up the new build. No build step
     needed — the deploy workflow stamps the commit into version.json, so any
     push to main reaches every screen. Cache-busted + no-store = picked up fast. */
  const VERSION_URL = "version.json";
  const VERSION_POLL_MS = 30000;
  let bootVersion = null, reloading = false;

  async function fetchVersion() {
    try {
      const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      return data && data.version != null ? String(data.version) : null;
    } catch { return null; }
  }
  async function checkVersion() {
    const v = await fetchVersion();
    if (v == null) return;                  // missing file or network blip — ignore
    if (bootVersion == null) { bootVersion = v; return; }   // establish baseline
    if (v !== bootVersion) reloadForUpdate();
  }
  function reloadForUpdate() {
    if (reloading) return;
    reloading = true;
    document.body.classList.add("is-updating");   // brief fade-out (see CSS)
    setTimeout(() => location.reload(), 650);
  }

  /* ---------- Re-sync when the device wakes or reconnects ---------- */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    tick(); applySchedule(); checkVersion(); requestWakeLock(); fetchWeather(); fetchWorldCup(); syncConfig();
  });
  addEventListener("online", checkVersion);

  /* ---------- Rocket flight: a fresh entry point + path every trip ---------- */
  const rocketEl = document.querySelector(".rocket");
  const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rand = (a, b) => Math.random() * (b - a) + a;

  // The icon rests pointing up-right (+45° above "east"); aim that along travel.
  const NOSE_OFFSET = 45;
  function flyRocket() {
    if (!rocketEl || !rocketEl.animate || prefersReduced) return;
    if (!state.rocket || screen.classList.contains("is-night")) {
      setTimeout(flyRocket, 4000);            // not now — check back shortly
      return;
    }
    let from, to;
    if (Math.random() < 0.6) {
      // enter from the left at a random height, cruise up and off the right
      const y = rand(14, 72);
      from = [rand(-20, -14), y]; to = [122, y - rand(16, 48)];
    } else {
      // rise from below in a random column, drift up and off the top
      const x = rand(8, 58);
      from = [x, rand(108, 122)]; to = [x + rand(20, 60), rand(-42, -26)];
    }
    // Point the nose along the real on-screen direction of travel (tip-first).
    const dxPx = (to[0] - from[0]) * innerWidth / 100;
    const dyPx = (to[1] - from[1]) * innerHeight / 100;
    const deg = Math.atan2(dyPx, dxPx) * 180 / Math.PI + NOSE_OFFSET;
    const dur = rand(48, 72) / (state.speed || 1) * 1000;   // slow, calm cruise
    rocketEl.animate(
      [
        { transform: `translate(${from[0]}vw, ${from[1]}vh) rotate(${deg}deg)`, opacity: 0 },
        { opacity: 1, offset: 0.12 },
        { opacity: 1, offset: 0.88 },
        { transform: `translate(${to[0]}vw, ${to[1]}vh) rotate(${deg}deg)`, opacity: 0 },
      ],
      { duration: dur, easing: "cubic-bezier(.45,.05,.55,.95)" }
    ).onfinish = () => setTimeout(flyRocket, rand(1500, 7000));
  }

  /* ---------- Background gallery: cross-fading slideshow + slow pan ----------
     Reads assets/backgrounds.json (a list of image URLs, auto-generated on
     deploy from assets/slides/). Two layers cross-fade; each slide gets its
     own slow Ken-Burns drift so the image keeps moving. */
  const slideLayers = [$("sceneImage"), $("sceneImageB")];
  // last-resort list so the gallery still works if backgrounds.json can't be fetched
  const FALLBACK_SLIDES = [
    "assets/slides/01-liquid.jpg", "assets/slides/02-waves.jpg", "assets/slides/03-bronze.jpg",
    "assets/slides/04-gold.jpg", "assets/slides/05-streaks.jpg", "assets/slides/06-glow.jpg",
    "assets/slides/07-layers.jpg", "assets/slides/08-blue.jpg", "assets/slides/09-teal.jpg",
    "assets/slides/10-purple.jpg", "assets/slides/11-red.jpg", "assets/slides/12-soft.jpg",
    // 4K landscapes
    "assets/slides/13-sunset-ridge.jpg", "assets/slides/14-dunes.jpg", "assets/slides/15-ocean-dusk.jpg",
    "assets/slides/16-aurora-peaks.jpg", "assets/slides/17-mesa-dusk.jpg",
    // 4K vector patterns
    "assets/slides/18-facets.jpg", "assets/slides/19-ribbons.jpg", "assets/slides/20-ripples.jpg",
    "assets/slides/21-aurora-bands.jpg", "assets/slides/22-hex-mesh.jpg",
    // 4K plasma / cloud patterns
    "assets/slides/23-ember-plasma.jpg", "assets/slides/24-teal-plasma.jpg",
    "assets/slides/25-nebula.jpg", "assets/slides/26-dusk-clouds.jpg",
    // more landscapes
    "assets/slides/27-alpine-lake.jpg", "assets/slides/28-foggy-peaks.jpg",
    "assets/slides/29-pine-forest.jpg", "assets/slides/30-coastal-dusk.jpg",
    "assets/slides/31-alpenglow.jpg", "assets/slides/32-starry-desert.jpg",
    // glossy liquid ribbons (house style)
    "assets/slides/33-liquid-twin.jpg", "assets/slides/34-liquid-drape.jpg",
    "assets/slides/35-liquid-cross.jpg", "assets/slides/36-liquid-silk.jpg",
    "assets/slides/37-liquid-crest.jpg", "assets/slides/38-liquid-ember.jpg",
  ];
  let slides = [], slideIdx = 0, slideFront = 0, slidesActive = false;
  let lastDailyDay = null, bgPinned = false;
  // Local-day number — same for every screen in a timezone on a given calendar
  // day — used to pick a deterministic "background of the day".
  const dayNumber = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  const dailyIndex = () => (slides.length ? (((dayNumber() % slides.length) + slides.length) % slides.length) : 0);
  function gotoDailyBg() {            // crossfade to today's background
    if (!slidesActive || !slides.length || bgPinned) return;
    lastDailyDay = dayNumber();
    setBg(dailyIndex(), false);
  }
  function maybeDailyBg() {           // at a day rollover, advance to the new background
    if (!state.dailyBg || bgPinned || !slidesActive) return;
    if (dayNumber() !== lastDailyDay) gotoDailyBg();
  }

  function panLayer(el) {
    // Background is held STATIC (no Ken-Burns drift) — the large slow zoom was part
    // of the motion the viewer found nauseating. The image still changes once a day.
    try { if (el.getAnimations) el.getAnimations().forEach((a) => a.cancel()); } catch {}
    el.style.transform = "scale(1.08)";
  }
  function showSlide(i) {
    const el = slideLayers[slideFront ^ 1];            // the hidden layer
    el.style.backgroundImage = `url("${slides[i]}")`;
    el.classList.add("is-on");                          // reveal first — never blocked by the pan
    slideLayers[slideFront].classList.remove("is-on");
    slideFront ^= 1; slideIdx = i;
    panLayer(el);
  }
  function setBg(i, persist) {
    if (!slides.length) return;
    showSlide(((i % slides.length) + slides.length) % slides.length);
    if (persist) {                     // a manual pick pins this image and stops auto-rotation
      state.bg = slides[slideIdx];
      state.dailyBg = false;
      save();
      const t = $("tgDailyBg"); if (t) t.checked = false;
    }
    syncBgGrid();
  }
  function buildBgGrid() {
    const g = $("bgGrid"); if (!g) return;
    g.innerHTML = "";
    slides.forEach((src, i) => {
      const b = document.createElement("button");
      b.className = "bg-opt"; b.dataset.i = i;
      b.style.backgroundImage = `url("${src}")`;
      b.title = src.split("/").pop();
      b.onclick = () => setBg(i, true);
      g.appendChild(b);
    });
    syncBgGrid();
  }
  function syncBgGrid() {
    document.querySelectorAll("#bgGrid .bg-opt").forEach((b) =>
      b.classList.toggle("is-active", Number(b.dataset.i) === slideIdx));
  }
  async function initSlides() {
    let list = [];
    for (let attempt = 0; attempt < 3 && !list.length; attempt++) {
      try {
        const r = await fetch(`assets/backgrounds.json?t=${Date.now()}`, { cache: "no-store" });
        if (r.ok) { const d = await r.json(); list = Array.isArray(d) ? d : (d.images || []); }
      } catch {}
      if (!list.length && attempt < 2) await new Promise((res) => setTimeout(res, 1500));
    }
    list = (list || []).filter(Boolean);
    if (!list.length) list = FALLBACK_SLIDES;          // never get stuck on the bare gradient
    slides = list; slidesActive = true; slideFront = 0;
    // Starting background. Priority:
    //   ?bg=<index|name> (pins it)  >  daily auto-rotation  >  saved choice  >  first.
    const bgQ = new URLSearchParams(location.search).get("bg");
    let start = 0;
    if (bgQ != null && /^\d+$/.test(bgQ)) { start = parseInt(bgQ, 10); bgPinned = true; }
    else if (bgQ != null) { const m = slides.findIndex((s) => s.includes(bgQ)); if (m >= 0) { start = m; bgPinned = true; } }
    else if (state.dailyBg) { start = dailyIndex(); lastDailyDay = dayNumber(); }
    else if (state.bg) { const m = slides.findIndex((s) => s === state.bg || s.includes(state.bg)); if (m >= 0) start = m; }
    slideIdx = ((start % slides.length) + slides.length) % slides.length;
    const first = slideLayers[0];
    first.style.backgroundImage = `url("${slides[slideIdx]}")`;
    first.classList.add("is-on");                       // reveal first — never blocked by the pan
    slideLayers[1].classList.remove("is-on");
    panLayer(first);
    buildBgGrid();
  }

  /* ---------- Weather: Maastricht via Open-Meteo (free, no key) ---------- */
  const WX_URL = "https://api.open-meteo.com/v1/forecast?latitude=50.8514&longitude=5.6909" +
    "&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min" +
    "&timezone=auto&forecast_days=3";
  function wxInfo(code) {
    const m = {
      0:["☀️","Clear"], 1:["🌤️","Mainly clear"], 2:["⛅","Partly cloudy"], 3:["☁️","Overcast"],
      45:["🌫️","Fog"], 48:["🌫️","Rime fog"],
      51:["🌦️","Light drizzle"], 53:["🌦️","Drizzle"], 55:["🌦️","Dense drizzle"],
      56:["🌧️","Freezing drizzle"], 57:["🌧️","Freezing drizzle"],
      61:["🌧️","Light rain"], 63:["🌧️","Rain"], 65:["🌧️","Heavy rain"],
      66:["🌧️","Freezing rain"], 67:["🌧️","Freezing rain"],
      71:["🌨️","Light snow"], 73:["🌨️","Snow"], 75:["❄️","Heavy snow"], 77:["❄️","Snow grains"],
      80:["🌦️","Showers"], 81:["🌦️","Showers"], 82:["⛈️","Violent showers"],
      85:["🌨️","Snow showers"], 86:["🌨️","Snow showers"],
      95:["⛈️","Thunderstorm"], 96:["⛈️","Thunderstorm"], 99:["⛈️","Thunderstorm"],
    };
    return m[code] || ["🌡️", "—"];
  }
  async function fetchWeather() {
    if (!state.weather) return;
    try {
      const r = await fetch(WX_URL, { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      const day = d.daily;
      const [icon, desc] = wxInfo(d.current.weather_code);
      $("wxIcon").textContent = icon;
      $("wxTemp").textContent = Math.round(d.current.temperature_2m) + "°";
      $("wxDesc").textContent = `${desc} · ${Math.round(day.temperature_2m_max[0])}° / ${Math.round(day.temperature_2m_min[0])}°`;
      // small forecast: tomorrow + day after
      $("wxForecast").innerHTML = [1, 2].map((i) => {
        const [ic] = wxInfo(day.weather_code[i]);
        const dn = new Date(day.time[i]).toLocaleDateString(undefined, { weekday: "short" });
        return `<span class="wx-day"><b>${dn}</b> ${ic} ${Math.round(day.temperature_2m_max[i])}°<i>/${Math.round(day.temperature_2m_min[i])}°</i></span>`;
      }).join("");
    } catch {}
  }

  /* ---------- World Cup scores: ESPN public scoreboard (free, CORS-ok) ----------
     Shows yesterday's results, live scores, and the next kick-offs in a slim
     strip at the bottom-centre. Polls every 5 min, every 60 s while a match
     is live. Hidden automatically when there are no matches in the window
     (so it disappears by itself after the tournament). */
  const WC_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
  let wcTimer = null, wcHasGames = false;
  function wcEsc(s) { const d = document.createElement("i"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  async function fetchWorldCup() {
    clearTimeout(wcTimer);
    let liveNow = false;
    if (state.worldcup) {
      try {
        const fmt = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
        const from = new Date(), to = new Date();
        from.setDate(from.getDate() - 1); to.setDate(to.getDate() + 1);
        const r = await fetch(`${WC_URL}?dates=${fmt(from)}-${fmt(to)}&t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) throw 0;
        const d = await r.json();
        const games = (d.events || []).map((e) => {
          const comp = (e.competitions || [])[0] || {};
          const team = (side) => ((comp.competitors || []).find((c) => c.homeAway === side) || {});
          const h = team("home"), a = team("away");
          const st = (e.status && e.status.type && e.status.type.state) || "pre";
          return {
            when: new Date(e.date), st,
            clock: st === "in" ? (e.status.displayClock || "live")
                 : st === "post" ? ((e.status.type && e.status.type.shortDetail) || "FT") : "",
            h: (h.team && (h.team.abbreviation || h.team.shortDisplayName)) || "?", hs: h.score,
            a: (a.team && (a.team.abbreviation || a.team.shortDisplayName)) || "?", as: a.score,
          };
        }).sort((x, y) => x.when - y.when);
        // Pick up to 5: every live match first, then the most recent results,
        // then the next kick-offs — shown in kick-off order.
        const live = games.filter((g) => g.st === "in");
        const done = games.filter((g) => g.st === "post");
        const next = games.filter((g) => g.st === "pre");
        const pick = live.slice(0, 5);
        let room = 5 - pick.length;
        const keepForNext = next.length && room > 0 ? 1 : 0;   // always show the next kick-off
        const takeDone = Math.min(done.length, room - keepForNext);
        if (takeDone > 0) pick.push(...done.slice(-takeDone));
        room = 5 - pick.length;
        if (room > 0) pick.push(...next.slice(0, room));
        pick.sort((x, y) => x.when - y.when);
        liveNow = live.length > 0;
        wcHasGames = pick.length > 0;
        if (wcHasGames) {
          const today = new Date().toDateString();
          $("wcGames").innerHTML = pick.map((g) => {
            if (g.st === "pre") {
              const day = g.when.toDateString() === today ? ""
                : `${g.when.toLocaleDateString(undefined, { weekday: "short" })} `;
              const t = `${pad(g.when.getHours())}:${pad(g.when.getMinutes())}`;
              return `<span class="wc-game"><b>${wcEsc(g.h)}</b>–<b>${wcEsc(g.a)}</b> <i>${day}${t}</i></span>`;
            }
            return `<span class="wc-game${g.st === "in" ? " is-live" : ""}">` +
              `<b>${wcEsc(g.h)}</b> ${wcEsc(g.hs)}–${wcEsc(g.as)} <b>${wcEsc(g.a)}</b> <i>${wcEsc(g.clock)}</i></span>`;
          }).join("");
        }
        $("worldcup").hidden = !(state.worldcup && wcHasGames);
      } catch { /* network blip — keep what's on screen, retry on the next tick */ }
    }
    wcTimer = setTimeout(fetchWorldCup, liveNow ? 60 * 1000 : 5 * 60 * 1000);
  }

  /* ---------- One-click central control ----------
     "Apply to all screens" commits the current look to config.json on GitHub
     (via the REST API) — the deploy workflow republishes it and every screen
     adopts it within ~2 minutes. Needs a one-time fine-grained token that is
     stored only in THIS browser's localStorage (never synced to the TVs). */
  const REPO = "JeanCamposLabs/ESM-Screen";
  const TOKEN_KEY = "esm-screen.ghtoken";
  const b64utf8 = (s) => btoa(unescape(encodeURIComponent(s)));
  async function pushConfigToAllScreens() {
    const box = $("ghTokenBox"), input = $("inGhToken");
    const token = (input.value || "").trim() || localStorage.getItem(TOKEN_KEY) || "";
    if (!token) {
      box.hidden = false; input.focus();
      flash("Paste a GitHub token first — see the note below", 6000);
      return;
    }
    const api = `https://api.github.com/repos/${REPO}/contents/config.json`;
    const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" };
    // Tell the operator exactly what is wrong — 401/404/403 each have a
    // different cause and a different fix on the token page.
    async function explain(res, phase) {
      let gh = ""; try { gh = (await res.json()).message || ""; } catch {}
      box.hidden = false;
      if (res.status === 401) {
        try { localStorage.removeItem(TOKEN_KEY); } catch {}
        input.focus();
        return "GitHub says the token itself is invalid (401) — re-copy the full token (starts with github_pat_) and paste it again";
      }
      if (res.status === 404)
        return "The token works but cannot see this repo (404). On the token's page: Repository access → Only select repositories → add ESM-Screen, then Save and try again";
      if (res.status === 403)
        return `The token cannot ${phase} (403). On the token's page: Permissions → Repository permissions → Contents → Read and write, then Save and try again` + (gh ? ` — GitHub said: “${gh}”` : "");
      return `GitHub error ${res.status} while trying to ${phase}` + (gh ? ` — “${gh}”` : "") + " — try again";
    }
    // Remember the token now; scope fixes on GitHub keep the same token string,
    // so a later retry just works. Only a real 401 forgets it.
    try { localStorage.setItem(TOKEN_KEY, token); } catch {}
    flash("Contacting GitHub…", 20000);
    try {
      const cur = await fetch(`${api}?ref=main&t=${Date.now()}`, { headers, cache: "no-store" });
      if (!cur.ok) { flash(await explain(cur, "read config.json"), 15000); return; }
      const sha = (await cur.json()).sha;
      const res = await fetch(api, {
        method: "PUT", headers,
        body: JSON.stringify({
          message: "Update screen config from admin panel",
          branch: "main", sha,
          content: b64utf8(JSON.stringify(configForExport(), null, 2) + "\n"),
        }),
      });
      if (!res.ok) { flash(await explain(res, "write config.json"), 15000); return; }
      input.value = ""; box.hidden = true;
      flash("Pushed ✓ — every screen updates itself within ~2 minutes", 8000);
    } catch (err) {
      flash("Couldn't reach GitHub — check the connection and try again", 6000);
    }
  }

  /* ---------- Central sync: every screen follows config.json ----------
     Change config.json once and all screens adopt it within a minute. Local
     panel tweaks are left alone until the config actually changes. */
  const CONFIG_URL = "config.json";
  let cfgRev = null;
  function applyBg(name) {
    if (!slidesActive || !slides.length) return;
    if (bgPinned) return;                          // a ?bg= kiosk pin wins over config
    if (state.dailyBg) { gotoDailyBg(); return; }  // auto-rotation owns the background
    if (!name) return;
    const i = slides.findIndex((s) => s === name || s.includes(name));
    if (i >= 0) { showSlide(i); syncBgGrid(); }
  }
  async function syncConfig() {
    try {
      const r = await fetch(`${CONFIG_URL}?t=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) return;
      const cfg = await r.json();
      const rev = JSON.stringify(cfg);
      if (rev === cfgRev) return;            // unchanged -> leave local tweaks alone
      cfgRev = rev;
      Object.assign(state, cfg);             // the shared config wins
      save();
      apply();
      applyBg(cfg.bg);
    } catch {}
  }
  // Current settings as a config others can adopt (the admin "copy" button).
  function configForExport() {
    const bg = String(state.bg || "").split("/").pop().replace(/\.\w+$/, "");
    return {
      style: state.style, palette: state.palette, bg,
      logo: state.logo, rocket: state.rocket, clock: state.clock,
      particles: state.particles, weather: state.weather, worldcup: state.worldcup,
      speed: state.speed, dailyBg: state.dailyBg,
      music: state.music, musicStation: state.musicStation, musicVolume: state.musicVolume,
    };
  }

  /* ---------- Ambient music (SomaFM internet radio, audio-only) ----------
     Browsers block audio autoplay until the first user interaction, so when
     music is on we show a "tap to start" pill and unlock on the first gesture
     (a tap, click or key — e.g. when someone switches the TV on each morning).
     Streams are commercial-free and listener-supported (somafm.com). */
  const audio = $("bgAudio");
  let urlIdx = 0;            // which mirror URL we're trying for the current station
  let userGestured = false; // has the user interacted yet (autoplay unlock)?
  let manualPaused = false; // user tapped pause -> stay paused until they resume

  const currentStation = () =>
    STATIONS.find((s) => s.id === state.musicStation) || STATIONS[0];
  // Do we intend audio to be playing right now? (feature on, not manually
  // paused, and not the dim night screen.)
  const intendPlay = () =>
    state.music && !manualPaused && !screen.classList.contains("is-night");

  function loadStation(resetMirror = true) {
    if (resetMirror) urlIdx = 0;
    const urls = stationUrls(currentStation());
    audio.src = urls[Math.min(urlIdx, urls.length - 1)];
    audio.load();
  }
  function startPlayback() {
    if (!audio.src) loadStation();
    audio.volume = clamp(state.musicVolume, 0, 1);
    const p = audio.play();
    if (p && p.catch) p.catch((err) => {
      const name = err && err.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        renderMusicbar();   // autoplay blocked -> show "tap to start", wait for a gesture
      } else if (name === "AbortError") {
        /* a newer load() interrupted this play() — benign, ignore */
      } else {
        tryNextMirror();    // network hiccup -> try another server
      }
    });
  }
  function tryNextMirror() {
    const urls = stationUrls(currentStation());
    if (urlIdx < urls.length - 1) { urlIdx++; loadStation(false); if (userGestured && intendPlay()) startPlayback(); }
    else { flash("Couldn't reach the music stream — try another station"); }
  }
  function pauseMusic() { manualPaused = true; audio.pause(); renderMusicbar(); }
  function playMusic() {
    manualPaused = false;
    if (userGestured) startPlayback();   // otherwise the "tap to start" pill is shown
    renderMusicbar();
  }
  function setStation(id, announce) {
    state.musicStation = id; save();
    manualPaused = false; urlIdx = 0; loadStation();
    if (userGestured && intendPlay()) startPlayback();
    syncMusicPanel(); renderMusicbar();
    if (announce) peekMusicbar();
  }
  function nextStation() {
    const i = STATIONS.findIndex((s) => s.id === state.musicStation);
    setStation(STATIONS[(i + 1 + STATIONS.length) % STATIONS.length].id, true);
  }

  // Reconcile playback with the current intent (called on state changes and on
  // the schedule tick, so music stops at night and recovers if a stream drops).
  function syncMusic() {
    if (!audio) return;
    if (intendPlay()) {
      if (userGestured && audio.paused) startPlayback();   // else: locked -> pill shown
    } else if (!audio.paused) {
      audio.pause();
    }
    audio.volume = clamp(state.musicVolume, 0, 1);
    renderMusicbar();
  }

  function renderMusicbar() {
    const bar = $("musicbar");
    if (!bar) return;
    const show = state.music && state.musicBar && !screen.classList.contains("is-night");
    bar.hidden = !show && !bar.classList.contains("is-peek");
    if (bar.hidden) return;
    if (state.music && !userGestured) {
      $("musicState").textContent = "🔊 Tap to start music";
    } else {
      $("musicState").textContent = (audio.paused ? "❚❚ " : "♪ ") + currentStation().name;
    }
  }
  let peekTimer = null;
  function peekMusicbar() {
    if (state.musicBar) return;        // already shown
    const bar = $("musicbar");
    bar.hidden = false; bar.classList.add("is-peek"); renderMusicbar();
    clearTimeout(peekTimer);
    peekTimer = setTimeout(() => { bar.classList.remove("is-peek"); renderMusicbar(); }, 2800);
  }

  function setupMusic() {
    if (!audio) return;
    audio.volume = clamp(state.musicVolume, 0, 1);
    audio.addEventListener("playing", renderMusicbar);
    audio.addEventListener("pause", renderMusicbar);
    audio.addEventListener("error", () => { if (intendPlay()) tryNextMirror(); });
    // The first interaction anywhere on the page satisfies the autoplay policy.
    const unlock = () => {
      if (userGestured) return;
      userGestured = true;
      if (intendPlay()) startPlayback();
      renderMusicbar();
    };
    ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
      document.addEventListener(ev, unlock, { passive: true }));
    // The on-screen badge opens the settings menu (where play/pause, station and
    // volume live). The click itself is the gesture that unlocks autoplay.
    $("musicbar").onclick = openPanel;
  }

  /* ---------- Full-screen light wave (~every 2 min, or click the logo) ----------
     A light band sweeps the screen and elements ripple as it passes; over the
     logo it becomes a rainbow that reveals the repeating EasyScaleMedia pattern.
     Driven by one class on #screen so everything stays in sync. */
  let waveTimer = null;
  function playWave() {
    if (screen.classList.contains("is-night")) return;
    screen.classList.remove("wave-go");
    void screen.offsetWidth;        // restart cleanly even if triggered mid-pass
    screen.classList.add("wave-go");
    clearTimeout(waveTimer);
    waveTimer = setTimeout(() => screen.classList.remove("wave-go"), 5400);
  }

  /* ---------- Boot ---------- */
  buildPanel();
  setupMusic();
  apply();
  const discCode = $("discCode");
  // Enough repeats to densely fill the disc as a tiny code grid (overflow clipped to the circle).
  if (discCode) discCode.textContent = "EasyScaleMedia".repeat(700);
  setInterval(playWave, 120000);   // the wave passes roughly every 2 minutes
  $("disc").addEventListener("click", playWave);   // click the logo to trigger it
  tick(); setInterval(tick, 1000);
  setInterval(applySchedule, 20000);
  sizeCanvas();
  addEventListener("resize", debounce(sizeCanvas, 250));
  rafId = requestAnimationFrame(frame);
  maybeHint();
  requestWakeLock();
  checkVersion();
  setInterval(checkVersion, VERSION_POLL_MS);
  flyRocket();
  initSlides();
  setInterval(maybeDailyBg, 15 * 60 * 1000);   // advance the background at the daily rollover
  fetchWeather();
  setInterval(fetchWeather, 30 * 60 * 1000);
  fetchWorldCup();                            // self-rescheduling (5 min / 60 s live)
  syncConfig();
  setInterval(syncConfig, 30000);

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
})();

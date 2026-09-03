/* =================================================================
   Easy Scale Media — Ambient Screen controller
   - Theme/palette switching, hidden control panel, live clock,
     auto on/off schedule, ambient particle canvas, persistence.
   - Catalog + rotation maths + GitHub push live in shared.js (window.ESM)
     so the remote control page (remote.html) uses the very same code.
   - No dependencies, no build. Settings persist in localStorage.
   - `?preview` turns the page into a live preview driven by postMessage
     (used inside remote.html): no polling, no audio, nothing saved.
   ================================================================= */
(() => {
  "use strict";

  const { STYLES, PALETTES, STATIONS, ROTATIONS, CATEGORIES } = ESM;
  const QS = new URLSearchParams(location.search);
  const PREVIEW = QS.has("preview");

  /* ---------- Defaults / state ---------- */
  const DEFAULTS = {
    ...ESM.CONFIG_DEFAULTS,  // style, palette, bg, bgRotate, bgSet, toggles, speed, music, schedule…
    name: "Easy Scale Media",
    tag: "Scaling brands to the moon.",
    musicBar: true,          // show the small on-screen music control (this device only)
  };
  const KEY = "esm-screen.v1";

  let state = load();

  // URL overrides — handy for pinning a kiosk to one look: ?style=premium&palette=navy
  (() => {
    const s = QS.get("style"), p = QS.get("palette");
    if (s && STYLES.some((x) => x.id === s)) state.style = s;
    if (p && PALETTES.some((x) => x.id === p)) state.palette = p;
  })();

  function load() {
    try {
      const saved = PREVIEW ? {} : JSON.parse(localStorage.getItem(KEY) || "{}");
      return { ...DEFAULTS, ...ESM.normalizeConfig(saved) };
    } catch { return { ...DEFAULTS }; }
  }
  function save() {
    if (PREVIEW) return;                       // a preview never touches this device's settings
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
  function toMin(hhmm) { const [h, m] = String(hhmm || "0:0").split(":").map(Number); return h * 60 + m; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  let forceNight = null;              // preview only: the remote can show the night screen
  function applySchedule() {
    if (forceNight != null) {
      screen.classList.toggle("is-night", forceNight);
    } else if (!state.schedule) {
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
    setMotionPaused(screen.classList.contains("is-night"));
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
    // Tabs
    const tabs = Array.from(document.querySelectorAll("#panelTabs [data-tab]"));
    const panes = Array.from(document.querySelectorAll("#panel [data-pane]"));
    const showTab = (id) => {
      tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === id));
      panes.forEach((p) => { p.hidden = p.dataset.pane !== id; });
    };
    tabs.forEach((t) => { t.onclick = () => showTab(t.dataset.tab); });
    showTab("look");

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
    $("inSpeed").oninput    = (e) => { state.speed = parseFloat(e.target.value); commit(); };
    $("tgSchedule").onchange= (e) => { state.schedule = e.target.checked; commit(); };
    $("inOn").onchange      = (e) => { state.onTime = e.target.value; commit(); };
    $("inOff").onchange     = (e) => { state.offTime = e.target.value; commit(); };
    $("tgNightClock").onchange = (e) => { state.nightClock = e.target.checked; commit(); };

    // Background rotation
    const rot = $("inBgRotate");
    rot.innerHTML = "";
    ROTATIONS.forEach((r) => {
      const o = document.createElement("option");
      o.value = r.id; o.textContent = r.name; rot.appendChild(o);
    });
    rot.onchange = (e) => {
      state.bgRotate = e.target.value; bgPinned = false; save();
      if (state.bgRotate === "off") state.bg = ESM.slideToken(slides[slideIdx] || state.bg);
      rotationTick(true); syncBgGrid();
    };
    $("btnNextBg").onclick = () => { if (slidesActive) setBg(slideIdx + 1, true); };
    const mot = $("inBgMotion");
    mot.innerHTML = "";
    ESM.MOTIONS.forEach((m) => { const o = document.createElement("option"); o.value = m.id; o.textContent = m.name; mot.appendChild(o); });
    mot.onchange = (e) => { state.bgMotion = e.target.value; save(); refreshMotion(); };

    // Music
    const stg = $("stationGrid");
    stg.innerHTML = "";
    STATIONS.forEach((s) => {
      const b = document.createElement("button");
      b.className = "st"; b.dataset.id = s.id;
      b.innerHTML = `<span class="st__dot"></span><span class="st__name">${s.name}</span><span class="st__genre">${s.genre}</span>`;
      b.onclick = () => setStation(s.id, false);
      stg.appendChild(b);
    });
    $("tgMusic").onchange    = (e) => { state.music = e.target.checked; if (state.music) manualPaused = false; commit(); };
    $("tgMusicBar").onchange = (e) => { state.musicBar = e.target.checked; commit(); };
    const mo = $("inMusicOutput");
    mo.innerHTML = "";
    ESM.MUSIC_OUTPUTS.forEach((o) => { const opt = document.createElement("option"); opt.value = o.id; opt.textContent = o.name; mo.appendChild(opt); });
    mo.onchange = (e) => { state.musicOutput = e.target.value; commit(); };
    $("inMusicVol").oninput  = (e) => { state.musicVolume = parseFloat(e.target.value); audio.volume = clamp(state.musicVolume, 0, 1); save(); renderMusicbar(); };
    $("btnNextStation").onclick = nextStation;

    $("btnFull").onclick  = toggleFullscreen;
    $("btnReset").onclick = () => { state = { ...DEFAULTS }; bgPinned = false; commit(); rotationTick(true); refreshMotion(); flash("Reset to defaults"); };
    $("btnApplyAll").onclick = pushConfigToAllScreens;
    $("btnForgetToken").onclick = () => { try { localStorage.removeItem(TOKEN_KEY); } catch {} $("inGhToken").value = ""; setPushStatus("Token forgotten on this device.", ""); };
    $("btnSync").onclick = () => {
      try { navigator.clipboard.writeText(JSON.stringify(configForExport(), null, 2)); flash("Config copied — paste into config.json on GitHub"); }
      catch { flash("Clipboard unavailable here"); }
    };
    $("panelClose").onclick = closePanel;
    $("panelScrim").onclick = closePanel;

    // Where to control every screen from a computer or phone
    const remoteUrl = new URL("remote.html", location.href).href;
    $("remoteLink").href = remoteUrl;
    $("remoteLink").textContent = remoteUrl.replace(/^https?:\/\//, "");
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
    $("inSpeed").value = state.speed;
    $("tgSchedule").checked = state.schedule;
    $("inOn").value = state.onTime;
    $("inOff").value = state.offTime;
    $("tgNightClock").checked = state.nightClock;
    $("tgMusic").checked = state.music;
    $("tgMusicBar").checked = state.musicBar;
    $("inMusicVol").value = state.musicVolume;
    $("inMusicOutput").value = state.musicOutput || "tvs";
    $("inBgRotate").value = state.bgRotate;
    $("inBgMotion").value = state.bgMotion;
    syncMusicPanel();
    syncBgGrid();
  }

  function syncMusicPanel() {
    document.querySelectorAll("#stationGrid .st").forEach((b) =>
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
    if (e.target.matches("input, textarea, select")) { if (e.key === "Escape") closePanel(); return; }
    const k = e.key.toLowerCase();
    if (k === "c" || k === "s") togglePanel();
    else if (k === "escape") closePanel();
    else if (k === "f") toggleFullscreen();
    else if (k === "n" && slidesActive) setBg(slideIdx + 1, true);   // manual next background (pins it)
    else if (k === "m" && state.music) nextStation();                // next music station
  });
  if (!PREVIEW && (location.hash === "#admin" || QS.has("admin"))) {
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
    if (PREVIEW || localStorage.getItem(KEY)) return;  // returning device: skip
    const h = $("hint");
    h.classList.add("is-show");
    setTimeout(() => h.classList.remove("is-show"), 9000);
  }

  /* ---------- Keep the display awake (always-on TV) ---------- */
  let wakeLock = null;
  async function requestWakeLock() {
    if (PREVIEW) return;
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
    if (PREVIEW) return;
    const v = await fetchVersion();
    if (v == null) return;                  // missing file or network blip — ignore
    if (bootVersion == null) { bootVersion = v; $("panelVersion").textContent = v; return; }   // establish baseline
    if (v !== bootVersion) reloadForUpdate(v);
  }
  function reloadForUpdate(v) {
    if (reloading) return;
    reloading = true;
    document.body.classList.add("is-updating");   // brief fade-out (see CSS)
    setTimeout(() => {
      // A plain location.reload() can be answered from the browser's HTTP cache
      // (Pages serves index.html with max-age), which re-runs the OLD app.js —
      // and because this boot then reads the NEW version.json as its baseline,
      // no further reload is ever attempted and the screen is stuck on old code.
      // Reloading at a URL carrying the new version is a different cache key, so
      // the HTML is really refetched. Existing params (?bg=, ?admin, …) survive.
      try {
        const u = new URL(location.href);
        u.searchParams.set("v", v);
        location.replace(u.toString());
      } catch { location.reload(true); }
    }, 650);
  }

  /* ---------- Re-sync when the device wakes or reconnects ---------- */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    // A TV that slept overnight wakes into a new slot: re-check the rotation
    // here so it changes immediately instead of on the next tick.
    tick(); applySchedule(); checkVersion(); requestWakeLock(); fetchWeather(); rotationTick(); syncConfig();
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

  /* ---------- Background gallery: cross-fading slides + timed rotation ----------
     Reads assets/backgrounds.json (a list of image URLs, auto-generated on
     deploy from assets/slides/). Two layers cross-fade. Which slide is on is
     decided by ESM.rotationPick() from the clock, so every screen agrees. */
  const slideLayers = [$("sceneImage"), $("sceneImageB")];
  // last-resort list so the gallery still works if backgrounds.json can't be fetched
  const FALLBACK_SLIDES = [
    "assets/slides/01-liquid.jpg", "assets/slides/02-waves.jpg", "assets/slides/03-bronze.jpg",
    "assets/slides/04-gold.jpg", "assets/slides/05-streaks.jpg", "assets/slides/06-glow.jpg",
    "assets/slides/07-layers.jpg", "assets/slides/08-blue.jpg", "assets/slides/09-teal.jpg",
    "assets/slides/10-purple.jpg", "assets/slides/11-red.jpg", "assets/slides/12-soft.jpg",
  ];
  let slides = [], slideIdx = 0, slideFront = 0, slidesActive = false;
  let lastSlot = null, bgPinned = false, rotTimer = null, motionMap = null;

  const activeSlides = () => ESM.effectiveSlides(slides, state.bgSet);

  // Slow, per-image drift. Every slide carries its own motion (assets/motion.json,
  // derived from the picture: horizons slide sideways, a bright subject is pushed
  // into, textures drift diagonally) and `bgMotion` scales it — "off" is dead still.
  // The old one-size Ken-Burns was cut for being nauseating; this is a fraction of
  // its size, at a constant apparent speed, and eases at both ends instead of
  // looping back with a jump.
  function panLayer(el, src) {
    try { if (el._esmAnim) { el._esmAnim.cancel(); el._esmAnim = null; } } catch {}
    try { if (el.getAnimations) el.getAnimations().forEach((x) => x.cancel()); } catch {}
    const frames = el.animate
      ? ESM.motionFrames(ESM.motionFor(motionMap, src), state.bgMotion, prefersReduced)
      : null;
    if (!frames) { el.style.transform = ESM.motionStill(); return; }
    el.style.transform = frames.from;
    try {
      el._esmAnim = el.animate(
        [{ transform: frames.from }, { transform: frames.to }],
        { duration: frames.duration, direction: "alternate", iterations: Infinity, easing: "ease-in-out" }
      );
      if (screen.classList.contains("is-night")) el._esmAnim.pause();
    } catch { el.style.transform = ESM.motionStill(); }   // very old browser: hold it still
  }
  // WAAPI animations ignore the CSS `animation-play-state: paused` used for the
  // night screen, so stop them by hand (kind to the panel and to power).
  function setMotionPaused(paused) {
    slideLayers.forEach((el) => {
      try { if (el._esmAnim) paused ? el._esmAnim.pause() : el._esmAnim.play(); } catch {}
    });
  }
  // Re-apply the current setting to the layer on screen (used by the panel/remote).
  function refreshMotion() {
    if (!slidesActive || !slides.length) return;
    panLayer(slideLayers[slideFront], slides[slideIdx]);
  }
  function showSlide(i) {
    if (i === slideIdx && slideLayers[slideFront].classList.contains("is-on")) return;   // already on screen
    const el = slideLayers[slideFront ^ 1];            // the hidden layer
    el.style.backgroundImage = `url("${slides[i]}")`;
    el.classList.add("is-on");                          // reveal first — never blocked by the pan
    slideLayers[slideFront].classList.remove("is-on");
    slideFront ^= 1; slideIdx = i;
    panLayer(el, slides[i]);
    syncBgGrid();
  }
  function showSlideSrc(src) {
    const i = slides.indexOf(src);
    if (i >= 0) showSlide(i);
  }
  // Rotation: called every 30 s, on wake, and whenever the config changes.
  function rotationTick(force) {
    if (!slidesActive || bgPinned) return;
    const list = activeSlides();
    const pick = ESM.rotationPick(list.length, state.bgRotate);
    clearTimeout(rotTimer);
    if (!pick) return;                                  // pinned: nothing to do
    // wake right on the next boundary, so every screen (and any paired one) switches at the same second
    rotTimer = setTimeout(() => rotationTick(), Math.max(1000, pick.nextChangeMs + 250));
    if (!force && pick.slot === lastSlot) return;
    lastSlot = pick.slot;
    showSlideSrc(list[pick.index]);
  }
  function setBg(i, persist) {
    if (!slides.length) return;
    showSlide(((i % slides.length) + slides.length) % slides.length);
    if (persist) {                     // a manual pick pins this image and stops the rotation
      state.bg = ESM.slideToken(slides[slideIdx]);
      state.bgRotate = "off";
      save();
      const r = $("inBgRotate"); if (r) r.value = "off";
    }
    syncBgGrid();
  }
  function buildBgGrid() {
    const g = $("bgGrid"); if (!g) return;
    g.innerHTML = "";
    CATEGORIES.forEach((cat) => {
      const items = slides.map((src, i) => ({ src, i, info: ESM.slideInfo(src) })).filter((x) => x.info.cat === cat.id);
      if (!items.length) return;
      const h = document.createElement("h3");
      h.className = "bg-cat"; h.textContent = `${cat.name} · ${items.length}`;
      g.appendChild(h);
      const grid = document.createElement("div");
      grid.className = "bg-grid";
      items.forEach(({ src, i, info }) => {
        const b = document.createElement("button");
        b.className = "bg-opt"; b.dataset.i = i; b.title = info.token;
        const img = document.createElement("img");
        img.loading = "lazy"; img.alt = info.name; img.src = ESM.thumbFor(src);
        img.onerror = () => { img.onerror = null; img.src = src; };
        const name = document.createElement("span");
        name.className = "bg-opt__name"; name.textContent = info.name;
        b.appendChild(img); b.appendChild(name);
        b.onclick = () => setBg(i, true);
        grid.appendChild(b);
      });
      g.appendChild(grid);
    });
    syncBgGrid();
  }
  function syncBgGrid() {
    document.querySelectorAll("#bgGrid .bg-opt").forEach((b) =>
      b.classList.toggle("is-active", Number(b.dataset.i) === slideIdx));
    const now = $("bgNow"); if (!now || !slides.length) return;
    const info = ESM.slideInfo(slides[slideIdx] || "");
    const list = activeSlides();
    const pick = ESM.rotationPick(list.length, state.bgRotate);
    let when = "pinned — choose a rotation above to resume";
    if (bgPinned) when = "pinned by the ?bg= URL on this TV";
    else if (pick) {
      const m = Math.max(1, Math.round(pick.nextChangeMs / 60000));
      when = `next change in ${m >= 120 ? Math.round(m / 60) + " h" : m + " min"} · ${list.length} in rotation`;
    }
    now.textContent = `Now: ${info.name} · ${when}`;
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
    try {
      const r = await fetch(`assets/motion.json?t=${Date.now()}`, { cache: "no-store" });
      if (r.ok) motionMap = await r.json();            // missing → every slide uses the fallback drift
    } catch {}
    slides = list; slidesActive = true; slideFront = 0;
    // Starting background. Priority:
    //   ?bg=<index|name> (pins it)  >  timed rotation  >  saved choice  >  first.
    const bgQ = QS.get("bg");
    let start = 0;
    if (bgQ != null && /^\d+$/.test(bgQ)) { start = parseInt(bgQ, 10); bgPinned = true; }
    else if (bgQ != null) { const m = ESM.findSlide(slides, bgQ); if (m >= 0) { start = m; bgPinned = true; } }
    else {
      const list2 = activeSlides();
      const pick = ESM.rotationPick(list2.length, state.bgRotate);
      if (pick) { start = slides.indexOf(list2[pick.index]); lastSlot = pick.slot; rotTimer = setTimeout(() => rotationTick(), Math.max(1000, pick.nextChangeMs + 250)); }
      else { const m = ESM.findSlide(slides, state.bg); if (m >= 0) start = m; }
    }
    slideIdx = ((start % slides.length) + slides.length) % slides.length;
    const first = slideLayers[0];
    first.style.backgroundImage = `url("${slides[slideIdx]}")`;
    first.classList.add("is-on");                       // reveal first — never blocked by the pan
    slideLayers[1].classList.remove("is-on");
    panLayer(first, slides[slideIdx]);
    buildBgGrid();
    if (PREVIEW) notifyParent();
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

  /* ---------- One-click central control ----------
     "Apply to all screens" commits the current look to config.json on GitHub
     (ESM.pushConfig) — the deploy workflow republishes it and every screen
     adopts it within ~2 minutes. Needs a one-time fine-grained token that is
     stored only in THIS browser's localStorage (never synced to the TVs).
     After the push we watch the published config.json until it matches, so
     the panel can say "live" instead of leaving the operator guessing. */
  const TOKEN_KEY = "esm-screen.ghtoken";
  let pushing = false;
  function setPushStatus(text, kind) {
    const el = $("pushStatus"); if (!el) return;
    el.textContent = text; el.dataset.kind = kind || "";
  }
  async function pushConfigToAllScreens() {
    if (pushing) return;
    const box = $("ghTokenBox"), input = $("inGhToken");
    const token = (input.value || "").trim() || localStorage.getItem(TOKEN_KEY) || "";
    if (!token) {
      box.hidden = false; input.focus();
      setPushStatus("Paste a GitHub token first — see the note below.", "warn");
      return;
    }
    // Remember the token now; scope fixes on GitHub keep the same token string,
    // so a later retry just works. Only a real 401 forgets it.
    try { localStorage.setItem(TOKEN_KEY, token); } catch {}
    pushing = true; $("btnApplyAll").disabled = true;
    setPushStatus("Contacting GitHub…", "busy");
    const cfg = configForExport();
    const res = await ESM.pushConfig(token, cfg, "Update screen config from the TV panel");
    if (!res.ok) {
      if (res.status === 401) { try { localStorage.removeItem(TOKEN_KEY); } catch {} }
      if (res.status) { box.hidden = false; input.focus(); }
      setPushStatus(res.message, "error");
      pushing = false; $("btnApplyAll").disabled = false;
      return;
    }
    input.value = ""; box.hidden = true;
    setPushStatus("Pushed ✓ — publishing… every screen follows within ~2 minutes.", "busy");
    const live = await ESM.waitForDeploy(cfg, { onTick: (s) => setPushStatus(`Pushed ✓ — publishing… ${s}s. Screens follow within ~30 s of the publish.`, "busy") });
    setPushStatus(live ? "Live on every screen ✓" : "Pushed, but the publish is taking unusually long — check the Actions tab on GitHub.", live ? "ok" : "warn");
    pushing = false; $("btnApplyAll").disabled = false;
  }

  /* ---------- Central sync: every screen follows config.json ----------
     Change config.json once and all screens adopt it within a minute. Local
     panel tweaks are left alone until the config actually changes. */
  const CONFIG_URL = "config.json";
  let cfgRev = null;
  function applyBg(name) {
    if (!slidesActive || !slides.length) return;
    if (bgPinned) return;                          // a ?bg= kiosk pin wins over config
    if (ESM.rotationMinutes(state.bgRotate)) { rotationTick(true); return; }   // the rotation owns the background
    const i = ESM.findSlide(slides, name || state.bg);
    if (i >= 0) showSlide(i);
  }
  async function syncConfig() {
    if (PREVIEW) return;
    try {
      const r = await fetch(`${CONFIG_URL}?t=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) return;
      const raw = await r.json();
      const rev = JSON.stringify(raw);
      if (rev === cfgRev) return;            // unchanged -> leave local tweaks alone
      cfgRev = rev;
      adoptConfig(raw);
    } catch {}
  }
  // Take a house config (from config.json or the remote's live preview).
  function adoptConfig(raw) {
    const cfg = ESM.normalizeConfig(raw);
    if (!("bgSet" in cfg)) cfg.bgSet = [];   // the house config owns the playlist: absent = everything
    const wasMotion = state.bgMotion;
    Object.assign(state, cfg);               // the shared config wins
    save();
    apply();
    applyBg(cfg.bg);
    if (state.bgMotion !== wasMotion) refreshMotion();
  }
  // Current settings as a config others can adopt (the admin "copy" button).
  function configForExport() { return ESM.pickConfig(state); }

  /* ---------- Ambient music (internet radio, audio-only) ----------
     Browsers block audio autoplay until the first user interaction, so when
     music is on we try once at boot (kiosk browsers, and Chrome on a site that
     plays daily, allow it) and otherwise show a "tap to start" pill and unlock
     on the first gesture (a tap, click or key — e.g. when someone switches
     the TV on each morning). */
  const audio = $("bgAudio");
  let urlIdx = 0;            // which mirror URL we're trying for the current station
  let userGestured = PREVIEW; // has the user interacted yet (autoplay unlock)?
  let manualPaused = false;  // user tapped pause -> stay paused until they resume

  const currentStation = () => ESM.findStation(state.musicStation);
  // Do we intend audio to be playing right now? (feature on, not manually
  // paused, and not the dim night screen.)
  const intendPlay = () =>
    !PREVIEW && state.music && state.musicOutput !== "speakers" && !manualPaused && !screen.classList.contains("is-night");

  function loadStation(resetMirror = true) {
    if (resetMirror) urlIdx = 0;
    const urls = ESM.stationUrls(currentStation());
    audio.src = urls[Math.min(urlIdx, urls.length - 1)];
    audio.load();
  }
  function startPlayback() {
    if (PREVIEW) return;
    if (!audio.src) loadStation();
    else if (audio.error) loadStation(false);   // a failed load (relay cold at boot) is retried, same mirror
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
    const urls = ESM.stationUrls(currentStation());
    if (urlIdx < urls.length - 1) { urlIdx++; loadStation(false); if (userGestured && intendPlay()) startPlayback(); }
    else { urlIdx = 0; if (panelOpen) flash("Couldn't reach the music stream — retrying; or try another station"); }   // the 20 s tick retries from the first mirror
  }
  function setStation(id, announce) {
    state.musicStation = id; save();
    manualPaused = false; urlIdx = 0;
    if (!PREVIEW) { loadStation(); if (userGestured && intendPlay()) startPlayback(); }
    syncMusicPanel(); renderMusicbar();
    if (announce) peekMusicbar();
  }
  function nextStation() {
    const i = STATIONS.findIndex((s) => s.id === state.musicStation);
    setStation(STATIONS[(i + 1 + STATIONS.length) % STATIONS.length].id, true);
  }

  // Reconcile playback with the current intent (called on state changes and on
  // the schedule tick, so music stops at night and recovers if a stream drops).
  let lastStationLoaded = null;
  function syncMusic() {
    if (!audio) return;
    if (intendPlay()) {
      if (lastStationLoaded !== state.musicStation) { lastStationLoaded = state.musicStation; urlIdx = 0; loadStation(); }
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
    if (state.musicOutput === "speakers") {
      $("musicState").textContent = "♪ " + currentStation().name + " · on the speakers";
    } else if (state.music && !userGestured) {
      $("musicState").textContent = "🔊 Tap to start music";
    } else {
      $("musicState").textContent = ((audio.paused && !PREVIEW) ? "❚❚ " : "♪ ") + currentStation().name;
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
    // Once anything has actually played, the origin is unlocked for good.
    audio.addEventListener("playing", () => { userGestured = true; renderMusicbar(); });
    audio.addEventListener("pause", renderMusicbar);
    audio.addEventListener("error", () => { if (intendPlay()) tryNextMirror(); });
    // The first interaction anywhere on the page satisfies the autoplay policy.
    const unlock = () => {
      if (userGestured) return;
      userGestured = true;
      if (audio.error) { urlIdx = 0; loadStation(); }   // the boot attempt hit a dead stream: start the mirrors over
      if (intendPlay()) startPlayback();
      renderMusicbar();
    };
    ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
      document.addEventListener(ev, unlock, { passive: true }));
    // The on-screen badge opens the settings menu (where play/pause, station and
    // volume live). The click itself is the gesture that unlocks autoplay.
    $("musicbar").onclick = openPanel;
    // Optimistic start: kiosk browsers (and Chrome once this site has a media
    // engagement history) allow it; if not, the tap-to-start pill stays up.
    if (intendPlay()) { lastStationLoaded = state.musicStation; startPlayback(); }
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

  /* ---------- Live preview (inside remote.html) ----------
     The remote posts messages; this page mirrors them without saving or
     polling, so the operator sees exactly what the TVs will show. */
  function notifyParent() {
    if (!PREVIEW || window.parent === window) return;
    try {
      window.parent.postMessage({
        type: "esm:state",
        slides: slides.slice(),
        current: slides[slideIdx] || null,
        config: configForExport(),
      }, "*");
    } catch {}
  }
  if (PREVIEW) {
    addEventListener("message", (e) => {
      const d = e.data || {};
      if (d.type === "esm:config" && d.config) { bgPinned = false; adoptConfig(d.config); notifyParent(); }
      else if (d.type === "esm:bg" && d.bg) { const i = ESM.findSlide(slides, d.bg); if (i >= 0) showSlide(i); notifyParent(); }
      else if (d.type === "esm:wave") playWave();
      else if (d.type === "esm:motion") { state.bgMotion = d.motion; refreshMotion(); }
      else if (d.type === "esm:night") { forceNight = d.on ? true : null; applySchedule(); }
      else if (d.type === "esm:panel") { d.open ? openPanel() : closePanel(); }
    });
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
  flyRocket();
  initSlides();
  setInterval(() => { rotationTick(); if (panelOpen) syncBgGrid(); }, 30000);   // timed background rotation
  fetchWeather();
  setInterval(fetchWeather, 30 * 60 * 1000);
  if (!PREVIEW) {
    checkVersion();
    setInterval(checkVersion, VERSION_POLL_MS);
    syncConfig();
    setInterval(syncConfig, 30000);
  } else {
    document.body.classList.add("is-preview");
  }

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
})();

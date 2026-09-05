/* =================================================================
   Easy Scale Media — Ambient Screen controller
   - Theme/palette switching, hidden control panel, live clock,
     auto on/off schedule, ambient particle canvas, persistence.
   - Background authority comes only from the credential-free Scale OS feed.
   - No dependencies, no build, cookies, credentials, or persistent settings.
   - `?preview` is a local development preview: no polling, audio, or storage.
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
  let state = { ...DEFAULTS, music: true, musicStation: "lofigirl", musicVolume: 0.45,
    schedule: true, onTime: "07:00", offTime: "23:00" };

  // URL overrides — handy for pinning a kiosk to one look: ?style=premium&palette=navy
  (() => {
    const s = QS.get("style"), p = QS.get("palette");
    if (s && STYLES.some((x) => x.id === s)) state.style = s;
    if (p && PALETTES.some((x) => x.id === p)) state.palette = p;
  })();

  function save() {} // Deliberately non-persistent: Scale OS owns shared display state.

  /* ---------- Element refs ---------- */
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const screen = $("screen");

  /* ---------- Apply state to the DOM ---------- */
  function apply() {
    root.dataset.style = state.style;
    root.dataset.palette = state.palette;
    accentColor();                                       // re-read the accent for the motes
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
  let lastTick = "";
  function tick() {
    const now = new Date();
    const t = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    if (t === lastTick) return;                          // same minute: nothing to redraw
    lastTick = t;
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
      const activeFeed = wallClient.current(Date.now());
      const activeSchedule = activeFeed ? activeFeed.schedule : null;
      screen.classList.toggle("is-night", !ESMWallBackground.isDaytime(Date.now(), activeSchedule));
    }
    setMotionPaused(screen.classList.contains("is-night"));
    syncMusic();   // go quiet at night, resume in the day
  }

  /* ---------- Ambient particle canvas ----------
     Lightweight floating motes that pick up the palette accent. Capped for
     a smooth all-day run on big panels. */
  let particles = [], rafId = null, lastT = 0, accentCache = "#ff7a18";
  const canvas = $("particles");
  const ctx = canvas.getContext("2d");
  // Read once per palette change (apply()), not once per frame: getComputedStyle
  // in the animation loop forces style recalculation on every tick.
  function accentColor() {
    accentCache = getComputedStyle(root).getPropertyValue("--accent").trim() || accentCache;
    return accentCache;
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
    const target = Math.min(36, Math.round((innerWidth * innerHeight) / 56000));
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
    if (t - lastT < 66) return;            // ~15fps cap: each frame re-uploads the canvas texture
    const dt = Math.min((t - lastT) / 16.67, 2); lastT = t;
    if (!state.particles || screen.classList.contains("is-night")) {
      ctx.clearRect(0, 0, innerWidth, innerHeight); return;
    }
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const col = accentCache;
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
    $("tgMusic").onchange    = (e) => { state.music = e.target.checked; e.target.checked ? startMusic() : stopMusic(); commit(); };
    $("tgMusicBar").onchange = (e) => { state.musicBar = e.target.checked; commit(); };
    $("inMusicVol").oninput  = (e) => { state.musicVolume = parseFloat(e.target.value); if (audio) audio.volume = state.musicVolume; save(); renderMusicbar(); };
    $("btnNextStation").onclick = nextStation;

    $("btnFull").onclick  = toggleFullscreen;
    $("btnReset").onclick = () => { state = { ...DEFAULTS, music: true, musicStation: "lofigirl", musicVolume: 0.45,
      schedule: true, onTime: "07:00", offTime: "23:00" }; bgPinned = false; commit(); rotationTick(true); refreshMotion(); flash("Reset to defaults"); };
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
    $("inSpeed").value = state.speed;
    $("tgSchedule").checked = state.schedule;
    $("inOn").value = state.onTime;
    $("inOff").value = state.offTime;
    $("tgNightClock").checked = state.nightClock;
    $("tgMusic").checked = state.music;
    $("tgMusicBar").checked = state.musicBar;
    $("inMusicVol").value = state.musicVolume;
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
    if (PREVIEW) return;
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
    tick(); applySchedule(); checkVersion(); requestWakeLock(); fetchWeather(); rotationTick(); refreshWallFeed();
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
  let slides = [], bundledSlides = [], slideIdx = 0, slideFront = 0, slidesActive = false, displayedSrc = null;
  let lastSlot = null, bgPinned = false, rotTimer = null, motionMap = null;
  let wallFeed = null;
  const wallClient = new ESMWallBackground.Client();

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
  function retireLayer(el) {
    clearTimeout(el._esmRetire);
    el._esmRetire = setTimeout(() => {
      if (el.classList.contains("is-on")) return;      // reused in the meantime
      try { if (el._esmAnim) { el._esmAnim.cancel(); el._esmAnim = null; } } catch {}
      el.style.backgroundImage = "";                   // free the texture; it is re-set on reuse
    }, 1800);                                          // just after the 1.6 s opacity fade
  }
  function showSlide(i) {
    if (slides[i] === displayedSrc && slideLayers[slideFront].classList.contains("is-on")) return;
    const el = slideLayers[slideFront ^ 1];            // the hidden layer
    clearTimeout(el._esmRetire);
    el.style.backgroundImage = `url("${slides[i]}")`;
    const probe = new Image();
    probe.onerror = () => { if (wallFeed) useBundledFallback(); };
    probe.src = slides[i];
    el.classList.add("is-on");                          // reveal first — never blocked by the pan
    slideLayers[slideFront].classList.remove("is-on");
    retireLayer(slideLayers[slideFront]);
    slideFront ^= 1; slideIdx = i; displayedSrc = slides[i];
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
    const activeFeed = wallClient.current(Date.now());
    if (activeFeed && activeFeed !== wallFeed) {
      wallFeed = activeFeed;
      bgPinned = false;
      lastSlot = null;
    }
    if (wallFeed) {
      const remotePick = ESMWallBackground.pick(wallFeed, Date.now());
      clearTimeout(rotTimer);
      if (!remotePick) { useBundledFallback(); return; }
      rotTimer = setTimeout(() => rotationTick(true), Math.max(250, remotePick.nextBoundaryMs - Date.now() + 50));
      if (force || remotePick.slot !== lastSlot) {
        lastSlot = remotePick.slot;
        slides = wallFeed.images.map(ESMWallBackground.imageUrl);
        showSlide(remotePick.index);
      }
      return;
    }
    const list = bundledSlides.length ? bundledSlides : activeSlides();
    const bundledPick = ESMWallBackground.bundledPick(list.length, Date.now());
    const pick = bundledPick ? {
      index: bundledPick.index,
      slot: bundledPick.slot,
      nextChangeMs: bundledPick.nextBoundaryMs - Date.now()
    } : null;
    clearTimeout(rotTimer);
    if (!pick) return;                                  // pinned: nothing to do
    // wake right on the next boundary, so every screen (and any paired one) switches at the same second
    rotTimer = setTimeout(() => rotationTick(), Math.max(1000, pick.nextChangeMs + 250));
    if (!force && pick.slot === lastSlot) return;
    lastSlot = pick.slot;
    showSlideSrc(list[pick.index]);
  }
  function setBg(i, persist) {
    if (!PREVIEW) return; // Scale OS or the deterministic bundled fallback owns every TV.
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
    bundledSlides = list.slice(); slides = list; slidesActive = true; slideFront = 0;
    // Starting background. Priority:
    //   ?bg=<index|name> (pins it)  >  timed rotation  >  saved choice  >  first.
    const bgQ = PREVIEW ? QS.get("bg") : null;
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
    displayedSrc = slides[slideIdx];
    first.classList.add("is-on");                       // reveal first — never blocked by the pan
    slideLayers[1].classList.remove("is-on");
    panLayer(first, slides[slideIdx]);
    buildBgGrid();
    if (PREVIEW) notifyParent();
    else refreshWallFeed();
  }

  function useBundledFallback() {
    wallClient.clear();
    wallFeed = null;
    slides = bundledSlides.length ? bundledSlides.slice() : FALLBACK_SLIDES.slice();
    state.bgRotate = "5m";   // mirrors ESMWallBackground.BUNDLED_SLOT_MS for the panel's "next change" text
    bgPinned = false; lastSlot = null;
    rotationTick(true);
  }
  async function refreshWallFeed() {
    if (PREVIEW || !slidesActive) return;
    try {
      const feed = await wallClient.refresh();
      if (!feed) return;
      if (feed.source !== "selected-library") { useBundledFallback(); return; }
      if (feed !== wallFeed) lastSlot = null;
      wallFeed = feed; bgPinned = false;
      rotationTick(true);
    } catch (_) { useBundledFallback(); }
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
      const fc = $("wxForecast"); fc.textContent = "";
      for (const i of [1, 2]) {                          // tomorrow + day after, as DOM nodes: no HTML from a third party
        const [ic] = wxInfo(day.weather_code[i]);
        const dn = new Date(day.time[i]).toLocaleDateString(undefined, { weekday: "short" });
        const span = document.createElement("span"); span.className = "wx-day";
        const b = document.createElement("b"); b.textContent = dn; span.appendChild(b);
        span.appendChild(document.createTextNode(` ${ic} ${Math.round(day.temperature_2m_max[i])}°`));
        const lo = document.createElement("i"); lo.textContent = `/${Math.round(day.temperature_2m_min[i])}°`; span.appendChild(lo);
        fc.appendChild(span);
      }
    } catch {}
  }

  function configForExport() { return ESM.pickConfig(state); }

  /* ---------- Music ----------
     The stream is a live relay on a free Render plan, so it *will* drop: Render
     spins the service down, a track fails to resolve, the office network blinks.
     Everything here is built around that:

     - Autoplay is attempted on load. Most TVs allow it and the music simply
       starts. The Philips refuses any sound before a user gesture, so there the
       badge shows ▶ and the first click anywhere (the logo included) starts it.
     - A watchdog checks that `currentTime` is actually advancing. A stream that
       stalls for STALL_MS, errors, or pauses on its own is reconnected on a
       fresh connection with exponential backoff (3 s … 60 s), forever.
     - Every third failure moves one step along a fallback chain of lo-fi
       stations on unrelated infrastructure, so the room is never silent and a
       second dead host costs seconds, not minutes. While off the intended
       station it is probed (the probe itself wakes a sleeping Render); when it
       answers with audio again it comes back by itself.
     - While the relay plays, a small ping every five minutes gives Render fresh
       inbound traffic, because an open stream alone does not stop its idle timer.

     `wantMusic` is the intent ("sound should be on"); it survives the night pause,
     so the stream returns by itself in the morning. */
  const audio = $("bgAudio");
  const STALL_MS = 15000, WATCH_MS = 5000, SETTLE_MS = 10000, KEEPALIVE_MS = 5 * 60000, PROBE_MS = 60000;
  let manualPaused = false, wantMusic = false, needsGesture = false;
  // The fallback chain: same flavour as Lofi Girl, each on different
  // infrastructure, all EU-hosted Icecast MP3 (see shared.js). Walked in order;
  // the intended station is skipped if it is itself in the chain.
  const BACKUP_CHAIN = ["fluxchillhop", "ilovechillhop", "reyfmlofi"];
  let streamUrls = [], streamIdx = 0, altIdx = 0, fails = 0, reconnectTimer = null;
  let lastTime = -1, lastProgressAt = 0, progressSince = 0;
  let probeBusy = false, probeEvery = PROBE_MS, nextProbeAt = 0, lastKeepalive = 0;

  const station = () => ESM.findStation(state.musicStation);
  // Intended station first, then the chain: altIdx walks this list.
  const alternatives = () => [station()].concat(
    BACKUP_CHAIN.filter((id) => id !== state.musicStation).map((id) => ESM.findStation(id)));
  const playingStation = () => alternatives()[altIdx] || station();
  const onBackup = () => altIdx !== 0;
  function loadStation() { streamUrls = ESM.stationUrls(playingStation()); streamIdx = 0; }
  const silentNow = () => screen.classList.contains("is-night") || manualPaused || !state.music || !wantMusic;
  function clearReconnect() { if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; } }

  // Point the element at the current candidate URL and play. A live stream has no
  // position worth keeping, so every (re)start is a fresh, cache-busted `src`: no
  // proxy or half-dead socket gets reused.
  function attempt() {
    if (!audio || !streamUrls.length) return;
    const base = streamUrls[Math.min(streamIdx, streamUrls.length - 1)];
    audio.src = base + (base.indexOf("?") < 0 ? "?" : "&") + "r=" + Date.now();
    audio.volume = state.musicVolume;
    lastTime = -1; lastProgressAt = Date.now(); progressSince = 0;
    const p = audio.play();
    if (p && p.catch) p.catch((e) => {
      if (e && e.name === "NotAllowedError") needsGesture = true;   // Philips: wait for a click
      renderMusicbar();
    });
  }

  // Reconnect with backoff. Each station gets three strikes (0 s, 3 s, 6 s
  // apart) before the chain moves on, so a dead relay is on FluxFM in ~10 s and
  // a dead FluxFM on I Love Chillhop ~10 s later. The waits double on every
  // full lap of the chain, so a dead network is not hammered forever.
  function reconnect() {
    if (reconnectTimer || silentNow() || needsGesture) return;
    fails++;
    const n = alternatives().length, step = fails % 3;              // 1, 2: next mirror; 0: next station
    if (step === 0) { altIdx = (altIdx + 1) % n; loadStation(); }
    else streamIdx = (streamIdx + 1) % streamUrls.length;
    if (onBackup()) nextProbeAt = Date.now() + probeEvery;
    const lap = Math.floor((fails - 1) / (3 * n));
    const base = step === 1 ? 0 : step === 2 ? 3000 : 6000;
    const delay = Math.min(60000, base * Math.pow(2, lap)) * (0.8 + Math.random() * 0.4);
    reconnectTimer = setTimeout(() => { reconnectTimer = null; attempt(); }, delay);
    renderMusicbar();
  }

  // Is the music actually moving? Runs every WATCH_MS.
  function watchdog() {
    if (!audio) return;
    if (silentNow()) { lastTime = -1; progressSince = 0; return; }
    if (needsGesture || reconnectTimer) return;
    const now = Date.now(), t = audio.currentTime;
    if (!audio.paused && !audio.error && t !== lastTime) {           // advancing: healthy
      lastTime = t; lastProgressAt = now;
      if (!progressSince) progressSince = now;
      if (now - progressSince >= SETTLE_MS) fails = 0;               // settled: backoff starts over next time
      if (onBackup()) { if (now >= nextProbeAt) probeIntended(); }
      else if (now - lastKeepalive >= KEEPALIVE_MS) keepalive();
      return;
    }
    if (audio.error || audio.paused || now - lastProgressAt >= STALL_MS) reconnect();
  }

  // A fresh inbound request every few minutes. Render's idle timer counts
  // requests, not open streams, so the TV keeps the relay awake by itself.
  function keepalive() {
    lastKeepalive = Date.now();
    const url = station().keepalive; if (!url) return;
    try { fetch(url + "?t=" + Date.now(), { mode: "no-cors", cache: "no-store", credentials: "omit" }).catch(() => {}); } catch {}
  }

  // Off the intended station: does it answer with audio again? Only a
  // real relay says `200 audio/*`; Render's own "waking up" page does not. The
  // request wakes a sleeping service, so the timeout covers a cold start. One in
  // flight at a time; the interval doubles (to five minutes) while it says no.
  function probeIntended() {
    if (probeBusy) return;
    probeBusy = true; nextProbeAt = Date.now() + probeEvery;
    const url = ESM.stationUrls(station())[0] + "?probe=" + Date.now();
    const timeout = new Promise((r) => setTimeout(() => r(false), 55000));
    const req = fetch(url, { cache: "no-store", credentials: "omit" }).then((r) => {
      const ok = r.ok && /audio/i.test(r.headers.get("content-type") || "");
      try { r.body.cancel(); } catch {}
      return ok;
    }).catch(() => false);
    Promise.race([req, timeout]).then((ok) => {
      probeBusy = false;
      if (!ok || !onBackup() || silentNow()) { probeEvery = Math.min(300000, probeEvery * 2); return; }
      altIdx = 0; fails = 0; probeEvery = PROBE_MS; loadStation();
      attempt(); peekMusicbar(); renderMusicbar();   // badge flips back at once, not on the next event
    });
  }

  // Idempotent: the TV automation can click the logo as often as it likes and
  // never accidentally silence the room. A click also means "try now".
  function startMusic() {
    if (PREVIEW || !audio) return;
    wantMusic = true; manualPaused = false; needsGesture = false; state.music = true;
    if (!streamUrls.length) loadStation();
    if (screen.classList.contains("is-night")) { renderMusicbar(); return; }
    clearReconnect(); fails = 0;
    if (audio.paused || audio.error) attempt(); else audio.volume = state.musicVolume;
    peekMusicbar();
    renderMusicbar();
  }
  function stopMusic() {
    wantMusic = false; manualPaused = true;
    clearReconnect();
    if (audio) audio.pause();
    renderMusicbar();
  }
  function toggleMusic() { (audio && !audio.paused) ? stopMusic() : startMusic(); }

  // Autoplay where the browser allows it; where it refuses, the ▶ badge waits
  // and the first gesture anywhere on the page starts the music.
  function tryAutoplay() { if (!PREVIEW && audio && state.music) startMusic(); }
  function unlockOnGesture() { if (needsGesture && wantMusic && !silentNow()) startMusic(); }

  function setStation(id, announce) {
    state.musicStation = id; save();
    manualPaused = false; altIdx = 0; fails = 0; loadStation(); clearReconnect();
    if (wantMusic && audio && !silentNow()) attempt();
    syncMusicPanel(); renderMusicbar();
    if (announce) peekMusicbar();
  }
  function nextStation() {
    const i = STATIONS.findIndex((s) => s.id === state.musicStation);
    setStation(STATIONS[(i + 1 + STATIONS.length) % STATIONS.length].id, true);
  }

  // Runs on every schedule tick: go quiet at night, come back in the day.
  function syncMusic() {
    if (!audio) { renderMusicbar(); return; }
    if (silentNow()) { clearReconnect(); if (!audio.paused) audio.pause(); }
    else if (audio.paused && !needsGesture && !reconnectTimer) attempt();
    else audio.volume = state.musicVolume;
    renderMusicbar();
  }

  function renderMusicbar() {
    const bar = $("musicbar");
    if (!bar) return;
    const show = state.musicBar && !screen.classList.contains("is-night");
    bar.hidden = !show && !bar.classList.contains("is-peek");
    if (bar.hidden) return;
    const playing = !!audio && !audio.paused && !audio.error;
    const retrying = wantMusic && !playing && !needsGesture && !manualPaused && (!!reconnectTimer || fails > 0);
    bar.classList.toggle("is-playing", playing);
    bar.setAttribute("aria-label", playing ? "Pause music" : "Play music");
    $("musicState").textContent = (playing ? "♪ " : retrying ? "↻ " : "▶ ") + playingStation().name +
      (onBackup() ? " · " + station().name + " unreachable" : "");
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
    loadStation();
    if (audio) {
      audio.volume = state.musicVolume;
      ["play", "playing", "pause", "waiting", "stalled"].forEach((ev) => audio.addEventListener(ev, renderMusicbar));
      audio.addEventListener("error", reconnect);
      audio.addEventListener("ended", reconnect);      // a live stream that ends has dropped
      setInterval(watchdog, WATCH_MS);
      addEventListener("online", () => {               // network is back: do not sit out the backoff
        if (wantMusic && !silentNow() && !needsGesture) { clearReconnect(); fails = 0; attempt(); }
      });
      ["pointerdown", "mousedown", "touchstart", "keydown"].forEach((ev) => document.addEventListener(ev, unlockOnGesture, true));
    }
    $("musicbar").onclick = toggleMusic;
    renderMusicbar();
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
      }, location.origin);   // never to a foreign parent
    } catch {}
  }
  if (PREVIEW) {
    addEventListener("message", (e) => {
      if (e.origin !== location.origin) return;   // only this site may drive the preview
      const d = e.data || {};
      if (d.type === "esm:bg" && d.bg && !wallFeed) { const i = ESM.findSlide(slides, d.bg); if (i >= 0) showSlide(i); notifyParent(); }
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
  setTimeout(tryAutoplay, 600);   // after the schedule has been applied; a beat after first paint
  const discCode = $("discCode");
  // Enough repeats to densely fill the disc as a tiny code grid (overflow clipped to the circle).
  if (discCode) discCode.textContent = "EasyScaleMedia".repeat(700);
  setInterval(playWave, 120000);   // the wave passes roughly every 2 minutes
  // The logo IS the play button: one click gives the wave and starts the music,
  // with no settings sidebar in the way. Enter/Space do the same, so a keyboard
  // or a remote's OK button works as a trigger too.
  function logoPress() { playWave(); startMusic(); }
  $("disc").addEventListener("click", logoPress);
  $("disc").addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); logoPress(); }
  });
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
    setInterval(refreshWallFeed, 30000);
  } else {
    document.body.classList.add("is-preview");
  }

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
})();

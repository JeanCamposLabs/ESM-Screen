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
    bg: "",
    weather: true,
  };
  const KEY = "esm-screen.v1";

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
  function applySchedule() {
    if (!state.schedule) { screen.classList.remove("is-night"); return; }
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const on = toMin(state.onTime), off = toMin(state.offTime);
    // Daytime window may wrap past midnight (e.g. on 07:00, off 23:00 = simple;
    // on 18:00, off 02:00 = wraps).
    const isDay = on <= off ? (cur >= on && cur < off) : (cur >= on || cur < off);
    screen.classList.toggle("is-night", !isDay);
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
    $("inSpeed").oninput    = (e) => { state.speed = parseFloat(e.target.value); commit(); };
    $("tgSchedule").onchange= (e) => { state.schedule = e.target.checked; commit(); };
    $("inOn").onchange      = (e) => { state.onTime = e.target.value; commit(); };
    $("inOff").onchange     = (e) => { state.offTime = e.target.value; commit(); };
    $("tgNightClock").onchange = (e) => { state.nightClock = e.target.checked; commit(); };

    $("btnFull").onclick  = toggleFullscreen;
    $("btnReset").onclick = () => { state = { ...DEFAULTS }; commit(); flash("Reset to defaults"); };
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
    $("inSpeed").value = state.speed;
    $("tgSchedule").checked = state.schedule;
    $("inOn").value = state.onTime;
    $("inOff").value = state.offTime;
    $("tgNightClock").checked = state.nightClock;
    syncBgGrid();
  }

  function commit() { save(); apply(); }
  function flash(msg) { const s = $("panelStatus"); s.textContent = msg; setTimeout(() => { if (s.textContent === msg) s.textContent = ""; }, 2000); }

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
  const VERSION_POLL_MS = 60000;
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
    tick(); applySchedule(); checkVersion(); requestWakeLock(); fetchWeather(); syncConfig();
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
    const dur = rand(22, 34) / (state.speed || 1) * 1000;
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
  const SLIDE_MS = 24000;
  const slideLayers = [$("sceneImage"), $("sceneImageB")];
  let slides = [], slideIdx = 0, slideFront = 0, slidesActive = false;

  function panLayer(el) {
    el.getAnimations().forEach((a) => a.cancel());
    if (prefersReduced) { el.style.transform = "scale(1.08)"; return; }
    // continuous, gentle Ken-Burns drift that loops forever (always moving)
    const x = (Math.random() * 2 - 1) * 2.4, y = (Math.random() * 2 - 1) * 2.4;
    el.animate(
      [{ transform: `scale(1.04) translate(${-x}%, ${-y}%)` },
       { transform: `scale(1.12) translate(${x}%, ${y}%)` }],
      { duration: 42000 / (state.speed || 1), easing: "ease-in-out",
        iterations: Infinity, direction: "alternate" }
    );
  }
  function showSlide(i) {
    const el = slideLayers[slideFront ^ 1];            // the hidden layer
    el.style.backgroundImage = `url("${slides[i]}")`;
    panLayer(el);
    el.classList.add("is-on");
    slideLayers[slideFront].classList.remove("is-on");
    slideFront ^= 1; slideIdx = i;
  }
  function setBg(i, persist) {
    if (!slides.length) return;
    showSlide(((i % slides.length) + slides.length) % slides.length);
    if (persist) { state.bg = slides[slideIdx]; save(); }
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
    try {
      const r = await fetch(`assets/backgrounds.json?t=${Date.now()}`, { cache: "no-store" });
      if (r.ok) { const d = await r.json(); list = Array.isArray(d) ? d : (d.images || []); }
    } catch {}
    list = (list || []).filter(Boolean);
    if (!list.length) return;                          // no gallery -> per-style fallback
    slides = list; slidesActive = true; slideFront = 0;
    // Starting background; it never changes on its own. Priority:
    //   ?bg=<index|name>  >  saved choice  >  first.
    const bgQ = new URLSearchParams(location.search).get("bg");
    let start = 0;
    if (bgQ != null && /^\d+$/.test(bgQ)) start = parseInt(bgQ, 10);
    else if (bgQ != null) { const m = slides.findIndex((s) => s.includes(bgQ)); if (m >= 0) start = m; }
    else if (state.bg) { const m = slides.findIndex((s) => s === state.bg || s.includes(state.bg)); if (m >= 0) start = m; }
    slideIdx = ((start % slides.length) + slides.length) % slides.length;
    const first = slideLayers[0];
    first.style.backgroundImage = `url("${slides[slideIdx]}")`;
    panLayer(first); first.classList.add("is-on");
    slideLayers[1].classList.remove("is-on");
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

  /* ---------- Central sync: every screen follows config.json ----------
     Change config.json once and all screens adopt it within a minute. Local
     panel tweaks are left alone until the config actually changes. */
  const CONFIG_URL = "config.json";
  let cfgRev = null;
  function applyBg(name) {
    if (!slidesActive || !slides.length || !name) return;
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
      particles: state.particles, weather: state.weather, speed: state.speed,
    };
  }

  /* ---------- Boot ---------- */
  buildPanel();
  apply();
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
  fetchWeather();
  setInterval(fetchWeather, 30 * 60 * 1000);
  syncConfig();
  setInterval(syncConfig, 60000);

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
})();

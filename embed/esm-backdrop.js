/* =================================================================
   ESM Backdrop — drop-in rotating backgrounds + the ESM disc
   v1.1.0 · no dependencies · plain ES5-ish so old TV browsers run it

   <link rel="stylesheet" href="esm-backdrop.css">
   <script src="esm-backdrop.js"></script>
   <script>
     ESMBackdrop.mount({ intervalMinutes: 3 });          // full-screen, disc on
     ESMBackdrop.mount({ follow: true });                 // paired: mirror the ESM screen's config
     ESMBackdrop.mount({ motion: "lively" });             // how much each image drifts
   </script>

   See README.md for every option. The image list and the images come from
   the ESM-Screen site by default (or from a local copy — set `base` /
   `manifest` / `slides`). Everything read from the network is DATA only
   (JSON + images) and is validated before use; this file never evaluates
   anything it fetched.
   ================================================================= */
(function (global) {
  "use strict";

  var VERSION = "1.2.0";
  var DEFAULT_BASE = "https://jeancamposlabs.github.io/ESM-Screen/";
  // config.json → minutes (same table as the ESM screen's shared.js)
  var ROTATE_MINUTES = { off: 0, daily: 1440, "4h": 240, hourly: 60, "30m": 30, "15m": 15, "5m": 5, "3m": 3 };
  var PALETTES = { orange: 1, navy: 1, electric: 1, teal: 1, purple: 1 };
  // Background drift. Every image carries its own motion (motion.json, computed
  // from the picture itself); this only scales it. Same numbers as the ESM screen,
  // so a paired screen drifts identically.
  var MOTION_K = { off: 0, subtle: 0.6, gentle: 1, lively: 1.5 };
  var MOTION_BASE_SCALE = 1.09;   // 4.5% of overhang each side, so an edge can never show
  var MOTION_MARGIN = 4.0;        // % — hard cap on the pan
  var MOTION_FALLBACK = { x: 1.1, y: 1.05, z: 0.012, d: 115 };
  var TOKEN_RE = /^[A-Za-z0-9_-]{1,80}$/;                                  // a slide token or a category id
  var PATH_RE = /^(?!.*\.\.)[A-Za-z0-9_./-]{1,200}\.(jpe?g|png|webp)$/i;   // a manifest entry, relative
  var URL_RE = /^https:\/\/[A-Za-z0-9.-]+\/[A-Za-z0-9_./%-]{1,300}\.(jpe?g|png|webp)$/i;  // or absolute https

  // Every image on the ESM-Screen site (used if the manifest can't be fetched).
  var FALLBACK_SLIDES = [
    "01-liquid","02-waves","03-bronze","04-gold","05-streaks","06-glow","07-layers","08-blue","09-teal","10-purple","11-red","12-soft",
    "13-sunset-ridge","14-dunes","15-ocean-dusk","16-aurora-peaks","17-mesa-dusk","18-facets","19-ribbons","20-ripples","21-aurora-bands",
    "22-hex-mesh","23-ember-plasma","24-teal-plasma","25-nebula","26-dusk-clouds","27-alpine-lake","28-foggy-peaks","29-pine-forest",
    "30-coastal-dusk","31-alpenglow","32-starry-desert","33-liquid-twin","34-liquid-drape","35-liquid-cross","36-liquid-silk",
    "37-liquid-crest","38-liquid-ember",
    "39-space-cosmic-cliffs","40-space-milky-way-core","41-space-carina-mystic","42-space-carina-dust","43-space-tarantula",
    "44-space-tarantula-violet","45-space-galactic-centre","46-space-rho-ophiuchi","47-space-helix","48-space-star-nursery",
    "49-space-nebula-lantern","50-space-spiral-pair","51-space-m81","52-space-andromeda","53-space-nebula-ember",
    "54-earth-limb-sunset","55-earth-limb-ember","56-earth-limb-dawn","57-earth-limb-moonrise","58-earth-milky-way",
    "59-earth-milky-way-arc","60-earth-limb-violet","61-earth-aurora-violet","62-earth-aurora-curtains","63-earth-aurora-green",
    "64-earth-aurora-sweep","65-earth-aurora-city-lights","66-earth-night-clouds","67-earth-limb-blue","68-earth-limb-city-lights",
    "69-earth-limb-purple-dawn","70-earth-aurora-ribbon",
    "71-nature-first-light","72-nature-dawn-star","73-nature-ember-dusk","74-nature-rose-dusk","75-nature-dunes-dusk",
    "76-nature-aurora-pine","77-nature-aurora-forest","78-nature-red-rock-night","79-nature-star-trails","80-nature-star-circle",
    "81-nature-starry-pines","82-nature-violet-sky","83-nature-twilight-plains","84-nature-ice-shore","85-nature-moonlit-sea",
    "86-nature-deep-blue","87-nature-blue-swell","88-nature-breaking-wave","89-nature-sea-horizon","90-nature-snow-peaks-dusk",
    "91-nature-alpine-sunset","92-nature-matterhorn","93-nature-dolomites-glow","94-nature-lake-dusk","95-nature-misty-ridge",
    "96-nature-larch-fog","97-nature-forest-light","98-nature-mars-crater","99-nature-coast-aerial","100-nature-violet-pier",
    "101-nature-crimson-shore","102-nature-golden-meadow","103-nature-cloud-valley","104-nature-misty-marsh"
  ].map(function (t) { return "assets/slides/" + t + ".jpg"; });

  var ROCKET = '<svg class="esmb__rocket" viewBox="13 15 63 63" aria-hidden="true"><g transform="translate(0,89) scale(0.1,-0.1)" fill="currentColor" stroke="none">' +
    '<path d="M518 646 c-57 -29 -109 -65 -126 -87 -6 -10 -29 -23 -50 -30 -69 -22 -123 -74 -137 -132 -7 -26 -6 -27 32 -27 34 0 47 -7 97 -56 55 -54 58 -59 53 -96 -5 -36 -4 -38 16 -32 67 20 130 81 142 136 4 16 24 49 46 74 22 25 47 60 56 77 21 42 43 124 43 165 l0 32 -62 -1 c-45 0 -76 -7 -110 -23z m50 -88 c21 -21 15 -76 -12 -93 -56 -37 -115 36 -69 87 18 20 63 24 81 6z"/>' +
    '<path d="M201 264 c-13 -17 -21 -41 -21 -67 l0 -40 41 6 c41 5 79 30 79 52 0 7 -11 10 -30 7 -29 -4 -30 -3 -30 32 0 43 -11 46 -39 10z"/></g></svg>';

  /* ---------- slide naming ---------- */
  function slideToken(src) { return String(src || "").split("/").pop().replace(/\.\w+$/, ""); }
  // "41-space-cosmic-cliffs" → { token, num, cat: "space", name: "Cosmic Cliffs" }
  function slideInfo(src) {
    var token = slideToken(src);
    var m = token.match(/^(\d+)-(.*)$/);
    var num = m ? parseInt(m[1], 10) : 0;
    var rest = m ? m[2] : token;
    var cat = "abstract";
    var cm = rest.match(/^(space|earth|nature|abstract|art)-(.+)$/);
    if (cm) { cat = cm[1]; rest = cm[2]; }
    else if (num >= 13 && num <= 38) cat = "art";
    var name = rest.replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    return { token: token, num: num, cat: cat, name: name };
  }

  /* ---------- rotation maths (identical to the ESM screen) ----------
     Local time is cut into slots of N minutes. Each slot maps to one image
     through a seeded shuffle per cycle: every image shows exactly once per
     cycle, in a shuffled order, and any two screens with the same list and
     interval show the same image at the same moment. */
  // Local time in seconds (seconds, not minutes, so sub-minute intervals such as
  // a 12 s demo work too; for whole-minute intervals the slots are identical).
  function localSeconds(now) {
    var d = now || new Date();
    return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 1000);
  }
  function seededOrder(n, seed) {
    var a = (seed >>> 0) || 1;
    function rnd() {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    var order = [], i, j, tmp;
    for (i = 0; i < n; i++) order.push(i);
    for (i = n - 1; i > 0; i--) {
      j = Math.floor(rnd() * (i + 1));
      tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }
    return order;
  }
  // → { index, slot, nextChangeMs }
  function pick(count, minutes, now, shuffle) {
    if (!count || !minutes) return null;
    var ls = localSeconds(now), span = minutes * 60;
    var slot = Math.floor(ls / span);
    var index;
    if (shuffle === false) index = ((slot % count) + count) % count;
    else {
      var epoch = Math.floor(slot / count);
      index = seededOrder(count, epoch * 7919 + count * 31 + minutes)[((slot % count) + count) % count];
    }
    return { index: index, slot: slot, nextChangeMs: ((slot + 1) * span - ls) * 1000 };
  }

  var REDUCED = false;
  try { REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) {}
  function motionFrames(m, motionId) {
    var k = MOTION_K[motionId];
    if (k == null) k = 1;
    if (!k || REDUCED) return null;
    var cap = function (v) { return Math.max(-MOTION_MARGIN, Math.min(MOTION_MARGIN, v * k)); };
    var x = cap(m.x), y = cap(m.y), z = Math.max(0, m.z * k);
    if (!x && !y && !z) return null;
    var s0 = MOTION_BASE_SCALE;
    return {
      from: "translate(" + (-x).toFixed(2) + "%, " + (-y).toFixed(2) + "%) scale(" + s0.toFixed(3) + ")",
      to: "translate(" + x.toFixed(2) + "%, " + y.toFixed(2) + "%) scale(" + (s0 + z).toFixed(3) + ")",
      duration: Math.max(30, m.d) * 1000
    };
  }

  /* ---------- helpers ---------- */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function joinUrl(base, path) {
    if (/^(https?:)?\/\//.test(path) || path.charAt(0) === "/") return path;
    return (base || "") + path;
  }
  function fetchJson(url) {
    return fetch(url + (url.indexOf("?") < 0 ? "?" : "&") + "t=" + Date.now(), { cache: "no-store", credentials: "omit" })
      .then(function (r) { if (!r.ok) throw new Error(url + " " + r.status); return r.json(); });
  }
  function preload(src, cb) {
    var im = new Image();
    im.onload = function () { cb && cb(true); };
    im.onerror = function () { cb && cb(false); };
    im.src = src;
  }
  // Only well-formed image paths get anywhere near the DOM, and absolute URLs
  // must live on the same origin as `base` (no third-party image hosts, so a
  // tampered list can't turn this into a tracking pixel).
  function originOf(u) { var m = String(u || "").match(/^https?:\/\/[^/]+/); return m ? m[0] : null; }
  function cleanList(list, base) {
    if (!Array.isArray(list)) return [];
    var allowed = originOf(base) || (typeof location !== "undefined" ? location.origin : null);
    var out = [];
    for (var i = 0; i < list.length && out.length < 2000; i++) {
      var p = list[i];
      if (typeof p !== "string") continue;
      if (PATH_RE.test(p)) out.push(p);
      else if (URL_RE.test(p) && allowed && p.indexOf(allowed + "/") === 0) out.push(p);
    }
    return out;
  }
  function cleanTokens(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(function (t) { return typeof t === "string" && TOKEN_RE.test(t); }).slice(0, 500);
  }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  /* ---------- mount ---------- */
  function mount(opts) {
    opts = opts || {};
    var base = opts.base != null ? opts.base : DEFAULT_BASE;
    if (base && base.charAt(base.length - 1) !== "/") base += "/";
    var minutes = opts.intervalMinutes != null ? Number(opts.intervalMinutes) : 3;
    var shuffle = opts.shuffle !== false;
    var fadeMs = opts.fadeMs != null ? Number(opts.fadeMs) : 1600;
    var playlist = cleanTokens([].concat(opts.playlist || [], opts.categories || []));

    // container: a selector, an element, or (default) a fixed full-screen layer
    var host = opts.el;
    if (typeof host === "string") host = document.querySelector(host);
    var created = false;
    if (!host) { host = el("div"); created = true; document.body.appendChild(host); }
    host.classList.add("esmb");
    if (created || opts.fixed) host.classList.add("esmb--fixed");
    host.setAttribute("data-palette", PALETTES[opts.palette] ? opts.palette : "orange");
    if (opts.zIndex != null) host.style.zIndex = String(opts.zIndex);
    if (opts.discSize) host.style.setProperty("--esmb-disc", String(opts.discSize));
    host.style.setProperty("--esmb-fade", (fadeMs / 1000) + "s");

    var layers = [el("div", "esmb__layer"), el("div", "esmb__layer")];
    host.appendChild(layers[0]); host.appendChild(layers[1]);
    if (opts.vignette !== false) host.appendChild(el("div", "esmb__vignette"));
    var disc = null;
    if (opts.disc !== false) {
      var w1 = opts.wordmark ? String(opts.wordmark).split("|")[0] : "Easy Scale";
      var w2 = opts.wordmark ? (String(opts.wordmark).split("|")[1] || "") : "Media";
      disc = el("div", "esmb__disc",
        '<div class="esmb__tube"><span class="esmb__ring"></span><div class="esmb__face">' + ROCKET +
        '<div class="esmb__word"></div></div></div>');
      var word = disc.querySelector(".esmb__word");
      var b1 = el("b"); b1.textContent = w1; word.appendChild(b1);
      if (w2) { var b2 = el("b"); b2.textContent = w2; word.appendChild(b2); }
      if (opts.discFloat === false) disc.classList.add("esmb__disc--still");
      host.appendChild(disc);
    }

    var motionId = MOTION_K[opts.motion] != null ? opts.motion : "gentle";
    var motionMap = null;
    var all = [], slides = [], front = 0, current = -1, pinned = null, pinnedToken = null;
    var timer = null, poll = null, follower = null, destroyed = false, lastSlot = null, started = false, pendingCfg = null;

    function filterSlides(list) {
      if (!playlist.length) return list;
      var want = {}, i;
      for (i = 0; i < playlist.length; i++) want[playlist[i]] = true;
      var out = list.filter(function (s) { var info = slideInfo(s); return want[info.token] || want[info.cat]; });
      return out.length ? out : list;
    }
    function indexOfToken(token) {
      for (var i = 0; i < slides.length; i++) if (slideToken(slides[i]) === slideToken(String(token))) return i;
      return -1;
    }
    function show(i, instant) {
      if (i === current || !slides.length) return;
      var src = slides[i];
      var swap = function () {
        if (destroyed || slides[i] !== src) return;
        var back = layers[front ^ 1];
        back.style.backgroundImage = 'url("' + src + '")';
        if (instant) back.style.transition = "none";
        back.classList.add("is-on");
        layers[front].classList.remove("is-on");
        if (instant) setTimeout(function () { back.style.transition = ""; }, 50);
        front ^= 1; current = i;
        drift(back, src);
        if (opts.onChange) { try { opts.onChange(Object.assign({ src: src, index: i, total: slides.length }, slideInfo(src))); } catch (e) {} }
        // warm the cache for the one after this, so the next fade is clean on a slow TV
        var nx = pick(slides.length, minutes, new Date(Date.now() + minutes * 60000), shuffle);
        if (nx) preload(slides[nx.index]);
      };
      preload(src, function () { swap(); });   // decode first, then fade — no flash of empty layer
    }
    // Slow, per-image drift: horizons slide sideways, a bright subject is pushed
    // into, textures drift diagonally. Eases at both ends, never jumps back.
    function drift(el, src) {
      try { if (el._esmAnim) { el._esmAnim.cancel(); el._esmAnim = null; } } catch (e) {}
      var m = (motionMap && motionMap[slideToken(src)]) || MOTION_FALLBACK;
      var f = el.animate ? motionFrames(m, motionId) : null;
      if (!f) { el.style.transform = "scale(" + MOTION_BASE_SCALE.toFixed(3) + ")"; return; }
      el.style.transform = f.from;
      try {
        el._esmAnim = el.animate([{ transform: f.from }, { transform: f.to }],
          { duration: f.duration, direction: "alternate", iterations: Infinity, easing: "ease-in-out" });
      } catch (e) { el.style.transform = "scale(" + MOTION_BASE_SCALE.toFixed(3) + ")"; }
    }
    function setMotion(id) {
      if (MOTION_K[id] == null || id === motionId) return;
      motionId = id;
      if (current >= 0) drift(layers[front], slides[current]);
    }

    function tick(force) {
      if (destroyed || pinned != null) return;
      var p = pick(slides.length, minutes, null, shuffle);
      clearTimeout(timer);
      if (!p) return;
      timer = setTimeout(function () { tick(); }, Math.max(1000, p.nextChangeMs + 250));   // right on the boundary
      if (!force && p.slot === lastSlot) return;
      lastSlot = p.slot;
      show(p.index);
    }
    function rebuild() {
      slides = filterSlides(all);
      if (!slides.length) return;
      if (current >= 0) current = slides.indexOf(layers[front].style.backgroundImage.replace(/^url\("(.*)"\)$/, "$1"));   // keep the index honest after a playlist change
      if (pinnedToken != null) {
        var m = indexOfToken(pinnedToken);
        if (m >= 0) { pinned = m; show(m); return; }
      }
      pinned = null; lastSlot = null;
      if (minutes) tick(true);
      else if (current < 0) show(0, true);
    }
    function start(list) {
      all = list.map(function (p) { return joinUrl(base, p); });
      // per-image motion; absent → every slide uses the same fallback drift
      fetchJson(joinUrl(base, opts.motionManifest || "assets/motion.json"))
        .then(function (d) { if (d && typeof d === "object") { motionMap = d; if (current >= 0) drift(layers[front], slides[current]); } })
        .catch(function () {});
      started = true;
      if (opts.start != null) pinnedToken = String(opts.start);
      if (pendingCfg) { var c = pendingCfg; pendingCfg = null; applyConfig(c); }
      else rebuild();
      // belt and braces: a sleeping TV misses timers — re-check on wake and every 30 s
      poll = setInterval(function () { tick(); }, 30000);
      document.addEventListener("visibilitychange", onVis);
    }
    function onVis() { if (!document.hidden) tick(); }

    /* ---------- paired mode: mirror the ESM screen's config.json ----------
       Reads rotation, playlist, pin and palette from the house config, so the
       ESM remote steers this screen too. Data only: validated field by field. */
    function applyConfig(cfg) {
      if (!cfg || typeof cfg !== "object") return;
      if (!started) { pendingCfg = cfg; return; }
      var changed = false;
      if (typeof cfg.bgRotate === "string" && ROTATE_MINUTES.hasOwnProperty(cfg.bgRotate)) {
        var m = ROTATE_MINUTES[cfg.bgRotate];
        if (m !== minutes) { minutes = m; changed = true; }
      } else if (cfg.dailyBg != null && !cfg.bgRotate) {          // very old configs
        var m2 = cfg.dailyBg ? 1440 : 0;
        if (m2 !== minutes) { minutes = m2; changed = true; }
      }
      var pl = cleanTokens(cfg.bgSet);
      if (!same(pl, playlist)) { playlist = pl; changed = true; }
      var pinTo = (!minutes && typeof cfg.bg === "string" && TOKEN_RE.test(cfg.bg)) ? cfg.bg : null;
      if (pinTo !== pinnedToken) { pinnedToken = pinTo; changed = true; }
      if (opts.followPalette !== false && typeof cfg.palette === "string" && PALETTES[cfg.palette]) host.setAttribute("data-palette", cfg.palette);
      if (opts.followMotion !== false && typeof cfg.bgMotion === "string") setMotion(cfg.bgMotion);
      if (changed) rebuild();
    }
    var followUrl = null;
    if (opts.follow === true) followUrl = base + "config.json";
    else if (typeof opts.follow === "string") followUrl = joinUrl(base, opts.follow);
    function fetchConfig() {
      if (!followUrl || destroyed) return;
      fetchJson(followUrl).then(applyConfig).catch(function () { /* keep the last known config */ });
    }

    // image list: explicit → manifest(s) → built-in fallback (all validated)
    var explicit = cleanList(opts.slides, base);
    if (explicit.length) start(explicit);
    else {
      var manifests = opts.manifest ? [].concat(opts.manifest) : [base + "assets/backgrounds.json"];
      (function tryNext(i) {
        if (i >= manifests.length) { start(FALLBACK_SLIDES); return; }
        fetchJson(joinUrl(base, manifests[i])).then(function (d) {
          var list = cleanList(Array.isArray(d) ? d : (d && d.images) || [], base);
          if (!list.length) throw new Error("empty manifest");
          start(list);
        }).catch(function () { tryNext(i + 1); });
      })(0);
    }
    if (followUrl) { fetchConfig(); follower = setInterval(fetchConfig, Math.max(15000, Number(opts.followEveryMs) || 60000)); }

    var api = {
      version: VERSION,
      get slides() { return slides.slice(); },
      current: function () { return current >= 0 ? Object.assign({ src: slides[current], index: current }, slideInfo(slides[current])) : null; },
      next: function () { pinned = (current + 1) % slides.length; pinnedToken = slideToken(slides[pinned]); show(pinned); return api; },
      prev: function () { pinned = (current - 1 + slides.length) % slides.length; pinnedToken = slideToken(slides[pinned]); show(pinned); return api; },
      pin: function (token) { var i = indexOfToken(token); if (i >= 0) { pinned = i; pinnedToken = slideToken(slides[i]); show(i); } return api; },
      unpin: function () { pinned = null; pinnedToken = null; lastSlot = null; tick(true); return api; },
      palette: function (p) { if (PALETTES[p]) host.setAttribute("data-palette", p); return api; },
      motion: function (id) { setMotion(id); return api; },
      interval: function (m) { minutes = Number(m) || 0; lastSlot = null; if (pinned == null) tick(true); return api; },
      destroy: function () {
        destroyed = true; clearTimeout(timer); clearInterval(poll); clearInterval(follower);
        layers.forEach(function (el) { try { if (el._esmAnim) el._esmAnim.cancel(); } catch (e) {} });
        document.removeEventListener("visibilitychange", onVis);
        if (created) host.parentNode && host.parentNode.removeChild(host);
        else host.innerHTML = "";
      }
    };
    return api;
  }

  global.ESMBackdrop = { mount: mount, pick: pick, slideInfo: slideInfo, slideToken: slideToken, FALLBACK_SLIDES: FALLBACK_SLIDES, ROTATE_MINUTES: ROTATE_MINUTES, MOTION_K: MOTION_K, VERSION: VERSION };
})(window);

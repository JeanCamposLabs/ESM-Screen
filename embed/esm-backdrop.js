/* =================================================================
   ESM Backdrop — drop-in rotating backgrounds + the ESM disc
   v1.0.0 · no dependencies · plain ES5-ish so old TV browsers run it

   <link rel="stylesheet" href="esm-backdrop.css">
   <script src="esm-backdrop.js"></script>
   <script>
     ESMBackdrop.mount({ intervalMinutes: 3 });   // full-screen, disc on
   </script>

   See README.md for every option. The image list and the images themselves
   come from the ESM-Screen site by default (or from a local copy — set
   `base` / `manifest` / `slides`).
   ================================================================= */
(function (global) {
  "use strict";

  var VERSION = "1.0.0";
  var DEFAULT_BASE = "https://jeancamposlabs.github.io/ESM-Screen/";

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
    return fetch(url + (url.indexOf("?") < 0 ? "?" : "&") + "t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(url + " " + r.status); return r.json(); });
  }
  function preload(src, cb) {
    var im = new Image();
    im.onload = function () { cb && cb(true); };
    im.onerror = function () { cb && cb(false); };
    im.src = src;
  }

  /* ---------- mount ---------- */
  function mount(opts) {
    opts = opts || {};
    var base = opts.base != null ? opts.base : DEFAULT_BASE;
    if (base && base.charAt(base.length - 1) !== "/") base += "/";
    var minutes = opts.intervalMinutes != null ? Number(opts.intervalMinutes) : 3;
    var shuffle = opts.shuffle !== false;
    var fadeMs = opts.fadeMs != null ? Number(opts.fadeMs) : 1600;

    // container: a selector, an element, or (default) a fixed full-screen layer
    var host = opts.el;
    if (typeof host === "string") host = document.querySelector(host);
    var created = false;
    if (!host) { host = el("div"); created = true; document.body.appendChild(host); }
    host.classList.add("esmb");
    if (created || opts.fixed) host.classList.add("esmb--fixed");
    host.setAttribute("data-palette", opts.palette || "orange");
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
        '<div class="esmb__word"><b>' + w1 + '</b>' + (w2 ? '<b>' + w2 + '</b>' : '') + '</div></div></div>');
      if (opts.discFloat === false) disc.classList.add("esmb__disc--still");
      host.appendChild(disc);
    }

    var slides = [], front = 0, current = -1, pinned = null, timer = null, poll = null, destroyed = false, lastSlot = null;

    function filterSlides(list) {
      var cats = opts.categories, pl = opts.playlist, want = {}, i;
      if (pl && pl.length) { for (i = 0; i < pl.length; i++) want[slideToken(pl[i])] = true; }
      if (cats && cats.length) { for (i = 0; i < cats.length; i++) want[cats[i]] = true; }
      if (!pl && !cats) return list;
      var out = list.filter(function (s) { var info = slideInfo(s); return want[info.token] || want[info.cat]; });
      return out.length ? out : list;
    }
    function show(i, instant) {
      if (i === current || !slides.length) return;
      var src = slides[i];
      var swap = function () {
        if (destroyed) return;
        var back = layers[front ^ 1];
        back.style.backgroundImage = 'url("' + src + '")';
        if (instant) back.style.transition = "none";
        back.classList.add("is-on");
        layers[front].classList.remove("is-on");
        if (instant) setTimeout(function () { back.style.transition = ""; }, 50);
        front ^= 1; current = i;
        if (opts.onChange) { try { opts.onChange(Object.assign({ src: src, index: i, total: slides.length }, slideInfo(src))); } catch (e) {} }
        // warm the cache for the one after this, so the next fade is clean on a slow TV
        var nx = pick(slides.length, minutes, new Date(Date.now() + minutes * 60000), shuffle);
        if (nx) preload(slides[nx.index]);
      };
      preload(src, function () { swap(); });   // decode first, then fade — no flash of empty layer
    }
    function tick(force) {
      if (destroyed || pinned != null) return;
      var p = pick(slides.length, minutes, null, shuffle);
      if (!p) return;
      if (!force && p.slot === lastSlot) return;
      lastSlot = p.slot;
      show(p.index);
      clearTimeout(timer);
      timer = setTimeout(function () { tick(); }, Math.max(1000, p.nextChangeMs + 250));
    }
    function start(list) {
      slides = filterSlides(list.map(function (p) { return joinUrl(base, p); }));
      if (!slides.length) return;
      var startIdx = 0;
      if (opts.start != null) {
        var m = -1;
        for (var i = 0; i < slides.length; i++) if (slideToken(slides[i]) === slideToken(String(opts.start))) { m = i; break; }
        if (m >= 0) { startIdx = m; pinned = m; }
      }
      if (pinned == null) { var p = pick(slides.length, minutes, null, shuffle); if (p) { startIdx = p.index; lastSlot = p.slot; } }
      show(startIdx, true);
      if (pinned == null) { var q = pick(slides.length, minutes, null, shuffle); if (q) timer = setTimeout(function () { tick(); }, Math.max(1000, q.nextChangeMs + 250)); }
      // belt and braces: a sleeping TV misses timers — re-check on wake and every 30 s
      poll = setInterval(function () { tick(); }, 30000);
      document.addEventListener("visibilitychange", onVis);
    }
    function onVis() { if (!document.hidden) tick(); }

    // image list: explicit → manifest(s) → built-in fallback
    if (opts.slides && opts.slides.length) start(opts.slides.slice());
    else {
      var manifests = opts.manifest ? [].concat(opts.manifest) : [base + "assets/backgrounds.json"];
      (function tryNext(i) {
        if (i >= manifests.length) { start(FALLBACK_SLIDES); return; }
        fetchJson(joinUrl(base, manifests[i])).then(function (d) {
          var list = Array.isArray(d) ? d : (d && d.images) || [];
          if (!list.length) throw new Error("empty manifest");
          start(list);
        }).catch(function () { tryNext(i + 1); });
      })(0);
    }

    var api = {
      version: VERSION,
      get slides() { return slides.slice(); },
      current: function () { return current >= 0 ? Object.assign({ src: slides[current], index: current }, slideInfo(slides[current])) : null; },
      next: function () { pinned = (current + 1) % slides.length; show(pinned); return api; },
      prev: function () { pinned = (current - 1 + slides.length) % slides.length; show(pinned); return api; },
      pin: function (token) {
        for (var i = 0; i < slides.length; i++) if (slideToken(slides[i]) === slideToken(String(token))) { pinned = i; show(i); break; }
        return api;
      },
      unpin: function () { pinned = null; lastSlot = null; tick(true); return api; },
      palette: function (p) { host.setAttribute("data-palette", p); return api; },
      destroy: function () {
        destroyed = true; clearTimeout(timer); clearInterval(poll);
        document.removeEventListener("visibilitychange", onVis);
        if (created) host.parentNode && host.parentNode.removeChild(host);
        else host.innerHTML = "";
      }
    };
    return api;
  }

  global.ESMBackdrop = { mount: mount, pick: pick, slideInfo: slideInfo, slideToken: slideToken, FALLBACK_SLIDES: FALLBACK_SLIDES, VERSION: VERSION };
})(window);

/* =================================================================
   ESM Screen — remote control (remote.html)
   Edit a DRAFT of the house config against a live preview of the screen,
   then push it to config.json on GitHub in one click. The same shared.js
   the TVs run decides which background is on right now, so what this page
   says the TVs show is what they show.
   ================================================================= */
(() => {
  "use strict";

  const { STYLES, PALETTES, STATIONS, ROTATIONS, CATEGORIES } = ESM;
  const $ = (id) => document.getElementById(id);
  const TOKEN_KEY = "esm-screen.ghtoken";
  const frame = $("preview");
  const listen = $("listen");

  let slides = [];            // every image on the site (assets/backgrounds.json)
  let live = null;            // the config the TVs are reading right now
  let draft = null;           // what this page is editing
  let version = null;         // version.json
  let previewing = null;      // slide src shown in the preview (null = follow the rotation)
  let frameReady = false;
  let pushing = false;
  let listenId = null, listenUrlIdx = 0;

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const withDefaults = (cfg) => Object.assign({}, ESM.CONFIG_DEFAULTS, cfg);
  const isDirty = () => live && draft && !ESM.sameConfig(live, draft);
  const fmtDur = (ms) => {
    const m = Math.max(1, Math.round(ms / 60000));
    if (m >= 120) return Math.round(m / 60) + " h";
    return m + " min";
  };

  /* ---------- Load ---------- */
  async function loadAll() {
    const [cfg, bgs, ver] = await Promise.all([
      ESM.fetchLiveConfig("").catch(() => ({})),
      fetch("assets/backgrounds.json?t=" + Date.now(), { cache: "no-store" }).then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch("version.json?t=" + Date.now(), { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
    ]);
    slides = Array.isArray(bgs) ? bgs : (bgs && bgs.images) || [];
    live = withDefaults(ESM.normalizeConfig(cfg));
    if (!draft) draft = clone(live);
    version = ver;
    buildStatic();
    buildGallery();
    render();
    renderLive();
    sendConfig();
  }

  // Someone else may push while this page is open: pick it up quietly when
  // there is nothing unpushed here, otherwise offer to load it.
  async function pollLive() {
    try {
      const cfg = withDefaults(ESM.normalizeConfig(await ESM.fetchLiveConfig("")));
      if (ESM.sameConfig(cfg, live)) return;
      if (!isDirty()) { live = cfg; draft = clone(cfg); render(); sendConfig(); }
      else { live = cfg; $("serverNotice").hidden = false; }
      renderLive();
    } catch {}
  }

  /* ---------- Build the static controls ---------- */
  function buildStatic() {
    const sg = $("styleGrid"); sg.innerHTML = "";
    STYLES.forEach((s) => {
      const b = document.createElement("button");
      b.className = "opt"; b.dataset.id = s.id; b.type = "button";
      b.innerHTML = `<span class="opt__name">${esc(s.name)}</span><span class="opt__desc">${esc(s.desc)}</span>`;
      b.onclick = () => set("style", s.id);
      sg.appendChild(b);
    });
    const pr = $("paletteRow"); pr.innerHTML = "";
    PALETTES.forEach((p) => {
      const b = document.createElement("button");
      b.className = "swatch"; b.dataset.id = p.id; b.type = "button";
      b.style.background = p.color; b.title = p.name;
      b.onclick = () => set("palette", p.id);
      pr.appendChild(b);
    });
    const mo = $("inMusicOutput"); mo.innerHTML = "";
    ESM.MUSIC_OUTPUTS.forEach((o) => { const opt = document.createElement("option"); opt.value = o.id; opt.textContent = o.name; mo.appendChild(opt); });
    const rot = $("inBgRotate"); rot.innerHTML = "";
    ROTATIONS.forEach((r) => {
      const o = document.createElement("option");
      o.value = r.id; o.textContent = r.name; rot.appendChild(o);
    });
    const sl = $("stationList"); sl.innerHTML = "";
    STATIONS.forEach((s) => {
      const row = document.createElement("div");
      row.className = "st"; row.dataset.id = s.id; row.tabIndex = 0; row.setAttribute("role", "button");
      row.innerHTML = `<span class="st__dot"></span><span class="st__name">${esc(s.name)}</span><span class="st__genre">${esc(s.genre)}</span>`;
      const lb = document.createElement("button");
      lb.className = "st__listen"; lb.type = "button"; lb.title = "Listen here"; lb.textContent = "▶";
      lb.onclick = (e) => { e.stopPropagation(); toggleListen(s.id); };
      row.appendChild(lb);
      row.onclick = () => set("musicStation", s.id);
      row.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); set("musicStation", s.id); } };
      sl.appendChild(row);
    });

    // Generic inputs carry data-key="<config key>"
    document.querySelectorAll("[data-key]").forEach((el) => {
      const key = el.dataset.key;
      const handler = () => {
        if (el.type === "checkbox") set(key, el.checked);
        else if (el.type === "range") set(key, parseFloat(el.value));
        else set(key, el.value);
      };
      el.addEventListener(el.type === "range" ? "input" : "change", handler);
    });

    $("btnPush").onclick = push;
    $("btnDiscard").onclick = () => { draft = clone(live); previewing = null; render(); sendConfig(); };
    $("btnLoadServer").onclick = () => { draft = clone(live); previewing = null; $("serverNotice").hidden = true; render(); sendConfig(); };
    $("btnPrevBg").onclick = () => stepPreview(-1);
    $("btnNextBg").onclick = () => stepPreview(1);
    $("btnPinPreview").onclick = () => { if (previewing) pin(previewing); };
    $("btnWave").onclick = () => post({ type: "esm:wave" });
    $("tgNightPreview").onchange = (e) => post({ type: "esm:night", on: e.target.checked });
    $("btnTestToken").onclick = testToken;
    $("btnForget").onclick = () => { try { localStorage.removeItem(TOKEN_KEY); } catch {} $("inToken").value = ""; renderToken("Token forgotten on this device."); };
    $("btnCopy").onclick = () => {
      navigator.clipboard.writeText(JSON.stringify(ESM.pickConfig(draft), null, 2))
        .then(() => setPush("Config copied to the clipboard.", "ok", 2500), () => setPush("Clipboard unavailable here.", "warn", 2500));
    };
    $("inToken").value = localStorage.getItem(TOKEN_KEY) || "";
    renderToken();

    listen.addEventListener("error", () => {
      const st = ESM.findStation(listenId); const urls = ESM.stationUrls(st);
      if (listenUrlIdx < urls.length - 1) { listenUrlIdx++; listen.src = urls[listenUrlIdx]; listen.play().catch(() => {}); }
      else { stopListen(); setPush("Couldn't reach that stream from here.", "warn", 3000); }
    });
  }

  /* ---------- Gallery ---------- */
  function buildGallery() {
    const g = $("gallery"); g.innerHTML = "";
    CATEGORIES.forEach((cat) => {
      const items = slides.filter((s) => ESM.slideInfo(s).cat === cat.id);
      if (!items.length) return;
      const sec = document.createElement("section");
      sec.className = "gcat"; sec.dataset.cat = cat.id;
      sec.innerHTML = `<div class="gcat__head"><h3>${esc(cat.name)}</h3><small>${esc(cat.blurb)} · <span class="gcat__count"></span></small>
        <span class="gcat__btns"><button class="btn btn--tiny" type="button" data-all="1">All</button><button class="btn btn--tiny" type="button" data-all="0">None</button></span></div>`;
      sec.querySelectorAll("[data-all]").forEach((b) => { b.onclick = () => includeCategory(cat.id, b.dataset.all === "1"); });
      const tiles = document.createElement("div"); tiles.className = "tiles";
      items.forEach((src) => {
        const info = ESM.slideInfo(src);
        const t = document.createElement("div");
        t.className = "tile"; t.dataset.src = src; t.dataset.token = info.token; t.title = info.token;
        const img = document.createElement("img");
        img.loading = "lazy"; img.alt = info.name; img.src = ESM.thumbFor(src);
        img.onerror = () => { img.onerror = null; img.src = src; };
        const check = document.createElement("input");
        check.type = "checkbox"; check.className = "tile__check"; check.title = "In the rotation";
        check.onclick = (e) => { e.stopPropagation(); includeSlide(info.token, check.checked); };
        const name = document.createElement("span"); name.className = "tile__name"; name.textContent = info.name;
        const badge = document.createElement("span"); badge.className = "tile__badge"; badge.hidden = true;
        t.appendChild(img); t.appendChild(check); t.appendChild(badge); t.appendChild(name);
        t.onclick = () => previewBg(src);
        tiles.appendChild(t);
      });
      sec.appendChild(tiles);
      g.appendChild(sec);
    });
  }
  const included = () => ESM.effectiveSlides(slides, draft.bgSet);
  const includedSet = () => { const m = {}; included().forEach((s) => { m[ESM.slideToken(s)] = true; }); return m; };
  function includeSlide(token, on) {
    const cur = includedSet();
    if (on) cur[token] = true; else delete cur[token];
    setPlaylist(Object.keys(cur));
  }
  function includeCategory(cat, on) {
    const cur = includedSet();
    slides.forEach((s) => { const i = ESM.slideInfo(s); if (i.cat === cat) { if (on) cur[i.token] = true; else delete cur[i.token]; } });
    setPlaylist(Object.keys(cur));
  }
  function setPlaylist(tokens) {
    if (!tokens.length) { setPush("Keep at least one image in the rotation.", "warn", 2500); render(); return; }
    // Whole categories collapse to their id; everything ticked = no restriction.
    set("bgSet", ESM.compactPlaylist(slides, tokens));
  }
  function pin(src) {
    draft.bg = ESM.slideToken(src); draft.bgRotate = "off";
    previewing = null; onDraftChange();
  }
  function previewBg(src) {
    previewing = src;
    post({ type: "esm:bg", bg: ESM.slideToken(src) });
    render();
  }
  function stepPreview(dir) {
    const list = included();
    if (!list.length) return;
    const cur = previewing || currentDraftSlide();
    let i = list.indexOf(cur); if (i < 0) i = 0;
    previewBg(list[((i + dir) % list.length + list.length) % list.length]);
  }
  // The slide the draft config puts on screen right now (rotation or pin).
  function currentDraftSlide() { return slideFor(draft); }
  function slideFor(cfg) {
    const list = ESM.effectiveSlides(slides, cfg.bgSet);
    const pick = ESM.rotationPick(list.length, cfg.bgRotate);
    if (pick) return list[pick.index];
    const i = ESM.findSlide(slides, cfg.bg);
    return i >= 0 ? slides[i] : slides[0];
  }

  /* ---------- Draft changes ---------- */
  function set(key, value) {
    draft[key] = value;
    if (key === "bgRotate" && value === "off" && !draft.bg) draft.bg = ESM.slideToken(currentDraftSlide());
    if (key === "bgRotate") previewing = null;                       // show what the rotation would show
    if (key === "bgSet" && previewing && included().indexOf(previewing) < 0) previewing = null;
    onDraftChange();
  }
  function onDraftChange() { render(); sendConfig(); }

  /* ---------- Render ---------- */
  function render() {
    if (!draft) return;
    document.querySelectorAll("#styleGrid .opt").forEach((b) => b.classList.toggle("is-active", b.dataset.id === draft.style));
    document.querySelectorAll("#paletteRow .swatch").forEach((b) => b.classList.toggle("is-active", b.dataset.id === draft.palette));
    document.querySelectorAll("#stationList .st").forEach((b) => b.classList.toggle("is-active", b.dataset.id === draft.musicStation));
    document.querySelectorAll("[data-key]").forEach((el) => {
      const v = draft[el.dataset.key];
      if (el.type === "checkbox") el.checked = !!v;
      else if (v != null) el.value = v;
    });
    $("speedLabel").textContent = "· " + Number(draft.speed).toFixed(1) + "×";
    $("volLabel").textContent = "· " + Math.round(draft.musicVolume * 100) + "%";

    // gallery state
    const inc = includedSet();
    const liveSrc = live ? slideFor(live) : null;
    const draftSrc = currentDraftSlide();
    const shown = previewing || draftSrc;
    document.querySelectorAll("#gallery .tile").forEach((t) => {
      const src = t.dataset.src, token = t.dataset.token;
      t.classList.toggle("is-included", !!inc[token]);
      t.classList.toggle("is-previewing", src === shown);
      t.querySelector(".tile__check").checked = !!inc[token];
      const badge = t.querySelector(".tile__badge");
      if (draft.bgRotate === "off" && ESM.slideToken(draft.bg) === token) { badge.hidden = false; badge.textContent = "Pinned"; badge.className = "tile__badge tile__badge--pin"; }
      else if (src === liveSrc) { badge.hidden = false; badge.textContent = "On the TVs"; badge.className = "tile__badge"; }
      else badge.hidden = true;
    });
    document.querySelectorAll("#gallery .gcat").forEach((sec) => {
      const n = Array.from(sec.querySelectorAll(".tile")).filter((t) => inc[t.dataset.token]).length;
      sec.querySelector(".gcat__count").textContent = n + "/" + sec.querySelectorAll(".tile").length + " in rotation";
    });
    const list = included();
    const pick = ESM.rotationPick(list.length, draft.bgRotate);
    $("bgSummary").textContent = pick
      ? `${list.length} of ${slides.length} images in rotation · next change in ${fmtDur(pick.nextChangeMs)}`
      : `pinned to ${ESM.slideInfo(draft.bg || draftSrc).name}`;
    const shownInfo = ESM.slideInfo(shown || "");
    $("previewNow").textContent = shown ? `${shownInfo.name}${previewing ? " (previewing)" : pick ? " (what the TVs show now)" : " (pinned)"}` : "…";
    $("btnPinPreview").disabled = !previewing;

    // dirty state
    const dirty = isDirty();
    $("dirtyBadge").hidden = !dirty;
    $("btnDiscard").hidden = !dirty;
    $("btnPush").disabled = !dirty || pushing;
    document.title = (dirty ? "● " : "") + "ESM Screen · Remote";
  }
  function renderLive() {
    if (!live) return;
    const src = slideFor(live);
    const list = ESM.effectiveSlides(slides, live.bgSet);
    const pick = ESM.rotationPick(list.length, live.bgRotate);
    const rot = ROTATIONS.find((r) => r.id === live.bgRotate);
    const st = ESM.findStation(live.musicStation);
    const parts = [
      `<span class="dot"></span>On the TVs now: <b>${esc(ESM.slideInfo(src).name)}</b>` + (pick ? ` · changes in ${fmtDur(pick.nextChangeMs)} (${esc(rot ? rot.name.toLowerCase() : "")}, ${list.length} images)` : " · pinned"),
      live.music ? `music <b>${esc(st.name)}</b> at ${Math.round(live.musicVolume * 100)}%${live.musicOutput === "speakers" ? " on the speakers" : live.musicOutput === "both" ? " on TVs + speakers" : ""}` : "music off",
      live.schedule ? `on ${esc(live.onTime)}–${esc(live.offTime)}` : "always on",
    ];
    $("liveStatus").innerHTML = parts.join(" · ");
    if (version && version.builtAt) {
      const d = new Date(version.builtAt);
      $("buildInfo").textContent = `Build ${version.version || "?"} · published ${isNaN(d) ? version.builtAt : d.toLocaleString()}`;
    }
  }
  function renderToken(note) {
    const has = !!localStorage.getItem(TOKEN_KEY);
    $("tokenState").textContent = note || (has ? "Token saved on this device" : "No token yet — needed to push");
  }

  /* ---------- Preview iframe ---------- */
  function post(msg) { try { frame.contentWindow.postMessage(msg, "*"); } catch {} }
  function sendConfig() {
    if (!draft || !frameReady) return;
    post({ type: "esm:config", config: ESM.pickConfig(draft) });
    if (previewing) post({ type: "esm:bg", bg: ESM.slideToken(previewing) });
  }
  addEventListener("message", (e) => {
    const d = e.data || {};
    if (d.type !== "esm:state") return;
    if (!frameReady) { frameReady = true; sendConfig(); }
  });

  /* ---------- Listen here ---------- */
  function toggleListen(id) {
    if (listenId === id) { stopListen(); return; }
    listenId = id; listenUrlIdx = 0;
    listen.src = ESM.stationUrls(ESM.findStation(id))[0];
    listen.volume = Math.max(0.05, Math.min(1, draft.musicVolume));
    listen.play().catch(() => {});
    document.querySelectorAll("#stationList .st__listen").forEach((b) => b.classList.toggle("is-on", b.parentElement.dataset.id === id));
  }
  function stopListen() {
    listenId = null; listen.pause(); listen.removeAttribute("src"); listen.load();
    document.querySelectorAll("#stationList .st__listen").forEach((b) => b.classList.remove("is-on"));
  }

  /* ---------- Push ---------- */
  let pushTimer = null;
  function setPush(text, kind, autoHideMs) {
    const el = $("pushStatus");
    clearTimeout(pushTimer);
    el.hidden = !text; el.textContent = text; el.dataset.kind = kind || "";
    if (autoHideMs) pushTimer = setTimeout(() => { el.hidden = true; }, autoHideMs);
  }
  function getToken() {
    const t = ($("inToken").value || "").trim() || localStorage.getItem(TOKEN_KEY) || "";
    if (t) { try { localStorage.setItem(TOKEN_KEY, t); } catch {} }
    renderToken();
    return t;
  }
  async function testToken() {
    const token = getToken();
    if (!token) { setPush("Paste a token first.", "warn", 3000); $("inToken").focus(); return; }
    setPush("Checking the token…", "busy");
    try {
      const r = await fetch("https://api.github.com/repos/" + ESM.REPO + "/contents/config.json?ref=main&t=" + Date.now(),
        { headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" }, cache: "no-store" });
      if (r.ok) { setPush("Token works — it can read the repo. Writing is checked on the first push.", "ok", 6000); renderToken("Token saved and verified"); }
      else {
        let gh = ""; try { gh = (await r.json()).message || ""; } catch {}
        if (r.status === 401) { try { localStorage.removeItem(TOKEN_KEY); } catch {} renderToken(); }
        setPush(ESM.explainGithub(r.status, "read config.json", gh), "error");
      }
    } catch { setPush("Couldn't reach GitHub — check the connection.", "error"); }
  }
  async function push() {
    if (pushing || !isDirty()) return;
    const token = getToken();
    if (!token) { setPush("Add a GitHub token in Connection (bottom of the page) to push.", "warn"); $("inToken").focus(); $("inToken").scrollIntoView({ block: "center", behavior: "smooth" }); return; }
    pushing = true; render();
    setPush("Pushing to GitHub…", "busy");
    const cfg = ESM.pickConfig(draft);
    const res = await ESM.pushConfig(token, cfg, "Update screen config from the remote");
    if (!res.ok) {
      if (res.status === 401) { try { localStorage.removeItem(TOKEN_KEY); } catch {} renderToken(); }
      setPush(res.message, "error");
      pushing = false; render(); return;
    }
    $("serverNotice").hidden = true;
    setPush("Pushed ✓ — GitHub Pages is publishing it (usually 1–2 minutes)…", "busy");
    const ok = await ESM.waitForDeploy(cfg, { onTick: (s) => setPush(`Pushed ✓ — publishing… ${s}s. The TVs pick it up within 30 s of that.`, "busy") });
    if (ok) {
      live = withDefaults(ESM.normalizeConfig(cfg));
      setPush("Live ✓ — every screen follows within 30 seconds.", "ok", 8000);
    } else {
      setPush("Pushed, but the publish is taking unusually long. Check the deploys link below; the TVs will follow once it lands.", "warn");
    }
    pushing = false; render(); renderLive();
  }

  /* ---------- Boot ---------- */
  loadAll();
  setInterval(pollLive, 60000);
  setInterval(() => { render(); renderLive(); }, 30000);   // "next change in…" stays honest
})();

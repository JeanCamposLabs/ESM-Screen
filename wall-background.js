/* Credential-free, fixed-origin Scale OS wall-background projection client. */
(function (global) {
  "use strict";

  const ORIGIN = "https://responseslatracker-eu.onrender.com";
  const FEED_URL = ORIGIN + "/wall-background/display.json";
  const IMAGE_PATH = "/wall-background/display-image";
  const MAX_BYTES = 32 * 1024;
  const SLOT_MS = 180000;
  const FIELDS = ["activatedAt", "browserAudio", "images", "output", "revision", "revisionOffset", "schedule", "slotMs", "source", "v"];
  const IMAGE_FIELDS = ["id", "version"];
  const SCHEDULE_FIELDS = ["off", "on", "timezone"];

  function exactKeys(value, expected) {
    return value && typeof value === "object" && !Array.isArray(value) &&
      Object.keys(value).sort().join("\n") === expected.slice().sort().join("\n");
  }
  function opaque(value) {
    return typeof value === "string" && /^[a-f0-9]{32}$/.test(value);
  }
  function instant(value) {
    if (typeof value !== "string" ||
        !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value)) return null;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) && parsed % SLOT_MS === 0 ? parsed : null;
  }
  function validate(value) {
    if (!exactKeys(value, FIELDS) || value.v !== 1 ||
        !Number.isSafeInteger(value.revision) || value.revision < 1 ||
        (value.source !== "selected-library" && value.source !== "bundled-fallback") ||
        value.slotMs !== SLOT_MS || instant(value.activatedAt) == null ||
        !Number.isSafeInteger(value.revisionOffset) || value.revisionOffset < 0 ||
        value.browserAudio !== false || value.output !== "cast-group") return null;
    if (!exactKeys(value.schedule, SCHEDULE_FIELDS) ||
        value.schedule.timezone !== "Europe/Amsterdam" ||
        value.schedule.on !== "07:00" || value.schedule.off !== "23:00") return null;
    if (!Array.isArray(value.images) || value.images.length > 40 ||
        (value.source === "selected-library" && value.images.length === 0) ||
        (value.source === "bundled-fallback" && value.images.length !== 0)) return null;
    for (const image of value.images) {
      if (!exactKeys(image, IMAGE_FIELDS) || !opaque(image.id) || !opaque(image.version)) return null;
    }
    return value;
  }
  function imageUrl(image) {
    if (!exactKeys(image, IMAGE_FIELDS) || !opaque(image.id) || !opaque(image.version)) return null;
    return ORIGIN + IMAGE_PATH + "?id=" + encodeURIComponent(image.id) + "&v=" + encodeURIComponent(image.version);
  }
  function pick(feed, nowMs) {
    const valid = validate(feed);
    const now = nowMs == null ? Date.now() : Number(nowMs);
    if (!valid || valid.source !== "selected-library" || !Number.isFinite(now)) return null;
    const activatedAt = instant(valid.activatedAt);
    if (now < activatedAt) return null;
    const slot = Math.floor((now - activatedAt) / valid.slotMs);
    const index = ((slot + valid.revisionOffset) % valid.images.length + valid.images.length) % valid.images.length;
    return {
      image: valid.images[index],
      index,
      slot,
      nextBoundaryMs: activatedAt + (slot + 1) * valid.slotMs,
      url: imageUrl(valid.images[index])
    };
  }
  function bundledPick(count, nowMs) {
    const total = Number(count);
    const now = nowMs == null ? Date.now() : Number(nowMs);
    if (!Number.isSafeInteger(total) || total < 1 || !Number.isFinite(now)) return null;
    const slot = Math.floor(now / SLOT_MS);
    return {
      index: ((slot % total) + total) % total,
      slot,
      nextBoundaryMs: (slot + 1) * SLOT_MS
    };
  }
  function amsterdamParts(nowMs) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date(nowMs == null ? Date.now() : nowMs));
    const out = {};
    parts.forEach(function (part) { out[part.type] = part.value; });
    return { hour: Number(out.hour), minute: Number(out.minute) };
  }
  function isDaytime(nowMs) {
    const parts = amsterdamParts(nowMs);
    const minute = parts.hour * 60 + parts.minute;
    return minute >= 7 * 60 && minute < 23 * 60;
  }
  function utf8Bytes(text) {
    try { return unescape(encodeURIComponent(text)).length; } catch (_) { return Infinity; }
  }

  class Client {
    constructor(fetchImpl) {
      this.fetchImpl = fetchImpl || global.fetch.bind(global);
      this.etag = null;
      this.feed = null;
      this.pending = null;
    }
    current(nowMs) {
      const now = nowMs == null ? Date.now() : Number(nowMs);
      if (this.pending && Number.isFinite(now) && now >= instant(this.pending.activatedAt)) {
        this.feed = this.pending;
        this.pending = null;
      }
      return this.feed;
    }
    clear() {
      this.etag = null;
      this.feed = null;
      this.pending = null;
    }
    async refresh(nowMs) {
      const headers = this.etag ? { "If-None-Match": this.etag } : {};
      const response = await this.fetchImpl(FEED_URL, {
        credentials: "omit",
        cache: "no-cache",
        headers
      });
      if (response.status === 304) return this.current(nowMs);
      if (!response.ok) throw new Error("display feed " + response.status);
      const length = Number(response.headers.get("content-length"));
      if (Number.isFinite(length) && length > MAX_BYTES) throw new Error("display feed too large");
      const text = await response.text();
      if (utf8Bytes(text) > MAX_BYTES) throw new Error("display feed too large");
      let parsed;
      try { parsed = JSON.parse(text); } catch (_) { throw new Error("invalid display JSON"); }
      const valid = validate(parsed);
      if (!valid) throw new Error("invalid display schema");
      this.etag = response.headers.get("etag") || null;
      const now = nowMs == null ? Date.now() : Number(nowMs);
      if (Number.isFinite(now) && now < instant(valid.activatedAt)) this.pending = valid;
      else { this.feed = valid; this.pending = null; }
      return this.current(now);
    }
  }

  const api = { ORIGIN, FEED_URL, IMAGE_PATH, MAX_BYTES, SLOT_MS, validate, imageUrl, pick, bundledPick, amsterdamParts, isDaytime, Client };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.ESMWallBackground = api;
})(typeof window !== "undefined" ? window : globalThis);

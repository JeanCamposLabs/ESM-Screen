/* Credential-free, fixed-origin Scale OS wall-background projection client. */
(function (global) {
  "use strict";

  const ORIGIN = "https://responseslatracker-eu.onrender.com";
  const FEED_URL = ORIGIN + "/wall-background/display.json";
  const IMAGE_PATH = "/wall-background/display-image";
  const MAX_BYTES = 32 * 1024;
  const MAX_HOLIDAYS = 512;
  const SLOT_MS = 180000;           // the Scale OS feed's slot: part of its validated contract
  const BUNDLED_SLOT_MS = 300000;   // the bundled fallback's own pace: 5 min, so ~190 slides fill a 16 h day
  const FIELDS = ["activatedAt", "browserAudio", "images", "output", "revision", "revisionOffset", "schedule", "slotMs", "source", "v"];
  const IMAGE_FIELDS = ["id", "version"];
  const SCHEDULE_FIELDS = ["off", "on", "timezone"];
  const SCHEDULE_HOLIDAY_FIELDS = ["holidays", "off", "on", "timezone"];
  const WEEKDAYS = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

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
  function calendarDate(value) {
    if (typeof value !== "string") return false;
    const match = /^(\d{4})-(\d\d)-(\d\d)$/.exec(value);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1) return false;
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return day <= days[month - 1];
  }
  function validateSchedule(schedule) {
    const hasHolidays = exactKeys(schedule, SCHEDULE_HOLIDAY_FIELDS);
    if ((!hasHolidays && !exactKeys(schedule, SCHEDULE_FIELDS)) ||
        schedule.timezone !== "Europe/Amsterdam" ||
        schedule.on !== "07:00" || schedule.off !== "23:00") return null;
    if (hasHolidays && (!Array.isArray(schedule.holidays) || schedule.holidays.length > MAX_HOLIDAYS ||
        !schedule.holidays.every(calendarDate))) return null;
    return schedule;
  }
  function validate(value) {
    if (!exactKeys(value, FIELDS) || value.v !== 1 ||
        !Number.isSafeInteger(value.revision) || value.revision < 1 ||
        (value.source !== "selected-library" && value.source !== "bundled-fallback") ||
        value.slotMs !== SLOT_MS || instant(value.activatedAt) == null ||
        !Number.isSafeInteger(value.revisionOffset) || value.revisionOffset < 0 ||
        value.browserAudio !== false || value.output !== "cast-group") return null;
    if (!validateSchedule(value.schedule)) return null;
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
  // Deterministic shuffle (mulberry32 + Fisher-Yates): every TV computes the same
  // order from the same seed, so they still switch together.
  function shuffledOrder(n, seed) {
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
  // Bundled fallback: walk the slides in an order reshuffled once per UTC day
  // (the change lands at 01:00/02:00 Amsterdam, while the screens are off), one
  // slide per BUNDLED_SLOT_MS. Within a day no slide repeats until all have shown.
  function bundledPick(count, nowMs) {
    const total = Number(count);
    const now = nowMs == null ? Date.now() : Number(nowMs);
    if (!Number.isSafeInteger(total) || total < 1 || !Number.isFinite(now)) return null;
    const slot = Math.floor(now / BUNDLED_SLOT_MS);
    const day = Math.floor(now / 86400000);
    const order = shuffledOrder(total, day * 2654435761);
    return {
      index: order[((slot % total) + total) % total],
      slot,
      nextBoundaryMs: (slot + 1) * BUNDLED_SLOT_MS
    };
  }
  function amsterdamParts(nowMs) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit",
      weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date(nowMs == null ? Date.now() : nowMs));
    const out = {};
    parts.forEach(function (part) { out[part.type] = part.value; });
    return {
      year: Number(out.year), month: Number(out.month), day: Number(out.day),
      weekday: WEEKDAYS[out.weekday], hour: Number(out.hour), minute: Number(out.minute)
    };
  }
  function dateKey(year, month, day) {
    function two(value) { return value < 10 ? "0" + value : String(value); }
    return String(year) + "-" + two(month) + "-" + two(day);
  }
  function easterSunday(year) {
    const y = Number(year);
    if (!Number.isSafeInteger(y) || y < 1583 || y > 9999) return null;
    const a = y % 19;
    const b = Math.floor(y / 100);
    const c = y % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    return { year: y, month, day: (h + l - 7 * m + 114) % 31 + 1 };
  }
  function shiftedDateKey(date, days) {
    const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
    return dateKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
  }
  function dutchPublicHolidays(year) {
    const y = Number(year);
    const easter = easterSunday(y);
    if (!easter) return [];
    const april27 = new Date(Date.UTC(y, 3, 27));
    const kingsDay = april27.getUTCDay() === 0 ? dateKey(y, 4, 26) : dateKey(y, 4, 27);
    return [
      dateKey(y, 1, 1), shiftedDateKey(easter, -2), shiftedDateKey(easter, 0),
      shiftedDateKey(easter, 1), kingsDay, dateKey(y, 5, 5),
      shiftedDateKey(easter, 39), shiftedDateKey(easter, 49), shiftedDateKey(easter, 50),
      dateKey(y, 12, 25), dateKey(y, 12, 26)
    ];
  }
  function isDutchPublicHoliday(parts) {
    if (!parts || !Number.isSafeInteger(parts.year) || !Number.isSafeInteger(parts.month) ||
        !Number.isSafeInteger(parts.day)) return false;
    return dutchPublicHolidays(parts.year).indexOf(dateKey(parts.year, parts.month, parts.day)) !== -1;
  }
  function isOfficeActive(nowMs, schedule) {
    const parts = amsterdamParts(nowMs);
    const minute = parts.hour * 60 + parts.minute;
    const validSchedule = validateSchedule(schedule);
    const wallHoliday = validSchedule && Array.isArray(validSchedule.holidays) &&
      validSchedule.holidays.indexOf(dateKey(parts.year, parts.month, parts.day)) !== -1;
    return parts.weekday >= 1 && parts.weekday <= 6 && !isDutchPublicHoliday(parts) &&
      !wallHoliday && minute >= 7 * 60 && minute < 23 * 60;
  }
  const isDaytime = isOfficeActive;
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

  const api = { ORIGIN, FEED_URL, IMAGE_PATH, MAX_BYTES, MAX_HOLIDAYS, SLOT_MS, BUNDLED_SLOT_MS, validate, validateSchedule,
    imageUrl, pick, bundledPick,
    amsterdamParts, easterSunday, dutchPublicHolidays, isDutchPublicHoliday, isOfficeActive, isDaytime, Client };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.ESMWallBackground = api;
})(typeof window !== "undefined" ? window : globalThis);

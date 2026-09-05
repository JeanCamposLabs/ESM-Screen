"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const wall = require("../wall-background");

const ID = "a".repeat(32);
const VERSION = "b".repeat(32);
function projection(overrides) {
  return {
    v: 1,
    revision: 3,
    source: "selected-library",
    images: [{ id: ID, version: VERSION }],
    slotMs: 180000,
    activatedAt: "2026-09-03T10:03:00.000Z",
    revisionOffset: 2,
    schedule: { timezone: "Europe/Amsterdam", on: "07:00", off: "23:00" },
    browserAudio: false,
    output: "cast-group",
    ...(overrides || {})
  };
}
function headers(values) {
  const map = Object.fromEntries(Object.entries(values || {}).map(([key, value]) => [key.toLowerCase(), value]));
  return { get: (key) => map[String(key).toLowerCase()] || null };
}
function response(body, options) {
  const config = options || {};
  return {
    ok: config.ok !== false,
    status: config.status == null ? 200 : config.status,
    headers: headers(config.headers),
    text: async () => body
  };
}

test("strict projection accepts only the narrow fixed contract", () => {
  assert.equal(wall.validate(projection()).revision, 3);
  assert.deepEqual(wall.validate(projection({ schedule: {
    timezone: "Europe/Amsterdam", on: "07:00", off: "23:00", holidays: ["2026-09-08"]
  } })).schedule.holidays, ["2026-09-08"]);
  assert.equal(wall.validate({ ...projection(), url: "https://evil.test/x" }), null);
  assert.equal(wall.validate(projection({ images: [{ id: "https://evil.test", version: VERSION }] })), null);
  assert.equal(wall.validate(projection({ schedule: { timezone: "UTC", on: "07:00", off: "23:00" } })), null);
  assert.equal(wall.validate(projection({ schedule: {
    timezone: "Europe/Amsterdam", on: "07:00", off: "23:00", surprise: []
  } })), null);
  assert.equal(wall.validate(projection({ browserAudio: true })), null);
  assert.equal(wall.validate(projection({ source: "bundled-fallback", images: [] })).source, "bundled-fallback");
  assert.equal(wall.validate(projection({ source: "bundled-fallback" })), null);
});

test("Wall Controls holidays are valid calendar dates and bounded", () => {
  const schedule = (holidays) => ({ timezone: "Europe/Amsterdam", on: "07:00", off: "23:00", holidays });
  assert.ok(wall.validateSchedule(schedule([])));
  assert.ok(wall.validateSchedule(schedule(Array(wall.MAX_HOLIDAYS).fill("2026-09-08"))));
  assert.equal(wall.validateSchedule(schedule(Array(wall.MAX_HOLIDAYS + 1).fill("2026-09-08"))), null);
  for (const invalid of ["2026-9-08", "2026-02-29", "2026-04-31", "not-a-date", 20260908]) {
    assert.equal(wall.validateSchedule(schedule([invalid])), null);
  }
  assert.ok(wall.validateSchedule(schedule(["2028-02-29"])));
});

test("image URLs are constructed only from fixed origin and opaque descriptors", () => {
  assert.equal(wall.imageUrl({ id: ID, version: VERSION }),
    wall.ORIGIN + "/wall-background/display-image?id=" + ID + "&v=" + VERSION);
  assert.equal(wall.imageUrl({ id: ID, version: "https://evil.test" }), null);
  assert.equal(wall.imageUrl({ id: ID, version: VERSION, url: "https://evil.test" }), null);
});

test("selection activates and advances on exact common UTC boundaries", () => {
  const feed = projection();
  const activation = Date.parse(feed.activatedAt);
  assert.equal(wall.pick(feed, activation - 1), null);
  assert.equal(wall.pick(feed, activation).slot, 0);
  assert.equal(wall.pick(feed, activation + feed.slotMs - 1).slot, 0);
  assert.equal(wall.pick(feed, activation + feed.slotMs).slot, 1);
  const two = projection({ images: [{ id: ID, version: VERSION }, { id: "c".repeat(32), version: "d".repeat(32) }] });
  assert.notEqual(wall.pick(two, activation).index, wall.pick({ ...two, revisionOffset: 3 }, activation).index);
});

test("bundled fallback is deterministic on the same UTC clock", () => {
  const boundary = Date.parse("2026-09-03T10:03:00.000Z");
  const one = wall.bundledPick(12, boundary);
  const two = wall.bundledPick(12, boundary);
  assert.deepEqual(one, two);
  assert.equal(wall.bundledPick(12, boundary + wall.SLOT_MS).slot, one.slot + 1);
  assert.equal(wall.bundledPick(0, boundary), null);
});

test("client omits credentials, revalidates by ETag and promotes pending revisions", async () => {
  const first = projection({ activatedAt: "2026-09-03T10:00:00.000Z" });
  const future = projection({ revision: 4, revisionOffset: 3, activatedAt: "2026-09-03T10:06:00.000Z" });
  const calls = [];
  const replies = [
    response(JSON.stringify(first), { headers: { etag: '"one"' } }),
    response(JSON.stringify(future), { headers: { etag: '"two"' } }),
    response("", { status: 304, ok: false })
  ];
  const client = new wall.Client(async (url, options) => {
    calls.push({ url, options });
    return replies.shift();
  });
  assert.equal((await client.refresh(Date.parse("2026-09-03T10:01:00Z"))).revision, 3);
  assert.equal((await client.refresh(Date.parse("2026-09-03T10:04:00Z"))).revision, 3);
  assert.equal(client.current(Date.parse("2026-09-03T10:06:00Z")).revision, 4);
  assert.equal((await client.refresh(Date.parse("2026-09-03T10:07:00Z"))).revision, 4);
  assert.equal(calls[0].url, wall.FEED_URL);
  assert.equal(calls[0].options.credentials, "omit");
  assert.equal(calls[0].options.cache, "no-cache");
  assert.equal(calls[2].options.headers["If-None-Match"], '"two"');
  client.clear();
  assert.equal(client.current(), null);
});

test("client rejects oversized bodies and malformed JSON", async () => {
  const tooLarge = new wall.Client(async () => response("", { headers: { "content-length": String(wall.MAX_BYTES + 1) } }));
  await assert.rejects(tooLarge.refresh(), /too large/);
  const malformed = new wall.Client(async () => response("{"));
  await assert.rejects(malformed.refresh(), /invalid display JSON/);
  const multibyte = new wall.Client(async () => response('"€'.repeat(12000) + '"'));
  await assert.rejects(multibyte.refresh(), /too large/);
});

test("Dutch public holidays are exact for 2026 and 2027", () => {
  assert.deepEqual(wall.dutchPublicHolidays(2026), [
    "2026-01-01", "2026-04-03", "2026-04-05", "2026-04-06", "2026-04-27",
    "2026-05-05", "2026-05-14", "2026-05-24", "2026-05-25", "2026-12-25", "2026-12-26"
  ]);
  assert.deepEqual(wall.dutchPublicHolidays(2027), [
    "2027-01-01", "2027-03-26", "2027-03-28", "2027-03-29", "2027-04-27",
    "2027-05-05", "2027-05-06", "2027-05-16", "2027-05-17", "2027-12-25", "2027-12-26"
  ]);
  assert.deepEqual(wall.easterSunday(2026), { year: 2026, month: 4, day: 5 });
  assert.deepEqual(wall.easterSunday(2027), { year: 2027, month: 3, day: 28 });
  assert.equal(wall.dutchPublicHolidays(2025).includes("2025-04-26"), true);
  assert.equal(wall.dutchPublicHolidays(2025).includes("2025-04-27"), false);
});

test("Amsterdam calendar parts come from the local timezone across DST", () => {
  assert.deepEqual(wall.amsterdamParts(Date.parse("2026-03-29T00:30:00Z")),
    { year: 2026, month: 3, day: 29, weekday: 7, hour: 1, minute: 30 });
  assert.deepEqual(wall.amsterdamParts(Date.parse("2026-03-29T01:30:00Z")),
    { year: 2026, month: 3, day: 29, weekday: 7, hour: 3, minute: 30 });
  assert.deepEqual(wall.amsterdamParts(Date.parse("2026-10-25T01:30:00Z")),
    { year: 2026, month: 10, day: 25, weekday: 7, hour: 2, minute: 30 });
});

test("office schedule includes weekdays and Saturday but excludes Sunday and holidays", () => {
  assert.equal(wall.isOfficeActive(Date.parse("2026-09-07T10:00:00Z")), true); // Monday
  assert.equal(wall.isOfficeActive(Date.parse("2026-09-11T10:00:00Z")), true); // Friday
  assert.equal(wall.isOfficeActive(Date.parse("2026-09-12T10:00:00Z")), true); // Saturday
  assert.equal(wall.isOfficeActive(Date.parse("2026-09-13T10:00:00Z")), false); // Sunday
  assert.equal(wall.isOfficeActive(Date.parse("2026-04-27T10:00:00Z")), false); // King's Day
  assert.equal(wall.isOfficeActive(Date.parse("2027-05-06T10:00:00Z")), false); // Ascension Day
});

test("Wall Controls holiday dates supplement deterministic local closures", () => {
  const schedule = { timezone: "Europe/Amsterdam", on: "07:00", off: "23:00", holidays: ["2026-09-08"] };
  assert.equal(wall.isOfficeActive(Date.parse("2026-09-08T10:00:00Z")), true);
  assert.equal(wall.isOfficeActive(Date.parse("2026-09-08T10:00:00Z"), schedule), false);
  assert.equal(wall.isOfficeActive(Date.parse("2026-04-27T10:00:00Z"), {
    timezone: "Europe/Amsterdam", on: "07:00", off: "23:00"
  }), false);
});

test("app wires only the active feed schedule into the office-active decision", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /activeFeed\s*=\s*wallClient\.current\(Date\.now\(\)\)/);
  assert.match(app, /isDaytime\(Date\.now\(\), activeSchedule\)/);
});

test("office hours remain 07:00 inclusive and 23:00 exclusive across CET and CEST", () => {
  assert.equal(wall.isOfficeActive(Date.parse("2026-01-15T05:59:00Z")), false);
  assert.equal(wall.isOfficeActive(Date.parse("2026-01-15T06:00:00Z")), true);
  assert.equal(wall.isOfficeActive(Date.parse("2026-01-15T21:59:00Z")), true);
  assert.equal(wall.isOfficeActive(Date.parse("2026-01-15T22:00:00Z")), false);
  assert.equal(wall.isOfficeActive(Date.parse("2026-07-15T04:59:00Z")), false);
  assert.equal(wall.isOfficeActive(Date.parse("2026-07-15T05:00:00Z")), true);
  assert.equal(wall.isOfficeActive(Date.parse("2026-07-15T20:59:00Z")), true);
  assert.equal(wall.isOfficeActive(Date.parse("2026-07-15T21:00:00Z")), false);
});

test("repository retires PAT writes and published admin assets; audio starts from script and self-heals", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const remote = fs.readFileSync(path.join(root, "remote.html"), "utf8");
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/deploy-pages.yml"), "utf8");
  const active = [app, html, remote, workflow, fs.readFileSync(path.join(root, "shared.js"), "utf8")].join("\n");
  assert.doesNotMatch(active, /esm-screen\.ghtoken|api\.github\.com\/repos|Authorization:\s*Bearer|localStorage/);
  // Audio is started from script, never the `autoplay` attribute: the page must
  // be able to tell a browser that refused (wait for a click) from a stream that
  // died (reconnect, then fall back), and the logo must remain a start button.
  assert.match(html, /<audio\b[^>]*id="bgAudio"/i);
  assert.doesNotMatch(html, /<audio\b[^>]*\bautoplay\b/i);
  assert.match(app, /function tryAutoplay\(\)/);
  assert.match(app, /NotAllowedError/);
  assert.match(app, /function logoPress\(\)\s*\{[^}]*startMusic\(\)/);
  assert.match(app, /function watchdog\(\)/);
  assert.match(app, /function reconnect\(\)/);
  assert.match(app, /function probeIntended\(\)/);
  assert.match(remote, /public screen remote has retired/i);
  assert.doesNotMatch(workflow, /cp .*remote\.(?:js|css)|cp .*config\.json/);
  assert.match(workflow, /actions\/deploy-pages/);
});

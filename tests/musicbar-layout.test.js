"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");

const ROOT = path.join(__dirname, "..");
const CSS = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
const FIXTURE = path.join(__dirname, "musicbar-layout.fixture.html");

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = CSS.match(new RegExp("(?:^|\\n)\\s*" + escaped + "\\s*\\{([^}]+)\\}"));
  assert.ok(match, `missing CSS rule for ${selector}`);
  return match[1].replace(/\s+/g, " ").trim();
}

function safeLayout(width, height) {
  const inset = Math.max(Math.min(width, height) * 0.06, width * 0.04);
  return { inset, availableWidth: width - (2 * inset) };
}

test("music control statically pins the TV-safe CSS contract", () => {
  const corner = rule(".corner");
  assert.match(corner, /--corner-safe-right:\s*max\(6vmin, 4vw, env\(safe-area-inset-right, 0px\)\)/);
  assert.match(corner, /right:\s*var\(--corner-safe-right\)/);
  assert.match(corner, /width:\s*max-content/);
  assert.match(corner, /max-width:\s*calc\(100vw - var\(--corner-safe-right\) - var\(--corner-safe-right\)\)/);

  const bar = rule(".musicbar");
  assert.match(bar, /position:\s*relative/);
  assert.match(bar, /flex:\s*none/);
  assert.match(bar, /min-width:\s*0/);
  assert.match(bar, /max-width:\s*100%/);
  assert.match(bar, /box-sizing:\s*border-box/);

  const state = rule(".musicbar__state");
  assert.match(state, /min-width:\s*0/);
  assert.match(state, /max-width:\s*100%/);
  assert.match(state, /overflow:\s*hidden/);
  assert.match(state, /text-overflow:\s*ellipsis/);
  assert.match(state, /white-space:\s*nowrap/);
});

test("safe insets are deterministic at both supported TV resolutions", () => {
  assert.deepEqual(safeLayout(1920, 1080), { inset: 76.8, availableWidth: 1766.4 });
  assert.deepEqual(safeLayout(1280, 720), { inset: 51.2, availableWidth: 1177.6 });
});

test("layout fixture keeps the clock hidden and supplies an overflow label", () => {
  const html = fs.readFileSync(FIXTURE, "utf8");
  assert.match(html, /class="corner"/);
  assert.match(html, /class="musicbar"/);
  assert.match(html, /class="musicbar__state"/);
  assert.match(html, /class="clock"[^>]*hidden/);
  assert.match(html, /deliberately long station label/);
});

test("optional Chrome geometry remains within the computed safe area", {
  skip: !process.env.CHROME_BIN && "set CHROME_BIN explicitly to run browser geometry"
}, () => {
  for (const [width, height] of [[1920, 1080], [1280, 720]]) {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), "musicbar-layout-"));
    try {
      const html = execFileSync(process.env.CHROME_BIN, [
        "--headless=new", "--disable-gpu", "--no-sandbox", "--allow-file-access-from-files",
        `--user-data-dir=${profile}`, `--window-size=${width},${height}`, "--dump-dom",
        pathToFileURL(FIXTURE).href
      ], { encoding: "utf8" });
      const encoded = html.match(/<output id="geometry" hidden="">([^<]+)<\/output>/);
      assert.ok(encoded, "Chrome fixture did not emit geometry");
      const geometry = JSON.parse(encoded[1].replace(/&quot;/g, "\"").replace(/&amp;/g, "&"));
      const expected = safeLayout(geometry.viewport.width, geometry.viewport.height);
      assert.ok(Math.abs((geometry.viewport.width - geometry.corner.right) - expected.inset) < 0.6);
      assert.ok(geometry.corner.width <= expected.availableWidth + 0.6);
      assert.ok(geometry.bar.left >= expected.inset - 0.6);
      assert.ok(geometry.bar.right <= geometry.viewport.width - expected.inset + 0.6);
    } finally {
      fs.rmSync(profile, { recursive: true, force: true });
    }
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { loadCore } from "./load-core.mjs";

var ZK = loadCore();
function fixture(name) {
  return fs.readFileSync(fileURLToPath(new URL("./fixtures/" + name, import.meta.url)), "utf8");
}

test("decodeEntities decodes named and numeric entities", function () {
  assert.equal(ZK.decodeEntities("A&nbsp;&amp;&#269;&#x161;"), "A &čš");
});

test("decodeEntities decodes typographic named entities", function () {
  assert.equal(ZK.decodeEntities("a&ndash;b&mdash;c&hellip;"), "a–b—c…");
  assert.equal(ZK.decodeEntities("&bdquo;x&ldquo; &lsquo;y&rsquo; &sbquo; &rdquo;"), "„x“ ‘y’ ‚ ”");
  assert.equal(ZK.decodeEntities("&laquo;a&raquo; 2&times;3 5&euro;"), "«a» 2×3 5€");
  assert.equal(ZK.decodeEntities("pro&shy;tože"), "protože");
});

test("decodeEntities is single-pass (no double decoding)", function () {
  assert.equal(ZK.decodeEntities("&#38;lt;"), "&lt;");
  assert.equal(ZK.decodeEntities("&amp;lt;"), "&lt;");
});

test("decodeEntities does not throw on out-of-range code points", function () {
  assert.doesNotThrow(function () { ZK.decodeEntities("a&#99999999;b&#x110000;c"); });
  assert.equal(ZK.decodeEntities("a&#99999999;b&#x110000;c"), "a�b�c");
  var xml = "<rss><item><title>T&#99999999;</title><link>https://a.cz/1</link></item></rss>";
  assert.equal(ZK.parseRss(xml, "X").length, 1);
});

test("stripTags removes CDATA, tags and entities", function () {
  assert.equal(ZK.stripTags("<![CDATA[<p>Ahoj&nbsp;<b>světe</b></p>]]>"), "Ahoj světe");
});

test("safeUrl accepts only https", function () {
  assert.equal(ZK.safeUrl("https://a.cz/x"), "https://a.cz/x");
  assert.equal(ZK.safeUrl("http://a.cz"), null);
  assert.equal(ZK.safeUrl("javascript:alert(1)"), null);
  assert.equal(ZK.safeUrl(null), null);
});

test("parseRss: iROZHLAS (enclosure image, no category)", function () {
  var items = ZK.parseRss(fixture("irozhlas.xml"), "iROZHLAS");
  assert.equal(items.length, 3);
  items.forEach(function (a) {
    assert.ok(a.image.startsWith("https://www.irozhlas.cz/"));
    assert.equal(a.category, null);
    assert.equal(typeof a.date, "number");
    assert.equal(a.source, "iROZHLAS");
    assert.equal(a.id, a.link);
  });
});

test("parseRss: ČT24 (no image, category, sanitized titles)", function () {
  var items = ZK.parseRss(fixture("ct24.xml"), "ČT24");
  assert.equal(items.length, 4);
  items.forEach(function (a) { assert.equal(a.image, null); });
  assert.ok(items[0].category && items[0].category.length > 0);
  items.forEach(function (a) {
    assert.ok(a.perex.indexOf("&nbsp;") < 0);
    assert.ok(a.perex.indexOf("<") < 0);
  });
  assert.equal(items[3].date, null);
  assert.equal(items[3].title, "Test & titulek");
});

test("parseRss: iDNES (media:content image)", function () {
  var items = ZK.parseRss(fixture("idnes.xml"), "iDNES");
  assert.equal(items.length, 3);
  items.forEach(function (a) { assert.ok(a.image.startsWith("https://1gr.cz/")); });
});

test("parseRss: empty or invalid input gives []", function () {
  // length check: arrays from the vm context have a different prototype, so deepEqual (strict) would fail
  assert.equal(ZK.parseRss("<rss></rss>", "X").length, 0);
  assert.equal(ZK.parseRss("nesmysl", "X").length, 0);
});

function art(link, date) {
  return { id: link, title: "t", link: link, perex: "", image: null, category: "", date: date, source: "X" };
}

test("mergeArticles: dedupes by link, sorts desc, null last", function () {
  var a10 = art("l10", 10);
  var res = ZK.mergeArticles([[a10, art("lnull", null)], [art("l30", 30), art("l10", 10)]]);
  assert.equal(res.length, 3);
  assert.equal(JSON.stringify(Array.from(res).map(function (x) { return x.date; })), "[30,10,null]");
});

test("relTime: relative and absolute formats", function () {
  var now = new Date(2026, 10, 13, 15, 42).getTime();
  assert.equal(ZK.relTime(now - 30e3, now), "právě teď");
  assert.equal(ZK.relTime(now - 12 * 60e3, now), "před 12 min");
  assert.equal(ZK.relTime(now - 5 * 3600e3, now), "před 5 h");
  assert.equal(ZK.relTime(new Date(2026, 10, 10, 9, 5).getTime(), now), "10. 11. 09:05");
  assert.equal(ZK.relTime(null, now), "");
});

test("relTime: unit boundaries", function () {
  var now = new Date(2026, 10, 13, 15, 42).getTime();
  assert.equal(ZK.relTime(now - 59e3, now), "právě teď");
  assert.equal(ZK.relTime(now - 60e3, now), "před 1 min");
  assert.equal(ZK.relTime(now - 59 * 60e3, now), "před 59 min");
  assert.equal(ZK.relTime(now - 60 * 60e3, now), "před 1 h");
  assert.equal(ZK.relTime(now - (23 * 60 + 59) * 60e3, now), "před 23 h");
  assert.equal(ZK.relTime(now - 24 * 3600e3, now), "12. 11. 15:42");
});

test("formatClock: weekday, date and zero-padded time", function () {
  assert.equal(ZK.formatClock(new Date(2026, 10, 13, 15, 42)), "pá 13. 11. 2026 · 15:42");
  assert.equal(ZK.formatClock(new Date(2026, 0, 4, 7, 5)), "ne 4. 1. 2026 · 07:05");
});

test("WARN_AFTER_MS is 20 minutes", function () {
  assert.equal(ZK.WARN_AFTER_MS, 1200000);
});

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

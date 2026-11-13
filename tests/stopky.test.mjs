import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBlock } from "./load-block.mjs";
const S = loadBlock("stopky-logika").Stopky;
const NOW = 1_800_000_000_000;
test("restoreStart vrací platný start", () => assert.equal(S.restoreStart(String(NOW - 60000), NOW), NOW - 60000));
test("restoreStart null pro chybějící hodnotu", () => assert.equal(S.restoreStart(null, NOW), null));
test("restoreStart null pro nesmysl", () => assert.equal(S.restoreStart("abc", NOW), null));
test("restoreStart null pro budoucnost", () => assert.equal(S.restoreStart(String(NOW + 120000), NOW), null));
test("restoreStart toleruje malou budoucnost a ořízne ji na now", () => {
  assert.equal(S.restoreStart(String(NOW + 30000), NOW), NOW);
  assert.equal(S.restoreStart(String(NOW + 60000), NOW), NOW);
  assert.equal(S.restoreStart(String(NOW + 60001), NOW), null);
});
test("restoreStart null po 12 h", () => assert.equal(S.restoreStart(String(NOW - 12 * 3600 * 1000), NOW), null));
test("elapsedMs nikdy záporné", () => assert.equal(S.elapsedMs(NOW, NOW - 5), 0));
test("fmtTime", () => { assert.equal(S.fmtTime(252000), "4:12"); assert.equal(S.fmtTime(5000), "0:05"); });

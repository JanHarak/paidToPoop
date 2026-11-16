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
test("ZDROJ_KEY", () => assert.equal(S.ZDROJ_KEY, "zachodova-stopky-zdroj-v1"));
test("zdroj: kalk jen pro přesnou hodnotu, jinak denik", () => {
  assert.equal(S.zdroj("kalk"), "kalk");
  assert.equal(S.zdroj("denik"), "denik");
  assert.equal(S.zdroj(null), "denik");
  assert.equal(S.zdroj("x"), "denik");
});
test("mereni: platné měření se vrátí celé", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(S.mereni({ start: NOW, min: 4.2, castka: 70, mena: "CZK", zapsano: true }))),
    { start: NOW, min: 4.2, castka: 70, mena: "CZK", zapsano: true });
});
test("mereni: zapsano chybí = false, neznámé klíče pryč", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(S.mereni({ start: NOW, min: 1, castka: 0, mena: "EUR", foo: 1 }))),
    { start: NOW, min: 1, castka: 0, mena: "EUR", zapsano: false });
});
test("mereni: neplatné vstupy dají null", () => {
  assert.equal(S.mereni(null), null);
  assert.equal(S.mereni("x"), null);
  assert.equal(S.mereni({ start: "a", min: 1, castka: 1, mena: "CZK" }), null);
  assert.equal(S.mereni({ start: NOW, min: 0, castka: 1, mena: "CZK" }), null);
  assert.equal(S.mereni({ start: NOW, min: 1, castka: -1, mena: "CZK" }), null);
  assert.equal(S.mereni({ start: NOW, min: 1, castka: NaN, mena: "CZK" }), null);
  assert.equal(S.mereni({ start: NOW, min: 1, castka: 1, mena: "" }), null);
});

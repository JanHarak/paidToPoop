import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBlock } from "./load-block.mjs";
const I = loadBlock("instalace-logika").InstalaceLogika;

const IOS_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IOS_CHROME = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1";
const IOS_FB = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/430.0]";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";

test("ODKLAD_MS je 24 hodin", () => assert.equal(I.ODKLAD_MS, 86400000));

test("platforma", () => {
  assert.equal(I.platforma(IOS_SAFARI), "ios-safari");
  assert.equal(I.platforma(IOS_CHROME), "ios-jiny");
  assert.equal(I.platforma(IOS_FB), "ios-jiny");
  assert.equal(I.platforma(ANDROID), "jiny");
  assert.equal(I.platforma(IOS_SAFARI + " GSA/300.0"), "ios-jiny");
  assert.equal(I.platforma(IOS_SAFARI + " Ddg/17.0"), "ios-jiny");
});

test("parse", () => {
  assert.deepEqual({ ...I.parse(null) }, { odlozenoDo: 0, nainstalovano: false });
  assert.deepEqual({ ...I.parse("{bad") }, { odlozenoDo: 0, nainstalovano: false });
  assert.deepEqual({ ...I.parse('{"odlozenoDo":123,"nainstalovano":true}') }, { odlozenoDo: 123, nainstalovano: true });
});

const ok = { mobil: true, standalone: false, nainstalovano: false, odlozenoDo: 0, ted: 1000, rezim: "prompt" };

test("maZobrazit", () => {
  assert.equal(I.maZobrazit(ok), true);
  assert.equal(I.maZobrazit({ ...ok, rezim: "ios" }), true);
  assert.equal(I.maZobrazit({ ...ok, mobil: false }), false);
  assert.equal(I.maZobrazit({ ...ok, standalone: true }), false);
  assert.equal(I.maZobrazit({ ...ok, nainstalovano: true }), false);
  assert.equal(I.maZobrazit({ ...ok, rezim: null }), false);
  assert.equal(I.maZobrazit({ ...ok, odlozenoDo: ok.ted + 1 }), false);
});

test("maZobrazit: odklad 24 h", () => {
  const t = 5000;
  const o = { ...ok, odlozenoDo: t + I.ODKLAD_MS };
  assert.equal(I.maZobrazit({ ...o, ted: t + I.ODKLAD_MS - 1 }), false);
  assert.equal(I.maZobrazit({ ...o, ted: t + I.ODKLAD_MS }), true);
});

test("KEY je pevny klic localStorage", () => assert.equal(I.KEY, "zachodova-instalace-v1"));

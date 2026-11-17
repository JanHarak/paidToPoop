import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBlock } from "./load-block.mjs";
const L = loadBlock("vtipy-logika").VtipyLogika;
const D = loadBlock("vtipy-data").VtipyData;
const J = (x) => JSON.parse(JSON.stringify(x));
// Deterministic "random" numbers in [0, 1).
const rnd = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

test("konstanty", () => {
  assert.equal(L.KEY, "zachodova-vtipy-v1");
  assert.equal(L.API_URL, "https://v2.jokeapi.dev/joke/Any?lang=cs&safe-mode&amount=10");
});

test("dalsi vybere jen z neviděných", () => {
  const r = L.dalsi(["a", "b", "c"], ["a", "b"], rnd([0.9]));
  assert.deepEqual(J(r), { vtip: "c", videne: ["a", "b", "c"] });
});
test("dalsi náhodně podle rnd", () => {
  assert.equal(L.dalsi(["a", "b", "c"], [], rnd([0])).vtip, "a");
  assert.equal(L.dalsi(["a", "b", "c"], [], rnd([0.5])).vtip, "b");
  assert.equal(L.dalsi(["a", "b", "c"], [], rnd([0.99])).vtip, "c");
});
test("dalsi po vyčerpání začne znovu, ale nezopakuje hned poslední", () => {
  const r = L.dalsi(["a", "b"], ["a", "b"], rnd([0]));
  assert.deepEqual(J(r), { vtip: "a", videne: ["a"] });
  const r2 = L.dalsi(["a", "b"], ["b", "a"], rnd([0]));
  assert.deepEqual(J(r2), { vtip: "b", videne: ["b"] });
});
test("dalsi s jedním vtipem a prázdnou sbírkou", () => {
  assert.equal(L.dalsi(["a"], ["a"], rnd([0])).vtip, "a");
  assert.equal(L.dalsi([], [], rnd([0])), null);
});
test("dalsi ignoruje viděné vtipy, které už ve sbírce nejsou", () => {
  const r = L.dalsi(["a", "b"], ["x", "a"], rnd([0]));
  assert.deepEqual(J(r), { vtip: "b", videne: ["a", "b"] });
});

test("parseVidene: jen pole řetězců", () => {
  assert.deepEqual(J(L.parseVidene(JSON.stringify(["a", "b"]))), ["a", "b"]);
  assert.deepEqual(J(L.parseVidene(JSON.stringify(["a", 5]))), ["a"]);
  assert.deepEqual(J(L.parseVidene("{")), []);
  assert.deepEqual(J(L.parseVidene(null)), []);
  assert.deepEqual(J(L.parseVidene("{\"a\":1}")), []);
});

test("zJokeApi: jednodílný i dvoudílný vtip, jen česky a bezpečné", () => {
  const o = { error: false, amount: 3, jokes: [
    { type: "single", joke: "Jeden.", lang: "cs", safe: true },
    { type: "twopart", setup: "Otázka?", delivery: "Pointa.", lang: "cs", safe: true },
    { type: "single", joke: "Unsafe.", lang: "cs", safe: false },
    { type: "single", joke: "English.", lang: "en", safe: true }
  ] };
  assert.deepEqual(J(L.zJokeApi(o)), ["Jeden.", "Otázka?\nPointa."]);
});
test("zJokeApi: jeden vtip bez pole jokes, chyba a nesmysl", () => {
  assert.deepEqual(J(L.zJokeApi({ error: false, type: "single", joke: "Jeden.", lang: "cs", safe: true })), ["Jeden."]);
  assert.deepEqual(J(L.zJokeApi({ error: true })), []);
  assert.deepEqual(J(L.zJokeApi(null)), []);
});

test("sloucit přidá jen nové vtipy", () => {
  assert.deepEqual(J(L.sloucit(["a", "b"], ["b", "c"])), ["a", "b", "c"]);
});

test("sbírka: aspoň 100 různých neprázdných vtipů bez dlouhé pomlčky", () => {
  assert.ok(Array.isArray(D) && D.length >= 100, "počet " + D.length);
  assert.equal(new Set(D).size, D.length, "duplicity");
  D.forEach((v) => {
    assert.equal(typeof v, "string");
    assert.ok(v.trim().length > 10, v);
    assert.ok(!v.includes("—"), v);
  });
});

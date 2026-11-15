import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBlock } from "./load-block.mjs";
const L = loadBlock("splachni-logika").SplachniLogika;
// Objects come from a vm realm, so compare via JSON (prototypes differ).
const js = (v) => JSON.parse(JSON.stringify(v));
const eq = (a, b) => assert.deepEqual(js(a), js(b));

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
// Values from the queue first, then a seeded LCG.
function fronta(vals, seed = 7) {
  const r = lcg(seed);
  let i = 0;
  return () => (i < vals.length ? vals[i++] : r());
}

// Board from 8 strings: 0-5 normal, a-f = 10+k, A-F = 20+k, S = sponge (30).
function deska(rows) {
  const d = [];
  for (const row of rows) {
    assert.equal(row.length, 8);
    for (const c of row) {
      if (c >= "0" && c <= "5") d.push(+c);
      else if (c >= "a" && c <= "f") d.push(10 + c.charCodeAt(0) - 97);
      else if (c >= "A" && c <= "F") d.push(20 + c.charCodeAt(0) - 65);
      else if (c === "S") d.push(30);
      else throw new Error("bad char " + c);
    }
  }
  assert.equal(d.length, 64);
  return d;
}
const BASE = ["01234501", "23450123", "45012345", "01234501", "23450123", "45012345", "01234501", "23450123"];
const transp = (d) => d.map((_, i) => d[(i % 8) * 8 + Math.floor(i / 8)]);
const tIdx = (i) => (i % 8) * 8 + Math.floor(i / 8);
const PLATNE = new Set([0, 1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 15, 20, 21, 22, 23, 24, 25, 30]);
const sorted = (a) => [...a].sort((x, y) => x - y);

// Board for run of 4 / L shape: row 6 col 2 is 0 above a 4.
const ROWS_4 = [...BASE.slice(0, 6), "01034501", "00403123"];

// Replays the steps on the post-swap board and returns the result.
function prehraj(start, a, b, kroky) {
  const d = start.slice();
  const t = d[a]; d[a] = d[b]; d[b] = t;
  for (const k of kroky) {
    for (const i of k.splach) {
      assert.notEqual(d[i], null, "splach prazdne bunky " + i);
      d[i] = null;
    }
    for (const v of k.vznik) {
      assert.ok(!k.splach.includes(v.i), "vznik v splach");
      d[v.i] = v.kod;
    }
    for (const p of k.pady) {
      assert.notEqual(d[p.z], null, "pad z prazdne " + p.z);
      assert.equal(d[p.z], p.kod, "pad kod");
      assert.ok(p.na > p.z && p.na % 8 === p.z % 8, "pad dolu ve sloupci");
    }
    const kody = k.pady.map((p) => p.kod);
    for (const p of k.pady) d[p.z] = null;
    k.pady.forEach((p, j) => { d[p.na] = kody[j]; });
    for (const n of k.nove) {
      assert.equal(d[n.i], null, "nove do plne bunky " + n.i);
      d[n.i] = n.kod;
    }
    assert.ok(d.every((v) => v !== null), "deska po kroku neni plna");
    if (k.zamichano) {
      assert.equal(k.deska.length, 64);
      for (let i = 0; i < 64; i++) d[i] = k.deska[i];
    }
  }
  return d;
}

test("konstanty a druh", () => {
  assert.equal(L.N, 8);
  assert.equal(L.DRUHU, 6);
  eq(L.EMOJI, ["📎", "☕", "📧", "📊", "🗓️", "🖨️"]);
  assert.equal(L.ZACHOD, "🚽");
  assert.equal(L.HOUBA, "🧽");
  assert.equal(L.druh(3), 3);
  assert.equal(L.druh(14), 4);
  assert.equal(L.druh(25), 5);
  assert.equal(L.druh(30), -1);
});

test("novaDeska: 200 seminek bez rad, s tahem, platne kody, deterministicka", () => {
  for (let s = 1; s <= 200; s++) {
    const d = L.novaDeska(lcg(s));
    assert.equal(d.length, 64);
    assert.ok(d.every((v) => Number.isInteger(v) && v >= 0 && v <= 5), "kody " + s);
    assert.equal(L.najdiRady(d).length, 0, "rada " + s);
    assert.equal(L.maTah(d), true, "tah " + s);
    eq(L.novaDeska(lcg(s)), d);
  }
});

test("novaDeska: zvladne i degenerovany rnd", () => {
  for (const c of [0, 0.5, 0.9999]) {
    const d = L.novaDeska(() => c);
    assert.equal(L.najdiRady(d).length, 0);
    assert.equal(L.maTah(d), true);
  }
});

test("najdiRady: vodorovna trojice a svisla ctverice", () => {
  const d = deska(BASE);
  assert.equal(L.najdiRady(d).length, 0);
  d[0] = 3; d[1] = 3; d[2] = 13; // row 0: 3 3 13 2 -> run of 3 h (13 is kind 3)
  d[3] = 2;
  // column 7 rows 2..5 kind 0
  d[23] = 0; d[31] = 0; d[39] = 20; d[47] = 0;
  const r = js(L.najdiRady(d));
  const h = r.find((x) => x.smer === "h");
  const v = r.find((x) => x.smer === "v");
  assert.equal(r.length, 2);
  eq(h, { bunky: [0, 1, 2], smer: "h", druh: 3 });
  eq(v, { bunky: [23, 31, 39, 47], smer: "v", druh: 0 });
});

test("najdiRady: houba nikdy nespoji", () => {
  const d = deska(BASE);
  d[0] = 30; d[1] = 30; d[2] = 30;
  assert.equal(L.najdiRady(d).length, 0);
  d[0] = 1; d[1] = 1; d[2] = 30; d[3] = 1;
  assert.equal(L.najdiRady(d).length, 0);
});

test("tah: nesousedni nebo stejny index je neplatny", () => {
  const d = deska(ROWS_4);
  for (const [a, b] of [[0, 0], [0, 2], [0, 9], [7, 8], [-1, 0], [63, 64], [1.5, 2]]) {
    const r = L.tah(d, a, b, lcg(1));
    assert.equal(r.platny, false, a + "," + b);
    assert.equal(r.body, 0);
    eq(r.kroky, []);
    eq(r.deska, d);
  }
});

test("tah: prohozeni bez rady je neplatne a nemeni vstup", () => {
  const d = deska(BASE);
  const kopie = d.slice();
  const r = L.tah(d, 0, 1, lcg(1));
  assert.equal(r.platny, false);
  assert.equal(r.body, 0);
  eq(r.kroky, []);
  eq(r.deska, kopie);
  assert.notEqual(r.deska, d);
  eq(d, kopie);
});

test("tah: jednoducha trojice", () => {
  const rows = [...BASE.slice(0, 6), "01034501", "00453123"];
  const d = deska(rows);
  assert.equal(L.najdiRady(d).length, 0);
  const kopie = d.slice();
  const r = L.tah(d, 50, 58, lcg(3));
  assert.equal(r.platny, true);
  eq(d, kopie);
  eq(sorted(r.kroky[0].splach), [56, 57, 58]);
  assert.equal(r.kroky[0].body, 30);
  assert.equal(r.kroky[0].retez, 1);
  eq(r.kroky[0].vznik, []);
});

test("tah: ctverice vytvori zachod 10+k (h) na miste tahu, +50", () => {
  const d = deska(ROWS_4);
  assert.equal(L.najdiRady(d).length, 0);
  const r = L.tah(d, 50, 58, lcg(3));
  assert.equal(r.platny, true);
  const k = r.kroky[0];
  eq(k.vznik, [{ i: 58, kod: 10 }]);
  eq(sorted(k.splach), [56, 57, 59]);
  assert.equal(k.body, 3 * 10 + 50);
});

test("tah: svisla ctverice vytvori zachod 20+k", () => {
  const d = transp(deska(ROWS_4));
  assert.equal(L.najdiRady(d).length, 0);
  const r = L.tah(d, tIdx(50), tIdx(58), lcg(3));
  assert.equal(r.platny, true);
  eq(r.kroky[0].vznik, [{ i: tIdx(58), kod: 20 }]);
  assert.equal(r.kroky[0].body, 80);
});

test("tah: tvar L vytvori houbu na kriseni, +100", () => {
  const d = deska(ROWS_4);
  const r = L.tah(d, 59, 58, lcg(3));
  assert.equal(r.platny, true);
  const k = r.kroky[0];
  eq(k.vznik, [{ i: 58, kod: 30 }]);
  eq(sorted(k.splach), [42, 50, 56, 57]);
  assert.equal(k.body, 4 * 10 + 100);
});

test("tah: zachod 10+k v rade splachne cely radek", () => {
  const rows = [...BASE.slice(0, 6), "01034501", "0a453123"];
  const d = deska(rows);
  assert.equal(L.najdiRady(d).length, 0);
  const r = L.tah(d, 50, 58, lcg(3));
  assert.equal(r.platny, true);
  const s = r.kroky[0].splach;
  for (let i = 56; i < 64; i++) assert.ok(s.includes(i), "chybi " + i);
  assert.equal(r.kroky[0].body, 10 * s.length);
});

test("tah: zachod 20+k aktivovany v rade splachne cely sloupec", () => {
  const rows = [...BASE.slice(0, 6), "01034501", "0A453123"];
  const d = deska(rows);
  const r = L.tah(d, 50, 58, lcg(3));
  const s = r.kroky[0].splach;
  for (let y = 0; y < 8; y++) assert.ok(s.includes(y * 8 + 1), "chybi " + (y * 8 + 1));
});

test("tah: houba + druh 2 splachne vsechny dvojky", () => {
  const d = deska(BASE);
  d[0] = 30;
  assert.equal(d[8], 2);
  const r = L.tah(d, 0, 8, lcg(5));
  assert.equal(r.platny, true);
  const po = d.slice(); po[0] = 2; po[8] = 30;
  const cekane = [8];
  po.forEach((v, i) => { if (v === 2) cekane.push(i); });
  eq(sorted(r.kroky[0].splach), sorted(cekane));
  assert.equal(r.kroky[0].retez, 1);
  assert.equal(r.kroky[0].body, 10 * cekane.length);
});

test("tah: houba + houba splachne celou desku", () => {
  const d = deska(BASE);
  d[0] = 30; d[1] = 30;
  const r = L.tah(d, 1, 0, lcg(5));
  assert.equal(r.platny, true);
  assert.equal(r.kroky[0].splach.length, 64);
  assert.equal(r.kroky[0].body, 640);
});

test("tah: houba + zachod splachne druh a zachod se aktivuje", () => {
  const d = deska(BASE);
  d[0] = 30; d[8] = 12; // 12 = toilet h of kind 2 at row 1
  const r = L.tah(d, 0, 8, lcg(5));
  const s = r.kroky[0].splach;
  for (let i = 0; i < 8; i++) assert.ok(s.includes(i), "radek 0 chybi " + i);
});

test("tah: retezova reakce ma retez 2 a dvojnasobne body", () => {
  const rows = [...BASE.slice(0, 6), "01034501", "00453123"];
  const d = deska(rows);
  // refill of cells 0,1,2 is kind 4 -> row 0 "444" + "3..."
  const r = L.tah(d, 50, 58, fronta([0.7, 0.7, 0.7]));
  assert.equal(r.platny, true);
  eq(r.kroky[0].nove, [{ i: 0, kod: 4 }, { i: 1, kod: 4 }, { i: 2, kod: 4 }]);
  assert.ok(r.kroky.length >= 2);
  const k2 = r.kroky[1];
  assert.equal(k2.retez, 2);
  eq(sorted(k2.splach), [0, 1, 2]);
  assert.equal(k2.body, 2 * r.kroky[0].body);
});

test("tah: prehrani kroku da vyslednou desku (scenare)", () => {
  const cases = [
    [deska([...BASE.slice(0, 6), "01034501", "00453123"]), 50, 58],
    [deska(ROWS_4), 50, 58],
    [deska(ROWS_4), 59, 58],
    [deska([...BASE.slice(0, 6), "01034501", "0a453123"]), 50, 58]
  ];
  for (const [d, a, b] of cases) {
    for (let s = 1; s <= 20; s++) {
      const r = L.tah(d, a, b, lcg(s));
      eq(prehraj(d, a, b, r.kroky), r.deska);
    }
  }
});

test("vlastnost: 300 her po 20 tazich", () => {
  const t0 = Date.now();
  const pary = [];
  for (let i = 0; i < 64; i++) {
    if (i % 8 < 7) pary.push([i, i + 1]);
    if (i < 56) pary.push([i, i + 8]);
  }
  for (let g = 1; g <= 300; g++) {
    const rnd = lcg(g * 7919);
    let d = L.novaDeska(rnd);
    for (let m = 0; m < 20; m++) {
      const poradi = pary.slice();
      for (let i = poradi.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [poradi[i], poradi[j]] = [poradi[j], poradi[i]];
      }
      let r = null, ab = null;
      for (const p of poradi) {
        const x = L.tah(d, p[0], p[1], rnd);
        if (x.platny) { r = x; ab = p; break; }
      }
      assert.ok(r, "zadny platny tah, hra " + g);
      const vys = js(r.deska);
      assert.equal(vys.length, 64);
      assert.ok(vys.every((v) => PLATNE.has(v)), "kody");
      assert.equal(L.najdiRady(vys).length, 0, "rady");
      assert.equal(L.maTah(vys), true, "tah");
      assert.equal(r.body, r.kroky.reduce((s, k) => s + k.body, 0), "body");
      r.kroky.forEach((k, i) => assert.equal(k.retez, i + 1));
      eq(prehraj(d, ab[0], ab[1], r.kroky), vys);
      d = vys;
    }
  }
  assert.ok(Date.now() - t0 < 4000, "pomale: " + (Date.now() - t0) + " ms");
});

test("maTah a napoveda", () => {
  const d = deska(ROWS_4);
  assert.equal(L.maTah(d), true);
  const n = js(L.napoveda(d));
  assert.equal(n.length, 2);
  assert.equal(L.tah(d, n[0], n[1], lcg(1)).platny, true);
  // board without moves: stripes of 3-cycle pattern
  const bez = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bez.push((x % 2) + 2 * ((y + Math.floor(x / 2)) % 3));
  assert.equal(L.najdiRady(bez).length, 0);
  assert.equal(L.maTah(bez), false);
  assert.equal(L.napoveda(bez), null);
  // any sponge swap is a move
  const h = bez.slice(); h[27] = 30;
  assert.equal(L.maTah(h), true);
  assert.ok(js(L.napoveda(h)).includes(27));
});

test("tah: deska bez tahu se zamicha (zamichano + deska v poslednim kroku)", () => {
  const bez = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bez.push((x % 2) + 2 * ((y + Math.floor(x / 2)) % 3));
  const d = bez.slice(); d[27] = 30; d[28] = 30;
  // sponge + sponge clears all, refill (ascending index) recreates the no-move pattern
  const r = L.tah(d, 27, 28, fronta(bez.map((k) => (k + 0.5) / 6), 11));
  assert.equal(r.platny, true);
  assert.equal(r.kroky.length, 1);
  const k = r.kroky[0];
  eq(k.nove.map((n) => n.kod), bez);
  assert.equal(k.zamichano, true);
  eq(k.deska, r.deska);
  eq(sorted(js(r.deska)), sorted(bez));
  assert.equal(L.najdiRady(r.deska).length, 0);
  assert.equal(L.maTah(r.deska), true);
  assert.equal(r.body, 640);
  eq(prehraj(d, 27, 28, r.kroky), r.deska);
});

test("zamichej: zachova multimnozinu kodu, bez rad, s tahem", () => {
  for (let s = 1; s <= 50; s++) {
    const d = L.novaDeska(lcg(s));
    d[5] = 30; d[40] = 13; d[41] = 22;
    const z = js(L.zamichej(d, lcg(s + 1000)));
    assert.equal(L.najdiRady(z).length, 0);
    assert.equal(L.maTah(z), true);
    eq(sorted(z), sorted(d));
  }
});

test("zamichej: zbytecne zamichana deska spadne na novaDeska", () => {
  const z = js(L.zamichej(new Array(64).fill(0), lcg(3)));
  assert.equal(L.najdiRady(z).length, 0);
  assert.equal(L.maTah(z), true);
});

const VYCHOZI = { rezim: "tahy", rekordy: { tahy: 0, cas: 0, nekonecna: 0 }, nekonecna: null };

test("parseUlozeni: null, rozbity JSON a pole davaji vychozi", () => {
  eq(L.parseUlozeni(null), VYCHOZI);
  eq(L.parseUlozeni("{bad"), VYCHOZI);
  eq(L.parseUlozeni("[]"), VYCHOZI);
});

test("parseUlozeni: platny objekt projde beze zmeny", () => {
  const o = { rezim: "nekonecna", rekordy: { tahy: 1240, cas: 800, nekonecna: 5000 },
    nekonecna: { deska: deska(ROWS_4), body: 320 } };
  eq(L.parseUlozeni(JSON.stringify(o)), o);
  const c = { rezim: "cas", rekordy: { tahy: 1, cas: 2, nekonecna: 3 }, nekonecna: null };
  eq(L.parseUlozeni(JSON.stringify(c)), c);
});

test("parseUlozeni: neplatna deska dava nekonecna null", () => {
  const p = (nek) => L.parseUlozeni(JSON.stringify({ rezim: "nekonecna", nekonecna: nek })).nekonecna;
  const d = deska(ROWS_4);
  assert.equal(p({ deska: d.slice(0, 63), body: 5 }), null);
  const rada = d.slice(); rada[59] = 4; rada[58] = 0;
  assert.equal(p({ deska: rada, body: 5 }), null);
  const zly = d.slice(); zly[3] = 7;
  assert.equal(p({ deska: zly, body: 5 }), null);
  assert.equal(p({ deska: d, body: -1 }), null);
  assert.equal(p({ deska: d, body: 1.5 }), null);
  assert.equal(p({ deska: d, body: "5" }), null);
  assert.equal(p("x"), null);
});

test("parseUlozeni: neplatny rezim a zaporne rekordy", () => {
  const r = js(L.parseUlozeni(JSON.stringify({ rezim: "x", rekordy: { tahy: -5, cas: "9", nekonecna: null } })));
  assert.equal(r.rezim, "tahy");
  eq(r.rekordy, { tahy: 0, cas: 0, nekonecna: 0 });
});

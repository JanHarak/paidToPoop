import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBlock } from "./load-block.mjs";
const L = loadBlock("porada-logika").PoradaLogika;
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

const S = 13;
const R = 11;
const idx = (r, c) => r * S + c;
const START = idx(1, 1);
const bunka = (st) => idx(Math.round(st.hrac.y), Math.round(st.hrac.x));
const NIC = { smer: null, porada: false };
const POHYB = (smer) => ({ smer, porada: false });

// Runs krok with the same input for ms milliseconds and collects the events.
function drz(st, vstup, ms, rnd) {
  const ud = [];
  for (let t = 0; t < ms; t += L.KROK_MS) ud.push(...L.krok(st, vstup, rnd));
  return ud;
}

// Walks in a direction until the condition holds (with a step guard).
function jdiDokud(st, smer, hotovo, rnd, ud) {
  for (let n = 0; n < 200 && !hotovo(st); n++) ud.push(...L.krok(st, POHYB(smer), rnd));
  assert.ok(hotovo(st), "cil nedosazen pri chuzi " + smer);
}

// A floor with crates removed, no bonuses and the elevator far away.
function prazdnePatro(seed = 1) {
  const rnd = lcg(seed);
  const st = L.novaHra(rnd);
  for (let i = 0; i < S * R; i++) if (st.mrizka[i] === 2) st.mrizka[i] = 0;
  st.bonusy = [];
  st.vytah = { i: idx(9, 11), odkryty: true, otevreny: false };
  return { st, rnd };
}

test("konstanty", () => {
  eq(
    [L.S, L.R, L.KROK_MS, L.ROZBUSKA_MS, L.VYBUCH_MS, L.NEZRANITELNOST_MS, L.ZIVOTU, L.RYCHLOST,
      L.RYCHLOST_MAX, L.KAVA, L.MAX_PORAD, L.MAX_DOSAH],
    [13, 11, 20, 2500, 500, 2000, 3, 3, 5.5, 0.5, 5, 6]
  );
});

test("novaHra: vychozi hodnoty", () => {
  const st = L.novaHra(lcg(1));
  assert.equal(st.patro, 1);
  assert.equal(st.zivoty, 3);
  assert.equal(st.body, 0);
  assert.equal(st.konec, false);
  assert.equal(st.mrizka.length, 143);
  eq(st.porady, []);
  eq(st.vybuchy, []);
  eq(st.kolegove, []);
  const h = st.hrac;
  eq([h.x, h.y, h.rychlost, h.maxPorad, h.dosah, h.nezranitelny], [1, 1, 3, 1, 1, 0]);
});

test("novaHra: stejna sekvence rnd dava stejne patro", () => {
  eq(L.novaHra(lcg(42)), L.novaHra(lcg(42)));
  assert.notDeepEqual(js(L.novaHra(lcg(42)).mrizka), js(L.novaHra(lcg(43)).mrizka));
});

test("novaHra: 200 seminek, zdi, start, krabice, vytah a dosazitelnost", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const st = L.novaHra(lcg(seed));
    const m = st.mrizka;
    let vhodnych = 0;
    let krabic = 0;
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < S; c++) {
        const i = idx(r, c);
        const zed = r === 0 || c === 0 || r === R - 1 || c === S - 1 || (r % 2 === 0 && c % 2 === 0);
        if (zed) {
          assert.equal(m[i], 1, "zed " + r + "," + c + " seed " + seed);
          continue;
        }
        assert.notEqual(m[i], 1, "nezed " + r + "," + c);
        if (i === idx(1, 1) || i === idx(1, 2) || i === idx(2, 1)) {
          assert.equal(m[i], 0, "start volny seed " + seed);
          continue;
        }
        vhodnych++;
        if (m[i] === 2) krabic++;
      }
    }
    const podil = krabic / vhodnych;
    assert.ok(podil >= 0.35 && podil <= 0.55, "podil krabic " + podil + " seed " + seed);
    const v = st.vytah;
    assert.equal(typeof v.i, "number");
    assert.equal(m[v.i], 2, "vytah pod krabici seed " + seed);
    assert.equal(v.odkryty, false);
    assert.equal(v.otevreny, false);
    assert.ok(!st.bonusy.some((b) => b.i === v.i), "bonus na vytahu seed " + seed);
    for (const b of st.bonusy) {
      assert.equal(m[b.i], 2);
      assert.equal(b.skryty, true);
      assert.ok(["kava", "porada", "dosah"].includes(b.typ));
    }
    assert.equal(new Set(st.bonusy.map((b) => b.i)).size, st.bonusy.length);
    const d = L.vzdalenosti(st, START, true);
    assert.ok(d[v.i] > 0, "vytah dosazitelny seed " + seed);
  }
});

test("vzdalenosti: BFS, krabice a nedosazitelne", () => {
  const { st } = prazdnePatro();
  const d = L.vzdalenosti(st, START, false);
  assert.equal(d.length, 143);
  assert.equal(d[START], 0);
  assert.equal(d[idx(1, 2)], 1);
  assert.equal(d[idx(3, 3)], 4);
  assert.equal(d[idx(0, 0)], -1);
  assert.equal(d[idx(2, 2)], -1);
  st.mrizka[idx(1, 2)] = 2;
  st.mrizka[idx(2, 1)] = 2;
  const d2 = L.vzdalenosti(st, START, false);
  assert.equal(d2[idx(1, 3)], -1);
  assert.equal(d2[idx(1, 2)], -1);
  assert.equal(L.vzdalenosti(st, START, true)[idx(1, 3)], 2);
});

test("novePatro: nove patro, staty, zivoty a body zustanou", () => {
  const rnd = lcg(5);
  const st = L.novaHra(rnd);
  st.patro = 4;
  st.zivoty = 2;
  st.body = 1200;
  Object.assign(st.hrac, { x: 5, y: 3, rychlost: 4, maxPorad: 3, dosah: 2, nezranitelny: 300 });
  st.porady = [{ i: idx(3, 5), zbyva: 100, dosah: 2, hracUvnitr: false }];
  st.vybuchy = [{ bunky: [idx(3, 5)], zbyva: 100 }];
  st.vytah = { i: 0, odkryty: true, otevreny: true };
  L.novePatro(st, rnd);
  eq([st.patro, st.zivoty, st.body], [4, 2, 1200]);
  const h = st.hrac;
  eq([h.x, h.y, h.rychlost, h.maxPorad, h.dosah], [1, 1, 4, 3, 2]);
  eq(st.porady, []);
  eq(st.vybuchy, []);
  eq(st.kolegove, []);
  assert.equal(st.vytah.odkryty, false);
  assert.equal(st.vytah.otevreny, false);
  assert.equal(st.mrizka[st.vytah.i], 2);
});

test("pohyb: 1000 ms doprava je 3 pole a nevejde do zdi", () => {
  const { st, rnd } = prazdnePatro();
  for (let n = 0; n < 1000 / L.KROK_MS; n++) {
    L.krok(st, POHYB("right"), rnd);
    assert.notEqual(st.mrizka[bunka(st)], 1);
    assert.equal(st.hrac.y, 1);
  }
  assert.ok(Math.abs(st.hrac.x - 4) <= 0.1, "x " + st.hrac.x);
  assert.equal(st.hrac.smer, "right");
  // Up is the border wall: no movement.
  drz(st, POHYB("up"), 200, rnd);
  assert.equal(st.hrac.y, 1);
});

test("pohyb: zastavi se pred krabici", () => {
  const rnd = lcg(3);
  const st = L.novaHra(rnd);
  for (let c = 2; c < 12; c++) st.mrizka[idx(1, c)] = 0;
  st.mrizka[idx(1, 4)] = 2;
  drz(st, POHYB("right"), 2000, rnd);
  assert.equal(st.hrac.x, 3);
  assert.equal(bunka(st), idx(1, 3));
});

test("pohyb: pomoc v zatacce dorovna do chodby", () => {
  const { st, rnd } = prazdnePatro();
  // Slightly below row 1 in column 1, turning right into row 1.
  st.hrac.y = 1.3;
  drz(st, POHYB("right"), 300, rnd);
  assert.equal(st.hrac.y, 1);
  assert.ok(st.hrac.x > 1);
  // Slightly right of column 3 while going down into column 3.
  st.hrac.x = 2.7;
  st.hrac.y = 1;
  drz(st, POHYB("down"), 400, rnd);
  assert.equal(st.hrac.x, 3);
  assert.ok(st.hrac.y > 1);
});

test("pohyb: 10 000 kroku nahodneho vstupu nikdy nestoji na zdi ani krabici", () => {
  const rnd = lcg(11);
  const st = L.novaHra(rnd);
  const smery = [null, "up", "down", "left", "right"];
  let vstup = NIC;
  for (let n = 0; n < 10000; n++) {
    if (n % 15 === 0) vstup = { smer: smery[Math.floor(rnd() * 5)], porada: rnd() < 0.1 };
    L.krok(st, vstup, rnd);
    const { x, y } = st.hrac;
    for (const r of [Math.floor(y), Math.ceil(y)]) {
      for (const c of [Math.floor(x), Math.ceil(x)]) {
        const k = st.mrizka[idx(r, c)];
        assert.ok(k !== 1 && k !== 2, "krok " + n + " na " + r + "," + c + " kod " + k);
      }
    }
  }
});

test("porada: jen maxPorad naraz, ne dvakrat na stejne pole, ne na vytah", () => {
  const { st, rnd } = prazdnePatro();
  let ud = L.krok(st, { smer: null, porada: true }, rnd);
  eq(ud, ["porada"]);
  eq(st.porady.map((p) => [p.i, p.dosah, p.hracUvnitr]), [[START, 1, true]]);
  // Same cell with more meetings allowed.
  st.hrac.maxPorad = 2;
  ud = L.krok(st, { smer: null, porada: true }, rnd);
  eq(ud, []);
  assert.equal(st.porady.length, 1);
  // Another cell: second one fits, third not (maxPorad 2).
  jdiDokud(st, "right", (s) => s.hrac.x >= 3, rnd, []);
  L.krok(st, { smer: null, porada: true }, rnd);
  assert.equal(st.porady.length, 2);
  jdiDokud(st, "right", (s) => s.hrac.x >= 5, rnd, []);
  L.krok(st, { smer: null, porada: true }, rnd);
  assert.equal(st.porady.length, 2);
  // Not on the elevator cell.
  st.porady = [];
  st.vytah = { i: idx(1, 5), odkryty: true, otevreny: false };
  ud = L.krok(st, { smer: null, porada: true }, rnd);
  eq(ud, []);
  eq(st.porady, []);
});

test("porada: blokuje manazera, kdyz z ni odejde", () => {
  const { st, rnd } = prazdnePatro();
  L.krok(st, { smer: null, porada: true }, rnd);
  jdiDokud(st, "right", (s) => s.hrac.x >= 2, rnd, []);
  assert.equal(st.porady[0].hracUvnitr, false);
  drz(st, POHYB("left"), 500, rnd);
  assert.equal(st.hrac.x, 2);
});

test("rozbuska: kriz useknuty zdmi a zastaveny prvni krabici, pak zmizi", () => {
  const { st, rnd } = prazdnePatro();
  st.hrac.dosah = 3;
  st.hrac.x = 9;
  st.hrac.y = 9;
  // Meeting at (3,3): up (2,3),(1,3),(0,3)=wall; down (4,3),(5,3) crate stops;
  // left (3,2),(3,1),(3,0)=wall; right (3,4),(3,5),(3,6).
  st.mrizka[idx(5, 3)] = 2;
  st.mrizka[idx(6, 3)] = 2;
  st.porady = [{ i: idx(3, 3), zbyva: L.ROZBUSKA_MS, dosah: 3, hracUvnitr: false }];
  const ud = [];
  for (let t = 0; t < L.ROZBUSKA_MS - L.KROK_MS; t += L.KROK_MS) ud.push(...L.krok(st, NIC, rnd));
  assert.equal(st.porady.length, 1);
  eq(st.vybuchy, []);
  ud.push(...L.krok(st, NIC, rnd));
  eq(st.porady, []);
  assert.equal(st.vybuchy.length, 1);
  const ocekavane = [idx(3, 3), idx(2, 3), idx(1, 3), idx(4, 3), idx(5, 3), idx(3, 2), idx(3, 1),
    idx(3, 4), idx(3, 5), idx(3, 6)];
  eq([...st.vybuchy[0].bunky].sort((a, b) => a - b), ocekavane.sort((a, b) => a - b));
  assert.equal(st.vybuchy[0].zbyva, L.VYBUCH_MS);
  assert.equal(st.mrizka[idx(5, 3)], 0);
  assert.equal(st.mrizka[idx(6, 3)], 2);
  assert.ok(ud.includes("vybuch"));
  assert.ok(ud.includes("krabice"));
  for (let t = 0; t < L.VYBUCH_MS - L.KROK_MS; t += L.KROK_MS) L.krok(st, NIC, rnd);
  assert.equal(st.vybuchy.length, 1);
  L.krok(st, NIC, rnd);
  eq(st.vybuchy, []);
});

test("retez: druha porada v dosahu vybuchne ve stejnem kroku", () => {
  const { st, rnd } = prazdnePatro();
  st.hrac.x = 9;
  st.hrac.y = 9;
  st.porady = [
    { i: idx(3, 3), zbyva: L.KROK_MS, dosah: 2, hracUvnitr: false },
    { i: idx(3, 5), zbyva: L.ROZBUSKA_MS, dosah: 1, hracUvnitr: false }
  ];
  L.krok(st, NIC, rnd);
  eq(st.porady, []);
  assert.equal(st.vybuchy.length, 2);
  const druhy = st.vybuchy.find((v) => v.bunky.includes(idx(3, 6)));
  assert.ok(druhy, "druhy vybuch se svym dosahem");
  assert.ok(druhy.bunky.includes(idx(3, 5)));
  assert.equal(druhy.zbyva, L.VYBUCH_MS);
});

test("vybuch: otevreny bonus zmizi, vytah zustane", () => {
  const { st, rnd } = prazdnePatro();
  st.hrac.x = 9;
  st.hrac.y = 9;
  st.bonusy = [{ i: idx(1, 4), typ: "kava", skryty: false }, { i: idx(5, 5), typ: "kava", skryty: false }];
  st.vytah = { i: idx(1, 2), odkryty: true, otevreny: false };
  st.porady = [{ i: idx(1, 3), zbyva: L.KROK_MS, dosah: 1, hracUvnitr: false }];
  L.krok(st, NIC, rnd);
  eq(st.bonusy.map((b) => b.i), [idx(5, 5)]);
  assert.ok(st.vybuchy[0].bunky.includes(idx(1, 2)));
  eq(st.vytah, { i: idx(1, 2), odkryty: true, otevreny: false });
  assert.equal(st.mrizka[idx(1, 2)], 0);
});

test("vybuch: rozbita krabice odkryje vytah", () => {
  const { st, rnd } = prazdnePatro();
  st.hrac.x = 9;
  st.hrac.y = 9;
  st.mrizka[idx(1, 4)] = 2;
  st.vytah = { i: idx(1, 4), odkryty: false, otevreny: false };
  st.porady = [{ i: idx(1, 3), zbyva: L.KROK_MS, dosah: 1, hracUvnitr: false }];
  L.krok(st, NIC, rnd);
  assert.equal(st.vytah.odkryty, true);
  assert.equal(st.mrizka[idx(1, 4)], 0);
});

test("unik ze startu: 200 seminek bez zasahu a s plnou kontrolou", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const rnd = lcg(seed);
    const st = L.novaHra(rnd);
    st.kolegove = [];
    const ud = [];
    jdiDokud(st, "right", (s) => bunka(s) === idx(1, 2), rnd, ud);
    ud.push(...L.krok(st, { smer: null, porada: true }, rnd));
    assert.equal(st.porady.length, 1, "porada polozena seed " + seed);
    assert.equal(st.porady[0].i, idx(1, 2));
    jdiDokud(st, "left", (s) => s.hrac.x <= 1, rnd, ud);
    jdiDokud(st, "down", (s) => s.hrac.y >= 2, rnd, ud);
    assert.equal(bunka(st), idx(2, 1));
    ud.push(...drz(st, NIC, 3500, rnd));
    assert.ok(ud.includes("vybuch"), "vybuchlo seed " + seed);
    assert.ok(!ud.includes("zasah"), "zasah seed " + seed);
    eq(st.porady, []);
    eq(st.vybuchy, []);
    // Full control: back up to the start and right again.
    jdiDokud(st, "up", (s) => s.hrac.y <= 1, rnd, ud);
    jdiDokud(st, "right", (s) => s.hrac.x >= 2, rnd, ud);
    assert.ok(!ud.includes("zasah"));
  }
});

test("zasah: manazer ve vybuchu dostane udalost, nezranitelny ne", () => {
  const { st, rnd } = prazdnePatro();
  st.porady = [{ i: idx(1, 2), zbyva: L.KROK_MS, dosah: 1, hracUvnitr: false }];
  const ud = L.krok(st, NIC, rnd);
  assert.ok(ud.includes("zasah"));
  assert.equal(st.zivoty, 3);
  st.hrac.nezranitelny = 1000;
  assert.ok(!L.krok(st, NIC, rnd).includes("zasah"));
  assert.equal(st.hrac.nezranitelny, 1000 - L.KROK_MS);
});

test("bonus: rozbita krabice odkryje dosah, sebrani zvysi dosah", () => {
  const { st, rnd } = prazdnePatro();
  st.mrizka[idx(1, 3)] = 2;
  st.bonusy = [{ i: idx(1, 3), typ: "dosah", skryty: true }];
  st.hrac.x = 9;
  st.hrac.y = 9;
  st.porady = [{ i: idx(1, 2), zbyva: L.KROK_MS, dosah: 1, hracUvnitr: false }];
  L.krok(st, NIC, rnd);
  assert.equal(st.mrizka[idx(1, 3)], 0);
  eq(st.bonusy, [{ i: idx(1, 3), typ: "dosah", skryty: false }]);
  drz(st, NIC, L.VYBUCH_MS, rnd);
  eq(st.vybuchy, []);
  st.hrac.x = 1;
  st.hrac.y = 1;
  const ud = [];
  jdiDokud(st, "right", (s) => s.hrac.x >= 3, rnd, ud);
  assert.ok(ud.includes("bonus"));
  assert.equal(st.hrac.dosah, 2);
  eq(st.bonusy, []);
});

test("bonus: maxima se dodrzi", () => {
  const { st, rnd } = prazdnePatro();
  Object.assign(st.hrac, { rychlost: 5.5, maxPorad: 5, dosah: 6 });
  st.bonusy = [
    { i: idx(1, 2), typ: "kava", skryty: false },
    { i: idx(1, 3), typ: "porada", skryty: false },
    { i: idx(1, 4), typ: "dosah", skryty: false }
  ];
  jdiDokud(st, "right", (s) => s.hrac.x >= 5, rnd, []);
  eq(st.bonusy, []);
  eq([st.hrac.rychlost, st.hrac.maxPorad, st.hrac.dosah], [5.5, 5, 6]);
  // Coffee near the cap is capped too.
  st.hrac.rychlost = 5.25;
  st.bonusy = [{ i: idx(1, 6), typ: "kava", skryty: false }];
  jdiDokud(st, "right", (s) => s.hrac.x >= 6, rnd, []);
  assert.equal(st.hrac.rychlost, 5.5);
});

test("bonus: skryty bonus pod krabici sebrat nejde", () => {
  const { st, rnd } = prazdnePatro();
  st.bonusy = [{ i: idx(1, 2), typ: "dosah", skryty: true }];
  jdiDokud(st, "right", (s) => s.hrac.x >= 3, rnd, []);
  assert.equal(st.hrac.dosah, 1);
  assert.equal(st.bonusy.length, 1);
});

test("konec: krok nic nedela", () => {
  const { st, rnd } = prazdnePatro();
  st.konec = true;
  eq(L.krok(st, { smer: "right", porada: true }, rnd), []);
  eq([st.hrac.x, st.porady.length], [1, 0]);
});

const VYCHOZI = { rekordPatro: 0, rekordBody: 0 };

test("parseUlozeni: null, rozbity JSON a pole davaji vychozi", () => {
  eq(L.parseUlozeni(null), VYCHOZI);
  eq(L.parseUlozeni("{bad"), VYCHOZI);
  eq(L.parseUlozeni("[]"), VYCHOZI);
});

test("parseUlozeni: platny objekt projde, zaporne a necela cisla davaji 0", () => {
  const o = { rekordPatro: 7, rekordBody: 1200 };
  eq(L.parseUlozeni(JSON.stringify(o)), o);
  eq(L.parseUlozeni(JSON.stringify({ rekordPatro: -1, rekordBody: 1.5 })), VYCHOZI);
  eq(L.parseUlozeni(JSON.stringify({ rekordPatro: "3", rekordBody: null })), VYCHOZI);
});

test("lepsi: vyssi patro, pri shode vyssi body, shoda je false", () => {
  const z = (p, b) => ({ rekordPatro: p, rekordBody: b });
  assert.equal(L.lepsi(z(3, 0), z(2, 9000)), true);
  assert.equal(L.lepsi(z(2, 9000), z(3, 0)), false);
  assert.equal(L.lepsi(z(3, 600), z(3, 500)), true);
  assert.equal(L.lepsi(z(3, 500), z(3, 600)), false);
  assert.equal(L.lepsi(z(3, 500), z(3, 500)), false);
});

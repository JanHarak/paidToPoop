import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBlock } from "./load-block.mjs";
const S = loadBlock("sachy-logika").SachyLogika;

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const KIWI = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1";
const sq = (s) => (s.charCodeAt(0) - 97) + (Number(s[1]) - 1) * 8;
const plain = (o) => JSON.parse(JSON.stringify(o));

function partieZFen(fen) {
  const pos = S.zFen(fen);
  return { pos, tahy: [], klice: [S.klic(pos)], posledni: null };
}

const PERFT = [
  [START, [20, 400, 8902]],
  [KIWI, [48, 2039, 97862]],
  ["8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", [14, 191, 2812, 43238]],
  ["r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", [6, 264, 9467]],
  ["rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", [44, 1486, 62379]]
];

for (const [fen, counts] of PERFT) {
  test("perft: " + fen, () => {
    const pos = S.zFen(fen);
    const pred = S.doFen(pos);
    counts.forEach((n, i) => {
      assert.equal(S.perft(pos, i + 1), n, "hloubka " + (i + 1));
    });
    assert.equal(S.doFen(pos), pred, "perft nemeni vstup");
  });
}

test("perft: pozice 3 hloubka 4 do 3 s", () => {
  const t0 = Date.now();
  S.perft(S.zFen("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1"), 4);
  assert.ok(Date.now() - t0 < 3000, "trvalo " + (Date.now() - t0) + " ms");
});

test("FEN: START_FEN tam a zpet", () => {
  assert.equal(S.START_FEN, START);
  assert.equal(S.doFen(S.zFen(S.START_FEN)), S.START_FEN);
  assert.equal(S.doFen(S.zFen(KIWI)), KIWI);
  assert.equal(S.zFen("nesmysl"), null);
});

test("pos.tah a kusNa", () => {
  const pos = S.zFen(START);
  assert.equal(pos.tah, "b");
  assert.deepEqual(plain(S.kusNa(pos, sq("e1"))), { barva: "b", typ: "k" });
  assert.deepEqual(plain(S.kusNa(pos, sq("d8"))), { barva: "c", typ: "q" });
  assert.deepEqual(plain(S.kusNa(pos, sq("g1"))), { barva: "b", typ: "n" });
  assert.equal(S.kusNa(pos, sq("e4")), null);
  assert.equal(S.zahraj(pos, "e2e4").tah, "c");
});

test("tahy: 20 legalnich tahu ve vychozi pozici", () => {
  const t = Array.from(S.tahy(S.zFen(START)));
  assert.equal(t.length, 20);
  assert.ok(t.includes("e2e4"));
  assert.ok(t.includes("g1f3"));
});

test("zahraj: nelegalni tah vrati null a vstup se nemeni", () => {
  const pos = S.zFen(START);
  assert.equal(S.zahraj(pos, "e2e5"), null);
  assert.equal(S.zahraj(pos, "xyz"), null);
  const po = S.zahraj(pos, "e2e4");
  assert.equal(S.doFen(pos), START);
  assert.equal(S.doFen(po), "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1");
});

test("zahraj: rosada e1g1 v Kiwipete presune vez na f1", () => {
  const po = S.zahraj(S.zFen(KIWI), "e1g1");
  assert.ok(po);
  assert.deepEqual(plain(S.kusNa(po, sq("g1"))), { barva: "b", typ: "k" });
  assert.deepEqual(plain(S.kusNa(po, sq("f1"))), { barva: "b", typ: "r" });
  assert.equal(S.kusNa(po, sq("h1")), null);
  assert.equal(S.kusNa(po, sq("e1")), null);
});

test("zahraj: promena pesce", () => {
  const po = S.zahraj(S.zFen("8/4P3/8/8/8/8/k7/4K3 w - - 0 1"), "e7e8n");
  assert.deepEqual(plain(S.kusNa(po, sq("e8"))), { barva: "b", typ: "n" });
});

test("vSachu", () => {
  assert.equal(S.vSachu(S.zFen(START)), false);
  const p = S.zTahu(["f2f3", "e7e5", "g2g4", "d8h4"]);
  assert.equal(S.vSachu(p.pos), true);
});

test("stav: rozehrana partie", () => {
  assert.deepEqual(plain(S.stav(S.novaPartie())), { konec: false, vitez: null, duvod: null });
});

test("stav: mat hloupeho", () => {
  const p = S.zTahu(["f2f3", "e7e5", "g2g4", "d8h4"]);
  assert.deepEqual(plain(S.stav(p)), { konec: true, vitez: "c", duvod: "mat" });
  assert.equal(S.partieTah(p, "e1f2"), false, "po konci nejde tahnout");
});

test("stav: pat", () => {
  const s = plain(S.stav(partieZFen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")));
  assert.deepEqual(s, { konec: true, vitez: null, duvod: "pat" });
});

test("stav: nedostatek materialu", () => {
  assert.equal(S.stav(partieZFen("4k3/8/8/8/8/8/8/4K3 w - - 0 1")).duvod, "material");
  assert.equal(S.stav(partieZFen("4k3/8/8/8/8/8/8/4KN2 w - - 0 1")).duvod, "material");
  assert.equal(S.stav(partieZFen("4k3/8/8/8/8/8/8/4KB2 w - - 0 1")).duvod, "material");
  // strelci na polich stejne barvy (f1 a c8 jsou svetla pole)
  assert.equal(S.stav(partieZFen("2b1k3/8/8/8/8/8/8/4KB2 w - - 0 1")).duvod, "material");
  // strelci na polich ruzne barvy
  assert.equal(S.stav(partieZFen("3bk3/8/8/8/8/8/8/4KB2 w - - 0 1")).konec, false);
  assert.equal(S.stav(partieZFen("4k3/8/8/8/8/8/8/4KR2 w - - 0 1")).konec, false);
  assert.equal(S.stav(partieZFen("4k3/8/8/8/8/8/8/3NKN2 w - - 0 1")).konec, false);
});

test("stav: trojnasobne opakovani", () => {
  const p = S.novaPartie();
  const kolo = ["g1f3", "g8f6", "f3g1", "f6g8"];
  for (const t of kolo) assert.ok(S.partieTah(p, t));
  assert.equal(S.stav(p).konec, false, "dvakrat jeste neni konec");
  for (const t of kolo) assert.ok(S.partieTah(p, t));
  assert.deepEqual(plain(S.stav(p)), { konec: true, vitez: null, duvod: "opakovani" });
  assert.equal(p.klice.length, 9);
});

test("stav: pravidlo 50 tahu", () => {
  const p = partieZFen("4k3/8/8/8/8/8/8/R3K3 w - - 99 80");
  assert.equal(S.stav(p).konec, false);
  assert.ok(S.partieTah(p, "a1a2"));
  assert.deepEqual(plain(S.stav(p)), { konec: true, vitez: null, duvod: "50tahu" });
});

test("partieTah: posledni tah a historie", () => {
  const p = S.novaPartie();
  assert.equal(S.partieTah(p, "e2e5"), false);
  assert.ok(S.partieTah(p, "e2e4"));
  assert.deepEqual(plain(p.posledni), { z: sq("e2"), na: sq("e4") });
  assert.deepEqual(plain(p.tahy), ["e2e4"]);
  assert.equal(p.klice.length, 2);
});

test("zTahu: obnoveni partie", () => {
  assert.equal(S.zTahu(["e2e4", "e7e5"]).tahy.length, 2);
  assert.equal(S.zTahu(["e2e5"]), null);
  assert.equal(S.zTahu("e2e4"), null);
  assert.equal(S.zTahu([42]), null);
  assert.equal(S.zTahu([]).tahy.length, 0);
});

test("klic: en passant jen kdyz jde brat", () => {
  const po = S.zahraj(S.zFen(START), "e2e4");
  assert.equal(S.klic(po).indexOf("e3"), -1);
  const p = S.zTahu(["e2e4", "a7a6", "e4e5", "d7d5"]);
  assert.ok(S.klic(p.pos).indexOf("d6") >= 0);
});

test("zapis: cesky zapis tahu", () => {
  const start = S.zFen(START);
  assert.equal(S.zapis(start, "g1f3"), "Jg1-f3");
  assert.equal(S.zapis(start, "e2e4"), "e2-e4");
  assert.equal(S.zapis(S.zFen(KIWI), "e1g1"), "O-O");
  assert.equal(S.zapis(S.zFen(KIWI), "e1c1"), "O-O-O");
  assert.equal(S.zapis(S.zFen(KIWI), "e5f7"), "Je5xf7");
  assert.equal(S.zapis(S.zFen(KIWI), "f3f6"), "Df3xf6");
  assert.equal(S.zapis(S.zFen("8/4P3/8/8/8/8/k7/4K3 w - - 0 1"), "e7e8q"), "e7-e8D");
  const p = S.zTahu(["e2e4", "e7e5", "d1h5", "b8c6"]);
  assert.equal(S.zapis(S.zTahu(["e2e4", "e7e5"]).pos, "d1h5"), "Dd1-h5");
  assert.equal(S.zapis(p.pos, "h5e5"), "Dh5xe5");
});

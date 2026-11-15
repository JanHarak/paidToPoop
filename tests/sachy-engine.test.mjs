import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBlock } from "./load-block.mjs";
const W = loadBlock("sachy-logika");
const S = W.SachyLogika;

const KIWI = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1";
const MAT1 = "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1";

test("engine: mat jednim tahem, tezka", () => {
  const pos = S.zFen(MAT1);
  assert.equal(S.nejlepsiTah(pos, { uroven: "tezka", casMs: 1000, rnd: () => 0 }), "d1d8");
});

test("engine: mat jednim tahem, lehka i s rnd 0.99", () => {
  const pos = S.zFen(MAT1);
  assert.equal(S.nejlepsiTah(pos, { uroven: "lehka", casMs: 1000, rnd: () => 0.99 }), "d1d8");
});

test("engine: tezka sebere nekrytou damu", () => {
  const pos = S.zFen("4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1");
  assert.equal(S.nejlepsiTah(pos, { uroven: "tezka", casMs: 1000, rnd: () => 0 }), "d1d5");
});

test("engine: tezka najde ovcaci mat", () => {
  const p = S.zTahu(["e2e4", "e7e5", "d1h5", "b8c6", "f1c4", "g8f6"]);
  assert.equal(S.nejlepsiTah(p.pos, { uroven: "tezka", casMs: 1000, rnd: () => 0, klice: p.klice }), "h5f7");
});

test("engine: deterministicky pri stejnem rnd", () => {
  for (const uroven of ["lehka", "tezka"]) {
    const pos = S.zFen(S.START_FEN);
    const a = S.nejlepsiTah(pos, { uroven, casMs: 1000, rnd: () => 0 });
    const b = S.nejlepsiTah(pos, { uroven, casMs: 1000, rnd: () => 0 });
    assert.equal(a, b, uroven);
    assert.ok(S.tahy(pos).includes(a), uroven + ": " + a);
  }
});

test("engine: nemeni vstupni pozici", () => {
  const pos = S.zFen(KIWI);
  S.nejlepsiTah(pos, { uroven: "lehka", casMs: 1000, rnd: () => 0.5 });
  assert.equal(S.doFen(pos), KIWI);
});

test("engine: tezka na Kiwipete do 2500 ms", () => {
  const pos = S.zFen(KIWI);
  const t0 = Date.now();
  const tah = S.nejlepsiTah(pos, { uroven: "tezka", casMs: 1500, rnd: () => 0 });
  const ms = Date.now() - t0;
  assert.ok(ms < 2500, "trvalo " + ms + " ms");
  assert.ok(S.tahy(pos).includes(tah), "neplatny tah " + tah);
});

test("engine: pat vrati null", () => {
  const pos = S.zFen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
  assert.equal(S.nejlepsiTah(pos, { uroven: "tezka", casMs: 1000, rnd: () => 0 }), null);
  assert.equal(S.nejlepsiTah(pos, { uroven: "lehka", casMs: 1000, rnd: () => 0 }), null);
});

test("engine: lehka vybira z nejlepsich tahu podle rnd", () => {
  // Bila muze vzit nekrytou damu, ostatni tahy jsou vyrazne horsi.
  const pos = S.zFen("4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1");
  assert.equal(S.nejlepsiTah(pos, { uroven: "lehka", casMs: 1000, rnd: () => 0 }), "d1d5");
  const jine = S.nejlepsiTah(pos, { uroven: "lehka", casMs: 1000, rnd: () => 0.99 });
  assert.ok(S.tahy(pos).includes(jine));
  assert.notEqual(jine, "d1d5");
});

test("engine: tah do treti opakovani hodnoti jako remizu", () => {
  // Bila prohrava (vez proti dame). Va1-b1 vez normalne ztraci, ale pozice po nem
  // uz v historii byla dvakrat, takze tah dava remizu (0), coz je lepsi nez prohra.
  // Pultahy 10: pozice se mohla opakovat (po braní nebo tahu pescem by nemohla).
  const pos = S.zFen("6k1/5p1p/6p1/8/4q3/8/5PPP/R5K1 w - - 10 30");
  const bez = S.nejlepsiTah(pos, { uroven: "tezka", casMs: 1000, rnd: () => 0 });
  assert.notEqual(bez, "a1b1");
  const poB1 = S.klic(S.zahraj(pos, "a1b1"));
  const klice = [poB1, "x", poB1, "y", S.klic(pos)];
  assert.equal(S.nejlepsiTah(pos, { uroven: "tezka", casMs: 1000, rnd: () => 0, klice }), "a1b1");
});

test("engine: spustVWorkeru odpovida na zpravu", () => {
  const zpravy = [];
  W.postMessage = (m) => zpravy.push(m);
  S.spustVWorkeru("");
  assert.equal(typeof W.onmessage, "function");
  W.onmessage({ data: { id: 7, tahy: ["e2e4", "e7e5", "d1h5", "b8c6", "f1c4", "g8f6"], uroven: "lehka" } });
  assert.deepEqual(JSON.parse(JSON.stringify(zpravy[0])), { id: 7, tah: "h5f7" });
  W.onmessage({ data: { id: 8, tahy: ["e2e5"], uroven: "lehka" } });
  assert.deepEqual(JSON.parse(JSON.stringify(zpravy[1])), { id: 8, tah: null });
});

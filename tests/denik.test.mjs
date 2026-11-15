import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBlock } from "./load-block.mjs";
const D = loadBlock("denik-logika").DenikLogika;
const J = (x) => JSON.parse(JSON.stringify(x));
const t = (y, m, d, h, mi) => new Date(y, m, d, h || 0, mi || 0).getTime();
const NOW = t(2026, 10, 16, 9, 12);
const z = (start, min, castka, mena, zdroj, id) =>
  D.novyZapis(start, min, castka, mena || "CZK", zdroj || "stopky", id || "i" + start);

test("konstanty", () => {
  assert.equal(D.KEY, "zachodova-denik-v1");
  assert.equal(D.MIN_MS, 10000);
  assert.equal(D.STRANKA_DNI, 30);
});

test("novyZapis vrací všech šest polí", () => {
  assert.deepEqual(J(D.novyZapis(NOW, 4.5, 98, "CZK", "stopky", "a1")),
    { id: "a1", start: NOW, min: 4.5, castka: 98, mena: "CZK", zdroj: "stopky" });
});
test("novyZapis null pro neplatné vstupy", () => {
  assert.equal(D.novyZapis(NOW, 0, 98, "CZK", "stopky", "a"), null);
  assert.equal(D.novyZapis(NOW, -1, 98, "CZK", "stopky", "a"), null);
  assert.equal(D.novyZapis(NOW, 4, -5, "CZK", "stopky", "a"), null);
  assert.equal(D.novyZapis(NOW, 4, 98, "CZK", "x", "a"), null);
  assert.equal(D.novyZapis(NOW, 4, 98, "", "stopky", "a"), null);
  assert.equal(D.novyZapis(NOW, "abc", 98, "CZK", "stopky", "a"), null);
  assert.equal(D.novyZapis(NOW, 4, NaN, "CZK", "rucne", "a"), null);
  assert.equal(D.novyZapis("x", 4, 98, "CZK", "rucne", "a"), null);
});

test("parse null a undefined", () => {
  assert.deepEqual(J(D.parse(null)), { zapisy: [], poskozeno: false });
  assert.deepEqual(J(D.parse(undefined)), { zapisy: [], poskozeno: false });
});
test("parse nečitelný JSON nebo chybějící zapisy je poškozené", () => {
  assert.deepEqual(J(D.parse("{")), { zapisy: [], poskozeno: true });
  assert.deepEqual(J(D.parse('{"x":1}')), { zapisy: [], poskozeno: true });
});
test("parse vynechá neplatné položky", () => {
  const ok = z(NOW, 4, 50, "CZK", "stopky", "ok");
  const r = D.parse('{"zapisy":[' + JSON.stringify(ok) + ',{"id":1}]}');
  assert.equal(r.poskozeno, false);
  assert.deepEqual(J(r.zapisy), [J(ok)]);
});
test("parse převede číselné id na řetězec", () => {
  const raw = '{"zapisy":[{"id":7,"start":' + NOW + ',"min":4,"castka":50,"mena":"CZK","zdroj":"stopky"}]}';
  const r = D.parse(raw);
  assert.equal(r.zapisy.length, 1);
  assert.strictEqual(r.zapisy[0].id, "7");
  assert.equal(D.odeber(r.zapisy, "7").odebrany.id, "7");
});
test("round-trip", () => {
  const a = [z(NOW, 4, 50, "CZK", "stopky", "a"), z(NOW + 1, 2, 3, "EUR", "rucne", "b")];
  assert.deepEqual(J(D.parse(D.serializuj(a))), { zapisy: J(a), poskozeno: false });
});

test("odeber nemění vstup a vrací odebraný", () => {
  const a = [z(1, 1, 1, "CZK", "stopky", "a"), z(2, 1, 1, "CZK", "stopky", "b")];
  const r = D.odeber(a, "a");
  assert.equal(a.length, 2);
  assert.equal(r.zapisy.length, 1);
  assert.equal(r.zapisy[0].id, "b");
  assert.equal(r.odebrany.id, "a");
  assert.notEqual(r.zapisy, a);
});
test("odeber neexistující id", () => {
  const a = [z(1, 1, 1, "CZK", "stopky", "a")];
  const r = D.odeber(a, "zzz");
  assert.equal(r.odebrany, null);
  assert.equal(r.zapisy.length, 1);
  assert.notEqual(r.zapisy, a);
});

test("zacatekDne", () => assert.equal(D.zacatekDne(NOW), t(2026, 10, 16)));
test("zacatekTydne pro neděli", () => assert.equal(D.zacatekTydne(t(2026, 10, 22, 15, 0)), t(2026, 10, 16)));
test("zacatekTydne pro pondělí", () => assert.equal(D.zacatekTydne(NOW), t(2026, 10, 16)));
test("zacatekMesice", () => assert.equal(D.zacatekMesice(NOW), t(2026, 10, 1)));

test("dnesni jen od půlnoci a seřazené", () => {
  const vcera = z(t(2026, 10, 15, 23, 59), 3, 10, "CZK", "stopky", "v");
  const p = z(t(2026, 10, 16, 8, 0), 3, 10, "CZK", "stopky", "p");
  const o = z(t(2026, 10, 16, 0, 0), 3, 10, "CZK", "stopky", "o");
  const r = D.dnesni([p, vcera, o], NOW);
  assert.deepEqual(J(r.map((x) => x.id)), ["o", "p"]);
});

test("souhrn drží měny zvlášť a respektuje meze", () => {
  const a = [z(100, 2, 100, "CZK", "stopky", "a"), z(150, 3, 4, "EUR", "stopky", "b"), z(200, 5, 9, "CZK", "stopky", "c")];
  assert.deepEqual(J(D.souhrn(a, 100, 200)), { pocet: 2, min: 5, castky: { CZK: 100, EUR: 4 } });
});

test("vyuctovani přes tři měsíce", () => {
  const a = [
    z(t(2026, 10, 16, 8), 4, 40, "CZK", "stopky", "1"),  // dnes
    z(t(2026, 10, 16, 9), 6, 60, "CZK", "stopky", "2"),  // dnes
    z(t(2026, 10, 18, 8), 2, 20, "CZK", "rucne", "3"),   // budoucnost později v týdnu, nepočítá se do dnes
    z(t(2026, 10, 3, 8), 8, 80, "CZK", "stopky", "4"),   // měsíc, ne týden
    z(t(2026, 9, 5, 8), 10, 100, "CZK", "stopky", "5"),  // říjen
    z(t(2026, 8, 5, 8), 12, 120, "CZK", "stopky", "6")   // září
  ];
  const v = D.vyuctovani(a, NOW);
  assert.equal(v.dnes.pocet, 2);
  assert.deepEqual(J(v.dnes.castky), { CZK: 100 });
  assert.equal(v.tyden.pocet, 3);
  assert.equal(v.mesic.pocet, 4);
  assert.equal(v.celkem.pocet, 6);
  assert.deepEqual(J(v.celkem.castky), { CZK: 420 });
  assert.equal(v.prumerMin, (4 + 6 + 2 + 8 + 10 + 12) / 6);
  // 5 různých dní se zápisem: 16., 18., 3.11., 5.10., 5.9.
  assert.deepEqual(J(v.prumerNaDen), { CZK: 84 });
});
test("vyuctovani prázdné", () => {
  const v = D.vyuctovani([], NOW);
  assert.equal(v.celkem.pocet, 0);
  assert.equal(v.prumerMin, 0);
  assert.deepEqual(J(v.prumerNaDen), {});
});

test("prumerStopek ignoruje ruční zápisy", () => {
  const a = [z(1, 4, 1, "CZK", "stopky", "a"), z(2, 6, 1, "CZK", "stopky", "b"), z(3, 100, 1, "CZK", "rucne", "c")];
  assert.equal(D.prumerStopek(a), 5);
  assert.equal(D.prumerStopek([z(3, 100, 1, "CZK", "rucne", "c")]), null);
  assert.equal(D.prumerStopek([]), null);
});

test("poDnech 35 dní, 30 skupin, dalsi", () => {
  const a = [];
  for (var i = 0; i < 35; i++) {
    a.push(z(t(2026, 10, 16 - i, 8), 3, 10, "CZK", "stopky", "r" + i));
    a.push(z(t(2026, 10, 16 - i, 14), 3, 10, "CZK", "stopky", "p" + i));
  }
  const r = D.poDnech(a, NOW, 30);
  assert.equal(r.skupiny.length, 30);
  assert.equal(r.dalsi, true);
  assert.equal(r.skupiny[0].start, t(2026, 10, 16));
  assert.equal(r.skupiny[0].nadpis, "Dnes");
  assert.deepEqual(J(r.skupiny[0].zapisy.map((x) => x.id)), ["p0", "r0"]);
  assert.equal(r.skupiny[0].souhrn.pocet, 2);
  assert.equal(r.skupiny[1].start, t(2026, 10, 15));
});
test("poDnech bez dalších", () => {
  const r = D.poDnech([z(NOW, 3, 1, "CZK", "stopky", "a")], NOW, 30);
  assert.equal(r.skupiny.length, 1);
  assert.equal(r.dalsi, false);
});

test("nadpisDne", () => {
  assert.equal(D.nadpisDne(t(2026, 10, 16), NOW), "Dnes");
  assert.equal(D.nadpisDne(t(2026, 10, 15), NOW), "Včera");
  assert.equal(D.nadpisDne(t(2026, 10, 9), NOW), "po 9. 11.");
  assert.equal(D.nadpisDne(t(2025, 10, 10), NOW), "po 10. 11. 2025");
});

test("formatCastky pořadí měn a prázdné", () => {
  const fmt = (c, m) => c + " " + m;
  assert.equal(D.formatCastky({ EUR: 4, CZK: 312 }, fmt, "CZK"), "312 CZK + 4 EUR");
  assert.equal(D.formatCastky({ PLN: 1, USD: 2, EUR: 3, AUD: 4, CZK: 5 }, fmt, "CZK"),
    "5 CZK + 3 EUR + 2 USD + 4 AUD + 1 PLN");
  assert.equal(D.formatCastky({}, fmt, "CZK"), "0 CZK");
});

test("fmtMin", () => {
  assert.equal(D.fmtMin(4.54), "4,5 min");
  assert.equal(D.fmtMin(6), "6 min");
  assert.equal(D.fmtMin(6.02), "6 min");
});

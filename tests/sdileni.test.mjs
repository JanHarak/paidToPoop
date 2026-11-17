import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBlock } from "./load-block.mjs";
const L = loadBlock("sdileni-logika").SdileniLogika;
const J = (x) => JSON.parse(JSON.stringify(x));
const H = { dnes: "250 Kč", navsteva: "83,33 Kč", mesic: "5 000 Kč", rok: "55 000 Kč", procent: "5,2 %", pocet: 3 };

test("obsah obrázku pro víc návštěv", () => {
  assert.deepEqual(J(L.obsah(H, "seraber.vercel.app")), {
    nadpis: "Záchodová kalkulačka",
    podnadpis: "Během svých návštěv jsem vydělal/a",
    castka: "250 Kč",
    radky: [["Za návštěvu", "83,33 Kč"], ["Za měsíc", "5 000 Kč"], ["Za rok", "55 000 Kč"]],
    hlaska: "Na záchodě jsem strávil/a 5,2 % pracovní doby.",
    paticka: "seraber.vercel.app"
  });
});
test("jedna návštěva: jednotné číslo", () => {
  const o = L.obsah(Object.assign({}, H, { dnes: "83,33 Kč", pocet: 1 }), "x.cz");
  assert.equal(o.podnadpis, "Během své návštěvy na záchodě jsem vydělal/a");
  assert.equal(o.castka, "83,33 Kč");
});
test("nula návštěv: jako jedna návštěva, částka za návštěvu", () => {
  const o = L.obsah(Object.assign({}, H, { dnes: "0,00 Kč", pocet: 0 }), "x.cz");
  assert.equal(o.podnadpis, "Během své návštěvy na záchodě jsem vydělal/a");
  assert.equal(o.castka, "83,33 Kč");
});
test("bez podílu pracovní doby není hláška", () => {
  assert.equal(L.obsah(Object.assign({}, H, { procent: "0 %" }), "x.cz").hlaska, "");
  assert.equal(L.obsah(Object.assign({}, H, { procent: "" }), "x.cz").hlaska, "");
});
test("adresa: skutečná doména, jinak výchozí", () => {
  assert.equal(L.adresa("seraber.vercel.app"), "seraber.vercel.app");
  assert.equal(L.adresa("janharak.github.io"), "janharak.github.io");
  assert.equal(L.adresa("localhost:8000"), "seraber.vercel.app");
  assert.equal(L.adresa("127.0.0.1:8000"), "seraber.vercel.app");
  assert.equal(L.adresa(""), "seraber.vercel.app");
});
test("název souboru podle data", () => {
  assert.equal(L.nazevSouboru(new Date(2026, 10, 7)), "zachodova-kalkulacka-2026-11-07.png");
});
test("obsah obrázku pro měření stopkami", () => {
  assert.deepEqual(J(L.obsahMereni({ cas: "4:12", castka: "84,00 Kč", zaMinutu: "20,00 Kč" }, "seraber.vercel.app")), {
    nadpis: "Záchodová kalkulačka",
    podnadpis: "Během své návštěvy na záchodě jsem vydělal/a",
    castka: "84,00 Kč",
    radky: [["Čas na záchodě", "4:12"], ["Za minutu", "20,00 Kč"]],
    hlaska: "",
    paticka: "seraber.vercel.app"
  });
});

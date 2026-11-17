import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBlock } from "./load-block.mjs";
const L = loadBlock("sdileni-logika").SdileniLogika;
const J = (x) => JSON.parse(JSON.stringify(x));
const H = { dnes: "250 Kč", navsteva: "83,33 Kč", mesic: "5 000 Kč", rok: "55 000 Kč", procent: "5,2 %" };

test("obsah obrázku", () => {
  assert.deepEqual(J(L.obsah(H, "seraber.vercel.app")), {
    nadpis: "Záchodová kalkulačka",
    podnadpis: "Dnes vydělám na záchodě",
    castka: "250 Kč",
    radky: [["Za návštěvu", "83,33 Kč"], ["Za měsíc", "5 000 Kč"], ["Za rok", "55 000 Kč"]],
    hlaska: "Na záchodě strávím 5,2 % pracovní doby.",
    paticka: "seraber.vercel.app"
  });
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

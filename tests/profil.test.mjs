import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBlock } from "./load-block.mjs";
const P = loadBlock("profil-logika").ProfilLogika;
const J = (x) => JSON.parse(JSON.stringify(x));
const VYCHOZI = { prezdivka: "", avatar: "", mode: "md", castka: 0, mena: "CZK", hodiny: 0, dni: 0, ptatSe: false };

test("konstanty", () => {
  assert.equal(P.KEY, "zachodova-profil-v1");
  assert.deepEqual(J(P.AVATARY), ["🧻", "🚽", "👑", "🦆", "💩", "🐻", "🦄", "🚀"]);
  assert.deepEqual(J(P.MENY), ["CZK", "EUR", "USD"]);
  assert.equal(P.MAX_PREZDIVKA, 24);
});

test("vychozi", () => {
  assert.deepEqual(J(P.vychozi()), VYCHOZI);
  assert.notEqual(P.vychozi(), P.vychozi());
});

test("normalizuj platný profil s čísly jako řetězci", () => {
  assert.deepEqual(
    J(P.normalizuj({ castka: "1250,5", hodiny: "8", dni: "20", mode: "sal", mena: "EUR", avatar: "🦆", prezdivka: "Jan" })),
    { prezdivka: "Jan", avatar: "🦆", mode: "sal", castka: 1250.5, mena: "EUR", hodiny: 8, dni: 20, ptatSe: false });
});
test("normalizuj neplatné hodnoty", () => {
  assert.equal(P.normalizuj({ castka: -5 }).castka, 0);
  assert.equal(P.normalizuj({ hodiny: 25 }).hodiny, 0);
  assert.equal(P.normalizuj({ dni: 20.5 }).dni, 0);
  assert.equal(P.normalizuj({ dni: 32 }).dni, 0);
  assert.equal(P.normalizuj({ mena: "GBP" }).mena, "CZK");
  assert.equal(P.normalizuj({ avatar: "🐸" }).avatar, "");
  assert.equal(P.normalizuj({ mode: "x" }).mode, "md");
});
test("normalizuj přezdívku", () => {
  const dlouha = "abcdefghij".repeat(3);
  assert.equal(P.normalizuj({ prezdivka: dlouha }).prezdivka, dlouha.slice(0, 24));
  assert.equal(P.normalizuj({ prezdivka: 5 }).prezdivka, "");
});
test("normalizuj zahodí neznámé klíče a zvládne null", () => {
  assert.deepEqual(J(P.normalizuj({ foo: 1 })), VYCHOZI);
  assert.deepEqual(J(P.normalizuj(null)), VYCHOZI);
});

test("parse null je chybějící", () => {
  assert.deepEqual(J(P.parse(null)), { profil: VYCHOZI, chybi: true, poskozeno: false });
});
test("parse poškozené vstupy", () => {
  for (const raw of ["{", "[1]", "5"]) {
    assert.deepEqual(J(P.parse(raw)), { profil: VYCHOZI, chybi: false, poskozeno: true });
  }
});
test("parse platný JSON s neplatným polem", () => {
  const r = J(P.parse('{"castka":"abc"}'));
  assert.equal(r.profil.castka, 0);
  assert.equal(r.chybi, false);
  assert.equal(r.poskozeno, false);
});

test("zKalkulacky nový tvar", () => {
  assert.deepEqual(
    J(P.zKalkulacky('{"mode":"sal","amounts":{"md":"9000","sal":"80000"},"cur":"EUR","hours":"8","dm":"21"}')),
    { mode: "sal", castka: 80000, mena: "EUR", hodiny: 8, dni: 21, prezdivka: "", avatar: "", ptatSe: false });
});
test("zKalkulacky starý tvar", () => {
  const p = J(P.zKalkulacky('{"md":"9000","cur":"CZK","hours":"8"}'));
  assert.equal(p.mode, "md");
  assert.equal(p.castka, 9000);
});
test("zKalkulacky null a nečitelné", () => {
  assert.deepEqual(J(P.zKalkulacky(null)), VYCHOZI);
  assert.deepEqual(J(P.zKalkulacky("{")), VYCHOZI);
});

test("serializuj a parse jsou inverzní", () => {
  const p = { prezdivka: "Jan", avatar: "👑", mode: "sal", castka: 80000, mena: "USD", hodiny: 7.5, dni: 21, ptatSe: true };
  assert.deepEqual(J(P.parse(P.serializuj(p)).profil), p);
});

test("zaMinutu", () => {
  assert.equal(P.zaMinutu({ mode: "md", castka: 9600, hodiny: 8, dni: 0 }), 20);
  assert.equal(P.zaMinutu({ mode: "sal", castka: 96000, hodiny: 8, dni: 20 }), 10);
  assert.equal(P.zaMinutu({ mode: "md", castka: 9600, hodiny: 0, dni: 0 }), 0);
  assert.equal(P.zaMinutu({ mode: "sal", castka: 96000, hodiny: 8, dni: 0 }), 0);
});

test("normalizuj ptatSe: jen skutečné true", () => {
  assert.equal(P.normalizuj({ ptatSe: true }).ptatSe, true);
  assert.equal(P.normalizuj({ ptatSe: false }).ptatSe, false);
  assert.equal(P.normalizuj({ ptatSe: "ano" }).ptatSe, false);
  assert.equal(P.normalizuj({}).ptatSe, false);
});
test("ptatSePoSpusteni: volba, sazba a neběžící stopky", () => {
  const p = { mode: "md", castka: 9600, hodiny: 8, ptatSe: true };
  assert.equal(P.ptatSePoSpusteni(p, false), true);
  assert.equal(P.ptatSePoSpusteni(p, true), false);
  assert.equal(P.ptatSePoSpusteni(Object.assign({}, p, { ptatSe: false }), false), false);
  assert.equal(P.ptatSePoSpusteni(Object.assign({}, p, { castka: 0 }), false), false);
});

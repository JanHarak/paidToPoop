import { test } from "node:test";
import assert from "node:assert/strict";
// Objects come from a vm realm, so compare via JSON (prototypes differ).
const eq = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));
import { loadBlock } from "./load-block.mjs";
const S = loadBlock("sachy-logika").SachyLogika;

const VYCHOZI = { vyhry: 0, prohry: 0, remizy: 0, barva: "b", obtiznost: "lehka", partie: null };

test("parseUlozeni: null, rozbity JSON a pole davaji vychozi", () => {
  eq(S.parseUlozeni(null), VYCHOZI);
  eq(S.parseUlozeni("{bad"), VYCHOZI);
  eq(S.parseUlozeni("[]"), VYCHOZI);
});

test("parseUlozeni: platny objekt projde beze zmeny", () => {
  const o = { vyhry: 3, prohry: 2, remizy: 1, barva: "c", obtiznost: "tezka",
    partie: { barva: "c", obtiznost: "tezka", tahy: ["e2e4", "e7e5", "a7a8q"] } };
  eq(S.parseUlozeni(JSON.stringify(o)), o);
});

test("parseUlozeni: zaporne a nenumericke pocty jsou 0", () => {
  const r = S.parseUlozeni(JSON.stringify({ vyhry: -1, prohry: "x", remizy: null }));
  assert.equal(r.vyhry, 0);
  assert.equal(r.prohry, 0);
  assert.equal(r.remizy, 0);
});

test("parseUlozeni: neplatna barva a obtiznost se vrati na vychozi", () => {
  const r = S.parseUlozeni(JSON.stringify({ barva: "x", obtiznost: "stredni" }));
  assert.equal(r.barva, "b");
  assert.equal(r.obtiznost, "lehka");
});

test("parseUlozeni: neplatny tah nebo hodnoty v partii davaji partie null", () => {
  const p = (partie) => S.parseUlozeni(JSON.stringify({ partie })).partie;
  assert.equal(p({ barva: "b", obtiznost: "lehka", tahy: ["e2e9"] }), null);
  assert.equal(p({ barva: "b", obtiznost: "lehka", tahy: "e2e4" }), null);
  assert.equal(p({ barva: "x", obtiznost: "lehka", tahy: [] }), null);
  assert.equal(p({ barva: "b", obtiznost: "zla", tahy: [] }), null);
  eq(p({ barva: "b", obtiznost: "lehka", tahy: [] }), { barva: "b", obtiznost: "lehka", tahy: [] });
});

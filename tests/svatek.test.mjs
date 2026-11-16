import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBlock } from "./load-block.mjs";
const L = loadBlock("svatek-logika").SvatekLogika;
const J = (x) => JSON.parse(JSON.stringify(x));
// Real responses of https://svatkyapi.cz/api/day/:date (trimmed to the fields we use).
const den = (name, isHoliday, holidayName) => ({ date: "2026-01-01", name, isHoliday, holidayName });

test("konstanty", () => {
  assert.equal(L.KEY, "zachodova-svatek-v1");
  assert.equal(L.url("2026-09-28"), "https://svatkyapi.cz/api/day/2026-09-28");
});

test("datumKlic podle místního času", () => {
  assert.equal(L.datumKlic(new Date(2026, 8, 5, 23, 59)), "2026-09-05");
  assert.equal(L.datumKlic(new Date(2026, 11, 31, 0, 0)), "2026-12-31");
});

test("jeJmeno: jména ano, názvy svátků ne", () => {
  ["Otmar", "Václav", "Adam a Eva", "Cyril a Metoděj", "Štěpán", "Horymír"].forEach((t) => assert.equal(L.jeJmeno(t), true, t));
  ["Nový rok", "Den vítězství", "Svátek práce", "Boží hod vánoční", "Den upálení mistra Jana Husa", "", null, 5].forEach((t) =>
    assert.equal(L.jeJmeno(t), false, String(t)));
});

test("zOdpovedi: běžný den", () => {
  assert.deepEqual(J(L.zOdpovedi(den("Otmar", false, null))), { jmeno: "Otmar", svatek: null });
});
test("zOdpovedi: jméno a státní svátek", () => {
  assert.deepEqual(J(L.zOdpovedi(den("Václav", true, "Den české státnosti"))), { jmeno: "Václav", svatek: "Den české státnosti" });
  assert.deepEqual(J(L.zOdpovedi(den("Adam a Eva", true, "Štědrý den"))), { jmeno: "Adam a Eva", svatek: "Štědrý den" });
});
test("zOdpovedi: svátek bez jména", () => {
  assert.deepEqual(J(L.zOdpovedi(den("Nový rok", true, "Nový rok / Den obnovy samostatného českého státu"))),
    { jmeno: null, svatek: "Nový rok / Den obnovy samostatného českého státu" });
  assert.deepEqual(J(L.zOdpovedi(den("Den vítězství", true, "Den vítězství"))), { jmeno: null, svatek: "Den vítězství" });
  assert.deepEqual(J(L.zOdpovedi(den("Boží hod vánoční", true, "1. svátek vánoční"))), { jmeno: null, svatek: "1. svátek vánoční" });
});
test("zOdpovedi: nesmysl dá null", () => {
  assert.equal(L.zOdpovedi(null), null);
  assert.equal(L.zOdpovedi("x"), null);
  assert.equal(L.zOdpovedi({ name: 5 }), null);
});

test("text: s přezdívkou a bez", () => {
  assert.equal(L.text({ jmeno: "Otmar", svatek: null }, "Jan"), "Ahoj Jan, dnes má svátek Otmar.");
  assert.equal(L.text({ jmeno: "Otmar", svatek: null }, ""), "Dnes má svátek Otmar.");
});
test("text: jméno má přednost, státní svátek se pak neukazuje", () => {
  assert.equal(L.text({ jmeno: "Václav", svatek: "Den české státnosti" }, "Jan"), "Ahoj Jan, dnes má svátek Václav.");
});
test("text: svátek bez jména", () => {
  assert.equal(L.text({ jmeno: null, svatek: "Den vítězství" }, "Jan"), "Ahoj Jan, dnes je státní svátek: Den vítězství.");
  assert.equal(L.text({ jmeno: null, svatek: "Den vítězství" }, ""), "Dnes je státní svátek: Den vítězství.");
});
test("text: přezdívka jen z mezer se nepočítá, nic k zobrazení = prázdný text", () => {
  assert.equal(L.text({ jmeno: "Otmar", svatek: null }, "   "), "Dnes má svátek Otmar.");
  assert.equal(L.text({ jmeno: null, svatek: null }, "Jan"), "");
  assert.equal(L.text(null, "Jan"), "");
});

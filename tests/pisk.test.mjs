import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBlock } from "./load-block.mjs";
const P = loadBlock("pisk-logika").PiskLogika;
const at = (x, y) => y * 25 + x;
const LEVELS = ["lehka", "tezsi"];

function stateWith(stones, turn) {
  const s = P.newGame(turn);
  for (const [x, y, who] of stones) s.board[at(x, y)] = who;
  return s;
}

test("newGame: prazdna deska", () => {
  const s = P.newGame(1);
  assert.equal(s.board.length, 625);
  assert.ok(s.board.every((v) => v === 0));
  assert.equal(s.turn, 1);
  assert.equal(s.over, false);
  assert.equal(s.last, -1);
  assert.equal(P.newGame(2).turn, 2);
});

test("place: odmita neplatne tahy", () => {
  const s = P.newGame(1);
  assert.equal(P.place(s, at(3, 3), 1), true);
  assert.equal(P.place(s, at(3, 3), 2), false, "obsazeno");
  assert.equal(P.place(s, at(4, 4), 1), false, "spatny hrac");
  assert.equal(P.place(s, -1, 2), false);
  assert.equal(P.place(s, 625, 2), false);
});

test("place: po konci hry nejde tahnout", () => {
  const s = P.newGame(1);
  for (let x = 0; x < 5; x++) {
    P.place(s, at(x, 0), 1);
    if (x < 4) P.place(s, at(x, 5), 2);
  }
  assert.equal(s.over, true);
  assert.equal(P.place(s, at(10, 10), s.turn), false);
});

function playLine(cells) {
  const s = P.newGame(1);
  let k = 0;
  cells.forEach((c, i) => {
    P.place(s, c, 1);
    if (i < cells.length - 1) {
      // druhy hrac tahne daleko od sebe (rozptyleno, bez petky)
      P.place(s, at((k * 3) % 25, 12 + Math.floor(k / 8) * 3), 2);
      k++;
    }
  });
  return s;
}

const dirs = {
  horizontalni: [0, 1, 2, 3, 4].map((x) => at(x, 0)),
  vertikalni: [20, 21, 22, 23, 24].map((y) => at(24, y)),
  diagonala: [20, 21, 22, 23, 24].map((v) => at(v, v)),
  protidiagonala: [at(4, 0), at(3, 1), at(2, 2), at(1, 3), at(0, 4)]
};
for (const name of Object.keys(dirs)) {
  test("vyhra: " + name, () => {
    const s = playLine(dirs[name]);
    assert.equal(s.over, true);
    assert.equal(s.winner, 1);
    assert.deepEqual([...s.line].sort((a, b) => a - b), [...dirs[name]].sort((a, b) => a - b));
  });
}

test("ctyri s mezerou neni vyhra", () => {
  const s = P.newGame(1);
  for (const x of [0, 1, 2, 4]) {
    P.place(s, at(x, 0), 1);
    P.place(s, at(x, 10 + (x > 2 ? 3 : 0)), 2);
  }
  assert.equal(s.over, false);
});

test("overline: sestka je vyhra s delkou 6", () => {
  const s = stateWith([[0, 0, 1], [1, 0, 1], [2, 0, 1], [4, 0, 1], [5, 0, 1]], 1);
  assert.equal(P.place(s, at(3, 0), 1), true);
  assert.equal(s.over, true);
  assert.equal(s.line.length, 6);
});

test("pretekani radku nevyhrava", () => {
  const s = stateWith([[22, 0, 1], [23, 0, 1], [24, 0, 1], [0, 1, 1]], 1);
  P.place(s, at(1, 1), 1);
  assert.equal(s.over, false);
  assert.equal(P.winLine(s.board, 25, at(1, 1)), null);
});

test("remiza: plna deska bez petky", () => {
  const s = P.newGame(1);
  for (let y = 0; y < 25; y++) {
    for (let x = 0; x < 25; x++) s.board[at(x, y)] = ((x + 2 * y) >> 1) % 2 === 0 ? 1 : 2;
  }
  for (let i = 0; i < 625; i++) assert.equal(P.winLine(s.board, 25, i), null);
  const last = at(12, 12);
  const who = s.board[last];
  s.board[last] = 0;
  s.turn = who;
  assert.equal(P.place(s, last, who), true);
  assert.equal(s.over, true);
  assert.equal(s.winner, 0);
});

test("bestMove: prazdna deska da stred", () => {
  for (const lv of LEVELS) {
    assert.equal(P.bestMove(P.newGame(2), lv, () => 0.5), at(12, 12));
  }
});

test("bestMove: vyhra ma prednost", () => {
  const stones = [[5, 10, 2], [6, 10, 2], [7, 10, 2], [8, 10, 2], [5, 15, 1], [6, 15, 1], [7, 15, 1]];
  for (const lv of LEVELS) {
    const s = stateWith(stones, 2);
    const m = P.bestMove(s, lv, () => 0);
    assert.ok(m === at(4, 10) || m === at(9, 10), lv + " " + m);
  }
});

test("bestMove: zablokuje petku", () => {
  const stones = [[5, 10, 1], [6, 10, 1], [7, 10, 1], [8, 10, 1], [4, 10, 2]];
  for (const lv of LEVELS) {
    assert.equal(P.bestMove(stateWith(stones, 2), lv, () => 0), at(9, 10));
  }
});

test("bestMove tezsi: zablokuje otevrenou ctyrku", () => {
  const s = stateWith([[5, 10, 1], [6, 10, 1], [7, 10, 1]], 2);
  const m = P.bestMove(s, "tezsi", () => 0);
  assert.ok(m === at(4, 10) || m === at(8, 10), String(m));
});

test("bestMove: deterministicky pri stejnem rnd", () => {
  const s = stateWith([[10, 10, 1], [11, 11, 2], [12, 10, 1]], 2);
  for (const lv of LEVELS) {
    assert.equal(P.bestMove(s, lv, () => 0), P.bestMove(s, lv, () => 0));
  }
});

test("bestMove tezsi: rychlost na rozehrane desce", () => {
  let seed = 12345;
  const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let s;
  for (;;) {
    s = P.newGame(1);
    let n = 0;
    while (n < 120) {
      const i = Math.floor(rng() * 625);
      if (s.board[i]) continue;
      s.board[i] = n % 2 ? 2 : 1;
      n++;
    }
    if (s.board.every((v, i) => !v || !P.winLine(s.board, 25, i))) break;
  }
  s.turn = 1;
  const t0 = Date.now();
  const m = P.bestMove(s, "tezsi", () => 0.3);
  assert.ok(Date.now() - t0 < 200, "pomale: " + (Date.now() - t0) + " ms");
  assert.equal(s.board[m], 0);
});

test("parseStats", () => {
  const def = { vyhry: 0, prohry: 0, remizy: 0, obtiznost: "lehka" };
  assert.deepEqual({ ...P.parseStats(null) }, def);
  assert.deepEqual({ ...P.parseStats("{bad") }, def);
  assert.deepEqual(
    { ...P.parseStats('{"vyhry":3,"prohry":-1,"remizy":"x","obtiznost":"tezsi"}') },
    { vyhry: 3, prohry: 0, remizy: 0, obtiznost: "tezsi" }
  );
});

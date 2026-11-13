import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBlock } from "./load-block.mjs";
const H = loadBlock("hra-logika").HraLogika;
const maze = H.parseMaze(H.MAZE);

const SMALL = [
  "##.##",
  "##.##",
  ".....",
  "##.##",
  "##.##"
];
const CORRIDOR = [
  "#####",
  "#...#",
  "#####"
];

function seq(values) {
  var i = 0;
  return function () { var v = values[i % values.length]; i++; return v; };
}
function idx(x, y) { return y * maze.w + x; }
function ent(x, y, dir) { return { x: x, y: y, dir: dir || null, next: null, speed: 0 }; }

// Fresh game already in "play" with enemies parked far away in chase mode
// (not moving: speed recomputed each tick, so park them in corners and stop them
// by making them wait in the pen instead when needed).
function playing() {
  var s = H.newGame(maze, seq([0.1, 0.5, 0.9]));
  s.phase = "play";
  return s;
}
function park(s) {
  // keep all enemies waiting in the pen for a long time
  s.enemies.forEach(function (en) { en.releaseAt = 1e9; });
}
function plain(o) { return JSON.parse(JSON.stringify(o)); }
function types(events) { return events.map(function (e) { return e.type; }); }

test("constants", () => {
  assert.deepEqual(plain(H.ENEMIES), ["sef", "pm", "kolega", "hr"]);
  assert.deepEqual(plain(H.RELEASE_S), { sef: 0, pm: 3, kolega: 6, hr: 9 });
  assert.deepEqual(plain(H.POINTS), { coin: 10, powerup: 50, enemy: [200, 400, 800, 1600] });
  assert.equal(typeof H.PLAYER_SPEED, "number");
});

test("powerDurationByLevel", () => {
  assert.equal(H.powerDuration(1), 7);
  assert.equal(H.powerDuration(4), 4);
  assert.equal(H.powerDuration(9), 3);
});

test("enemySpeedCapped", () => {
  assert.equal(H.enemySpeed(20, 6), 6);
  assert.ok(Math.abs(H.enemySpeed(1, 6) - 5.1) < 1e-9);
  assert.ok(H.enemySpeed(2, 6) > H.enemySpeed(1, 6));
});

test("sefTargetsPlayer and kolega random", () => {
  var p = ent(5, 5, "right");
  assert.deepEqual(plain(H.targetFor("sef", ent(1, 1), p, maze)), { x: 5, y: 5 });
  assert.equal(H.targetFor("kolega", ent(1, 1), p, maze), null);
});

test("pmTargetsAhead", () => {
  var p = ent(5, 5, "right");
  assert.deepEqual(plain(H.targetFor("pm", ent(1, 1), p, maze)), { x: 9, y: 5 });
  var q = ent(5, 5, "up");
  assert.deepEqual(plain(H.targetFor("pm", ent(1, 1), q, maze)), { x: 5, y: 1 });
});

test("hrPatrolsWhenFar", () => {
  var p = ent(1, 19);
  var t = H.targetFor("hr", ent(17, 1), p, maze);
  assert.deepEqual(plain(t), { x: maze.patrol.x, y: maze.patrol.y });
});

test("hrPatrolsSidePassageNotTheDoor", () => {
  // player on the left half -> left end of the side passage
  assert.deepEqual(plain(H.targetFor("hr", ent(17, 1), ent(1, 19), maze)), { x: 1, y: maze.tunnelRow });
  // player on the right half -> right end
  assert.deepEqual(plain(H.targetFor("hr", ent(1, 1), ent(17, 19), maze)), { x: maze.w - 2, y: maze.tunnelRow });
  var t = H.targetFor("hr", ent(17, 1), ent(1, 19), maze);
  assert.notDeepEqual(plain(t), plain(maze.exit));
});

test("hrChasesWhenNear", () => {
  var p = ent(5, 5);
  assert.deepEqual(plain(H.targetFor("hr", ent(9, 1), p, maze)), { x: 5, y: 5 });
  // exactly 8 tiles (manhattan) still chases
  assert.deepEqual(plain(H.targetFor("hr", ent(9, 9), p, maze)), { x: 5, y: 5 });
});

test("chooseDirNoReverse", () => {
  var m = H.parseMaze(CORRIDOR);
  var e = ent(2, 1, "right");
  // target behind it: still must not reverse in a straight corridor
  for (var i = 0; i < 20; i++) {
    assert.equal(H.chooseDir(e, m, { x: 1, y: 1 }, Math.random, null), "right");
    assert.equal(H.chooseDir(e, m, null, Math.random, null), "right");
  }
  // dead end: reverse is allowed
  var d = ent(3, 1, "right");
  assert.equal(H.chooseDir(d, m, { x: 3, y: 1 }, Math.random, null), "left");
});

test("chooseDirTargets and ties follow DIRS order", () => {
  var m = H.parseMaze(SMALL);
  var e = ent(2, 2, "up");
  assert.equal(H.chooseDir(e, m, { x: 4, y: 2 }, Math.random, null), "right");
  assert.equal(H.chooseDir(e, m, { x: 0, y: 2 }, Math.random, null), "left");
  // target straight below would need a reverse; up/left/right remain: left/right tie at
  // equal distance, up is farther -> left (DIRS order)
  assert.equal(H.chooseDir(e, m, { x: 2, y: 4 }, Math.random, null), "left");
});

test("chooseDirRandomUsesRng", () => {
  var m = H.parseMaze(SMALL);
  var e = ent(2, 2, "up");
  // options without reverse: up, left, right
  assert.equal(H.chooseDir(e, m, null, function () { return 0; }, null), "up");
  assert.equal(H.chooseDir(e, m, null, function () { return 0.5; }, null), "left");
  assert.equal(H.chooseDir(e, m, null, function () { return 0.99; }, null), "right");
});

test("chooseDirFlees", () => {
  var m = H.parseMaze(SMALL);
  var e = ent(2, 2, "down");
  assert.equal(H.chooseDir(e, m, null, Math.random, { x: 0, y: 2 }), "right");
  assert.equal(H.chooseDir(e, m, null, Math.random, { x: 4, y: 2 }), "left");
});

test("newGame state", () => {
  var s = H.newGame(maze, Math.random);
  assert.equal(s.level, 1);
  assert.equal(s.score, 0);
  assert.equal(s.lives, 3);
  assert.equal(s.phase, "ready");
  assert.equal(s.enemies.length, 4);
  assert.deepEqual(plain(s.enemies.map(function (en) { return en.kind; })), plain(H.ENEMIES));
  s.enemies.forEach(function (en) { assert.equal(en.mode, "pen"); });
  assert.equal(s.coinsLeft.size, maze.coins.size);
  assert.equal(s.powerLeft.size, maze.powerups.size);
  assert.equal(s.player.x, maze.start.x);
  assert.equal(s.player.y, maze.start.y);
});

test("readyCountsDownToPlay", () => {
  var s = H.newGame(maze, Math.random);
  var x0 = s.enemies[0].e.x, y0 = s.enemies[0].e.y;
  H.update(s, H.READY_S / 2, "left");
  assert.equal(s.phase, "ready");
  assert.equal(s.player.x, maze.start.x);
  assert.equal(s.enemies[0].e.x, x0);
  assert.equal(s.enemies[0].e.y, y0);
  H.update(s, H.READY_S / 2 + 0.01, "left");
  assert.equal(s.phase, "play");
});

test("coinScores", () => {
  var s = playing();
  park(s);
  s.player.x = 8; s.player.y = 16;
  var ev = H.update(s, 1 / 60, null);
  assert.equal(s.score, 10);
  assert.ok(types(ev).indexOf("coin") >= 0);
  assert.equal(ev[types(ev).indexOf("coin")].points, 10);
  assert.ok(!s.coinsLeft.has(idx(8, 16)));
  assert.equal(s.best, 10);
});

test("bestKeptWhenHigher", () => {
  var s = playing();
  park(s);
  s.best = 5000;
  s.player.x = 8; s.player.y = 16;
  H.update(s, 1 / 60, null);
  assert.equal(s.best, 5000);
});

test("powerupChain", () => {
  var s = playing();
  // all enemies out and chasing, parked in distant corners
  var corners = [[17, 1], [17, 19], [1, 1], [17, 3]];
  s.enemies.forEach(function (en, i) {
    en.mode = "chase"; en.releaseAt = 0;
    en.e.x = corners[i][0]; en.e.y = corners[i][1]; en.e.dir = null;
  });
  s.player.x = 1; s.player.y = 16; s.player.dir = null;
  var ev = H.update(s, 1 / 60, null);
  assert.ok(types(ev).indexOf("powerup") >= 0);
  assert.equal(s.score, 50);
  assert.equal(s.chain, 0);
  assert.equal(s.powerTime, H.powerDuration(1));
  s.enemies.forEach(function (en) { assert.equal(en.mode, "flee"); });
  var expected = [200, 400, 800, 1600];
  s.enemies.forEach(function (en, i) {
    en.e.x = 1; en.e.y = 16; en.e.dir = null;
    var evs = H.update(s, 1 / 60, null);
    var k = types(evs).indexOf("enemyEaten");
    assert.ok(k >= 0, "enemy " + i + " eaten");
    assert.equal(evs[k].points, expected[i]);
    assert.equal(en.mode, "eaten");
    // move the eaten one away so it does not collide again
  });
  assert.equal(s.chain, 4);
  assert.equal(s.score, 50 + 200 + 400 + 800 + 1600);
  assert.equal(s.lives, 3);
});

test("powerupReversesAndSlows", () => {
  var s = playing();
  var en = s.enemies[0];
  en.mode = "chase"; en.e.x = 1.5; en.e.y = 3; en.e.dir = "right";
  s.enemies.slice(1).forEach(function (o) { o.releaseAt = 1e9; });
  s.player.x = 1; s.player.y = 16; s.player.dir = null;
  H.update(s, 1 / 60, null);
  assert.equal(en.mode, "flee");
  assert.equal(en.e.dir, "left");
  assert.ok(Math.abs(en.e.speed - H.enemySpeed(1, H.PLAYER_SPEED) / 2) < 1e-9);
});

test("fleeEndsAfterPowerTime", () => {
  var s = playing();
  var en = s.enemies[0];
  en.mode = "chase"; en.e.x = 17; en.e.y = 1;
  s.enemies.slice(1).forEach(function (o) { o.releaseAt = 1e9; });
  s.player.x = 1; s.player.y = 16; s.player.dir = null;
  H.update(s, 1 / 60, null);
  assert.equal(en.mode, "flee");
  for (var t = 0; t < H.powerDuration(1) + 0.1; t += 0.1) H.update(s, 0.1, null);
  assert.equal(s.powerTime, 0);
  assert.equal(en.mode, "chase");
});

test("eatenReturnsToPenAndLeavesAgain", () => {
  var s = playing();
  var en = s.enemies[0];
  s.enemies.slice(1).forEach(function (o) { o.releaseAt = 1e9; });
  en.mode = "eaten"; en.e.x = 1; en.e.y = 19; en.e.dir = null;
  s.player.x = 17; s.player.y = 19; s.player.dir = null;
  var sawPen = false, sawChase = false;
  for (var i = 0; i < 60 * 20 && !sawChase; i++) {
    H.update(s, 1 / 60, null);
    if (en.mode === "pen") sawPen = true;
    if (sawPen && en.mode === "chase") sawChase = true;
  }
  assert.ok(sawPen, "returned to the meeting room");
  assert.ok(sawChase, "left the meeting room again");
});

test("touchCostsLife", () => {
  var s = playing();
  park(s);
  var en = s.enemies[0];
  en.mode = "chase"; en.releaseAt = 0;
  s.player.x = 7; s.player.y = 3; s.player.dir = null;
  en.e.x = 7; en.e.y = 3; en.e.dir = null;
  var ev = H.update(s, 1 / 60, null);
  assert.deepEqual(plain(types(ev).filter(function (t) { return t === "lifeLost"; })), ["lifeLost"]);
  assert.equal(s.lives, 2);
  assert.equal(s.phase, "dying");
  // pause, then positions reset and back to ready
  H.update(s, H.DYING_S + 0.01, null);
  assert.equal(s.phase, "ready");
  assert.equal(s.player.x, maze.start.x);
  assert.equal(s.player.y, maze.start.y);
  assert.equal(s.enemies[0].mode, "pen");

  // last life -> gameOver
  s.phase = "play";
  s.lives = 1;
  park(s);
  en = s.enemies[0]; // positions were reset: fresh enemy objects
  en.mode = "chase";
  s.player.x = 7; s.player.y = 3; s.player.dir = null;
  en.e.x = 7; en.e.y = 3; en.e.dir = null;
  ev = H.update(s, 1 / 60, null);
  assert.ok(types(ev).indexOf("lifeLost") >= 0);
  assert.ok(types(ev).indexOf("gameOver") >= 0);
  assert.equal(s.lives, 0);
  assert.equal(s.phase, "over");
  var px = s.player.x;
  assert.deepEqual(plain(H.update(s, 1, "left")), []);
  assert.equal(s.player.x, px);
});

test("collisionUnderHalfTile", () => {
  var s = playing();
  park(s);
  var en = s.enemies[0];
  en.mode = "chase";
  s.player.x = 7; s.player.y = 3; s.player.dir = null;
  en.e.x = 7.6; en.e.y = 3; en.e.dir = null; en.e.speed = 0;
  // distance 0.6 -> no collision (enemy is mid-tile so has no dir: it does not move)
  var ev = H.update(s, 1 / 1000, null);
  assert.equal(types(ev).indexOf("lifeLost"), -1);
});

test("levelAdvances", () => {
  var s = playing();
  park(s);
  s.coinsLeft = new Set([idx(8, 16)]);
  s.powerLeft = new Set();
  s.player.x = 8; s.player.y = 16;
  var ev = H.update(s, 1 / 60, null);
  assert.ok(types(ev).indexOf("coin") >= 0);
  assert.ok(types(ev).indexOf("levelDone") >= 0);
  assert.equal(s.level, 2);
  assert.equal(s.coinsLeft.size, maze.coins.size);
  assert.equal(s.powerLeft.size, maze.powerups.size);
  assert.equal(s.phase, "levelDone");
  H.update(s, H.LEVEL_DONE_S + 0.01, null);
  assert.equal(s.phase, "ready");
  assert.equal(s.player.x, maze.start.x);
  assert.equal(s.player.y, maze.start.y);
});

test("enemiesReleasedInOrder", () => {
  var s = playing();
  var start = s.enemies.map(function (en) { return { x: en.e.x, y: en.e.y }; });
  function moved(i) {
    return s.enemies[i].e.x !== start[i].x || s.enemies[i].e.y !== start[i].y;
  }
  s.player.x = 1; s.player.y = 19;
  H.update(s, 0.5, null);
  assert.ok(moved(0), "sef out");
  assert.ok(!moved(1) && !moved(2) && !moved(3));
  for (var i = 0; i < 26; i++) H.update(s, 0.1, null);
  assert.ok(moved(1), "pm out after 3.1 s");
  assert.ok(!moved(2) && !moved(3));
});

test("longRandomGameStaysValid", () => {
  var seed = 12345;
  function rng() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
  var s = H.newGame(maze, rng);
  var dirs = ["up", "left", "down", "right"];
  var penKey = {};
  maze.pen.forEach(function (p) { penKey[idx(p.x, p.y)] = true; });
  var input = "left";
  for (var i = 0; i < 60 * 120 && s.phase !== "over"; i++) {
    if (i % 40 === 0) input = dirs[Math.floor(rng() * 4)];
    H.update(s, 1 / 60, input);
    [s.player].concat(s.enemies.map(function (en) { return en.e; })).forEach(function (e) {
      assert.ok(isFinite(e.x) && isFinite(e.y), "finite position");
    });
    s.enemies.forEach(function (en) {
      var x = Math.round(en.e.x), y = Math.round(en.e.y);
      if (x < 0 || x >= maze.w) return;
      assert.ok(!H.isWall(maze, x, y, true), en.kind + " in wall at " + x + "," + y);
      if (en.mode === "chase" || en.mode === "flee") {
        assert.ok(!penKey[idx(x, y)], en.kind + " " + en.mode + " inside meeting room");
        assert.ok(!(x === maze.door.x && y === maze.door.y), en.kind + " in door");
      }
    });
  }
  assert.ok(s.score >= 0);
});

test("updateLargeDtIsSafe", () => {
  var s = playing();
  H.update(s, 5, "left");
  assert.ok(isFinite(s.player.x));
  s.enemies.forEach(function (en) { assert.ok(isFinite(en.e.x) && isFinite(en.e.y)); });
});

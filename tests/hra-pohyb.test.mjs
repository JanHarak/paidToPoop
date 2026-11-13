import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBlock } from "./load-block.mjs";
const H = loadBlock("hra-logika").HraLogika;
const maze = H.parseMaze(H.MAZE);

// Small test maze: 5x5 with an intersection in the middle (2,2).
const SMALL = [
  "##.##",
  "##.##",
  ".....",
  "##.##",
  "##.##"
];
function small() { return H.parseMaze(SMALL); }
const TUN = [
  "#####",
  "<...>",
  "#####"
];

test("parseMaze na MAZE", () => {
  assert.equal(maze.w, 19);
  assert.equal(maze.h, 21);
  assert.equal(maze.powerups.size, 4);
  assert.ok(maze.coins.size > 150);
  assert.ok(maze.pen.length >= 4);
  assert.equal(typeof maze.tunnelRow, "number");
  assert.equal(H.MAZE.join("").split("H").length - 1, 1);
  // H is the meeting-room exit; HR patrols the side passage
  assert.deepEqual({ x: maze.exit.x, y: maze.exit.y }, { x: maze.door.x, y: maze.door.y - 1 });
  assert.deepEqual({ x: maze.patrol.x, y: maze.patrol.y }, { x: 1, y: maze.tunnelRow });
  assert.equal(H.isWall(maze, maze.patrol.x, maze.patrol.y, false), false);
  assert.equal(H.isWall(maze, maze.w - 1 - maze.patrol.x, maze.patrol.y, false), false);
});

test("mazeIsSymmetric", () => {
  H.MAZE.forEach(function (row) {
    var mirror = row.split("").reverse().map(function (c) {
      return c === "<" ? ">" : c === ">" ? "<" : c;
    }).join("");
    assert.equal(mirror, row);
  });
});

function passable(m, x, y) {
  if (y < 0 || y >= m.h) return false;
  if (m.tunnelRow === y) { if (x < 0) x += m.w; if (x >= m.w) x -= m.w; }
  if (x < 0 || x >= m.w) return false;
  return !m.walls[y * m.w + x];
}

test("noDeadEnds", () => {
  var penKey = {};
  maze.pen.forEach(function (p) { penKey[p.y * maze.w + p.x] = true; });
  penKey[maze.door.y * maze.w + maze.door.x] = true;
  for (var y = 0; y < maze.h; y++) for (var x = 0; x < maze.w; x++) {
    if (!passable(maze, x, y) || penKey[y * maze.w + x]) continue;
    var n = 0;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
      if (passable(maze, x + d[0], y + d[1])) n++;
    });
    assert.ok(n >= 2, "dead end at " + x + "," + y);
  }
});

test("allCoinsReachable", () => {
  var seen = {}, q = [maze.start];
  seen[maze.start.y * maze.w + maze.start.x] = true;
  while (q.length) {
    var c = q.shift();
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
      var nx = c.x + d[0], ny = c.y + d[1];
      if (H.isWall(maze, nx, ny, false)) return;
      if (ny < 0 || ny >= maze.h) return;
      if (nx < 0) nx += maze.w;
      if (nx >= maze.w) nx -= maze.w;
      var k = ny * maze.w + nx;
      if (seen[k]) return;
      seen[k] = true;
      q.push({ x: nx, y: ny });
    });
  }
  maze.coins.forEach(function (k) { assert.ok(seen[k], "coin " + k); });
  maze.powerups.forEach(function (k) { assert.ok(seen[k], "powerup " + k); });
});

test("stopsAtWall", () => {
  var m = small();
  var e = { x: 2, y: 0, dir: "down", next: null, speed: 4 };
  H.stepEntity(e, m, 10, false);
  assert.equal(e.x, 2);
  assert.equal(e.y, 4);
  var f = { x: 0, y: 2, dir: "left", next: null, speed: 3 };
  H.stepEntity(f, m, 3, false);
  assert.equal(f.x, 0);
  assert.equal(f.y, 2);
});

test("bufferedTurnAtIntersection", () => {
  var m = small();
  var e = { x: 0.5, y: 2, dir: "right", next: "down", speed: 2 };
  H.stepEntity(e, m, 0.25, false);
  assert.equal(e.dir, "right");
  assert.equal(e.next, "down");
  H.stepEntity(e, m, 0.6, false);
  assert.equal(e.dir, "down");
  assert.equal(e.next, null);
  assert.equal(e.x, 2);
  assert.ok(e.y > 2);
});

test("reverse mid-tile is immediate", () => {
  var m = small();
  var e = { x: 0.5, y: 2, dir: "right", next: "left", speed: 1 };
  H.stepEntity(e, m, 0.25, false);
  assert.equal(e.dir, "left");
  assert.ok(e.x < 0.5);
});

test("largeDtDoesNotTunnel", () => {
  var m = small();
  var e = { x: 2, y: 2, dir: "right", next: null, speed: 4 };
  H.stepEntity(e, m, 5, false);
  assert.ok(!H.isWall(m, Math.round(e.x), Math.round(e.y), false));
  assert.equal(e.x, 4);
  var r = { x: maze.start.x, y: maze.start.y, dir: "up", next: null, speed: 6 };
  H.stepEntity(r, maze, 5, false);
  assert.ok(!H.isWall(maze, Math.round(r.x), Math.round(r.y), false));
});

test("tunnelWraps", () => {
  var m = H.parseMaze(TUN);
  assert.equal(m.tunnelRow, 1);
  var e = { x: 0, y: 1, dir: "left", next: null, speed: 4 };
  H.stepEntity(e, m, 0.375, false);
  assert.equal(e.x, 3.5);
  var f = { x: 4, y: 1, dir: "right", next: null, speed: 4 };
  H.stepEntity(f, m, 0.375, false);
  assert.equal(f.x, 0.5);
});

test("doorBlocksPlayerOnly", () => {
  assert.equal(H.isWall(maze, maze.door.x, maze.door.y, false), true);
  assert.equal(H.isWall(maze, maze.door.x, maze.door.y, true), false);
});

test("DIRS", () => {
  assert.equal(JSON.stringify(H.DIRS.up), JSON.stringify({ x: 0, y: -1 }));
  assert.equal(JSON.stringify(H.DIRS.right), JSON.stringify({ x: 1, y: 0 }));
});

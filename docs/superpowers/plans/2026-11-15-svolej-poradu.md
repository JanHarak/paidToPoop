# Svolej poradu! – implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an original "place and run" maze game, "Svolej poradu!", to the "Hry" tab. A manager in a suit lays meetings that blast in a cross, clears colleagues on each office floor and rides the elevator up. The record is the highest floor.

**Architecture:**
- `<script id="porada-logika">` holds pure logic: floor generation, a fixed-step simulation (`krok`), movement, meetings, blasts, bonuses, colleagues, lives, floors and storage parsing. It is tested in Node with a seeded `rnd`.
- `<script id="porada-ui">` mirrors `#splachni-ui` / `#sachy-ui` for the frame (inline in `#hraSlot`, fullscreen via `window.Vrstvy`, `HrySeznam`). It draws on a canvas with `requestAnimationFrame` like `#hra-ui` (Rulička) and runs the logic in fixed steps with an accumulator.

**Tech Stack:** Plain HTML/CSS/ES5 JS, canvas 2D, Node `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-15-svolej-poradu-design.md`

## Global Constraints

- Everything lives in the single `index.html`.
  - JS is ES5 style (`var`, `function`), with no dependencies and no build step.
  - The UI is in Czech, mobile-first, with light and dark mode through the existing CSS variables.
  - No em dash characters in copy, comments or commits.
- Tests run with `node --test`, with no directory argument. 154 tests pass today.
  - Blocks are loaded through `tests/load-block.mjs`.
  - Objects from the vm realm need a JSON round-trip before `deepStrictEqual`.
- Grid: 13 columns × 11 rows. Index is `r*13 + c`, row 0 at the top. Cell codes: `0` free, `1` wall (border and the pillar on every cell where both `r` and `c` are even), `2` crate 📦.
  - Start is `(1,1)`. Cells `(1,1)`, `(1,2)` and `(2,1)` are always free.
- Values from the spec:
  - meeting fuse 2500 ms, blast visible and active 500 ms, starting range 1, starting meetings at once 1;
  - 3 lives, invulnerability 2000 ms after losing a life;
  - manager base speed 3 cells/s, max 5.5; colleagues 1.5 to 2 cells/s at first, always below 3;
  - colleagues: 3 on floor 1, more per floor, at most 8; spawn only on free cells at BFS path distance ≥ 5 from start (crates ignored for the distance);
  - "Kolega na minutku" chases when within about 5 cells;
  - crate density about 40 to 50 % of the eligible free cells; bonus chance about 20 to 25 % per crate;
  - bonuses: ☕ speed (to max 5.5), 📅 +1 meeting (max 5), 📢 +1 range (max 6); they persist across floors and lives;
  - 100 points per colleague, 500 per completed floor.
- Elevator 🛗: hidden under one crate that never hides a bonus. Only the manager may enter its cell. Blasts pass through it and destroy nothing on it. Meetings cannot be placed on it. It opens when no colleague is left. Entering it when open advances the floor at once.
- localStorage key `zachodova-porada-v1` holds `{rekordPatro, rekordBody}`. Every access is wrapped in try/catch. Defaults are `{rekordPatro: 0, rekordBody: 0}`. The record is saved as soon as a new floor is reached and again at game over. Better record = higher floor, ties broken by higher points.
- The game must not touch the stopwatch or earnings. Key handlers return early inside `[inert]`, and in fullscreen unless `Vrstvy.top()` is the game.
- The warning layer (z-index 61/62) stays above the game (50).
- The game exposes `window.Porada = { isOpen }`. Add it to `blokovano()` in `#instalace-ui`.

## Review Focus

1. A long gap between frames (tab in background, pause, slow phone) must not teleport actors through walls or fire many fuses at once. The UI clamps the accumulated time to 250 ms, and the logic only ever advances in fixed steps (Task 1 test with many steps, Task 4).
2. From the start corner, with base stats, laying a meeting and walking around the corner always survives (Task 1 test over many seeds).
3. A colleague hit by two overlapping blasts scores once, and a manager hit by a blast and a colleague in the same step loses one life (Task 2 test).
4. Generation: over many seeds the elevator and all colleagues are reachable from start when crates are ignored, colleagues are at path distance ≥ 5, and the elevator crate never hides a bonus (Task 1 and Task 2 tests).
5. Releasing a held direction outside the pad button (`pointercancel`, `pointerleave`, `lostpointercapture`) or losing window focus must stop movement (Task 4 browser check).

---

### Task 1: Logic, part 1: floor, movement, meetings, blasts, bonuses (`#porada-logika`)

**Files:**
- Modify: `index.html`. Add `<script id="porada-logika">` after the closing `</script>` of `#splachni-logika`.
- Test: `tests/porada.test.mjs`

**Interfaces:**
- Produces `window.PoradaLogika`:
  - constants `S = 13`, `R = 11`, `KROK_MS = 20`, `ROZBUSKA_MS = 2500`, `VYBUCH_MS = 500`, `NEZRANITELNOST_MS = 2000`, `ZIVOTU = 3`, `RYCHLOST = 3`, `RYCHLOST_MAX = 5.5`, `KAVA = 0.5`, `MAX_PORAD = 5`, `MAX_DOSAH = 6`;
  - `novaHra(rnd) -> stav` for floor 1 with 3 lives, 0 points and base stats;
  - `novePatro(stav, rnd)` fills `stav` with a new floor and keeps the manager's stats, lives and points;
  - `krok(stav, vstup, rnd) -> udalosti[]` advances by exactly `KROK_MS`. It mutates `stav`. `vstup` is `{smer: null|"up"|"down"|"left"|"right", porada: bool}`.
  - `vzdalenosti(stav, odkud, ignorujKrabice) -> number[]` BFS path distances (−1 when unreachable);
  - `parseUlozeni(raw) -> {rekordPatro, rekordBody}`;
  - `lepsi(a, b) -> bool`, true when record `a` beats `b`.
- `stav` shape (later tasks rely on it):
  - `mrizka: number[143]`, `patro`, `zivoty`, `body`, `konec: bool`;
  - `hrac: {x, y, smer, rychlost, maxPorad, dosah, nezranitelny /* ms left */}` with `x, y` in cell units (cell centre = integer column / row);
  - `porady: [{i, zbyva /* ms */, dosah, hracUvnitr: bool}]`;
  - `vybuchy: [{bunky: number[], zbyva}]`;
  - `bonusy: [{i, typ: "kava"|"porada"|"dosah", skryty: bool}]` (hidden ones are under crates);
  - `vytah: {i, odkryty: bool, otevreny: bool}`;
  - `kolegove: [...]`, filled by Task 2 (Task 1 leaves it empty).
- `udalosti` items are strings, consumed by the UI: `"porada"`, `"vybuch"`, `"krabice"`, `"bonus"`, plus Task 2's events.
- Rules not fully fixed by the tests:
  - **Movement:** the manager moves along the held direction at `rychlost` cells/s. When turning off-axis, if within 0.45 cell of the corridor line, snap toward it while moving (corner assist). Blocked by walls, crates and meetings (except the one with `hracUvnitr` until the manager's cell differs from it). The elevator cell, closed or open, is passable for the manager.
  - **Laying:** on the manager's rounded cell, only if fewer than `maxPorad` meetings are active, the cell has no meeting and it is not the elevator cell.
  - **Blast:** from the meeting cell in four directions up to `dosah`. Stops at a wall. A crate is destroyed and stops it (the cell is included). A meeting in the path detonates at once (same step, its own range). Bonuses lying open in the blast vanish. The elevator cell is included and nothing happens to it.
  - **Crate destroyed:** a hidden bonus becomes visible, and so does the elevator.
  - **Pickup:** entering a visible bonus cell applies it, capped at the maximum.
  - The manager is hit while their rounded cell is in an active blast and `nezranitelny` is 0. Task 1 only marks this with an event `"zasah"` (Task 2 turns it into a life loss).

- [ ] **Step 1: Write the failing tests** with a seeded LCG `rnd` helper:
  - `novaHra` over 200 seeds:
    - border and even/even cells are walls;
    - start cells are free;
    - crate share of eligible cells is between 0.35 and 0.55;
    - exactly one elevator, under a crate, with no bonus on the same cell;
    - the elevator is reachable from start with `vzdalenosti(stav, start, true)`.
  - Movement: with `{smer:"right"}` for 1000 ms, `hrac.x` grows by about 3 (±0.1) and never enters a wall or crate; 10 000 steps of random input never put the manager's rounded cell on a wall or crate.
  - Laying: one meeting per `maxPorad`; no second meeting on the same cell; not on the elevator cell.
  - Fuse: after `ROZBUSKA_MS` the meeting is gone and `vybuchy` has a cross of the right shape, cut by walls and stopped at the first crate (crate cell turned to `0`); after `VYBUCH_MS` more, `vybuchy` is empty.
  - Chain: two meetings in range; the second detonates in the same step as the first.
  - Escape (Review Focus 2): over 200 seeds, with `stav.kolegove = []` (so the test stays valid after Task 2), walk from start to `(1,2)` (row 1, column 2), lay a meeting there, walk back left to `(1,1)` and down to `(2,1)`, which is outside the cross of range 1, then wait 3500 ms; no `"zasah"` event and the manager still has full control.
  - Bonus: a destroyed crate with a hidden `"dosah"` bonus reveals it; walking onto it increases `dosah` by 1; caps are respected (`dosah` ≤ 6, `maxPorad` ≤ 5, `rychlost` ≤ 5.5).
  - `parseUlozeni`: `null`, `"{bad"`, `"[]"` give defaults; valid round-trips; negative or non-integer values give 0.
  - `lepsi`: higher floor wins; equal floor, higher points wins; equal is false.
- [ ] **Step 2: Run** `node --test`. Expected: FAIL with "Script block not found: porada-logika".
- [ ] **Step 3: Implement** the block.
- [ ] **Step 4: Run** `node --test`. Expected: all pass.
- [ ] **Step 5: Commit**: `feat: logika hry Svolej poradu (patro, porady, vybuchy)`

### Task 2: Logic, part 2: colleagues, lives, elevator, floors, score

**Files:**
- Modify: `index.html`, the `#porada-logika` block.
- Test: `tests/porada.test.mjs`

**Interfaces:**
- Consumes the Task 1 `stav` shape and functions.
- Each colleague is `{x, y, smer, typ: "stazista"|"minutka", rychlost}`, moving cell to cell (decides only at cell centres).
- New events: `"kolega"` (one per colleague removed), `"zivot"` (life lost), `"vytah"` (elevator opened), `"patro"` (new floor reached), `"konec"` (game over).
- Rules:
  - **Count per floor:** `min(3 + (patro - 1), 8)`. Number of `"minutka"`: `Math.ceil(count * min(0.1 * (patro - 1), 0.6))`; floor 1 has none, floor 2 has one.
  - **Speed:** `min(1.5 + 0.1 * (patro - 1), 2.9)` for stážista, `+0.2` for minutka, also capped at 2.9.
  - **Spawn:** random free cells (not crates, not the elevator) with `vzdalenosti(stav, start, true)[i] >= 5`, each on a different cell.
  - **Stážista:** keeps its direction when possible; at an intersection it turns with probability 0.3; when blocked it picks a random free direction (turning back only if nothing else). Cannot enter walls, crates, meetings or the elevator cell.
  - **Minutka:** when the BFS path distance (crates and meetings block) from its cell to the manager's rounded cell is ≤ 5, it takes the next step on that path. Otherwise it behaves like stážista.
  - **Colleague hit:** a colleague whose rounded cell is in an active blast is removed once, `body += 100`, event `"kolega"`.
  - **Manager hit:** blast on the manager's cell, or a colleague within 0.6 cell (Euclidean between centres), while `nezranitelny` is 0. At most one life per step:
    - `zivoty -= 1`, event `"zivot"`;
    - if `zivoty` is 0: `konec = true`, event `"konec"`, and `krok` does nothing from then on;
    - else: manager back to start, all meetings and blasts removed, surviving colleagues moved to new random cells by the spawn rule, `nezranitelny = NEZRANITELNOST_MS`. Crates and bonuses stay.
  - **Elevator:** when `kolegove` becomes empty, `vytah.otevreny = true`, event `"vytah"` (once). When the manager's rounded cell is the elevator and it is open: `body += 500`, `patro += 1`, `novePatro`, event `"patro"`.
  - `novaHra` and `novePatro` now spawn colleagues.

- [ ] **Step 1: Write the failing tests:**
  - Spawn over 200 seeds and floors 1, 4, 10: count matches the formula; every colleague is on a free cell, not the elevator, at distance ≥ 5, and reachable when crates are ignored; floor 1 has no minutka.
  - 20 000 steps with random input: colleagues never stand on a wall, crate, meeting or the elevator cell; speeds stay below 3.
  - Minutka: on a hand-built open corridor with the manager 3 cells away, after 1500 ms the distance has shrunk.
  - Double hit (Review Focus 3): a colleague inside two overlapping blasts gives one `"kolega"` and +100; a manager hit by a blast and touched by a colleague in the same step loses exactly one life.
  - Invulnerability: right after `"zivot"`, 1900 ms inside a blast causes no further life loss; after 2000 ms it does.
  - Life loss resets manager to start, clears meetings and blasts, keeps crates, bonuses and stats.
  - Game over: after the third life, `konec` is true, `"konec"` fires once and `krok` changes nothing afterwards.
  - Elevator: removing the last colleague fires `"vytah"` once; walking into the open elevator gives `"patro"`, `patro` 2, `body` +500, a fresh floor with 4 colleagues, and stats kept. A closed elevator does nothing.
- [ ] **Step 2: Run** `node --test`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `node --test`. Expected: all pass, the whole file under about 3 s.
- [ ] **Step 5: Commit**: `feat: logika hry Svolej poradu (kolegove, zivoty, patra)`

### Task 3: Games list entry, detail and TODO

**Files:**
- Modify: `index.html`, the `#hryMenu` markup and CSS, plus a temporary rule in `#hry-seznam`.
- Modify: `TODO.md`, section `## Hry`.

**Interfaces:**
- List item: `<button class="hry-polozka" data-hra="porada" aria-pressed="false">` with name "Svolej poradu!" and subtitle "Zavři kolegy v poradě", placed after Spláchni to.
- Detail: `<div class="hry-detail" data-hra="porada" hidden>` with:
  - the text "Jsi manažer. Pokládej porady, rozbíjej krabice a zavři všechny kolegy v poradě. Pak jeď výtahem o patro výš. Pozor, porada zasáhne i tebe. Stopky sezení běží dál.";
  - `p.hry-stat#poradaRekord` with "Rekord: zatím žádný" (Task 4 fills "Rekord: 7. patro");
  - `button.hra-btn#poradaHrajBtn` "Zahraj si".
- Temporary rule in `#hry-seznam`: if `window.PoradaLogika` is missing, call `HrySeznam.odeber("porada")`. Task 4 removes it.
- TODO line under `## Hry`: "Svolej poradu: aréna proti počítačovým manažerům (1 až 3 soupeři, poslední přeživší vyhrává). Původní představa uživatele, odloženo."

- [ ] **Step 1: Add the markup, CSS (reuse the existing detail classes) and the TODO line.**
- [ ] **Step 2: Run** `node --test`. Expected: all pass.
- [ ] **Step 3: Browser check** on preview `static` at the mobile preset: 5 games listed, the detail shows correctly, other games unchanged, console clean; reset the viewport to desktop.
- [ ] **Step 4: Commit**: `feat: Svolej poradu v seznamu her`

### Task 4: Game UI (`#porada-ui`)

**Files:**
- Modify: `index.html`
  - new `<div id="porada" class="vrstva porada" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="poradaTitul" hidden>` after `#splachni`;
  - CSS;
  - new `<script id="porada-ui">` after `#splachni-ui`;
  - `blokovano()` in `#instalace-ui`;
  - remove the Task 3 temporary rule.

**Interfaces:**
- Consumes `PoradaLogika` (Tasks 1 and 2), the detail ids from Task 3, `HrySeznam`, `Vrstvy`, `Stopky`.
- Produces `window.Porada = { isOpen: () => bool }`.
- Markup:
  - `.hra-hlava` with `h2#poradaTitul` "Svolej poradu!", `#poradaPatro` "Patro 1", `#poradaZivoty` (e.g. "❤ 3", aria-label "Životy: 3"), `#poradaBody` "0 bodů", `#poradaStopky`, `#poradaPauza` "Pauza"/"Pokračovat", `#poradaCela` (copy of the SVG pair, extend the CSS selectors), `#poradaZavrit` "×" with aria-label "Ukončit hru".
  - `p#poradaStav` with `role="status"`: announces "Patro N", "Přišel jsi o život", "Výtah je otevřený!", the end result.
  - `canvas#poradaPlatno` with `aria-label="Hrací plocha"`, aspect 13:11, scaled to the box width (`devicePixelRatio` aware), larger in fullscreen.
  - Touch controls `#poradaOvladani`, shown for `pointer: coarse` (like `#hraOvladani`): a cross of four `.hra-smer[data-smer]` buttons (reuse the existing classes) and a large `button#poradaTlacitko` "Svolat poradu" beside it. `touch-action: none` on the controls.
  - End overlay `#poradaKonec` (pattern of `#splachniKonec`): "Dostal ses do N. patra · B bodů", optional "Nový rekord!", buttons "Hrát znovu" / "Ukončit hru".
- Drawing (shapes on canvas, colours from CSS variables read once per theme change):
  - floor in a light tone, walls as solid office partitions, crates 📦 (emoji or a drawn box);
  - manager: head, dark suit, white shirt, a bright tie, facing the direction of travel; blinks while invulnerable;
  - colleagues: two visibly different simple figures (stážista vs. minutka, e.g. colour of shirt or a coffee mug);
  - meeting: 📅 with a shrinking ring or clock hand showing the remaining fuse;
  - blast: cross of cells in a strong accent colour with fade over 500 ms;
  - bonuses ☕ 📅 📢, elevator 🛗 drawn closed vs. open (e.g. dimmed vs. highlighted).
  - Interpolate actor positions between logic steps for smooth movement.
- Loop: `requestAnimationFrame`; accumulate real time, clamp it to 250 ms, then run `krok` every `KROK_MS`. Use `Math.random` as `rnd`.
- Input:
  - Keyboard: arrows and WASD set the held direction (most recent key wins, releasing it falls back to another still-held key); Space or Enter sets `porada: true` for the next step. Clear held keys on `blur` and `visibilitychange`.
  - Pad: `pointerdown` sets the direction with pointer capture; `pointerup`, `pointercancel` and `lostpointercapture` clear it. "Svolat poradu" on `pointerdown`.
- Pause: the loop stops (and does not accumulate) when the game is closed, `document.hidden`, the Hry panel is hidden, `#warnModal` is shown, or the user pressed Pauza. A user pause survives the warning; automatic pauses resume by themselves.
- Events: `"zivot"`, `"vytah"`, `"patro"` update the header and `#poradaStav`; `"patro"` saves the record if better (`lepsi`); `"konec"` saves the record and shows the overlay. "Hrát znovu" calls `novaHra`. The detail record line updates whenever the menu is shown.
- A game in progress is kept in memory while closed and reopened, lost on reload.
- Lifecycle: mirror `#splachni-ui` (`setMode`, `toggleFull`, `onFullClose`, `closeGame` with `endAfterFull` and the `focusMenu` fallback, `tickStopky`, `HrySeznam.odeber("porada")` on init or runtime failure).

- [ ] **Step 1: Markup and CSS.**
- [ ] **Step 2: Canvas sizing and drawing.**
- [ ] **Step 3: Loop, input, pause.**
- [ ] **Step 4: Events, end overlay, record, detail line, lifecycle, banner blocking, removal of the temporary rule.**
- [ ] **Step 5: Run** `node --test`. Expected: all pass.
- [ ] **Step 6: Browser check** at the mobile preset (375×812) and desktop, light and dark:
  - the whole board and the pad fit inline at 375 px; the page does not scroll while holding the pad (simulate with pointer events if needed);
  - keyboard: move, lay a meeting, escape, blast breaks crates, a colleague is removed, points rise;
  - lose a life on purpose: the manager respawns blinking at start, hearts drop;
  - finish a floor (a temporary debug path to clear colleagues is fine if removed afterwards): elevator opens, entering it gives floor 2 and saves the record;
  - game over: overlay, record updated, "Hrát znovu" restarts at floor 1;
  - Pauza, closing the game, switching to another tab and the 20-minute warning all freeze meetings and colleagues; after resuming nothing jumps;
  - fullscreen toggle, Esc and Back;
  - with the game open, `Instalace.vyhodnot("ios")` keeps the banner hidden;
  - console clean; reset the viewport to desktop.
- [ ] **Step 7: Commit**: `feat: hra Svolej poradu v zalozce Hry`

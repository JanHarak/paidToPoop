# Spláchni to! – implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an original match-3 game, "Spláchni to!", to the "Hry" tab. It has an office theme (emoji tiles), three modes (Tahy, Na čas, Nekonečná), and records per mode. The Nekonečná game is saved across page loads.

**Architecture:**
- `<script id="splachni-logika">` holds pure, deterministic logic (board, matches, specials, gravity, scoring, storage parsing), tested in Node. It returns step lists that the UI animates.
- `<script id="splachni-ui">` mirrors `#pisk-ui` / `#sachy-ui`:
  - absolutely positioned tile `<button>`s moved with CSS transforms;
  - inline in `#hraSlot` or fullscreen via `window.Vrstvy`;
  - registers with `window.HrySeznam`.

**Tech Stack:** Plain HTML/CSS/ES5 JS, Node `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-15-splachni-to-design.md`

## Global Constraints

- Everything lives in the single `index.html`.
  - JS is ES5 style (`var`, `function`), with no dependencies and no build step.
  - The UI is in Czech, mobile-first, with light and dark mode through the existing CSS variables.
  - No em dash characters in copy, comments or commits.
- Tests run with `node --test`, with no directory argument. 127 tests pass today.
  - Blocks are loaded through `tests/load-block.mjs`.
  - Objects from the vm realm need a JSON round-trip before `deepStrictEqual`.
- The board is 8×8. The index is `row*8 + col`, with row 0 at the top. Tile codes are integers:
  - `0..5` normal kinds, in order 📎 ☕ 📧 📊 🗓️ 🖨️;
  - `10+k` toilet 🚽 of kind k that clears its row (made from a horizontal run);
  - `20+k` toilet 🚽 of kind k that clears its column (made from a vertical run);
  - `30` sponge 🧽, which has no kind;
  - `-1` empty, used only inside steps.
  - `druh(code)` is `code % 10` for codes below 30, and -1 for the sponge.
- Scoring:
  - 10 points per cleared tile, multiplied by the chain level (1, 2, 3, …);
  - +50 for creating a 🚽;
  - +100 for creating a 🧽.
- Modes:
  - `"tahy"`: 25 moves;
  - `"cas"`: 90 s, counting only while the game is open, visible, not paused and not under the warning;
  - `"nekonecna"`: endless, saved.
- localStorage key `zachodova-splachni-v1` holds:
  - `rezim`: `"tahy"`, `"cas"` or `"nekonecna"`;
  - `rekordy`: `{tahy, cas, nekonecna}`;
  - `nekonecna`: `null` or `{deska:[64 codes], body}`.
  - Every access is wrapped in try/catch. The defaults are `{rezim:"tahy", rekordy:{0, 0, 0}, nekonecna:null}`.
- The game must not touch the stopwatch or earnings. Key handlers return early inside `[inert]`, and in fullscreen unless `Vrstvy.top()` is the game.
- The warning layer (z-index 61/62) stays above the game (50).
- The game exposes `window.Splachni = { isOpen }`. Add it to `blokovano()` in `#instalace-ui`.

## Review Focus

1. A swap that creates no run must leave the board, score and move count unchanged (Task 1 tests, Task 3 UI).
2. Chain reactions, and specials activating specials, must terminate. The final board after any move must have no runs and at least one move, or be reshuffled (Task 1 property test over many seeds).
3. Input during animations or chains is ignored. Closing the game or switching to fullscreen mid-animation must not corrupt the board or double-apply a move (Task 3).
4. The "Na čas" timer must not run while the game is closed, the tab is hidden, the page is in the background, the game is paused or the warning is shown. It must never go below 0 (Task 3).
5. A corrupt saved Nekonečná board (wrong length, invalid codes, existing runs, or no move) is discarded and never crashes the game (Task 1 `parseUlozeni`, Task 3).

---

### Task 1: Logic (`#splachni-logika`)

**Files:**
- Modify: `index.html`. Add `<script id="splachni-logika">` after the closing `</script>` of `#sachy-logika`.
- Test: `tests/splachni.test.mjs`

**Interfaces:**
- Produces `window.SplachniLogika`:
  - `N = 8`, `DRUHU = 6`, `EMOJI = ["📎","☕","📧","📊","🗓️","🖨️"]`, `ZACHOD = "🚽"`, `HOUBA = "🧽"`
  - `druh(kod) -> -1..5`
  - `novaDeska(rnd) -> number[64]`
    - It has no runs and `maTah` is true.
    - It is deterministic for the same `rnd` sequence.
  - `najdiRady(deska) -> [{bunky:number[], smer:"h"|"v", druh:number}]`
    - Each item is a maximal run of 3 or more of the same `druh`.
    - The sponge (-1) never matches.
  - `maTah(deska) -> bool` and `napoveda(deska) -> [a, b] | null`
    - A move is a swap that creates a run.
    - Any swap that involves a sponge counts as a move.
  - `tah(deska, a, b, rnd) -> {platny, deska, body, kroky}`
    - `a` and `b` must be orthogonal neighbours. Otherwise `platny` is false.
    - The input array is never mutated.
    - If `platny` is false, `deska` is a copy of the input, `body` is 0 and `kroky` is `[]`.
    - Each step is `{splach:[i...], vznik:[{i,kod}], pady:[{z,na,kod}], nove:[{i,kod}], body, retez}`.
      - Every step happens after the swap (the UI animates the swap first).
      - `nove[].i` are target cells. The UI drops them in from above the board.
    - When the final board has no move, the last step has `zamichano: true` and a `deska` field holding the reshuffled board.
  - `zamichej(deska, rnd) -> number[64]`
    - It permutes the existing codes so there is no run and `maTah` is true.
    - After 50 failed attempts it falls back to `novaDeska(rnd)`.
  - `parseUlozeni(raw) -> {rezim, rekordy:{tahy,cas,nekonecna}, nekonecna:null|{deska,body}}`
    - `nekonecna` is kept only if all of these hold:
      - `deska` has 64 valid codes;
      - `najdiRady(deska)` is empty;
      - `maTah(deska)` is true;
      - `body` is a non-negative integer.
- Resolution rules (not fully determined by the tests):
  - **Swap with a sponge:**
    - sponge + normal tile or toilet: clears every tile of that tile's `druh`, including toilets of that kind, which then activate;
    - sponge + sponge: clears the whole board.
  - **Swap of two non-special tiles:** valid only if a run results.
  - **Creating specials from the runs of a step:**
    - A cell belonging to both an `h` and a `v` run of the same kind, or any run of 5 or more, creates a 🧽 (code 30). It goes on the swapped cell if that cell is in the run, otherwise on the intersection cell or the run's middle cell.
    - Otherwise a run of exactly 4 creates a 🚽 of that kind (10+k for `h`, 20+k for `v`), at the swapped cell if it is in the run, else at `bunky[1]`.
    - A created special stays on the board, and is not cleared in that step.
  - **Activation:** a 🚽 that is cleared also clears its whole row (`10+k`) or column (`20+k`). This chains through any specials hit.
  - **Gravity:** after clearing, tiles fall down per column. Empty cells at the top are refilled with `Math.floor(rnd()*6)`.
  - Repeat with `retez + 1` until there are no runs.
  - Step body is `10 * clearedCount * retez`, plus the creation bonuses.

- [ ] **Step 1: Write the failing tests.** Use a seeded `rnd` helper (LCG) in the test file.
  - `novaDeska` with 200 seeds: no runs, `maTah` true, every code in 0..5.
  - `najdiRady`:
    - finds a horizontal run of 3 and a vertical run of 4 on a hand-built board;
    - does not match across a sponge.
  - `tah` with non-neighbours or an identical index gives `platny: false`.
  - A swap that creates no run gives `platny: false` and a board equal to the input. The input is not mutated.
  - A simple run of 3 gives `platny: true`. The first step's `splach` has exactly the 3 indices, `body` is 30 and `retez` is 1.
  - A run of 4 creates `10+k` (h) or `20+k` (v) at the swapped cell, with `body` including +50.
  - An L shape creates 30 at the intersection.
  - A 🚽 `10+k` included in a run clears its whole row: all 8 indices of that row are in `splach`.
  - Sponge + kind 2 clears every kind-2 tile.
  - Chain: a hand-built board where the refill is controlled by `rnd` gives a second step with `retez` 2 and doubled points.
  - Property test, 300 random games of 20 random valid moves each:
    - every final `deska` has no runs and has a move;
    - the codes are valid;
    - `body` equals the sum of the steps' `body`.
  - `zamichej` keeps the multiset of codes when it does not fall back.
  - `parseUlozeni`:
    - `null`, `"{bad"` and `"[]"` give the defaults;
    - a valid object round-trips;
    - `deska` of length 63 gives `nekonecna` null;
    - a `deska` with a ready run gives null;
    - an invalid `rezim` gives `"tahy"`;
    - negative records give 0.
- [ ] **Step 2: Run** `node --test`. Expected: FAIL with "Script block not found: splachni-logika".
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `node --test`. Expected: all pass, and the property test stays under about 2 s.
- [ ] **Step 5: Commit**:
  ```
  feat: logika hry Splachni to
  ```

### Task 2: Games list entry and detail

**Files:**
- Modify: `index.html`, in the `#hryMenu` markup and the CSS. Add a temporary rule to `#hry-seznam`.

**Interfaces:**
- Produces the markup contract used by Task 3:
  - List item: `<button class="hry-polozka" data-hra="splachni">` with name "Spláchni to!" and subtitle "Spoj tři stejné otravnosti".
  - Detail: `<div class="hry-detail" data-hra="splachni">` containing:
    - the text "Prohazuj sousední věci z kanceláře. Tři a víc stejných v řadě spláchneš. Stopky sezení běží dál.";
    - a `.seg` group labelled "Režim" with `.splachni-rezim[data-rezim="tahy"|"cas"|"nekonecna"]` buttons ("Tahy" / "Na čas" / "Nekonečná") using `aria-pressed`;
    - `p#splachniRezimPopis`, with copy filled in by Task 3:
      - tahy: "25 tahů na co nejvíc bodů.";
      - cas: "90 sekund, spláchni, co stihneš.";
      - nekonecna: "Hraj bez konce, hru si pamatuju.";
    - `#splachniRekord`;
    - `#splachniHrajBtn.hra-btn` "Zahraj si";
    - `#splachniNovaBtn.hra-btn-sek` "Nová hra", hidden;
    - a confirm group `#splachniPotvrzeni`, hidden, with text "Rozehraná hra se zahodí. Začít novou?" and buttons "Začít novou" / "Zpět", the same pattern as the chess detail.
- Temporary rule in `#hry-seznam`: if `window.SplachniLogika` is missing, call `HrySeznam.odeber("splachni")`. Task 3 removes it.

- [ ] **Step 1: Add the markup and CSS.** Copy the chess detail patterns, including the `[hidden]` overrides.
- [ ] **Step 2: Run** `node --test`. Expected: all pass.
- [ ] **Step 3: Browser check** on preview `static` at the mobile preset:
  - the Hry tab lists 4 games, and the Spláchni to! detail shows correctly;
  - the other games are unchanged;
  - the console is clean;
  - reset the viewport to desktop afterwards.
- [ ] **Step 4: Commit**:
  ```
  feat: Splachni to v seznamu her
  ```

### Task 3: Game UI (`#splachni-ui`)

**Files:**
- Modify: `index.html`
  - new `<div id="splachni" class="vrstva splachni" hidden>` after `#sachy`;
  - CSS;
  - new `<script id="splachni-ui">` after `#sachy-ui`;
  - `blokovano()` in `#instalace-ui`;
  - remove the Task 2 temporary rule.

**Interfaces:**
- Consumes:
  - `SplachniLogika` from Task 1;
  - the detail ids from Task 2;
  - `HrySeznam`, `Vrstvy`, `Stopky`.
- Produces `window.Splachni = { isOpen: () => bool }`.
- Markup:
  - The `.hra-hlava` header holds:
    - `h2` "Spláchni to!";
    - `#splachniBody` "Spláchnuto: N";
    - `#splachniZbyva`, showing "Tahů: 25" for tahy, "1:30" for cas, and hidden for nekonecna;
    - `#splachniStopky`;
    - `#splachniPauza`, shown only in cas mode, with text "Pauza" / "Pokračovat";
    - `#splachniCela`, a copy of the SVG pair, with the CSS selectors extended;
    - `#splachniZavrit` "×", with aria-label "Ukončit hru".
  - `p#splachniStav` with `role="status"`.
  - `#splachniDeska` is a square, `position: relative`, with `touch-action: none`.
    - It holds 64 tile `button.splachni-dlazdice` elements, absolutely positioned with `transform: translate(...)`.
    - It uses `role="grid"` with `role="row"` wrappers. If absolute positioning makes row wrappers impractical, use `role="group"` and an `aria-label` on each tile, and say so in the report.
  - The end overlay `#splachniKonec`, hidden, shows "Spláchnuto: N", an optional "Nový rekord!", and the buttons "Hrát znovu" / "Ukončit hru".
- Tiles:
  - The emoji glyph is shown at about 60% of the tile size.
  - Each kind gets a light tinted background, defined as six CSS custom properties per theme.
  - Toilets show 🚽 over their kind tint, with a small row or column indicator (↔ or ↕).
  - The sponge shows 🧽.
  - `aria-label` reads e.g. "Řádek 3, sloupec 5, káva". The kind names are sponka, káva, mail, graf, porada, tiskárna, záchod and houbička.
- Animation sequencing:
  - The swap takes 180 ms. An invalid swap animates there and back.
  - Then, for each step:
    1. clear: scale to 0 and fade, 180 ms;
    2. fall plus new tiles, 220 ms;
    3. if `zamichano`, show "Žádný tah, míchám…" and replace the board.
  - Implement with `setTimeout` chains or `transitionend` with a timeout fallback. Keep a `bezi` flag: input is ignored while it is true.
  - `prefers-reduced-motion` sets every duration to 0 or about 1 ms.
- Input:
  - **Pointer:** a `pointerdown` on a tile, then `pointermove` beyond 1/3 of the tile size, gives a swap toward the dominant direction.
  - **Tap:** the first tap selects a tile and the second, on a neighbour, swaps. A tap elsewhere reselects.
  - **Keyboard:** arrows move a roving tabindex. Enter or Space selects. An arrow while a tile is selected swaps in that direction. Esc clears the selection, unless fullscreen handles Esc first.
- Modes:
  - Moves are counted only for valid swaps.
  - **tahy:** at 0 moves, once the chain finishes, show the end overlay and update the record.
  - **cas:**
    - The timer runs on a 250 ms tick from `performance.now()` deltas, only while all of these hold:
      - the game is open and not paused;
      - `document.hidden` is false;
      - the Hry tab is visible (`#hraPanel` is not hidden);
      - `#warnModal` is hidden.
    - At 0, wait for any running chain, then show the end overlay.
  - **nekonecna:**
    - Save `{deska, body}` after each completed move.
    - Update the record continuously.
    - The detail shows "Pokračovat" plus "Nová hra" with a confirm when a saved game exists. The confirm works as in the chess detail.
  - tahy and cas games in progress are kept in memory while the game is closed and reopened, and lost on reload.
  - "Hrát znovu" starts a new game in the same mode.
- Lifecycle: mirror `#sachy-ui`:
  - `setMode`, `toggleFull`, `onFullClose`;
  - `closeGame`, with `endAfterFull` and the `focusMenu` fallback;
  - `tickStopky`;
  - `HrySeznam.odeber("splachni")` on init or runtime failure.
- Closing mid-animation finishes the logical state immediately: the board is already final in the logic result, so the UI just renders the final state on next open. The move is applied exactly once.

- [ ] **Step 1: Markup and CSS.** Make the board square: `width: min(100%, 72vh)` inline, filling the space in fullscreen.
- [ ] **Step 2: Detail wiring.** Mode toggles with descriptions and per-mode record, the remembered mode, and Pokračovat / Nová hra with the confirm for Nekonečná.
- [ ] **Step 3: Board rendering and animation sequencing.**
- [ ] **Step 4: Input** (pointer, tap, keyboard).
- [ ] **Step 5: Modes, timer, end overlay, saving, lifecycle, banner blocking, and removal of the temporary rule.**
- [ ] **Step 6: Run** `node --test`. Expected: all pass.
- [ ] **Step 7: Browser check** at the mobile preset (375×812) and on desktop, in light and dark mode:
  - **Tahy:**
    - play by tap and by drag (mouse drag in the pane);
    - an invalid swap animates back and does not use a move;
    - the move counter decreases;
    - force the end by setting the remaining moves to 1 through a temporary debug path, or play out; the overlay appears and the record updates.
  - **Na čas:**
    - the timer counts down;
    - Pauza stops it;
    - closing the game stops it, and reopening resumes it;
    - switching to the Svět tab stops it;
    - simulating the 20-minute warning stops it;
    - at 0 the overlay appears.
  - **Nekonečná:**
    - play a few moves, then reload;
    - "Pokračovat" restores the board and the score;
    - "Nová hra" asks for confirmation.
  - **Fullscreen:**
    - toggling mid-chain leaves the board consistent;
    - Esc and Back leave fullscreen.
  - **Banner:** with the game open, `Instalace.vyhodnot("ios")` keeps the install banner hidden.
  - **Console:** clean.
  - Reset the viewport to desktop.
- [ ] **Step 8: Commit**:
  ```
  feat: hra Splachni to v zalozce Hry
  ```

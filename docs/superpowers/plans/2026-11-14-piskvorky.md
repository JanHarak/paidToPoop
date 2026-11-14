# Piškvorky a seznam her – implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the "Hra" tab into a games list with a detail section, and add Gomoku ("Piškvorky", five in a row) against the computer, with a pannable board.

**Architecture:** Everything lives in `index.html`, split into script blocks. `#pisk-logika` holds pure logic: the board, the win check and the computer move, tested in Node. `#hry-seznam` holds the list and detail controller that both games register with. `#pisk-ui` holds the Gomoku UI: a 25×25 grid of `<button>` cells in an `overflow:auto` box, with fullscreen through `window.Vrstvy`, the same way Rulíčka does it. Rulíčka (`#hra-ui`) keeps its behaviour and only changes its entry points.

**Tech Stack:** Plain HTML/CSS/ES5 JS, no dependencies; Node `node:test` for logic.

**Spec:** `docs/superpowers/specs/2026-11-14-piskvorky-design.md`

## Global Constraints

- Everything stays in the single `index.html`. Use ES5-style JS (`var`, `function`), no dependencies and no build step. The UI is in Czech, mobile-first, with light and dark mode via the existing CSS variables (`--ink`, `--muted`, `--line`, `--brass`, `--porcelain`, …).
- Never use an em dash in copy, comments or commit messages. Use an en dash with spaces, or a hyphen in code.
- Tests run with `node --test`, with no directory argument (Windows). Load blocks via `tests/load-block.mjs` (`loadBlock(id)` returns the block's `window`).
- The game must not touch the stopwatch keys, the earnings or `zachod` state. It only reads `window.Stopky` for display.
- localStorage keys:
  - `zachodova-hry-vyber-v1` stores the selected game id, `"rulicka"` or `"piskvorky"`.
  - `zachodova-piskvorky-v1` stores `{vyhry, prohry, remizy, obtiznost}`, where `obtiznost` is `"lehka"` or `"tezsi"`.
  - Every read and write is wrapped in try/catch.
- Board size is 25×25, cells are about 34 px, and a win needs 5 or more in a row (overlines win). The player is × (value 1) and the computer is ○ (value 2).
- The computer moves about 300 ms after the player and must compute its move in under about 100 ms.
- The warning layer stays above games (z-index 61/62 > 50). Game key handlers return early when the game is inside `[inert]`.

## Review Focus

1. A finger drag that pans the board must not place a stone. Native `click` on buttons inside an `overflow:auto` box already gives this, but there must be no `touchstart`/`pointerdown` placement handlers. Verify by dragging in mobile emulation in Task 3.
2. Taps on a cell while the computer is thinking, on an occupied cell, or after the game is over do nothing. `PiskLogika.place` returns false (Task 1 tests), and the UI only calls `place` when it is the player's turn.
3. Lines touching the board edge, and lines of 6, count as a win (Task 1 tests).
4. If the game is closed or put into fullscreen mid-think, the computer still makes exactly one move when the game is shown again. Track a `pending` timer, clear it on close, and re-schedule on open if `turn === 2 && !over` (Task 3 step).
5. Corrupt or missing localStorage data falls back to defaults (Task 1 `parseStats` tests). If localStorage throws, the game is still playable (Task 3 try/catch).

---

### Task 1: Gomoku logic `#pisk-logika`

**Files:**
- Modify: `index.html`. Add `<script id="pisk-logika">` right after the closing `</script>` of `#hra-logika`.
- Test: `tests/pisk.test.mjs`

**Interfaces:**
- Produces `window.PiskLogika`:
  - `SIZE = 25`
  - `newGame(starter: 1|2) -> state`, where state is `{size, board: number[size*size] (0 empty / 1 / 2), turn: 1|2, over: bool, winner: 0|1|2, line: number[]|null, last: number (-1 if none), moves: number}`.
  - `place(state, idx, who) -> bool`. It mutates the state. It returns false if the game is over, `who !== state.turn`, idx is out of range, or the cell is occupied. On success it sets `last` and `moves`, checks for a win (setting `over`, `winner` and `line`, where `line` holds all indices of the winning run, length ≥ 5), checks for a draw (board full: `over`, `winner` 0), and otherwise flips `turn`.
  - `winLine(board, size, idx) -> number[]|null`. Returns the longest same-stone run through idx in any of the 4 directions if its length is ≥ 5, otherwise null.
  - `bestMove(state, level: "lehka"|"tezsi", rnd: () => number) -> idx`. Plays for `state.turn`.
  - `parseStats(raw: string|null) -> {vyhry, prohry, remizy, obtiznost}`. Non-negative integers. Invalid values become 0 and an invalid level becomes `"lehka"`.

- [ ] **Step 1: Write failing tests** in `tests/pisk.test.mjs` (`const P = loadBlock("pisk-logika").PiskLogika`, with a helper `at(x,y)=y*25+x`):
  - `newGame(1)`: the board has 625 zeros, `turn===1`, `over===false`, `last===-1`.
  - `place` rejects an occupied cell, the wrong player, `idx` -1 or 625, and any move after `over`.
  - Horizontal win `(0..4, 0)`: after the 5th move, `over`, `winner===1`, and `line` sorted equals the 5 indices. Check vertical `(24, 20..24)`, diagonal `(20..24, 20..24)` and anti-diagonal `(4,0),(3,1),(2,2),(1,3),(0,4)` the same way. Four in a row plus a gap is not a win.
  - Overline: stones at x=0..2 and x=4..5, then placing x=3 gives `line.length===6`.
  - Row wrap guard: stones at `(22..24, 0)` and `(0..1, 1)` are not a win.
  - Draw: fill a board in a pattern with no 5-run (for example, a cell is 1 when `((x + 2*y) >> 1) % 2 === 0`, then verify no `winLine`), leave one cell, and place it. The game is over with `winner===0`. Build the state by assigning to `board` directly and then calling `place` for the last cell.
  - `bestMove` on an empty board, for both levels, returns the centre `at(12,12)`.
  - Win priority: computer stones at `(5..8, 10)` with `(4,10)` and `(9,10)` empty, and player stones elsewhere forming an open three. With `turn=2`, both levels return `at(4,10)` or `at(9,10)`.
  - Block five: player stones at `(5..8, 10)` with `(4,10)` taken by the computer. With `turn=2`, both levels return `at(9,10)`.
  - Block open four on "tezsi": player at `(5..7, 10)`, both ends open. The result is in `{at(4,10), at(8,10)}`.
  - Determinism: the same state with `rnd` returning 0 gives the same move twice.
  - Speed: a mid-game board with about 120 random stones (seeded) and no win. `bestMove` with "tezsi" takes under 200 ms in Node.
  - `parseStats(null)` gives `{vyhry:0, prohry:0, remizy:0, obtiznost:"lehka"}`. `parseStats("{bad")` gives the same. `parseStats('{"vyhry":3,"prohry":-1,"remizy":"x","obtiznost":"tezsi"}')` gives `{vyhry:3, prohry:0, remizy:0, obtiznost:"tezsi"}`.

- [ ] **Step 2: Run** `node --test`. Expected: the new tests fail with "Script block not found: pisk-logika". The 60 existing tests pass.

- [ ] **Step 3: Implement `#pisk-logika`.** `bestMove` algorithm (the tests do not fully determine it):
  - Candidates are empty cells within Chebyshev distance 2 of any stone. On an empty board, return the centre.
  - For each candidate and each of the 4 directions, count the run that placing `me` would make (contiguous stones, plus open ends 0/1/2). Do the same for `opp`.
  - Score per direction, by run length and open ends:
    - 5 or more: 1 000 000
    - 4 with 2 open ends: 100 000
    - 4 with 1 open end: 10 000
    - 3 with 2 open ends: 5 000
    - 3 with 1 open end: 500
    - 2 with 2 open ends: 200
    - 2 with 1 open end: 50
    - 1: 5
    - 0 open ends with a run under 5: 0
  - Sum over the directions. `total = attack + defenseWeight * defense`. `defenseWeight` is 0.9 for "tezsi" and 0.6 for "lehka".
  - Hard rules before scoring, for both levels:
    1. If any candidate wins for `me`, return it.
    2. If any candidate would give `opp` five, return it.
  - "tezsi" returns the max `total`. Ties are broken by `rnd`: index `Math.floor(rnd() * ties.length)`.
  - "lehka" sorts by `total` and picks `Math.floor(rnd() * k)` from the top `k = min(4, n)`.

- [ ] **Step 4: Run** `node --test`. Expected: all tests pass.

- [ ] **Step 5: Commit**:
  ```
  git add index.html tests/pisk.test.mjs
  git commit -m "feat: logika piskvorek s pocitacovym souperem"
  ```

### Task 2: Games list and detail in the Hra tab (`#hry-seznam`), Rulíčka moved in

**Files:**
- Modify: `index.html`
  - Markup `#hraPanel` (around lines 868-875)
  - CSS near `.hra-uvod` (around lines 585-603)
  - New `<script id="hry-seznam">` immediately before `<script id="hra-ui">`
  - `#hra-ui` entry points: `hideEntry`, `openGame`, `closeGame`, `fail`

**Interfaces:**
- Produces `window.HrySeznam`:
  - `zobrazMenu()` shows the list and detail, and hides `#hraSlot`.
  - `skryjMenu()` hides the list and detail, and shows `#hraSlot`.
  - `odeber(id)` hides that game's list item and detail. If it was selected, it selects the first remaining game. If none remain, it switches to the Svět tab (when Hra is selected) and hides `#tabHra`.
  - `vyber(id)` selects a game and saves it to `zachodova-hry-vyber-v1`.
  - `vybrana()` returns the selected id.
- Markup contract, used by Task 3:
  - Each list item is `<button class="hry-polozka" data-hra="<id>" aria-pressed="true|false">`, holding a `<span class="hry-nazev">` and a `<span class="hry-pod">`.
  - Each detail is `<div class="hry-detail" data-hra="<id>">`, holding the title, text, a stats line and the Play button.
  - Ids:
    - Rulíčka: `hrajBtn` (kept) and stats `#rulickaRekord`.
    - Piškvorky: `piskHrajBtn` and stats `#piskStat`. Difficulty buttons are `.pisk-obt` with `data-obt="lehka|tezsi"` and `aria-pressed`, in a `.seg` group labelled "Obtížnost".
  - The list and detail live in a wrapper `#hryMenu`, which replaces `#hraUvod`. `#hraSlot` stays.
- Copy:
  - Rulíčka list subtitle: "Utíkej šéfovi z kanceláře". The detail text stays as it is today.
  - Piškvorky list subtitle: "Pět v řadě proti počítači".
  - Piškvorky detail text: "Polož pět svých křížků do řady dřív než počítač. Pole se dá posouvat prstem. Stopky sezení běží dál."
  - Stats line: "Výhry X · Prohry Y · Remízy Z".
  - Rulíčka record line: "Rekord: N Kč", formatted the way the HUD formats the record.

- [ ] **Step 1: Markup + CSS.**
  - Lay out the list as a vertical stack of full-width rows, min-height 44px. The selected row gets a `--brass` left border and a `--porcelain` background.
  - Under the list, add a 2px dashed `--line` separator, then the detail. The detail is centred, with the Play button styled like today's `.hra-uvod .hra-btn`.
  - Ship the piškvorky detail markup now, including the difficulty buttons. Task 3 wires it up.
  - Until Task 3, `#hry-seznam` calls `odeber("piskvorky")` only if `window.PiskLogika` is missing. Task 3 replaces that with registration from `#pisk-ui`.
- [ ] **Step 2: `#hry-seznam` script.**
  - Handles click selection.
  - Up and Down arrows move between visible items.
  - Restores the saved selection, or falls back to the first visible item.
- [ ] **Step 3: Rewire `#hra-ui`.**
  - `openGame` calls `HrySeznam.skryjMenu()` instead of toggling `uvod` and `slot`. `closeGame` calls `HrySeznam.zobrazMenu()` and then `hrajBtn.focus()`.
  - `hideEntry` and `fail` call `HrySeznam.odeber("rulicka")` instead of hiding the tab. Keep the old fallback if `HrySeznam` is missing.
  - Update `#rulickaRekord` at init and in `closeGame`, after `saveBest`.
- [ ] **Step 4: Run** `node --test`. Expected: all tests pass, because the blocks still load.
- [ ] **Step 5: Browser check** (preview config `static`, port 8000). In the Hra tab:
  - Both items are shown, Rulíčka is selected and its detail shows the record.
  - Selecting Piškvorky switches the detail. The selection survives a reload.
  - Rulíčka plays inline and in fullscreen as before. Closing it returns to the menu with focus on "Zahraj si".
  - There are no console errors.
- [ ] **Step 6: Commit**:
  ```
  git commit -am "feat: seznam her s detailem v zalozce Hra"
  ```

### Task 3: Gomoku UI `#pisk-ui`

**Files:**
- Modify: `index.html`
  - New `<div id="pisk" class="vrstva pisk" hidden>` after `#hra`
  - CSS after the `.hra-inline` rules
  - New `<script id="pisk-ui">` after `#hra-ui`

**Interfaces:**
- Consumes:
  - `window.PiskLogika` (Task 1)
  - `window.HrySeznam` and the piškvorky detail ids (Task 2)
  - `window.Vrstvy.open(el, {onClose, initialFocus})`, `close(el)` and `top()`
  - `window.Stopky` (`restoreStart`, `elapsedMs`, `fmtTime`), used exactly as `#hra-ui` uses it for `#hraStopky`
- Produces `window.Pisk = { isOpen: () => bool }`.
- Markup:
  - The header `.hra-hlava` holds:
    - `h2#piskTitul` "Piškvorky"
    - `span#piskSkore`, showing "Výhry X · Prohry Y"
    - `span#piskStopky`, styled like `#hraStopky`
    - `button#piskCela`, a copy of the `#hraCela` SVG pair, with CSS rules extended to `#piskCela`
    - `button#piskZavrit` "×", with aria-label "Ukončit hru"
  - `p#piskStav` with `role="status"`.
  - `div#piskPole.pisk-pole`, the scroll box: `overflow:auto`, `touch-action: pan-x pan-y`, `overscroll-behavior: contain`.
    - Inline it is `height: min(72vh, 520px)`. In fullscreen it uses `flex: 1`.
    - It contains `div#piskMrizka`, a CSS grid of 25 columns, 34px each, with 625 `button.pisk-bunka` cells.
    - Each cell has `aria-label` "Řádek R, sloupec S, prázdné|křížek|kolečko".
    - Grid ARIA: `role="grid"` on `#piskMrizka`. Rows are not needed. Mark cells with `role="gridcell"`. Use roving `tabindex`: exactly one cell has 0.
  - `button#piskNova` "Nová hra" is hidden until the game is over.
- Behaviour:
  - Stones: × uses `--ink` and ○ uses `--brass`.
  - Last computer move: an outline. Winning line: a `--porcelain` background and bold.
  - `#piskStav` text, depending on state:
    - "Jsi na tahu"
    - "Počítač přemýšlí…"
    - "Vyhrál jsi!"
    - "Prohrál jsi"
    - "Remíza"
- [ ] **Step 1: Markup + CSS** as above, reusing `.vrstva`, `.hra-hlava` and `.hra-inline`. The `.hra-inline` rules are generalised so `#pisk.hra-inline` gets a border and radius, and `.hra-inline .pisk-pole` gets the inline height.
- [ ] **Step 2: `#pisk-ui` script.**
  - Initialisation:
    - Build the 625 cells once, in a DocumentFragment.
    - Stats come from `PiskLogika.parseStats(localStorage)`. Saving happens at game end and on difficulty change.
    - If any init step throws, call `HrySeznam.odeber("piskvorky")` and `console.error`. Remove the Task 2 temporary check.
  - Detail: clicking a difficulty button sets `stats.obtiznost`, saves, and updates `aria-pressed`. `#piskStat` text: "Výhry X · Prohry Y · Remízy Z".
  - Starting:
    - `#piskHrajBtn` calls `openGame()`. This moves `#pisk` into `#hraSlot`, sets inline mode, calls `HrySeznam.skryjMenu()`, and creates a game if there is none or the last one is over.
    - The starter alternates. The first game in a page lifetime is started by the player.
    - Centre the scroll on `(12,12)` only when a new game starts. Focus the roving cell with `preventScroll`.
  - Player move:
    - A `click` on `#piskMrizka` uses delegation to find the cell index. It is ignored unless `state.turn===1 && !state.over && !pending`.
    - Then `place(state, i, 1)` runs and the view re-renders. If the game is not over, `pending = setTimeout(computerMove, 300)`.
  - Computer move:
    - `place(state, PiskLogika.bestMove(state, stats.obtiznost, Math.random), 2)`, render, then `pending = 0`.
    - If the move's cell is outside the visible scroll area, scroll it into view with `block/inline: "nearest"`.
  - Game over:
    - Update stats: a win if `winner===1`, a loss if 2, a draw if 0. Save them.
    - Show `#piskNova` and focus it. `#piskNova` starts a new game with the alternating starter.
    - If a new game starts with the computer, it plays the centre after 300 ms.
  - Fullscreen and closing mirror `#hra-ui` (`setMode`, `toggleFull`, `onFullClose`, `closeGame`, `endAfterFull`), using `#pisk` and its own buttons.
  - `closeGame`:
    - Clear `pending` without consuming the turn.
    - Hide `#pisk` and call `HrySeznam.zobrazMenu()`.
    - Refresh `#piskStat` and focus `#piskHrajBtn`.
    - An unfinished game stays in memory and is not counted.
  - On open, if `state.turn===2 && !state.over`, re-schedule the computer move.
  - The stopwatch display in the header updates every 1 s while the game is open, the same way as `#hra-ui`'s `tickStopky`. The interval is cleared on close.
  - Keyboard: a `keydown` on `#piskMrizka`.
    - Arrows move the roving cell (clamped) and focus it.
    - Enter or Space acts as a click.
    - Return early if `#pisk.closest("[inert]")`, or if in fullscreen and `Vrstvy.top() !== pisk`.
  - Opening a game while the other is open cannot happen, because the menu is hidden while a game is open. No extra code.
- [ ] **Step 3: Run** `node --test`. Expected: all tests pass.
- [ ] **Step 4: Browser check** at 375×812 (mobile preset) and on desktop:
  - Play a game to a loss on "tezsi" by placing random moves. The status, winning-line highlight, stats update and "Nová hra" all work.
  - Drag to pan without placing a stone. Tapping places a stone.
  - Fullscreen toggles back and forth mid-game without losing the board or the scroll position.
  - Esc and browser Back leave fullscreen.
  - Closing mid-think and reopening: the computer moves exactly once.
  - Simulate the warning with `localStorage` start time over 20 minutes ago, or call the warning function. The warning is on top, and the arrow keys don't move the grid.
  - The stopwatch keeps counting.
  - There are no console errors in light or dark mode.
- [ ] **Step 5: Commit**:
  ```
  git commit -am "feat: piskvorky proti pocitaci v zalozce Hra"
  ```

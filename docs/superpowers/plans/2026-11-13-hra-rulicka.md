# Rulička na útěku – plán implementace

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Cíl:** Přidat do `index.html` originální bludišťovou hru „Rulička na útěku“ a trvalé stopky sezení, které hra nikdy nepřeruší.

**Architektura:** Všechno zůstává v `index.html`, rozdělené do samostatných `<script>` bloků s vlastní IIFE: čistá logika stopek (`#stopky-logika`), sdílený pomocník vrstev (`#vrstvy`), stávající kalkulačka, čistá herní logika bez DOM (`#hra-logika`) a herní UI (`#hra-ui`). Čisté bloky se testují v Node přes `node:test`: test vytáhne obsah bloku podle `id` z `index.html` a spustí ho ve `vm` s objektem `window`. DOM části se ověřují ručně v prohlížeči.

**Tech stack:** čisté HTML, CSS, JS (ES5 styl jako stávající kód: `var`, `function`), canvas 2D; testy Node 22 `node:test` + `node:assert`, bez závislostí.

**Spec:** [docs/superpowers/specs/2026-11-13-hra-rulicka-design.md](../specs/2026-11-13-hra-rulicka-design.md)

## Global Constraints

- Jeden soubor `index.html`, žádné závislosti ani build. Testy jsou jen vývojové soubory ve `tests/`.
- Rozhraní česky. V textech žádné dlouhé pomlčky (em dash), jen „–“ s mezerami nebo krátká věta.
- Barvy jen přes CSS proměnné stránky (`--tile`, `--grout`, `--porcelain`, `--ink`, `--muted`, `--brass`, `--brass-soft`, `--line`), světlý i tmavý režim.
- Žádné prvky Pac-Mana: žádný žlutý kruh s ústy, žádní duchové, klasická jména ani klasické bludiště, žádné zvuky.
- Klíče `localStorage`: hra `zachodova-hra-v1`, stopky `zachodova-stopky-v1`. Klíč `zachodova-kalkulacka-v1` hra nečte ani nemění. Každý přístup v `try/catch`.
- Hra nesmí spustit, zastavit ani změnit stopky; chyba ve hře nesmí rozbít kalkulačku.
- Herní smyčka běží jen při otevřené a nepozastavené hře.

## Review Focus

1. Stopky běží, hráč stiskne Zpět ve hře: zavře se jen hra, stránka zůstane, stopky běží (test: Task 2 ruční krok 6).
2. Stránka obnovená nebo mobilem zahozená během sezení: stopky se obnoví se správným časem, starší než 12 h se zahodí (testy `restoreStart` v Task 1).
3. `localStorage` vyhazuje výjimku (soukromý režim): stopky i hra fungují v paměti (test `restoreStart` s `null`, ruční krok Task 1).
4. Rychlé tažení prstem nebo dvě šipky těsně po sobě před křižovatkou: směr se zapamatuje a provede (test `bufferedTurnAtIntersection` v Task 3).
5. Velký `dt` po návratu na kartu: postava neproletí zdí (test `largeDtDoesNotTunnel` v Task 3; smyčka navíc omezuje `dt` na 0,1 s v Task 5).

---

### Task 1: Testovací harness, trvalé stopky a API kalkulačky

**Files:**
- Create: `tests/load-block.mjs`, `tests/stopky.test.mjs`
- Modify: `index.html` (nový blok `<script id="stopky-logika">` před stávajícím skriptem; stávající skript kalkulačky ř. 463–664)

**Interfaces:**
- Produces:
  - `tests/load-block.mjs`: `loadBlock(id: string): object` – načte `index.html`, vytáhne obsah `<script id="{id}">…</script>`, spustí ho ve `vm.createContext({ window: {} })` a vrátí `context.window`.
  - `window.Stopky` (blok `#stopky-logika`):
    - `KEY = "zachodova-stopky-v1"`, `MAX_AGE_MS = 12 * 3600 * 1000`
    - `restoreStart(raw: string|null, now: number): number|null` – vrátí uložený start, jen když je `raw` celé číslo ≤ `now` a `now - start < MAX_AGE_MS`; jinak `null`.
    - `elapsedMs(start: number, now: number): number` – `max(0, now - start)`.
    - `fmtTime(ms: number): string` – `"m:ss"` (přesunutá stávající `fmtTime` z kalkulačky).
  - `window.zachod` (vystaví kalkulačka): `{ timerStart(): number|null, earned(ms: number): number, money(v: number): string }`.

- [ ] **Step 1: Napiš `tests/load-block.mjs` a padající testy v `tests/stopky.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBlock } from "./load-block.mjs";
const S = loadBlock("stopky-logika").Stopky;
const NOW = 1_800_000_000_000;
test("restoreStart vrací platný start", () => assert.equal(S.restoreStart(String(NOW - 60000), NOW), NOW - 60000));
test("restoreStart null pro chybějící hodnotu", () => assert.equal(S.restoreStart(null, NOW), null));
test("restoreStart null pro nesmysl", () => assert.equal(S.restoreStart("abc", NOW), null));
test("restoreStart null pro budoucnost", () => assert.equal(S.restoreStart(String(NOW + 1000), NOW), null));
test("restoreStart null po 12 h", () => assert.equal(S.restoreStart(String(NOW - 12 * 3600 * 1000), NOW), null));
test("elapsedMs nikdy záporné", () => assert.equal(S.elapsedMs(NOW, NOW - 5), 0));
test("fmtTime", () => { assert.equal(S.fmtTime(252000), "4:12"); assert.equal(S.fmtTime(5000), "0:05"); });
```

- [ ] **Step 2: Spusť testy, musí selhat**

Run: `node --test tests/`
Expected: FAIL (blok `stopky-logika` neexistuje)

- [ ] **Step 3: Přidej blok `#stopky-logika` s `window.Stopky` podle Interfaces**

- [ ] **Step 4: Spusť testy, musí projít**

Run: `node --test tests/`
Expected: PASS, 7 testů

- [ ] **Step 5: Zapoj trvalé stopky do kalkulačky**

V handleru `#flush`: při startu ulož `String(timerStart)` pod `Stopky.KEY`, při spláchnutí klíč smaž (obojí v `try/catch`). Spouštěcí část handleru (stav tlačítka, `startRain`, interval s textem „Sedíš … a už máš …“) přesuň do `startTimer(start: number)` a volej ji z handleru i na konci inicializace, když `Stopky.restoreStart(localStorage.getItem(Stopky.KEY), Date.now())` vrátí start. Neplatný uložený start smaž. Výpočet času vždy přes `Stopky.elapsedMs(timerStart, Date.now())`. Na konci IIFE nastav `window.zachod` podle Interfaces (`earned(ms) = rateMin() * ms / 60000`).

- [ ] **Step 6: Ruční ověření v prohlížeči**

Otevři `index.html`. Spusť stopky, počkej 5 s, obnov stránku: tlačítko je „Hotovo, spláchnout“, čas pokračuje (≥ 0:05), prší bankovky. Spláchni a obnov: stopky neběží. V DevTools nastav `localStorage.setItem("zachodova-stopky-v1", String(Date.now() - 13*3600*1000))` a obnov: stopky neběží a klíč je pryč. V anonymním okně se zablokovaným úložištěm stopky fungují jako dřív.

- [ ] **Step 7: Commit**

```bash
git add index.html tests/load-block.mjs tests/stopky.test.mjs
git commit -m "feat: trvale stopky sezeni prezivaji obnoveni stranky"
```

### Task 2: Sdílený pomocník vrstev a tlačítko „Zahraj si“

**Files:**
- Modify: `index.html` (blok `<script id="vrstvy">` před kalkulačkou; CSS `.vrstva`; markup `#hra` a tlačítka `#hrajBtn` v `<header>`)

**Interfaces:**
- Produces: `window.Vrstvy`:
  - `open(el: HTMLElement, opts: { onClose?: () => void, returnFocus?: HTMLElement }): void` – zobrazí `el` (`hidden = false`), přidá do zásobníku, `history.pushState({ vrstva: true }, "")`, zamkne scroll (`document.documentElement.classList.add("zamceno")`), pošle na `window` událost `"vrstva-otevrena"` s `detail: el`.
  - `close(el?: HTMLElement): void` – zavře nejvrchnější (nebo danou) vrstvu; když stav historie pochází z ní, zavolá `history.back()` a dokončí zavření v `popstate`. Zavolá `onClose`, vrátí fokus, při prázdném zásobníku odemkne scroll.
  - `top(): HTMLElement|null`
  - Jeden `popstate` a jeden `keydown` (Esc) handler: zavřou jen nejvrchnější vrstvu.
- Markup: `<div id="hra" class="vrstva" role="dialog" aria-modal="true" aria-labelledby="hraTitul" hidden>` s hlavičkou (titul „Rulička na útěku“, `#hraSkore`, `#hraRekord`, `#hraZivoty`, `#hraUroven`, `#hraStopky` (hidden), `#hraPauza`, `#hraZavrit` „×“) a `<canvas id="hraPlocha">`.

- [ ] **Step 1: Implementuj `Vrstvy`, CSS (`.vrstva` fixed přes celou obrazovku s `safe-area-inset`, pozadí `--tile`; `.zamceno { overflow: hidden }`) a markup**

- [ ] **Step 2: Dočasně napoj `#hrajBtn` na `Vrstvy.open($("hra"), { returnFocus: hrajBtn })` a `#hraZavrit` na `Vrstvy.close()`**

- [ ] **Step 3: Ruční ověření**

Na šířce 375 px i desktopu: „Zahraj si“ otevře prázdnou vrstvu, stránka pod ní se neposouvá. Zavření křížkem, Esc i Zpět funguje, fokus se vrátí na „Zahraj si“, scroll se odemkne. Po zavření Zpět stránka neodešla jinam (druhé Zpět teprve opouští stránku). Spusť stopky, otevři a zavři vrstvu všemi třemi způsoby: stopky běží dál beze skoku.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: sdilene vrstvy pres celou obrazovku a vstup do hry"
```

### Task 3: Herní logika – bludiště a pohyb

**Files:**
- Modify: `index.html` (blok `<script id="hra-logika">`, bez přístupu k DOM)
- Create: `tests/hra-pohyb.test.mjs`

**Interfaces:**
- Produces v `window.HraLogika`:
  - `DIRS = { up: {x:0,y:-1}, left: {x:-1,y:0}, down: {x:0,y:1}, right: {x:1,y:0} }`, pořadí pro remízy `["up","left","down","right"]`.
  - `MAZE: string[]` – vlastní bludiště 19 sloupců × 21 řádků. Znaky: `#` zeď, `.` mince, `o` power-up, ` ` prázdno, `-` dveře zasedačky, `Z` zasedačka, `S` start ruličky, `H` hlídací políčko HR, `<`/`>` konce bočního průchodu (průchozí, bez mince).
  - `parseMaze(rows: string[]): Maze` kde `Maze = { w, h, walls: boolean[], coins: Set<number>, powerups: Set<number>, start: {x,y}, pen: {x,y}[], door: {x,y}, patrol: {x,y}, tunnelRow: number|null }`, index políčka `y * w + x`.
  - `isWall(maze, x, y, forEnemy: boolean): boolean` – mimo mřížku v řádku průchodu není zeď; dveře `-` jsou zeď jen pro ruličku.
  - `Entity = { x: number, y: number, dir: string|null, next: string|null, speed: number }` (pozice v políčkách, střed políčka = celé číslo, rychlost v políčkách za sekundu).
  - `stepEntity(e: Entity, maze: Maze, dt: number, forEnemy: boolean): void` – posune o `speed*dt` po malých krocích (max 0,25 políčka), na středu políčka zkusí `next`, pak `dir`, před zdí zastaví na středu, v průchodu přetočí `x` na druhou stranu.

- [ ] **Step 1: Napiš padající testy**

Použij malé testovací bludiště v testu (např. 5×5 s křižovatkou uprostřed) a reálné `MAZE`:
- `parseMaze` na `MAZE`: `w === 19`, `h === 21`, `powerups.size === 4`, `coins.size > 150`.
- `mazeIsSymmetric`: každý řádek `MAZE` se rovná svému zrcadlu (se záměnou `<`/`>`).
- `noDeadEnds`: každé průchozí políčko mimo zasedačku má aspoň 2 průchozí sousedy.
- `allCoinsReachable`: BFS ze `start` (pohyb ruličky) dosáhne všech mincí a power-upů.
- `stopsAtWall`: entita jedoucí do zdi skončí na středu posledního volného políčka, `x` je celé číslo.
- `bufferedTurnAtIntersection`: `dir = "right"`, `next = "down"` 1,5 políčka před křižovatkou; po dostatečném `dt` je `dir === "down"`.
- `largeDtDoesNotTunnel`: `stepEntity(e, maze, 5, false)` u zdi nikdy neskončí na políčku zdi.
- `tunnelWraps`: entita v řádku průchodu jedoucí doleva z `x = 0` se objeví u `x = w - 1`.
- `doorBlocksPlayerOnly`: `isWall(maze, door.x, door.y, false) === true`, `isWall(..., true) === false`.

- [ ] **Step 2: Spusť, musí selhat**

Run: `node --test tests/`
Expected: FAIL v `hra-pohyb.test.mjs`

- [ ] **Step 3: Navrhni `MAZE` a implementuj `parseMaze`, `isWall`, `stepEntity`**

Bludiště vlastní, kancelářský půdorys (bloky stolů, kuchyňka, zasedačka uprostřed, start dole), ne kopie klasického.

- [ ] **Step 4: Spusť, musí projít**

Run: `node --test tests/`
Expected: PASS všech testů

- [ ] **Step 5: Commit**

```bash
git add index.html tests/hra-pohyb.test.mjs
git commit -m "feat: bludiste a pohyb postav pro hru"
```

### Task 4: Herní logika – nepřátelé, power-up, skóre, úrovně

**Files:**
- Modify: `index.html` (blok `#hra-logika`)
- Create: `tests/hra-pravidla.test.mjs`

**Interfaces:**
- Consumes: `parseMaze`, `isWall`, `stepEntity`, `DIRS`, `MAZE` z Task 3.
- Produces v `window.HraLogika`:
  - `ENEMIES = ["sef", "pm", "kolega", "hr"]`, `RELEASE_S = { sef: 0, pm: 3, kolega: 6, hr: 9 }`.
  - `POINTS = { coin: 10, powerup: 50, enemy: [200, 400, 800, 1600] }`.
  - `powerDuration(level: number): number` – `max(3, 8 - level)` sekund (úroveň 1 → 7).
  - `enemySpeed(level: number, playerSpeed: number): number` – `min(playerSpeed, base * (1 + 0.05 * (level - 1)))`, `base = 0.85 * playerSpeed`.
  - `targetFor(kind: string, enemy: Entity, player: Entity, maze: Maze): {x,y}|null` – sef: políčko ruličky; pm: 4 políčka před ruličkou ve směru `player.dir`; hr: políčko ruličky, když je manhattanovská vzdálenost ≤ 8, jinak `maze.patrol`; kolega: `null` (náhoda).
  - `chooseDir(enemy: Entity, maze: Maze, target: {x,y}|null, rng: () => number, fleeFrom: {x,y}|null): string` – možnosti bez obratu o 180° (když jiná není, obrat povolen), bez zdí; s cílem nejkratší vzdušná vzdálenost, s `fleeFrom` největší, bez cíle náhodně přes `rng`; remízy podle pořadí `DIRS`.
  - `newGame(maze: Maze, rng: () => number): State` a `update(state: State, dt: number, input: string|null): GameEvent[]`.
    - `State = { maze, level, score, best, lives, player: Entity, enemies: {kind, e: Entity, mode: "pen"|"chase"|"flee"|"eaten", releaseAt}[], coinsLeft: Set<number>, powerLeft: Set<number>, powerTime, chain, time, phase: "ready"|"play"|"dying"|"levelDone"|"over" }`.
    - `GameEvent = { type: "coin"|"powerup"|"enemyEaten"|"lifeLost"|"levelDone"|"gameOver", points?: number }`.
    - Sebrání power-upu: všichni nepřátelé mimo zasedačku `flee`, otočí se o 180°, poloviční rychlost, `chain = 0`. Chycení v `flee`: body `POINTS.enemy[min(chain,3)]`, `chain++`, nepřítel `eaten` a vrací se rychle do zasedačky, pak znovu vyjde. Dotyk v `chase`: `lifeLost`, reset pozic; při 0 životech `gameOver`. Všechny mince a power-upy pryč: `levelDone`, `level++`, nové mince.
    - Kolize: vzdálenost středů < 0,5 políčka.

- [ ] **Step 1: Napiš padající testy**

- `powerDurationByLevel`: `powerDuration(1) === 7`, `powerDuration(4) === 4`, `powerDuration(9) === 3`.
- `enemySpeedCapped`: `enemySpeed(20, 6) === 6`, `enemySpeed(1, 6)` ≈ 5,1.
- `pmTargetsAhead`: ruličky na (5,5) směr `right` → cíl (9,5).
- `hrPatrolsWhenFar` a `hrChasesWhenNear`.
- `chooseDirNoReverse`: na rovné chodbě nepřítel nikdy nezvolí opačný směr; ve slepé situaci obrat vrátí.
- `chooseDirFlees`: s `fleeFrom` vybere směr dál od ruličky.
- `coinScores`: po sebrání mince `score += 10` a událost `coin`.
- `powerupChain`: sebrat power-up, postupně se dotknout 4 nepřátel v `flee` → body 200, 400, 800, 1600.
- `touchCostsLife`: dotyk v `chase` → `lives` o 1 méně, událost `lifeLost`; při posledním životě `gameOver`.
- `levelAdvances`: smaž všechny mince kromě jedné, seber ji → `levelDone`, `level === 2`, mince doplněné.
- `enemiesReleasedInOrder`: po 0 s vyjde jen `sef`, po 3,1 s i `pm`.

- [ ] **Step 2: Spusť, musí selhat**

Run: `node --test tests/`
Expected: FAIL v `hra-pravidla.test.mjs`

- [ ] **Step 3: Implementuj podle Interfaces**

- [ ] **Step 4: Spusť, musí projít**

Run: `node --test tests/`
Expected: PASS všech testů

- [ ] **Step 5: Commit**

```bash
git add index.html tests/hra-pravidla.test.mjs
git commit -m "feat: nepratele, power-up, skore a urovne hry"
```

### Task 5: Herní UI – vykreslení, ovládání, smyčka, HUD

**Files:**
- Modify: `index.html` (blok `<script id="hra-ui">` za kalkulačkou; CSS hlavičky hry a překryvných hlášek)

**Interfaces:**
- Consumes: `Vrstvy` (Task 2), `HraLogika` (Task 3–4), `window.zachod` a `Stopky` (Task 1).
- Produces: `window.Hra = { pause(): void, isOpen(): boolean }`.

- [ ] **Step 1: Inicializace v `try/catch`**

Celý `#hra-ui` obalit; při výjimce skrýt `#hrajBtn` a skončit. `#hrajBtn` otevře hru přes `Vrstvy.open($("hra"), { onClose: stopLoop, returnFocus: hrajBtn })` (nahradí dočasné napojení z Task 2).

- [ ] **Step 2: Vykreslení**

Canvas škálovaný na dostupný prostor pod hlavičkou s poměrem bludiště, `devicePixelRatio`, přepočet na `resize`. Barvy z `getComputedStyle(document.documentElement)` při otevření a při změně `matchMedia("(prefers-color-scheme: dark)")`. Zdi jako stoly a příčky (výplň `--porcelain`, okraj `--line`), mince `--brass`, power-up jako přeškrtnutá kartička kalendáře. Rulička: bílý válec s otáčejícím se vzorem podle ujeté dráhy. Nepřátelé: postavičky s odlišující věcí a barvou (šéf kravata, PM notebook, kolega hrnek, HR desky); v `flee` bledé, poslední 2 s blikají (při `prefers-reduced-motion` jen změní barvu).

- [ ] **Step 3: Ovládání**

Šipky a WASD nastavují `input` (zapamatovaný směr), mezerník a P pauza, tlačítko `#hraPauza`. Na canvasu `touch-action: none`, `pointerdown`/`pointermove`: tah ≥ 20 px určí směr podle větší osy. Fokus po otevření na canvas (`tabindex="0"`).

- [ ] **Step 4: Smyčka a stavy**

`requestAnimationFrame`, pevný krok 1/60 s, `dt` z rAF omezený na 0,1 s. Smyčka běží jen při otevřené hře a `phase` jiné než pauza. Pauza při `visibilitychange` (skryto), při zavření vrstvy a při události `"vrstva-otevrena"` s jinou vrstvou než `#hra` (budoucí upozornění po 20 min). Po pauze hra stojí, dokud hráč nepustí. Překryvné hlášky: „Připrav se!“, při ztrátě života náhodně z `["Šéf: Máš chvilku?", "PM: Jen rychlý sync…", "Kolega: Máš chvilku?", "HR: Musíme si promluvit."]`, „Úroveň hotová, šéf nic nepoznal“, konec hry se skóre, rekordem a tlačítky „Hrát znovu“ a „Zpět ke kalkulačce“.

- [ ] **Step 5: HUD a uložení**

Skóre a rekord jako `zachod.money(score)` s textem „Vydělal jsi …“, životy jako malé ruličky, „Úroveň N“. Rekord v `localStorage["zachodova-hra-v1"]` jako `{ best: number }`. Když `zachod.timerStart()` není `null`, `#hraStopky` je vidět a jednou za sekundu (vlastní `setInterval`, jen při otevřené hře) ukazuje „Sedíš {Stopky.fmtTime(ms)} · {zachod.money(zachod.earned(ms))}“.

- [ ] **Step 6: Ruční ověření**

375 px a desktop, světlý i tmavý režim: hra se dá dohrát do konce, ovládání šipkami i tažením, stránka se při tažení neposouvá, hrací plocha nepřetéká. Po zavření hry `requestAnimationFrame` neběží (v DevTools Performance nebo logem). Přepnutí karty hru pozastaví.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat: vykresleni, ovladani a smycka hry Rulicka na uteku"
```

### Task 6: Celkové ověření scénáře sezení

**Files:** žádné změny, jen ověření (opravy jdou do příslušného bloku).

- [ ] **Step 1: Testy**

Run: `node --test tests/`
Expected: PASS všech testů

- [ ] **Step 2: Scénář ze specu v prohlížeči (375 px)**

Spusť stopky → otevři hru → hlavička ukazuje „Sedíš 0:0X · …“ → hraj 30 s → zavři tlačítkem Zpět → stopky běží a čas odpovídá skutečnosti → obnov stránku → stopky běží dál se správným časem → spláchni → počet návštěv +1 a průměr upraven. Kalkulačka po celou dobu reaguje na změny vstupů.

- [ ] **Step 3: Kontrola originality**

Projdi vzhled: žádný žlutý kruh s ústy, žádní duchové, bludiště není klasické, žádné zvuky.
